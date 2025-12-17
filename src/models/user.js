import { connection } from '../core/database.js';
import { hashPassword, verifyPassword } from '../utils/argonUtil.js';
import { encryptPassword } from '../utils/hash.js';

class User {
  constructor() {
    this.db = connection;
  }

  // async findOrCreate({ googleId, email, name, picture }) {
  //   let user = await this.user.findByGoogleId(googleId);
  //   if (!user) {
  //     console.log("I NEED TO CREATE USING GOOGLE!!!!!")
  //     user = await this.user.createWithGoogle({ googleId, email, name, picture });
  //   }
  //   return user;
  // }

  async findByEmail(email) {
    // Check student emails first
    const [studentResult] = await this.db.execute(
      `SELECT email FROM registered_student_emails WHERE email = ?`,
      [email]
    );

    if (studentResult.length > 0) {
      return {email: studentResult[0], role: 'student'}; // Found in students
    }

    // If not found, check professor emails
    const [profResult] = await this.db.execute(
      `SELECT email FROM registered_prof_emails WHERE email = ?`,
      [email]
    );

    if (profResult.length > 0) {
      return {email: profResult[0], role: 'professor'}; // Found in professors
    }

    // If not found in either table
    return null;
  }


  async findByGoogleId(googleId) {
    const query = 'SELECT account_id, google_id FROM accounts WHERE google_id = ? LIMIT 1';
    const [rows] = await this.db.execute(query, [googleId]);
    return rows[0] || null;
  }


  async createPartialGoogleUser({ googleId, email, picture }) {
    const query =
      'INSERT INTO accounts (account_id, email, google_id, profile_pic, created_at) VALUES (?, ?, ?, ?, NOW())';
    const [result] = await this.db.execute(query, [1, email, googleId, picture]);

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
        'SELECT account_id, email, password FROM accounts WHERE email = ?',
        [email],
      );

      if (!results[0]) return null;

      const storedHash = results[0].password;

      console.log(storedHash)

      console.log(await hashPassword(password))
      const isValid = await verifyPassword(storedHash, password);

      console.log(isValid)
      if (!isValid) return null;

      

      console.log(results?.[0])
      // return results?.[0];

      const user = results[0];
      return {
        account_id: user.account_id,
        email: user.email,
        // do NOT include user.password
      };

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

