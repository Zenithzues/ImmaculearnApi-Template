import { mysqlConnection } from "../../config/mysqlConnection.js";
import { Logger } from "../../utils/Logger.js";

class Announcement {
  constructor() {
    this.db = mysqlConnection;
    this.logger = new Logger("AnnouncementModel");
  }

  // ✅ CREATE ANNOUNCEMENT
  async createAnnouncement(
    title,
    content,
    target_audience = "ALL",
    created_by,
    imageUrls,
  ) {
    const conn = await this.db.getConnection();

    try {
      await conn.beginTransaction();

      const query = `
        INSERT INTO announcements
        (title, content, target_audience, is_published, created_by, created_at, updated_at)
        VALUES (?, ?, ?, 1, ?, NOW(), NOW())
      `;

      const result = await conn.execute(query, [
        title,
        content,
        target_audience,
        created_by,
      ]);

      console.log(result);

      const announce_id = result[0].insertId;

      // save images if uploaded
      if (imageUrls && imageUrls.length > 0) {
        const imageQuery = `
          INSERT INTO announcement_images (announce_id, image_url, created_at)
          VALUES (?, ?, NOW())
        `;

        for (const file of imageUrls) {
          await conn.execute(imageQuery, [announce_id, file]);
        }
      }

      await conn.commit();
      return result;
    } catch (err) {
      await conn.rollback();
      this.logger.error("Error Creating Announcement", {
        title,
        target_audience,
        created_by,
        err,
      });
      throw err;
    } finally {
      conn.release();
    }
  }

  // ✅ GET LATEST 10 ANNOUNCEMENTS
  async getAnnouncements(target_audience = null) {
    const conn = await this.db.getConnection();

    try {
      let query = `
        SELECT a.*
        FROM announcements a
        WHERE a.is_published = 1
      `;

      const params = [];

      if (target_audience && target_audience !== "ALL") {
        query += ` AND (a.target_audience = ? OR a.target_audience = 'ALL')`;
        params.push(target_audience);
      }

      query += ` ORDER BY a.announce_id DESC LIMIT 10`;

      const [announcements] = await conn.execute(query, params);

      // Get images for each announcement separately
      for (const announcement of announcements) {
        const imageQuery = `
          SELECT image_url
          FROM announcement_images
          WHERE announce_id = ?
          ORDER BY image_id ASC
        `;
        
        const [images] = await conn.execute(imageQuery, [announcement.announce_id]);
        announcement.images = images.map(img => img.image_url);
      }

      return announcements;
    } catch (err) {
      this.logger.error("Error Getting Announcements", {
        target_audience,
        err,
      });
      throw err;
    } finally {
      conn.release();
    }
  }

  // ✅ GET SINGLE ANNOUNCEMENT
  async getAnnouncementById(announce_id) {
    const conn = await this.db.getConnection();

    try {
      const query = `
        SELECT *
        FROM announcements
        WHERE announce_id = ?
      `;

      const [rows] = await conn.execute(query, [announce_id]);
      return rows[0] || null;
    } catch (err) {
      this.logger.error("Error Getting Announcement By ID", {
        announce_id,
        err,
      });
      throw err;
    } finally {
      conn.release();
    }
  }

  // ✅ UPDATE ANNOUNCEMENT
  async updateAnnouncement(announce_id, title, content, target_audience) {
    const conn = await this.db.getConnection();

    try {
      await conn.beginTransaction();

      const query = `
        UPDATE announcements
        SET title = ?,
            content = ?,
            target_audience = ?,
            updated_at = NOW()
        WHERE announce_id = ?
      `;

      const [result] = await conn.execute(query, [
        title,
        content,
        target_audience,
        announce_id,
      ]);

      await conn.commit();
      return result;
    } catch (err) {
      await conn.rollback();
      this.logger.error("Error Updating Announcement", {
        announce_id,
        err,
      });
      throw err;
    } finally {
      conn.release();
    }
  }

  // GET STUDENT ANNOUNCEMENTS
  async getStudentAnnouncements() {
    const conn = await this.db.getConnection();

    try {
      const query = `
        SELECT *
        FROM announcements
        WHERE is_published = 1 
        AND (target_audience = 'STUDENTS' OR target_audience = 'ALL')
        ORDER BY announce_id DESC 
        LIMIT 10
      `;

      const [announcements] = await conn.execute(query);

      // Get images for each announcement
      for (const announcement of announcements) {
        const imageQuery = `
          SELECT image_url
          FROM announcement_images
          WHERE announce_id = ?
          ORDER BY image_id ASC
        `;
        
        const [images] = await conn.execute(imageQuery, [announcement.announce_id]);
        announcement.images = images.map(img => img.image_url);
      }

      return announcements;
    } catch (err) {
      this.logger.error("Error Getting Student Announcements", { err });
      throw err;
    } finally {
      conn.release();
    }
  }

  // GET PROFESSOR ANNOUNCEMENTS
  async getProfessorAnnouncements() {
    const conn = await this.db.getConnection();

    try {
      const query = `
        SELECT *
        FROM announcements
        WHERE is_published = 1 
        AND (target_audience = 'TEACHERS' OR target_audience = 'ALL')
        ORDER BY announce_id DESC 
        LIMIT 10
      `;

      const [announcements] = await conn.execute(query);

      // Get images for each announcement
      for (const announcement of announcements) {
        const imageQuery = `
          SELECT image_url
          FROM announcement_images
          WHERE announce_id = ?
          ORDER BY image_id ASC
        `;
        
        const [images] = await conn.execute(imageQuery, [announcement.announce_id]);
        announcement.images = images.map(img => img.image_url);
      }

      return announcements;
    } catch (err) {
      this.logger.error("Error Getting Professor Announcements", { err });
      throw err;
    } finally {
      conn.release();
    }
  }

  // DELETE ANNOUNCEMENT
  async deleteAnnouncement(announce_id) {
    const conn = await this.db.getConnection();

    try {
      await conn.beginTransaction();

      const query = `
        DELETE FROM announcements
        WHERE announce_id = ?
      `;

      const [result] = await conn.execute(query, [announce_id]);

      await conn.commit();
      return result;
    } catch (err) {
      await conn.rollback();
      this.logger.error("Error Deleting Announcement", {
        announce_id,
        err,
      });
      throw err;
    } finally {
      conn.release();
    }
  }
}

export default Announcement;
