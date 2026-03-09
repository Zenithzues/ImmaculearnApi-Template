import { connection } from "../../core/database.js";
import { transporter } from "../../core/nodeMailer.js";

class RegisteredEmail {
  constructor() {
    this.db = connection;
    this.transporter = transporter;
  }

  /*
  ========================================
  REGISTER SINGLE EMAIL
  ========================================
  */
  async registerEmails(emails) {

  // normalize input
  let emailList = [];

  if (typeof emails === "string") {
    emailList = emails.split(",").map(e => e.trim());
  } else if (Array.isArray(emails)) {
    emailList = emails.map(e => e.trim());
  }

  const sql = `
    INSERT INTO registered_student_emails (email)
    VALUES (?)
    ON DUPLICATE KEY UPDATE email = email
  `;

  const results = [];

  for (const email of emailList) {
    const [result] = await this.db.execute(sql, [email]);

    const isInserted = result.affectedRows > 0;
    results.push({
      email,
      inserted: isInserted,
      message:
        isInserted
          ? "Email registered successfully"
          : "Email already registered"
    });

    // Only send email if it's a new registration
    if (isInserted) {
      await this.transporter.sendMail({
        to: email,
        subject: 'Immaculearn Registration',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Welcome to Immaculearn!</h1>
            </div>
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-top: 20px;">
              <h2 style="color: #333; margin-bottom: 15px;">Registration Successful</h2>
              <p style="color: #666; line-height: 1.6; font-size: 16px;">Your email has been successfully registered to Immaculearn. We're excited to have you join our learning community!</p>
              <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin-top: 20px; border-left: 4px solid #28a745;">
                <p style="margin: 0; color: #155724; font-weight: bold;">🎉 You're now part of our educational platform!</p>
              </div>
            </div>
            <div style="text-align: center; margin-top: 20px; color: #999; font-size: 14px;">
              <p>Best regards,<br>The Immaculearn Team</p>
            </div>
          </div>
        `
      });
    }
  }

  return results;
}

  /*
  ========================================
  BULK REGISTER (OPTIMIZED)
  ========================================
  */
  async bulkRegisterEmails(emails = []) {
    if (!emails.length) {
      return { inserted: 0 };
    }

    const uniqueEmails = [...new Set(
      emails.map(e => e.trim().toLowerCase())
    )];

    const values = uniqueEmails.map(email => [email]);

    const sql = `
      INSERT INTO registered_student_emails (email)
      VALUES ?
      ON DUPLICATE KEY UPDATE email = email
    `;

    const [result] = await this.db.query(sql, [values]);

    // Send emails to all registered emails
    for (const email of uniqueEmails) {
      await this.transporter.sendMail({
        to: email,
        subject: 'Immaculearn Registration',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Welcome to Immaculearn!</h1>
            </div>
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-top: 20px;">
              <h2 style="color: #333; margin-bottom: 15px;">Registration Successful</h2>
              <p style="color: #666; line-height: 1.6; font-size: 16px;">Your email has been successfully registered to Immaculearn. We're excited to have you join our learning community!</p>
              <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin-top: 20px; border-left: 4px solid #28a745;">
                <p style="margin: 0; color: #155724; font-weight: bold;">🎉 You're now part of our educational platform!</p>
              </div>
            </div>
            <div style="text-align: center; margin-top: 20px; color: #999; font-size: 14px;">
              <p>Best regards,<br>The Immaculearn Team</p>
            </div>
          </div>
        `
      });
    }

    return {
      inserted: result.affectedRows,
    };
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