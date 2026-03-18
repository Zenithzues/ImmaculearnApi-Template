import { connection } from "../../core/database.js";
import UserModel from "./UserModel.js";

class RegisteredProfEmail {
  constructor() {
    this.db = connection;
    this.userModel = new UserModel();
    this.logger = console;
  }


  // Email Template
  getEmailTemplate(email) {
    return `
      <html>
      <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @media only screen and (max-width: 620px) {
          .email-wrapper { width: 100% !important; }
          .email-body { padding: 16px !important; }
        }
      </style>
      </head>
      <body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;">

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:20px 0;">
      <tr>
      <td align="center">

      <table class="email-wrapper" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;">

      <!-- HEADER -->
      <tr>
      <td align="center" style="background:linear-gradient(135deg,#667eea,#764ba2);padding:30px;color:white;">
      <h1 style="margin:0;font-size:26px;">Welcome to Immaculearn!</h1>
      </td>
      </tr>

      <!-- CONTENT -->
      <tr>
      <td class="email-body" style="padding:30px;">

      <h2 style="margin-top:0;color:#333;">You are Invited!</h2>

      <p style="color:#666;font-size:16px;line-height:1.6;">
      Dear Immaculearn User: <b>${email}</b>,<br><br>
      Your Gmail has been successfully added to the <b>Immaculearn System</b>.
      Please follow the steps below to start using your account.
      </p>

      <!-- STEP 1 -->
      <table width="100%" style="margin-top:20px;background:#f5f6fa;border-radius:8px;">
      <tr>
      <td class="step-number" width="50" align="center" style="padding:20px;">
      <div style="background:#667eea;color:white;width:32px;height:32px;border-radius:50%;line-height:32px;font-weight:bold;text-align:center;">
      1
      </div>
      </td>

      <td style="padding:20px;">
      <b style="color:#333;">Access Your Account</b><br>
      <span style="color:#666;font-size:14px;">
      Click the link below to start using the platform.
      </span>

      <br><br>

      <a href="https://immaculearn-web.up.railway.app"
      style="background:#667eea;color:white;padding:10px 20px;
      text-decoration:none;border-radius:6px;display:inline-block;">
      Open Immaculearn
      </a>

      </td>
      </tr>
      </table>

      <!-- STEP 2 -->
      <table width="100%" style="margin-top:15px;background:#f5f6fa;border-radius:8px;">
      <tr>
      <td class="step-number" width="50" align="center" style="padding:20px;">
      <div style="background:#667eea;color:white;width:32px;height:32px;border-radius:50%;line-height:32px;font-weight:bold;text-align:center;">
      2
      </div>
      </td>

      <td style="padding:20px;">
      <b style="color:#333;">Complete Your Profile</b><br>
      <span style="color:#666;font-size:14px;">
      Click <b>Continue with Gmail</b> and complete your professor profile by filling in your name,
      department, and other required information.
      </span>
      </td>
      </tr>
      </table>

      </td>
      </tr>

      </table>

      <!-- FOOTER -->
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin-top:20px;text-align:center;color:#999;font-size:14px;">
      <tr>
      <td>
      Best regards,<br>
      <b>The Immaculearn Team</b><br><br>
      © 2025 Immaculearn. All rights reserved.
      </td>
      </tr>
      </table>

      </td>
      </tr>
      </table>

      </body>
      </html>
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

    // 0️⃣ BULK Check if any emails are already registered as professors
    const placeholders = uniqueEmails.map(() => "?").join(",");
    
    const [professorRows] = await this.db.execute(
      `SELECT email FROM accounts WHERE email IN (${placeholders})`,
      uniqueEmails
    );
    
    const professorEmails = professorRows.map(r => r.email);
    
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

    // 0️⃣ BULK Check if any emails are already registered as students
    const [studentRows] = await this.db.execute(
      `SELECT email FROM registered_student_emails WHERE email IN (${placeholders})`,
      uniqueEmails
    );
    
    const studentEmails = studentRows.map(r => r.email);
    
    if (studentEmails.length > 0) {
      return {
        inserted: 0,
        skipped: uniqueEmails.length,
        emailsNotSent: studentEmails.length,
        studentBlocked: studentEmails,
        totalProcessed: uniqueEmails.length,
        message: `${studentEmails.length} email(s) are already registered as students and cannot be registered as professors`
      };
    }

    // 1️⃣ BULK Check ALL emails for complete professor profiles
    const [profileRows] = await this.db.execute(
      `SELECT 
        a.email,
        s.prof_fn,
        s.prof_ln,
        s.prof_gender,
        s.prof_department
      FROM accounts a
      LEFT JOIN professors s ON s.account_id = a.account_id
      WHERE a.email IN (${placeholders})`,
      uniqueEmails
    );

    // Check which users have complete profiles
    const usersWithCompleteProfiles = profileRows
      .filter(row => 
        row.prof_fn && 
        row.prof_ln && 
        row.prof_gender && 
        row.prof_department
      )
      .map(row => row.email);

    // 2️⃣ BULK Find existing registered emails
    const [existingRows] = await this.db.execute(
      `SELECT email FROM registered_prof_emails WHERE email IN (${placeholders})`,
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
        INSERT INTO registered_prof_emails (email)
        VALUES ?
      `;

      const [result] = await this.db.query(sql, [values]);
      insertedCount = result.affectedRows;
    }

    // 6️⃣ Send emails only to those with incomplete profiles
    if (emailsToSend.length) {
      await Promise.all(
        emailsToSend.map(async (email) => {
          const res = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "api-key": process.env.BREVO_API_KEY
            },
            body: JSON.stringify({
              sender: {
                name: "Immaculearn",
                email: "immaculearn@gmail.com"
              },
              to: [{ email }],
              subject: "Immaculearn Registration",
              htmlContent: this.getEmailTemplate(email)
            })
          });

          if (!res.ok) {
            const err = await res.json();
            throw new Error(`Brevo error for ${email}: ${JSON.stringify(err)}`);
          }
        })
      );
    }

    return {
      inserted: insertedCount,
      skipped: existingEmails.length,
      emailsNotSent: usersWithCompleteProfiles.length,
      totalProcessed: uniqueEmails.length
    };
  }

  // Alias for compatibility
  async bulkRegisterEmails(emails = []) {
    return this.registerEmails(emails);
  }

  async getAllRegisteredProfessors() {
    const sql = `
      SELECT 
        s.prof_fn,
        s.prof_ln,
        s.prof_gender,
        s.prof_department,
        r.email
      FROM registered_prof_emails r
      LEFT JOIN accounts a 
        ON r.email = a.email
      LEFT JOIN professors s
        ON s.account_id = a.account_id
      ORDER BY 
        s.prof_id IS NULL,
        s.prof_id DESC
    `;

    const [rows] = await this.db.execute(sql);

    return rows;
  }

  async deleteEmail(email) {
    const connection = await this.db.getConnection();

    try {
      await connection.beginTransaction();

      const [accountRows] = await connection.execute(
        `SELECT account_id FROM accounts WHERE email = ?`,
        [email]
      );

      let deletedRecords = {
        registeredEmails: 0,
        accounts: 0,
        professors: 0
      };

      if (accountRows.length > 0) {
        const accountId = accountRows[0].account_id;

        const [professorResult] = await connection.execute(
          `DELETE FROM professors WHERE account_id = ?`,
          [accountId]
        );

        deletedRecords.professors = professorResult.affectedRows;

        const [accountResult] = await connection.execute(
          `DELETE FROM accounts WHERE account_id = ?`,
          [accountId]
        );

        deletedRecords.accounts = accountResult.affectedRows;
      }

      const [emailResult] = await connection.execute(
        `DELETE FROM registered_prof_emails WHERE email = ?`,
        [email]
      );

      deletedRecords.registeredEmails = emailResult.affectedRows;

      await connection.commit();

      const totalDeleted =
        deletedRecords.registeredEmails +
        deletedRecords.accounts +
        deletedRecords.professors;

      return {
        deleted: totalDeleted > 0,
        email,
        deletedRecords,
        totalDeleted,
        message:
          totalDeleted > 0
            ? `Successfully deleted ${totalDeleted} records associated with ${email}`
            : "No records found for this email"
      };

    } catch (error) {
      await connection.rollback();
      throw error;

    } finally {
      connection.release();
    }
  }
}

export default RegisteredProfEmail;