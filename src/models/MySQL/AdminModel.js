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
        WHERE end IS NULL
        ORDER BY start DESC
        LIMIT 1;
      `,
    );

    return result[0];
  }
}

export default AdminModel;
