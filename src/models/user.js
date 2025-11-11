import { connection } from '../core/database.js';
import { encryptPassword } from '../utils/hash.js';

class User {
  constructor() {
    this.db = connection;
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
  async create(username, password, fullname) {
    try {
      const [results,] = await connection.execute(
        'INSERT INTO users(username, password, fullname) VALUES (?, ?, ?)',
        [username, encryptPassword(password), fullname],
      );

      return results;
    } catch (err) {
      console.error('<error> user.create', err);
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
        'SELECT account_id FROM account WHERE username = ? AND password = ?',
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
      const [results,] = await connection.execute(
        `SELECT p.f_name, p.l_name FROM profile AS p
        LEFT JOIN account AS a
        ON a.profile_id = p.profile_id 
        WHERE a.account_id = ?
        `,
        [account_id]
      )

      return results?.[0];
    } catch (err) {
      console.error('<error> user.getInformation', err);
      throw err;
    }
  }
}

export default User;

