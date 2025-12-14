import crypto from 'crypto';
import { connection } from '../core/database.js';

export class UserToken {
  constructor() {
    this.db = connection; // store DB connection or pool
  }

  // Create a new refresh token and store in DB
  async create(userId, refreshToken) {
    console.log(refreshToken)
    console.log(userId)
    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days

    console.log(expiresAt)

    const [result] = await this.db.execute(
      'INSERT INTO tokens (user_id, refresh_token, expires_at) VALUES (?, ?, ?)',
      [userId, hash, expiresAt]
    );

    return {
      id: result.insertId,
      userId,
      refreshTokenHash: hash,
      expiresAt,
      createdAt: new Date()
    };
  }

  async findByUserId(userId) {
    const [rows] = await this.db.execute(
        'SELECT * FROM tokens WHERE user_id = ? LIMIT 1',
        [userId]
    );
    return rows[0] || null;
  }

  async update(userId, refreshToken) {
    const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days
    return await this.db.query(
        `
        UPDATE tokens
        SET refresh_token = ?, expires_at = ?
        WHERE user_id = ?
        `,
        [hashedToken, expiresAt, userId]
    );
  }




  // Find a valid refresh token by hash
  async findByHash(hash) {
    console.log(hash)
    const [rows] = await this.db.execute(
      'SELECT * FROM tokens WHERE refresh_token = "GdSx4RNMhNFmI586YejCv5PFQJsYxExYA3eIZU_EzHI"'
    );

    console.log(rows)

    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      refreshTokenHash: row.refresh_token,
      expiresAt: row.expires_at,
      createdAt: row.created_at
    };
  }

  // Invalidate a token by ID (instead of deleting)
  async invalidate(id) {
    await this.db.execute(
      'UPDATE tokens SET refresh_token = NULL, expires_at = NOW() WHERE id = ?',
      [id]
    );
  }

  // Invalidate all tokens for a user (logout)
  async invalidateByUserId(userId) {
    await this.db.execute(
      'UPDATE tokens SET refresh_token = NULL, expires_at = NOW() WHERE user_id = ?',
      [userId]
    );
  }
}
