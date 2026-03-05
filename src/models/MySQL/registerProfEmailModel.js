import { connection } from "../../core/database.js";

class RegisteredProfEmail {
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
      INSERT INTO registered_prof_emails (email)
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
      INSERT INTO registered_prof_emails (email)
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
  GET ALL REGISTERED PROFS (WITH JOIN)
  ========================================
  */
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
      s.prof_id IS NULL,   -- NULL (no match) will be last
      s.prof_id DESC
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
        professors: 0
      };
      
      if (accountRows.length > 0) {
        const accountId = accountRows[0].account_id;
        
        // Delete from professors table where account_id matches
        const [professorResult] = await connection.execute(
          'DELETE FROM professors WHERE account_id = ?',
          [accountId]
        );
        deletedRecords.professors = professorResult.affectedRows;
        
        // Delete from accounts table
        const [accountResult] = await connection.execute(
          'DELETE FROM accounts WHERE account_id = ?',
          [accountId]
        );
        deletedRecords.accounts = accountResult.affectedRows;
      }
      
      // Delete from registered_prof_emails table
      const [emailResult] = await connection.execute(
        'DELETE FROM registered_prof_emails WHERE email = ?',
        [email]
      );
      deletedRecords.registeredEmails = emailResult.affectedRows;
      
      await connection.commit();
      
      const totalDeleted = deletedRecords.registeredEmails + deletedRecords.accounts + deletedRecords.professors;
      
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

export default RegisteredProfEmail;