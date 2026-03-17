import crypto from "crypto";
// import { connection } from '../../config/MySQLConnection.js';
import { Logger } from "../../utils/Logger.js";
import { mysqlConnection } from "../../config/mysqlConnection.js";
// import { mysqlConnection } from '../../config/mysqlConnection.js';

export class UserToken {
  constructor() {
    this.db = mysqlConnection;
    this.logger = new Logger("UserToken");
  }

  // Create a new refresh token and store in DB
  async create(userId, hashedRefresh) {
    try {
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days

      this.logger.debug("Creating user token", { userId, expiresAt });

      const result = await this.db.execute(
        "INSERT INTO tokens (account_id, refresh_token, expires_at, created_at) VALUES (?, ?, ?, NOW())",
        [userId, hashedRefresh, expiresAt],
      );

      this.logger.info("User token created", {
        userId,
        token_id: result.insertId,
      });

      return {
        token_id: result.insertId,
        userId,
        refreshTokenHash: hashedRefresh,
        expiresAt,
        createdAt: new Date(),
      };
    } catch (error) {
      this.logger.error("Error creating user token", { userId, error });
      throw error;
    }
  }

  async adminCreate(admin_id, hashedRefresh) {
    try {
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days

      this.logger.debug("Creating user token", { admin_id, expiresAt });

      const result = await this.db.execute(
        "INSERT INTO tokens (admin_id, refresh_token, expires_at, created_at) VALUES (?, ?, ?, NOW())",
        [admin_id, hashedRefresh, expiresAt],
      );

      this.logger.info("User token created", {
        admin_id,
        token_id: result.insertId,
      });

      return {
        token_id: result.insertId,
        admin_id,
        refreshTokenHash: hashedRefresh,
        expiresAt,
        createdAt: new Date(),
      };
    } catch (error) {
      this.logger.error("Error creating user token", { admin_id, error });
      throw error;
    }
  }

  async findByUserId(userId) {
    try {
      const [rows] = await this.db.execute(
        "SELECT * FROM tokens WHERE account_id = ? LIMIT 1",
        [userId],
      );

      if (rows) {
        this.logger.debug("Found token by user ID", { userId });
      }

      return rows || null;
    } catch (error) {
      this.logger.error("Error finding token by user ID", { userId, error });
      throw error;
    }
  }

  async findByAdminId(admin_id) {
    try {
      const [rows] = await this.db.execute(
        "SELECT * FROM tokens WHERE admin_id = ? LIMIT 1",
        [admin_id],
      );

      if (rows) {
        this.logger.debug("Found token by admin ID", { admin_id });
      }

      return rows || null;
    } catch (error) {
      this.logger.error("Error finding token by admin ID", { admin_id, error });
      throw error;
    }
  }

  async update(userId, hashedRefresh) {
    try {
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days
      console.log(hashedRefresh, userId);
      const result = await this.db.execute(
        `UPDATE tokens SET refresh_token = ?, expires_at = ? WHERE account_id = ?`,
        [hashedRefresh, expiresAt, userId],
      );

      this.logger.debug("Updated user token", { userId });

      return result;
    } catch (error) {
      this.logger.error("Error updating user token", { userId, error });
      throw error;
    }
  }

  async adminUpdate(admin_id, hashedRefresh) {
    try {
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days
      console.log(hashedRefresh, admin_id);
      const result = await this.db.execute(
        `UPDATE tokens SET refresh_token = ?, expires_at = ? WHERE admin_id = ?`,
        [hashedRefresh, expiresAt, admin_id],
      );

      this.logger.debug("Updated user token", { admin_id });

      return result;
    } catch (error) {
      this.logger.error("Error updating user token", { admin_id, error });
      throw error;
    }
  }

  async findByRefresh(refreshToken) {
    try {
      // Ensure database is connected
      await this.db.ensureConnected();

      const query = `SELECT * FROM tokens WHERE refresh_token = ?`;
      const result = await this.db.execute(query, [refreshToken]);
      const rows = result[0] || result; // Handle different MySQL driver formats

      return Array.isArray(rows) ? rows[0] : rows;
    } catch (error) {
      this.logger.error("Error finding token by refresh token", { error });
      throw error;
    }
  }

  async invalidate(token_id) {
    try {
      await this.db.execute(
        "UPDATE tokens SET refresh_token = NULL, expires_at = NOW() WHERE token_id = ?",
        [token_id],
      );

      this.logger.info("Token invalidated", { token_id });
    } catch (error) {
      this.logger.error("Error invalidating token", { token_id, error });
      throw error;
    }
  }

  async invalidateByUserId(userId) {
    try {
      await this.db.execute(
        "UPDATE tokens SET refresh_token = NULL, expires_at = NOW() WHERE account_id = ?",
        [userId],
      );

      this.logger.info("All tokens invalidated for user", { userId });
    } catch (error) {
      this.logger.error("Error invalidating tokens by user ID", {
        userId,
        error,
      });
      throw error;
    }
  }

  async cleanupExpiredTokens() {
    try {
      const [result] = await this.db.execute(
        "DELETE FROM tokens WHERE expires_at < NOW()",
      );

      if (result.affectedRows > 0) {
        this.logger.info("Cleaned up expired tokens", {
          count: result.affectedRows,
        });
      }

      return result.affectedRows;
    } catch (error) {
      this.logger.error("Error cleaning up expired tokens", { error });
      throw error;
    }
  }

  async getActiveTokenCount(userId) {
    try {
      const [rows] = await this.db.execute(
        `SELECT COUNT(*) as count FROM tokens 
         WHERE account_id = ? AND expires_at > NOW()`,
        [userId],
      );

      return rows[0]?.count || 0;
    } catch (error) {
      this.logger.error("Error getting active token count", { userId, error });
      throw error;
    }
  }
}
