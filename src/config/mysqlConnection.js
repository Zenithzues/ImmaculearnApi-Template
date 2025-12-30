// src/config/mysqlConnection.js
import mysql from 'mysql2/promise';
import { Logger } from '../utils/Logger.js';

export class MySQLConnection {
  constructor() {
    this.logger = new Logger('MySQL');
    this.pool = null;
    this.isConnected = false;
    this.connectionPromise = null; // Store the connection promise
  }

  async connect() {
    // If already connecting, return the existing promise
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = (async () => {
      try {
        this.pool = mysql.createPool({
          host: process.env.MYSQLHOST,
          user: process.env.MYSQLUSER,
          password: process.env.MYSQLPASSWORD,
          database: process.env.MYSQLDATABASE,
          port: process.env.MYSQLPORT || 3306,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
          idleTimeout: 60000,
          enableKeepAlive: true,
          keepAliveInitialDelay: 0
        });

        // Test connection
        const connection = await this.pool.getConnection();
        const [rows] = await connection.query('SELECT 1 as connected');
        connection.release();

        this.isConnected = true;
        this.logger.info('MySQL connected successfully');
        
        return this;
      } catch (error) {
        this.logger.error('Failed to connect to MySQL:', error);
        this.connectionPromise = null; // Reset on error
        throw error;
      }
    })();

    return this.connectionPromise;
  }

  async ensureConnected() {
    if (!this.isConnected && !this.connectionPromise) {
      await this.connect();
    } else if (this.connectionPromise) {
      await this.connectionPromise;
    }
    return this;
  }

  async query(sql, params = []) {
    await this.ensureConnected();
    
    try {
      const [rows] = await this.pool.query(sql, params);
      return rows;
    } catch (error) {
      this.logger.error('MySQL query error:', { sql, params, error });
      throw error;
    }
  }

  async execute(sql, params = []) {
    await this.ensureConnected();
    
    try {
      const [result] = await this.pool.execute(sql, params);
      return result;
    } catch (error) {
      this.logger.error('MySQL execute error:', { sql, params, error });
      throw error;
    }
  }

  async transaction(callback) {
    await this.ensureConnected();
    const connection = await this.pool.getConnection();
    
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getConnection() {
    await this.ensureConnected();
    return await this.pool.getConnection();
  }

  escape(value) {
    return mysql.escape(value);
  }

  escapeId(value) {
    return mysql.escapeId(value);
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
      this.pool = null;
      this.connectionPromise = null;
      this.logger.info('MySQL disconnected');
    }
  }
}

// Create singleton instance
const mysqlConnection = new MySQLConnection();

// Auto-connect when the module is imported
mysqlConnection.connect().catch(error => {
  console.error('Failed to auto-connect MySQL:', error);
});

export { mysqlConnection };