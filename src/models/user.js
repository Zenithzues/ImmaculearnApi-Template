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
    const query = 'SELECT * FROM users WHERE google_id = ? LIMIT 1';
    const [rows] = await this.db.execute(query, [googleId]);
    return rows[0] || null;
  }


  async createPartialGoogleUser({ googleId, email, picture }) {
    const query =
      'INSERT INTO users (google_id, email, picture, created_at) VALUES (?, ?, ?, NOW())';
    const [result] = await this.db.execute(query, [googleId, email, picture]);

    return { id: result.insertId, googleId, email, picture };
  }

  async completeOnboarding(userId, data) {
    const { f_name, l_name, birthdate, department_id, password, role } = data;
    const query =
      `UPDATE users 
       SET f_name = ?, l_name = ?, birthdate = ?, department_id = ?, pwsd = ?, role = ? 
       WHERE account_id = ?`;
    await this.db.execute(query, [f_name, l_name, birthdate, department_id, password, role, userId]);

    return this.get(userId);
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

