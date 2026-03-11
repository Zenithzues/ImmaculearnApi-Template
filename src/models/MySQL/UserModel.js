import { mysqlConnection } from "../../config/mysqlConnection.js";
import { hashPassword, verifyPassword } from "../../utils/argonUtil.js";
import { encryptPassword } from "../../utils/hash.js";
import { Logger } from "../../utils/Logger.js";

class User {
  constructor() {
    this.db = mysqlConnection;
    this.logger = new Logger("UserModel");
  }

  async findByEmail(email) {
    try {
      //   this.logger.debug('Finding user by email', { email });

      // Check student emails first
      const studentResult = await this.db.execute(
        `SELECT email FROM registered_student_emails WHERE email = ?`,
        [email],
      );

      //   console.log(!studentResult || "No student Result found");

      if (studentResult && studentResult.length > 0) {
        // this.logger.debug('Found student email', { email });
        return { email: studentResult[0].email, role: "student" };
      }

      // If not found, check professor emails
      const profResult = await this.db.execute(
        `SELECT email FROM registered_prof_emails WHERE email = ?`,
        [email],
      );
      //   console.log(!profResult || "No student Result found");

      if (profResult && profResult.length > 0) {
        // this.logger.debug('Found professor email', { email });
        return { email: profResult[0].email, role: "professor" };
      }

      // If not found in either table
      this.logger.error("Email not found in registered lists", { email });
      return null;
    } catch (error) {
      this.logger.error("Error finding user by email", { email, error });
      throw error;
    }
  }

  async findByGoogleId(googleId) {
    try {
      const query =
        "SELECT account_id, google_id FROM accounts WHERE google_id = ? LIMIT 1";
      const [rows] = await this.db.execute(query, [googleId]);

      //   console.log(rows)

      //   if (!rows) {
      //     this.logger.error('User not found by Google ID', { googleId });
      //   }

      return rows || null;
    } catch (error) {
      this.logger.error("Error finding user by Google ID", { googleId, error });
      throw error;
    }
  }

  async findByAccountId(account_id, role) {
    try {
      //   await this.db.ensureConnected();
      const finder = this.getFinder(role);
      const user = await finder.findByAccountId(account_id);

      //   if (!user) {
      //     this.logger.error(' User not found by account ID', { account_id, role });
      //   }

      return user;
    } catch (error) {
      this.logger.error("Error finding user by account ID", {
        account_id,
        role,
        error,
      });
      throw error;
    }
  }

  getFinder(role) {
    switch (role) {
      case "student":
        return new StudentFinder(this.db);
      case "professor":
        return new ProfessorFinder(this.db);
      default:
        this.logger.error("Unsupported role", { role });
        throw new Error(`Unsupported role: ${role}`);
    }
  }

  async createPartialGoogleUser({ googleId, email, picture }) {
    try {
      const query =
        "INSERT INTO accounts (email, google_id, profile_pic, created_at) VALUES (?, ?, ?, NOW())";
      const result = await this.db.execute(query, [email, googleId, picture]);

      this.logger.info("Created partial Google user", { email, googleId });

      return { account_id: result.insertId, googleId, email, picture };
    } catch (error) {
      this.logger.error("Error creating partial Google user", {
        email,
        googleId,
        error,
      });
      throw error;
    }
  }

  async completeStudentOnboarding(userId, data) {
    const {
      f_name,
      l_name,
      birthdate,
      gender,
      department_id,
      password,
      year_level,
    } = data;

    if (!userId) throw new Error("User ID is required");
    if (!password) throw new Error("Password is required");

    const gender_initial = gender?.charAt(0)?.toUpperCase() || null;

    const conn = await this.db.getConnection();

    try {
      await conn.beginTransaction();

      // 1️⃣ Check if account exists
      const [account] = await conn.execute(
        "SELECT account_id FROM accounts WHERE account_id = ?",
        [userId],
      );

      if (account.length === 0) {
        throw new Error("Account does not exist");
      }

      // 2️⃣ Check if student already exists
      const [existingStudent] = await conn.execute(
        "SELECT account_id FROM students WHERE account_id = ?",
        [userId],
      );

      if (existingStudent.length > 0) {
        throw new Error("Student already onboarded");
      }

      // 3️⃣ Hash password
      const hashedPassword = await hashPassword(password);

      const [updateResult] = await conn.execute(
        "UPDATE accounts SET password = ? WHERE account_id = ?",
        [hashedPassword, userId],
      );

      if (updateResult.affectedRows === 0) {
        throw new Error("Failed to update account password");
      }

      // 4️⃣ Insert student profile
      await conn.execute(
        `
      INSERT INTO students 
      (account_id, student_fn, student_ln, student_bd, student_gender, student_course, student_yr_lvl)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
        [
          userId,
          f_name,
          l_name,
          birthdate,
          gender_initial,
          department_id,
          year_level,
        ],
      );

      await conn.commit();
      this.logger.info("Student onboarding completed", { userId });
    } catch (err) {
      await conn.rollback();
      this.logger.error("Student onboarding failed", { userId, error: err });
      throw err;
    } finally {
      conn.release();
    }
  }

  async completeProfessorOnboarding(userId, data) {
    const { f_name, l_name, birthdate, department, gender, password } = data;

    if (!userId) throw new Error("User ID is required");
    if (!password) throw new Error("Password is required");

    const gender_initial = gender?.charAt(0)?.toUpperCase() || null;

    const conn = await this.db.getConnection();

    try {
      await conn.beginTransaction();

      // 1️⃣ Check if account exists
      const [account] = await conn.execute(
        "SELECT account_id FROM accounts WHERE account_id = ?",
        [userId],
      );

      if (account.length === 0) {
        throw new Error("Account does not exist");
      }

      // 2️⃣ Check if professor already exists
      const [existingProfessor] = await conn.execute(
        "SELECT account_id FROM professors WHERE account_id = ?",
        [userId],
      );

      if (existingProfessor.length > 0) {
        throw new Error("Professor already onboarded");
      }

      // 3️⃣ Hash password
      const hashedPassword = await hashPassword(password);

      const [updateResult] = await conn.execute(
        "UPDATE accounts SET password = ? WHERE account_id = ?",
        [hashedPassword, userId],
      );

      if (updateResult.affectedRows === 0) {
        throw new Error("Failed to update account password");
      }

      // 4️⃣ Insert professor profile
      await conn.execute(
        `
      INSERT INTO professors
      (account_id, prof_fn, prof_ln, prof_bd, prof_gender, prof_department)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
        [userId, f_name, l_name, birthdate, gender_initial, department],
      );

      await conn.commit();
      this.logger.info("Professor onboarding completed", { userId });
    } catch (err) {
      await conn.rollback();
      this.logger.error("Professor onboarding failed", { userId, error: err });
      throw err;
    } finally {
      conn.release();
    }
  }

  async getBySpaceId(space_id) {
    try {
      const [result] = await this.db.execute(
        `
            SELECT space_uuid, space_name, description, created_by
            FROM spaces
            WHERE space_id = ?
            LIMIT 1
            `,
        [space_id],
      );

      return result || [];
    } catch (err) {
      // await this.db.rollback();
      this.logger.error("Failed to get Space", { space_id });
      throw err;
    }
  }

  async createSpace(account_id, space_name, space_description) {
    try {
      const query = `INSERT INTO spaces (space_uuid, space_name, description, created_by, created_at) VALUES (UUID(), ?, ?, ?, NOW())`;
      const result = await this.db.execute(query, [
        space_name,
        space_description,
        account_id,
      ]);

      const [row] = await this.db.execute(
        "SELECT space_uuid FROM spaces WHERE space_id = ?",
        [result.insertId],
      );
      //   this.logger.info('Created Space', { space_name, space_description, account_id });

      return {
        success: true,
        space_uuid: row.space_uuid,
        insertId: result.insertId,
      };
    } catch (error) {
      this.logger.error("Error creating Space", {
        space_name,
        space_description,
        error,
      });
      throw error;
    }
  }

  async verify(email, password) {
    try {
      const result = await this.findByEmail(email);

      if (!result) return null;

      const { email: registered_email, role: registered_role } = result;

      console.log(registered_email);
      if (!registered_email) return null;

      //   this.logger.debug('Verifying user credentials', { email });
      const account = await this.db.execute(
        `
          SELECT account_id, password FROM accounts
          WHERE email = ?
        `,
        [registered_email],
      );

      const isValid = await verifyPassword(account[0].password, password);

      if (!isValid) {
        this.logger.warn("Invalid password", { email });
        return null;
      }

      // Check which hash method was used
      // let isValid;
      // if (storedHash.startsWith('$argon2')) {
      //   // Argon2 hash
      //   isValid = await verifyPassword(storedHash, password);
      // } else {
      //   // Assume bcrypt or other hash
      //   // You'll need to implement this based on your encryptPassword function
      //   isValid = await this.verifyLegacyPassword(password, storedHash);
      // }

      this.logger.info("User verification successful", {
        email,
        account_id: account[0].account_id,
      });

      return {
        account_id: account[0].account_id,
        role: registered_role,
      };
    } catch (err) {
      this.logger.error("Error verifying user", { email, error: err });
      throw err;
    }
  }

  async verifyLegacyPassword(password, storedHash) {
    // Implement your legacy password verification here
    // This depends on what encryptPassword() does
    const newHash = encryptPassword(password);
    return newHash === storedHash;
  }

  async get(account_id) {
    try {
      const [results] = await this.db.execute(
        `SELECT account_id, email FROM accounts WHERE account_id = ?`,
        [account_id],
      );

      //   if (results[0]) {
      //     this.logger.debug('Retrieved user info', { account_id });
      //   }

      return results[0] || null;
    } catch (err) {
      this.logger.error("Error getting user info", { account_id, error: err });
      throw err;
    }
  }

  async getAllSpaceInvitesByAccountId(account_id) {
    try {
      const results = await this.db.execute(
        `SELECT account_id, email FROM accounts WHERE account_id = ?`,
        [account_id],
      );

      return results[0] || null;
    } catch (err) {
      this.logger.error("Error getting user info", { account_id, error: err });
      throw err;
    }
  }

  async getUserStatus(account_id) {
    try {
      const status = await this.db.execute(
        `
            SELECT status 
            FROM accounts
            WHERE account_id = ?
            `,
        [account_id],
      );

      // this.logger.debug('Get User status', { account_id, status });
      return status;
    } catch (err) {
      this.logger.error("Error getting user status", { account_id, err });
      throw err;
    }
  }

  async updateUserStatus(account_id, status) {
    try {
      await this.db.execute(
        `UPDATE accounts SET status = ? WHERE account_id = ?`,
        [status, account_id],
      );

      //   this.logger.debug('Updated user status', { account_id, status });
    } catch (error) {
      this.logger.error("Error updating user status", {
        account_id,
        status,
        error,
      });
      throw error;
    }
  }

  // New method: Sync user to Supabase for collaboration features
  async syncToSupabase(account_id, role) {
    try {
      const user =
        (await this.findByAccountId(account_id, "student")) ||
        (await this.findByAccountId(account_id, "professor"));

      if (!user) {
        this.logger.warn("User not found for Supabase sync", { account_id });
        return false;
      }

      // This would be called from HybridDatabase syncUserToSupabase method
      return {
        id: account_id.toString(),
        email: user[0].email,
        username: user[0].full_name || user[0].email.split("@")[0],
        role: role || "student",
        avatar_url: user[0].profile_pic || null,
      };
    } catch (error) {
      this.logger.error("Error syncing user to Supabase", {
        account_id,
        error,
      });
      throw error;
    }
  }
}

class StudentFinder {
  constructor(db) {
    this.db = db;
    this.logger = new Logger("StudentFinder");
  }

  async findByAccountId(account_id) {
    try {
      const query = `
        SELECT 
          acc.account_id,
          acc.email,
          acc.profile_pic,
          st.student_fn,
          st.student_ln,
          st.student_bd AS birth_date,
          st.student_gender AS gender,
          st.student_course AS course,
          st.student_yr_lvl AS year_level,
          'student' as role
        FROM accounts AS acc
        LEFT JOIN students AS st ON st.account_id = acc.account_id
        WHERE acc.account_id = ?
        LIMIT 1
      `;

      const rows = await this.db.execute(query, [account_id]);

      //   if (rows[0]) {
      //     this.logger.debug('Found student by account ID', { account_id });
      //   }

      return rows || null;
    } catch (error) {
      this.logger.error("Error finding student by account ID", {
        account_id,
        error,
      });
      throw error;
    }
  }
}

class ProfessorFinder {
  constructor(db) {
    this.db = db;
    this.logger = new Logger("ProfessorFinder");
  }

  async findByAccountId(account_id) {
    try {
      // this.logger.debug('Found professor by account ID', { account_id });
      const query = `
        SELECT 
            acc.account_id,
            acc.email,
            acc.profile_pic,
            pr.prof_fn,
            pr.prof_ln,
            pr.prof_bd AS birth_date,
            pr.prof_gender AS gender,
            pr.prof_department AS department
        FROM accounts AS acc
        LEFT JOIN professors AS pr ON pr.account_id = acc.account_id
        WHERE acc.account_id = ?
        LIMIT 1
        `;

      // FIX: Use execute instead of query
      const rows = await this.db.execute(query, [account_id]);
      // this.logger.debug('Found professor by account ID', { rows });

      return rows || null;
    } catch (error) {
      this.logger.error("Error finding professor by account ID", {
        account_id,
        error,
      });
      throw error;
    }
  }
}

export default User;
