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
}

export default RegisteredProfEmail;