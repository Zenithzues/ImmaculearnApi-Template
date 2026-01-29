import { connection } from '../core/database.js';

class RegisteredProfEmail {
  constructor() {
    this.db = connection;
  }

  /**
   * Check if email already exists
   * @param {string} email
   * @returns {boolean}
   */
  async isEmailRegistered(email) {
    const sql =
      'SELECT COUNT(*) AS count FROM registered_prof_emails WHERE reg_email = ?';

    const [rows] = await this.db.execute(sql, [email]);
    return rows[0].count > 0;
  }

  /**
   * Register single email only
   * @param {string} email
   */
  async registerEmail(email) {
    const sql =
      'INSERT INTO registered_prof_emails (reg_email) VALUES (?)';

    await this.db.execute(sql, [email]);
  }

  /**
   * Register email safely (no duplicate crash)
   * @param {string} email
   */
  async one_email(email) {
    const exists = await this.isEmailRegistered(email);

    if (exists) {
      return {
        inserted: false,
        message: 'Email already registered',
      };
    }

    await this.registerEmail(email);

    return {
      inserted: true,
      email,
    };
  }

  /**
   * BULK register emails
   * @param {string[]} emails
   * @returns {{ inserted: number, skipped: number }}
   */
  async bulkRegisterEmails(emails = []) {
    if (!emails.length) {
      return { inserted: 0, skipped: 0 };
    }

    // Normalize & remove duplicates from CSV
    const uniqueEmails = [...new Set(
      emails.map(e => e.trim().toLowerCase())
    )];

    const values = [];
    let skipped = 0;

    for (const email of uniqueEmails) {
      const exists = await this.isEmailRegistered(email);

      if (!exists) {
        values.push([email]);
      } else {
        skipped++;
      }
    }

    if (values.length) {
      const sql = `
        INSERT INTO registered_prof_emails (reg_email)
        VALUES ?
      `;
      await this.db.query(sql, [values]);
    }

    return {
      inserted: values.length,
      skipped,
    };
  }
   
  async getAllRegisteredEmails() {
  const sql = `
    SELECT reg_email
    FROM registered_prof_emails
    ORDER BY reg_id DESC
  `;
  const [rows] = await this.db.execute(sql);
  return rows.map(row => row.reg_email);
}

}

export default RegisteredProfEmail;
