import { mysqlConnection } from "../../config/mysqlConnection.js";
import { Logger } from "../../utils/Logger.js";

class AcademicModel {
  constructor() {
    this.db = mysqlConnection;
    this.logger = new Logger("AcademicModel");
  }

  // Get latest academic term
  async getLatestAcademic() {
    try {
      const rows = await this.db.query(`
        SELECT * FROM academic_term
        ORDER BY created_at DESC
        LIMIT 1
      `);
      return rows.length ? rows[0] : null;
    } catch (err) {
      this.logger.error("Error fetching latest academic term", err);
      throw err;
    }
  }

  // Get active academic term
  async getActiveAcademic() {
    try {
      const rows = await this.db.query(`
        SELECT * FROM academic_term
        WHERE academic_status = 'active'
        ORDER BY created_at DESC
        LIMIT 1
      `);
      return rows.length ? rows[0] : null;
    } catch (err) {
      this.logger.error("Error fetching active academic term", err);
      throw err;
    }
  }

  // Get all academic terms
  async getAllAcademic() {
    try {
      const rows = await this.db.query(`
        SELECT * FROM academic_term
        ORDER BY created_at DESC
      `);
      return rows;
    } catch (err) {
      this.logger.error("Error fetching all academic terms", err);
      throw err;
    }
  }

  // Create new academic term (auto complete previous active)
  async createAcademicTerm(data) {
    const connection = await this.db.getConnection();

    try {
      await connection.beginTransaction();

      // If new term is active → complete previous active
      if (data.academic_status === "active") {
        await connection.query(`
          UPDATE academic_term
          SET academic_status = 'completed'
          WHERE academic_status = 'active'
        `);
      }

      const [result] = await connection.query(
        `
        INSERT INTO academic_term
        (acad_term_name, semester, academic_year, academic_status, created_by)
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          data.acad_term_name,
          data.semester,
          data.academic_year,
          data.academic_status || "active",
          data.created_by,
        ],
      );

      await connection.commit();
      return result.insertId;
    } catch (err) {
      await connection.rollback();
      this.logger.error("Error creating academic term", err);
      throw err;
    } finally {
      connection.release();
    }
  }

  // Update academic term
  async updateAcademicTerm(id, data) {
    const connection = await this.db.getConnection();

    try {
      await connection.beginTransaction();

      // If setting to active → complete others
      if (data.academic_status === "active") {
        await connection.query(`
          UPDATE academic_term
          SET academic_status = 'completed'
          WHERE academic_status = 'active'
        `);
      }

      await connection.query(
        `
        UPDATE academic_term
        SET acad_term_name = ?,
            semester = ?,
            academic_year = ?,
            academic_status = ?,
            updated_at = NOW()
        WHERE acad_term_id = ?
        `,
        [
          data.acad_term_name,
          data.semester,
          data.academic_year,
          data.academic_status,
          id,
        ],
      );

      await connection.commit();
      return true;
    } catch (err) {
      await connection.rollback();
      this.logger.error("Error updating academic term", err);
      throw err;
    } finally {
      connection.release();
    }
  }
}

export default AcademicModel;
