import { connection } from "../../core/database.js";
import { transporter } from "../../core/nodeMailer.js";
import UserModel from "./UserModel.js";

class RegisteredEmail {
  constructor() {
    this.db = connection;
    this.transporter = transporter;
    this.userModel = new UserModel();
    this.logger = console;
  }

  // Email Template
  getEmailTemplate() {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    padding: 30px; border-radius: 10px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">Welcome to Immaculearn!</h1>
        </div>

        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-top: 20px;">
          <h2 style="color: #333;">You are Invited!</h2>

          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            Your email has been successfully registered to Immaculearn.
            We're excited to have you join our learning community!
            Please click the link below
            <a href="https://immaculearn-online.netlify.app" style="color: #667eea; text-decoration: none;">Access Account</a>
          </p>

          <div style="background:#e8f5e8;padding:15px;border-left:4px solid #28a745;margin-top:20px">
            <b style="color:#155724">🎉 You're now part of our educational platform!</b>
          </div>
        </div>

        <div style="text-align:center;margin-top:20px;color:#999;font-size:14px">
          Best regards,<br>The Immaculearn Team
        </div>
      </div>
    `;
  }

  normalizeEmails(emails) {
    let emailList = [];

    if (typeof emails === "string") {
      emailList = emails.split(",");
    } else if (Array.isArray(emails)) {
      emailList = emails;
    }

    return [...new Set(
      emailList.map(e => e.trim().toLowerCase()).filter(Boolean)
    )];
  }

  async registerEmails(emails) {
    const uniqueEmails = this.normalizeEmails(emails);

    if (!uniqueEmails.length) {
      return { inserted: 0 };
    }

    // 0️⃣ Check if any emails are already registered as professors
    const professorEmails = [];
    for (const email of uniqueEmails) {
      const user = await this.userModel.findByEmail(email);
      if (user && user.role === "professor") {
        professorEmails.push(email);
      }
    }

    if (professorEmails.length > 0) {
      return {
        inserted: 0,
        skipped: uniqueEmails.length,
        emailsNotSent: professorEmails.length,
        professorBlocked: professorEmails,
        totalProcessed: uniqueEmails.length,
        message: `${professorEmails.length} email(s) are already registered as professors and cannot be registered as students`
      };
    }
    // 1️⃣ Check ALL emails for complete student profiles
    const placeholders = uniqueEmails.map(() => "?").join(",");

    const [profileRows] = await this.db.execute(
      `SELECT 
        a.email,
        s.student_fn,
        s.student_ln,
        s.student_gender,
        s.student_course,
        s.student_yr_lvl
      FROM accounts a
      LEFT JOIN students s ON s.account_id = a.account_id
      WHERE a.email IN (${placeholders})`,
      uniqueEmails
    );

    // Check which users have complete profiles
    const usersWithCompleteProfiles = profileRows
      .filter(row => 
        row.student_fn && 
        row.student_ln && 
        row.student_gender && 
        row.student_course && 
        row.student_yr_lvl
      )
      .map(row => row.email);

    // 2️⃣ Find existing registered emails
    const [existingRows] = await this.db.execute(
      `SELECT email FROM registered_student_emails WHERE email IN (${placeholders})`,
      uniqueEmails
    );

    const existingEmails = existingRows.map(r => r.email);

    // 3️⃣ Filter new emails
    const newEmails = uniqueEmails.filter(
      email => !existingEmails.includes(email)
    );

    // 4️⃣ Filter out users with complete profiles from receiving emails
    const emailsToSend = uniqueEmails.filter(
      email => !usersWithCompleteProfiles.includes(email)
    );

    // 5️⃣ Bulk insert new emails
    let insertedCount = 0;

    if (newEmails.length) {
      const values = newEmails.map(email => [email]);

      const sql = `
        INSERT INTO registered_student_emails (email)
        VALUES ?
        ON DUPLICATE KEY UPDATE email = email
      `;

      const [result] = await this.db.query(sql, [values]);
      insertedCount = result.affectedRows;
    }

    // 6️⃣ Send emails only to those with incomplete profiles
    if (emailsToSend.length) {
      await Promise.all(
        emailsToSend.map(email =>
          this.transporter.sendMail({
            to: email,
            subject: 'Immaculearn Registration',
            html: this.getEmailTemplate()
          })
        )
      );
    }

    return {
      inserted: insertedCount,
      skipped: existingEmails.length,
      emailsNotSent: usersWithCompleteProfiles.length,
      totalProcessed: uniqueEmails.length
    };
  }

  /*
  ========================================
  BULK REGISTER (UPDATED)
  ========================================
  */
  async bulkRegisterEmails(emails = []) {
    return this.registerEmails(emails);
  }

  /*
  ========================================
  GET ALL REGISTERED STUDENTS (WITH JOIN)
  ========================================
  */
  async getAllRegisteredStudents() {
    const sql = `
      SELECT 
        s.student_id,
        s.student_fn,
        s.student_ln,
        s.student_gender,
        s.student_course,
        s.student_yr_lvl,
        r.email
      FROM registered_student_emails r
      LEFT JOIN accounts a 
        ON r.email = a.email
      LEFT JOIN students s
        ON s.account_id = a.account_id
      ORDER BY 
        s.student_id IS NULL,   -- NULL (no match) will be last
        s.student_id DESC
    `;

    const [rows] = await this.db.execute(sql);
    return rows;
  }

  async deleteEmail(email) {
    const connection = await this.db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Get account_id from accounts table using email
      const [accountRows] = await connection.execute(
        'SELECT account_id FROM accounts WHERE email = ?',
        [email]
      );
      
      let deletedRecords = {
        registeredEmails: 0,
        accounts: 0,
        students: 0
      };
      
      if (accountRows.length > 0) {
        const accountId = accountRows[0].account_id;
        
        // Delete from students table where account_id matches
        const [studentResult] = await connection.execute(
          'DELETE FROM students WHERE account_id = ?',
          [accountId]
        );
        deletedRecords.students = studentResult.affectedRows;
        
        // Delete from accounts table
        const [accountResult] = await connection.execute(
          'DELETE FROM accounts WHERE account_id = ?',
          [accountId]
        );
        deletedRecords.accounts = accountResult.affectedRows;
      }
      
      // Delete from registered_student_emails table
      const [emailResult] = await connection.execute(
        'DELETE FROM registered_student_emails WHERE email = ?',
        [email]
      );
      deletedRecords.registeredEmails = emailResult.affectedRows;
      
      await connection.commit();
      
      const totalDeleted = deletedRecords.registeredEmails + deletedRecords.accounts + deletedRecords.students;
      
      return {
        deleted: totalDeleted > 0,
        email,
        deletedRecords,
        totalDeleted,
        message:
          totalDeleted > 0
            ? `Successfully deleted ${totalDeleted} records associated with ${email}`
            : "No records found for this email",
      };
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

}

export default RegisteredEmail;