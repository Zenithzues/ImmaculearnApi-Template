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
}

export default RegisteredEmail;