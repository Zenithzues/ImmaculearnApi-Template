import { mysqlConnection } from "../../config/mysqlConnection.js";
import { verifyPassword } from "../../utils/argonUtil.js";
import { Logger } from "../../utils/Logger.js";

class AdminModel {
  constructor() {
    this.db = mysqlConnection;
    this.logger = new Logger("AdminModel");
  }

  async findByAdminId(admin_id) {
    try {
      const admin = await this.db.execute(
        `
          SELECT admin_fullname, admin_email FROM admin_account
          WHERE admin_id = ?
        `,
        [admin_id],
      );

      return admin[0];
    } catch (error) {
      this.logger.error("Error finding user by account ID", {
        account_id,
        role,
        error,
      });
      throw error;
    }
  }

  async verify(email, password) {
    try {
      //   this.logger.debug('Verifying user credentials', { email });
      const admin = await this.db.execute(
        `
            SELECT admin_id, admin_password FROM admin_account
            WHERE admin_email = ?
          `,
        [email],
      );

      const isValid = await verifyPassword(admin[0].admin_password, password);

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
        account_id: admin[0].admin_id,
      });

      return admin[0];
    } catch (err) {
      this.logger.error("Error verifying user", { email, error: err });
      throw err;
    }
  }

  async getLatestAcademicTerm() {
    const result = await this.db.execute(
      `
        SELECT *
        FROM academic_term
        WHERE academic_status = "active"
        ORDER BY created_at DESC
        LIMIT 1;
      `,
    );

    return result[0];
  }

  async getAllAcademic() {
    const result = await this.db.execute(
      `
        SELECT *
        FROM academic_term
      `,
    );

    return result;
  }

  async createAcademic(admin_id, period, semester, year) {
    const conn = await this.db.getConnection();

    try {
      await conn.beginTransaction();

      await this.db.execute(
        `
        INSERT INTO academic_term(acad_term_name, semester, academic_year, academic_status, created_by, created_at)
        VALUES (?, ?, ?, "active", ?, NOW())
        `,
        [period, semester, year, admin_id],
      );

      await conn.commit();

      return true;
    } catch (err) {
      await conn.rollback();
      this.logger.error("Creating Academic failed", { admin_id, error: err });
      throw err;
    } finally {
      conn.release();
    }
  }

  async closeAcademic(admin_id, acad_term_id) {
    const conn = await this.db.getConnection();

    try {
      await conn.beginTransaction();

      await this.db.execute(
        `
        UPDATE academic_term
        SET academic_status = "completed", updated_at = NOW();
        WHERE acad_term_id = ? AND created_by = ?
        `,
        [acad_term_id, admin_id],
      );

      await conn.commit();

      return true;
    } catch (err) {
      await conn.rollback();
      this.logger.error("Creating Academic failed", { admin_id, error: err });
      throw err;
    } finally {
      conn.release();
    }
  }
}

export default AdminModel;
