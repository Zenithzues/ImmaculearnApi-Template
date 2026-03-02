import { mysqlConnection } from "../../config/mysqlConnection.js";
import { Logger } from "../../utils/Logger.js";

class Announcement {
  constructor() {
    this.db = mysqlConnection;
    this.logger = new Logger("AnnouncementModel");
  }

  async createAnnouncement(title, content, target_audience = 'ALL', publish_option = 'NOW', scheduled_at = null, created_by) {
    const conn = await this.db.getConnection();

    try {
      await conn.beginTransaction();

      const announcementQuery = `INSERT INTO announcements(title, content, target_audience, publish_option, scheduled_at, is_published, created_by, created_at, updated_at) VALUES(?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`;

      const is_published = publish_option === 'NOW' ? 1 : 0;

      const result = await conn.execute(announcementQuery, [
        title,
        content,
        target_audience,
        publish_option,
        scheduled_at,
        is_published,
        created_by
      ]);

      await conn.commit();

      return result;
    } catch (err) {
      await conn.rollback();
      this.logger.error("Error Creating Announcement", { title, content, target_audience, publish_option, created_by, err });
      throw err;
    } finally {
      conn.release();
    }
  }

  async getAnnouncements(limit = 10, offset = 0, target_audience = null) {
    const conn = await this.db.getConnection();

    try {
      let query = `SELECT * FROM announcements WHERE is_published = 1`;
      const params = [];

      if (target_audience && target_audience !== 'ALL') {
        query += ` AND (target_audience = ? OR target_audience = 'ALL')`;
        params.push(target_audience);
      }

      query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const [rows] = await conn.execute(query, params);
      return rows;
    } catch (err) {
      this.logger.error("Error Getting Announcements", { target_audience, err });
      throw err;
    } finally {
      conn.release();
    }
  }

  async getAnnouncementById(announce_id) {
    const conn = await this.db.getConnection();

    try {
      const query = `SELECT * FROM announcements WHERE announce_id = ?`;
      const [rows] = await conn.execute(query, [announce_id]);
      return rows[0] || null;
    } catch (err) {
      this.logger.error("Error Getting Announcement by ID", { announce_id, err });
      throw err;
    } finally {
      conn.release();
    }
  }

  async updateAnnouncement(announce_id, title, content, target_audience, publish_option, scheduled_at) {
    const conn = await this.db.getConnection();

    try {
      await conn.beginTransaction();

      const is_published = publish_option === 'NOW' ? 1 : 0;

      const query = `UPDATE announcements SET title = ?, content = ?, target_audience = ?, publish_option = ?, scheduled_at = ?, is_published = ?, updated_at = NOW() WHERE announce_id = ?`;

      const result = await conn.execute(query, [
        title,
        content,
        target_audience,
        publish_option,
        scheduled_at,
        is_published,
        announce_id
      ]);

      await conn.commit();

      return result;
    } catch (err) {
      await conn.rollback();
      this.logger.error("Error Updating Announcement", { announce_id, title, content, err });
      throw err;
    } finally {
      conn.release();
    }
  }

  async deleteAnnouncement(announce_id) {
    const conn = await this.db.getConnection();

    try {
      await conn.beginTransaction();

      const query = `DELETE FROM announcements WHERE announce_id = ?`;
      const result = await conn.execute(query, [announce_id]);

      await conn.commit();

      return result;
    } catch (err) {
      await conn.rollback();
      this.logger.error("Error Deleting Announcement", { announce_id, err });
      throw err;
    } finally {
      conn.release();
    }
  }

  
}

export default Announcement;
