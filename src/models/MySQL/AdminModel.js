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
          SELECT admin_id, admin_fullname, admin_email FROM admin_account
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

      // Check if admin exists
      if (!admin || admin.length === 0) {
        this.logger.warn("Admin not found", { email });
        return null;
      }

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
        SELECT 
        acad_term_id AS academic_id,
        acad_term_name AS academic_period, 
        semester AS academic_semester, 
        academic_year, academic_status, 
        created_by, 
        updated_at, 
        created_at
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

  async updateAcademic(
    admin_id,
    acad_term_id,
    academic_period = null,
    academic_semester = null,
    academic_year = null,
    academic_status = null,
  ) {
    const conn = await this.db.getConnection();

    try {
      await conn.beginTransaction();

      const fields = [];
      const values = [];

      if (academic_period !== null) {
        fields.push("acad_term_name = ?");
        values.push(academic_period);
      }

      if (academic_semester !== null) {
        fields.push("semester = ?");
        values.push(academic_semester);
      }

      if (academic_year !== null) {
        fields.push("academic_year = ?");
        values.push(academic_year);
      }

      if (academic_status !== null) {
        fields.push("academic_status = ?");
        values.push(academic_status);
      }

      // Always update timestamp
      fields.push("updated_at = NOW()");

      // 🚨 Nothing to update
      if (fields.length === 1) {
        throw new Error("No fields provided to update");
      }

      const sql = `
      UPDATE academic_term
      SET ${fields.join(", ")}
      WHERE acad_term_id = ? AND created_by = ?
    `;

      values.push(acad_term_id, admin_id);

      const [result] = await conn.execute(sql, values);

      if (result.affectedRows === 0) {
        throw new Error("Academic term not found or unauthorized");
      }

      await conn.commit();
      return true;
    } catch (err) {
      await conn.rollback();
      this.logger.error("Updating Academic failed", { admin_id, error: err });
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
