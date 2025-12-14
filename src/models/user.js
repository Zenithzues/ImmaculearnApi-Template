import { connection } from '../core/database.js';
import { encryptPassword } from '../utils/hash.js';

class User {
  constructor() {
    this.db = connection;
  }

  async findOrCreate({ googleId, email, name, picture }) {
    let user = await this.user.findByGoogleId(googleId);
    if (!user) {
      user = await this.user.createWithGoogle({ googleId, email, name, picture });
    }
    return user;
  }

  async findByGoogleId(googleId) {
    const query = 'SELECT * FROM accounts WHERE google_id = ? LIMIT 1';
    const [rows] = await this.db.execute(query, [googleId]);
    return rows[0] || null;
  }


  async createPartialGoogleUser({ googleId, email, picture }) {
    const query =
      'INSERT INTO accounts (google_id, email, created_at) VALUES (?, ?, NOW())';
    const [result] = await this.db.execute(query, [googleId, email]);

    return { id: result.insertId, googleId, email, picture };
  }

  async completeStudentOnboarding(userId, data) {
    const { f_name, l_name, birthdate, department_id, password } = data;
    
    const connection = await this.db.getConnection(); // assume MySQL pool
    try {
      await connection.beginTransaction();

      // 1️⃣ Update accounts table (store password)
      const hashedPassword = encryptPassword(password); // e.g., bcrypt
      const updateAccountQuery = 'UPDATE accounts SET pswd = ? WHERE account_id = ?';
      await connection.execute(updateAccountQuery, [hashedPassword, userId]);

      // 2️⃣ Update students table (personal info)
      const updateStudentQuery = `
        UPDATE students
        SET f_name = ?, l_name = ?, birthdate = ?, department_id = ?
        WHERE account_id = ?`;
      await connection.execute(updateStudentQuery, [f_name, l_name, birthdate, department_id, userId]);

      // Commit transaction
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * Create user profile
   *
   * @param {String} username
   * @param {String} password
   * @param {String} fullname 
   *
   * @returns {Object}
   * @throws MySQL2 error
   *
   */
  async create(email, password) {
    try {
      const [results,] = await connection.execute(
        'INSERT INTO accounts(email, pswd) VALUES (?, ?)',
        [email, encryptPassword(password)],
      );

      return results;
    } catch (err) {
      console.error('<error> accounts.create', err);
      throw err;
    }
  }

  /**
   * Verify if account exists
   *
   * @param {string} email 
   * @param {string} password
   * @returns {Object}
   * @throws {Error}
   */
  async verify(email, password) {
    try {
      const [results,] = await connection.execute(
        'SELECT account_id FROM accounts WHERE email = ? AND pswd = ?',
        [email, encryptPassword(password)],
      )

      console.log(results?.[0])
      return results?.[0];
    } catch (err) {
      console.error('<error> user.verify', err);
      throw err;
    }
  }

  /**
   * Get user's information
   *
   * @param {number} account_id 
   * @returns {Object}
   * @throws {Error}
   *
   */
  async get(account_id) {
    try {
      // const [results,] = await connection.execute(
      //   `SELECT p.f_name, p.l_name FROM profile AS p
      //   LEFT JOIN account AS a
      //   ON a.profile_id = p.profile_id 
      //   WHERE a.account_id = ?
      //   `,
      //   [account_id]
      // )

      const [results,] = await this.db.execute(
        `
        SELECT account_id, email FROM accounts
        WHERE account_id = ?
        `, [account_id]
      )

      return results?.[0];
    } catch (err) {
      console.error('<error> user.getInformation', err);
      throw err;
    }
  }
}

export default User;

