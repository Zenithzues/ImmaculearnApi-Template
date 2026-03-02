import { mysqlConnection } from "../../config/mysqlConnection.js";
import { Logger } from "../../utils/Logger.js";

class FileModel {
  constructor() {
    this.db = mysqlConnection;
    this.logger = new Logger("FileModel");
  }

  async createLesson(
    acad_term_id,
    c_space_id = null,
    space_id = null,
    lesson_name,
  ) {
    const connection = await this.db.getConnection();

    try {
      await connection.beginTransaction();

      // Validation
      if (!lesson_name || !acad_term_id || (!c_space_id && !space_id)) {
        throw new Error(
          "Invalid parameters: lesson_name, acad_term_id, and either c_space_id or space_id are required.",
        );
      }

      // Insert lesson
      const sql = `
      INSERT INTO lessons
        (acad_term_id, c_space_id, space_id, lesson_name, created_at)
      VALUES (?, ?, ?, ?, NOW())
    `;
      const params = [acad_term_id, c_space_id, space_id, lesson_name];

      const [result] = await connection.execute(sql, params);

      await connection.commit();

      // Return the newly created lesson ID
      return result.insertId;
    } catch (err) {
      await connection.rollback();
      this.logger.error("Error Creating Lesson", { err });
      throw err;
    } finally {
      connection.release();
    }
  }

  async createFile(
    c_space_id = null,
    space_id = null,
    lesson_id,
    orig_file_name,
    storage_path,
    file_url,
    file_size,
    file_mimetype,
  ) {
    const connection = await this.db.getConnection();

    try {
      await connection.beginTransaction();

      if (!lesson_id || !orig_file_name || !file_url || !file_size) {
        throw new Error(
          "Invalid parameters: lesson_id, orig_file_name, file_url, and file_size are required.",
        );
      }

      const sql = `
      INSERT INTO files
        (c_space_id, space_id, lesson_id, orig_file_name, storage_path, file_url, file_size, file_mimetype, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

      // If you have account_id or acad_term_id, make sure to pass them
      // For now, assuming owner_id and acad_term_id need to be passed from context

      const params = [
        c_space_id,
        space_id,
        lesson_id,
        orig_file_name,
        storage_path, // Supabase path
        file_url, // public URL (same here; you can separate if needed)
        file_size,
        file_mimetype,
      ];

      const [result] = await connection.execute(sql, params);

      await connection.commit();

      // Return the newly created file ID
      return result.insertId;
    } catch (err) {
      await connection.rollback();
      this.logger.error("Error Creating File", { err });
      throw err;
    } finally {
      connection.release();
    }
  }

  async listResourcesBySpaceId(space_id) {
    try {
      const result = await this.db.execute(
        `
        SELECT 
          l.lesson_id,
          l.lesson_name,
          l.created_at,
          f.file_id,
          f.orig_file_name AS file_name,
          f.file_url,
          f.file_size, 
          f.file_mimetype
        FROM lessons l
        LEFT JOIN files f
          ON f.lesson_id = l.lesson_id
        WHERE l.space_id = ?
        ORDER BY l.created_at DESC
        `,
        [space_id],
      );
      return result;
    } catch (err) {
      this.logger.error("Error getting resources ", { err });
      throw err;
    }
  }

  async listResourcesByCourseSpaceId(c_space_id) {
    try {
      const result = await this.db.execute(
        `
        SELECT 
          l.lesson_id,
          l.lesson_name,
          l.created_at,
          f.file_id,
          f.orig_file_name AS file_name,
          f.file_url,
          f.file_size, 
          f.file_mimetype
        FROM lessons l
        LEFT JOIN files f
          ON f.lesson_id = l.lesson_id
        WHERE l.c_space_id = ?
        ORDER BY l.created_at DESC
        `,
        [c_space_id],
      );
      return result;
    } catch (err) {
      this.logger.error("Error getting resources ", { err });
      throw err;
    }
  }

  async getFileByIdAndLesson(file_id, lesson_id) {
    try {
      const sql = `
      SELECT 
        f.file_id,
        f.storage_path,
        COALESCE(s.created_by, cs.created_by) AS owner_id
      FROM files f
      INNER JOIN lessons l 
        ON l.lesson_id = f.lesson_id
      LEFT JOIN spaces s 
        ON s.space_id = f.space_id
      LEFT JOIN course_spaces cs 
        ON cs.c_space_id = f.c_space_id
      WHERE f.file_id = ? 
        AND f.lesson_id = ?
      LIMIT 1
    `;

      const rows = await this.db.execute(sql, [file_id, lesson_id]);

      return rows.length ? rows[0] : null;
    } catch (err) {
      this.logger.error("Error fetching file", { err });
      throw err;
    }
  }

  async deleteLesson(lesson_id) {
    const sql = `
    DELETE FROM lessons
    WHERE lesson_id = ?
  `;
    await this.db.execute(sql, [lesson_id]);
  }

  // Create a new file record
  async create_file({
    space_id,
    owner_id,
    filename,
    content,
    path,
    cld_url,
    public_id,
    mimetype,
    size,
    status,
  }) {
    try {
      const result = await this.db.execute(
        `INSERT INTO files (
        file_uuid, space_id, owner_id, filename, content, path,
        cld_url, public_id, mimetype, size, status, created_at
      )
      VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          space_id ?? null,
          owner_id ?? null,
          filename ?? null,
          content ?? null,
          path ?? null,
          cld_url ?? null,
          public_id ?? null,
          mimetype ?? null,
          size ?? 0,
          status ?? "local",
        ],
      );

      const row = await this.db.execute(
        `
            SELECT file_uuid FROM files
            WHERE file_id = ?
            `,
        [result.insertId],
      );

      this.logger.info("File record created", { fileId: result.insertId });

      return {
        file_id: result.insertId,
        fuuid: row[0].file_uuid,
        created_at: new Date(),
      };
    } catch (error) {
      this.logger.error("Error creating file record", { error });
      throw error;
    }
  }

  // async create({ space_id, owner_id, group_id, filename, content, path, cld_url, public_id, mimetype, size, status }) {
  //   try {
  //     const result = await this.db.execute(
  //       `INSERT INTO files (file_uuid, space_id, owner_id, group_id, filename, content, path, cld_url, public_id, mimetype, size, status, created_at)
  //        VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
  //       [space_id, owner_id, group_id, filename, content, path, cld_url, public_id, mimetype, size, status]
  //     );

  //     const row = await this.db.execute(
  //       `
  //       SELECT file_uuid FROM files
  //       WHERE file_id = ?
  //       `, [result.insertId]
  //     )

  //     this.logger.info('File record created', { fileId: result.insertId });

  //     return {
  //       file_id: result.insertId,
  //       fuuid : row[0].file_uuid,
  //       created_at: new Date(),
  //     };
  //   } catch (error) {
  //     this.logger.error('Error creating file record', { error });
  //     throw error;
  //   }
  // }

  async saveDraft(fileId, content) {
    // just update DB
    await this.db.execute(
      "UPDATE files SET content = ?, status = ? WHERE file_id = ?",
      [content, "drafted", fileId],
    );
  }

  async updateCloudInfo(fileId, { cloud_url, public_id, status, size }) {
    try {
      await this.db.execute(
        "UPDATE files SET cld_url = ?, public_id = ?, size = ?, status = ? WHERE file_id = ?",
        [cloud_url, public_id, size, status, fileId],
      );
      this.logger.info("File updated after Cloudinary upload", {
        fileId,
        cloud_url,
        status,
      });
      return true;
    } catch (error) {
      this.logger.error("Error updating file after Cloudinary upload", {
        fileId,
        error,
      });
      throw error;
    }
  }

  async markAsUploaded(fileId, cloudUrl) {
    try {
      await this.db.execute(
        "UPDATE files SET cloud_url = ?, is_uploaded = 1 WHERE file_id = ?",
        [cloudUrl, fileId],
      );
      this.logger.info("File uploaded to Cloudinary", { fileId, cloudUrl });
      return true;
    } catch (error) {
      this.logger.error("Error updating file after Cloudinary upload", {
        fileId,
        error,
      });
      throw error;
    }
  }

  // Get a file by ID
  async findById(fileId) {
    try {
      const rows = await this.db.execute(
        "SELECT * FROM files WHERE file_id = ? LIMIT 1",
        [fileId],
      );
      return rows[0] || null;
    } catch (error) {
      this.logger.error("Error fetching file by ID", { fileId, error });
      throw error;
    }
  }

  // Get all files
  async findAllBySpaceId(space_id) {
    try {
      const rows = await this.db.execute(
        `SELECT * FROM files
        WHERE space_id = ? 
        ORDER BY created_at DESC
        `,
        [space_id],
      );
      return rows;
    } catch (error) {
      this.logger.error("Error fetching all files", { error });
      throw error;
    }
  }

  // Delete file by ID
  async delete(fileId) {
    try {
      await this.db.execute("DELETE FROM files WHERE file_id = ?", [fileId]);
      this.logger.info("File deleted", { fileId });
      return true;
    } catch (error) {
      this.logger.error("Error deleting file", { fileId, error });
      return false;
    }
  }
}

export default FileModel;
