import { mysqlConnection } from '../../config/mysqlConnection.js';
import { Logger } from '../../utils/Logger.js';

class FileModel {
  constructor() {
    this.db = mysqlConnection;
    this.logger = new Logger('FileModel');
  }





  // Create a new file record
  async create_file({ space_id, owner_id, filename, content, path, cld_url, public_id, mimetype, size, status }) {
        try {
          const result = await this.db.execute(
      `INSERT INTO files (
        file_uuid, space_id, owner_id, filename, content, path,
        cld_url, public_id, mimetype, size, status, created_at
      )
      VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [space_id ?? null, owner_id ?? null, filename ?? null, content ?? null, path ?? null, cld_url ?? null, public_id ?? null, mimetype ?? null, size ?? 0, status ?? 'local']
    );


          const row = await this.db.execute(
            `
            SELECT file_uuid FROM files
            WHERE file_id = ?
            `, [result.insertId]
          )


          this.logger.info('File record created', { fileId: result.insertId });

          return {
            file_id: result.insertId,
            fuuid : row[0].file_uuid,
            created_at: new Date(),
          };
        } catch (error) {
          this.logger.error('Error creating file record', { error });
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
        'UPDATE files SET content = ?, status = ? WHERE file_id = ?',
        [content, 'drafted', fileId]
    );
  }



  async updateCloudInfo(fileId, { cloud_url, public_id, status, size }) {
    try {
        await this.db.execute(
            'UPDATE files SET cld_url = ?, public_id = ?, size = ?, status = ? WHERE file_id = ?',
            [cloud_url, public_id, size, status, fileId]
        );
        this.logger.info('File updated after Cloudinary upload', { fileId, cloud_url, status });
        return true;
    } catch (error) {
        this.logger.error('Error updating file after Cloudinary upload', { fileId, error });
        throw error;
    }
}


  async markAsUploaded(fileId, cloudUrl) {
    try {
        await this.db.execute(
        'UPDATE files SET cloud_url = ?, is_uploaded = 1 WHERE file_id = ?',
        [cloudUrl, fileId]
        );
        this.logger.info('File uploaded to Cloudinary', { fileId, cloudUrl });
        return true;
    } catch (error) {
        this.logger.error('Error updating file after Cloudinary upload', { fileId, error });
        throw error;
    }
  }

  // Get a file by ID
  async findById(fileId) {
    try {
      const rows = await this.db.execute(
        'SELECT * FROM files WHERE file_id = ? LIMIT 1',
        [fileId]
      );
      return rows[0] || null;
    } catch (error) {
      this.logger.error('Error fetching file by ID', { fileId, error });
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
        `,[space_id]
      );
      return rows;
    } catch (error) {
      this.logger.error('Error fetching all files', { error });
      throw error;
    }
  }

  // Delete file by ID
  async delete(fileId) {
    try {
      await this.db.execute('DELETE FROM files WHERE file_id = ?', [fileId]);
      this.logger.info('File deleted', { fileId });
      return true;
    } catch (error) {
      this.logger.error('Error deleting file', { fileId, error });
      return false;
    }
  }
}


export default FileModel;