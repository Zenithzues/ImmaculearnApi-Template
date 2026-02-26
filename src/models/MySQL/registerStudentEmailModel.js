import { connection } from "../../core/database.js";

class RegisteredEmail {
  constructor() {
    this.db = connection;
  }

  /*
  ========================================
  REGISTER SINGLE EMAIL
  ========================================
  */
  async one_email(email) {
    const sql = `
      INSERT INTO registered_student_emails (email)
      VALUES (?)
      ON DUPLICATE KEY UPDATE email = email
    `;

    const [result] = await this.db.execute(sql, [email]);

    return {
      inserted: result.affectedRows > 0,
      email,
      message:
        result.affectedRows > 0
          ? "Email registered successfully"
          : "Email already registered",
    };
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