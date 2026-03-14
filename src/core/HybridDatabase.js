// import { mysqlConnection } from '../config/MySQLConnection.js';
import { mysqlConnection } from "../config/mysqlConnection.js";
import { supabaseConnection } from "../config/supabaseConnection.js";
// import { supabaseConnection } from '../config/SupabaseConnection.js';
import User from "../models/MySQL/UserModel.js";
import { Logger } from "../utils/Logger.js";
import crypto from "crypto";

export class HybridDatabase {
  constructor() {
    this.logger = new Logger("HybridDatabase");
    this.mysql = mysqlConnection;
    this.supabase = supabaseConnection;
    this.supabaseClient = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      this.logger.info("Initializing hybrid database connections...");

      // Connect to MySQL (auth)
      await this.mysql.connect();

      // Connect to Supabase (collaborative data)
      // Wrap in try-catch since Supabase might be optional
      try {
        await this.supabase.connect();
        this.supabaseClient = this.supabase.getAdminClient(); // Get the actual client
        if (!this.supabaseClient) {
          throw new Error("Failed to get Supabase client");
        }
        this.logger.info("Supabase connected");
      } catch (error) {
        this.logger.warn(
          "Supabase connection failed (continuing without it):",
          error.message,
        );
        // Continue without Supabase - it's optional for basic auth functionality
      }

      // Initialize database schemas (optional)
      if (this.supabase.isConnected) {
        await this.initializeSupabaseSchema();
      }

      this.isInitialized = true;
      this.logger.info("Hybrid database initialized successfully");

      return this;
    } catch (error) {
      this.logger.error("Failed to initialize hybrid database:", error);
      throw error;
    }
  }

  async initializeSchemas() {
    try {
      // MySQL Schema (Auth & Users)
      await this.initializeMySQLSchema();

      // Supabase Schema (Collaboration)
      await this.initializeSupabaseSchema();

      this.logger.info("Database schemas initialized");
    } catch (error) {
      this.logger.error("Schema initialization failed:", error);
      throw error;
    }
  }

  async initializeMySQLSchema() {
    const schemas = [
      // Users table
      `
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        avatar_url TEXT,
        status ENUM('online', 'offline', 'away', 'busy') DEFAULT 'offline',
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        email_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_username (username),
        INDEX idx_status (status)
      )
      `,

      // Sessions table
      `
      CREATE TABLE IF NOT EXISTS user_sessions (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        user_id VARCHAR(36) NOT NULL,
        token_hash VARCHAR(255) NOT NULL,
        device_info TEXT,
        ip_address VARCHAR(45),
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        revoked_at TIMESTAMP NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_token_hash (token_hash),
        INDEX idx_expires_at (expires_at)
      )
      `,

      // User preferences
      `
      CREATE TABLE IF NOT EXISTS user_preferences (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        user_id VARCHAR(36) NOT NULL,
        settings JSON DEFAULT '{}',
        theme VARCHAR(50) DEFAULT 'light',
        language VARCHAR(10) DEFAULT 'en',
        notifications_enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user (user_id)
      )
      `,
    ];

    for (const schema of schemas) {
      try {
        await this.mysql.query(schema);
      } catch (error) {
        this.logger.error("MySQL schema creation error:", error);
      }
    }
  }

  async initializeSupabaseSchema() {
    const tables = [
      // Users table (already exists, but ensure it's correct)
      `
        CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255),
        username VARCHAR(255),
        role VARCHAR(50),
        avatar_url TEXT,
        status VARCHAR(50),
        last_seen TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(email)
        )
        `,

      // Chat rooms
      `
        CREATE TABLE IF NOT EXISTS chat_rooms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255),
        description TEXT,
        type VARCHAR(50) CHECK (type IN ('direct', 'group', 'channel')) DEFAULT 'direct',
        created_by VARCHAR(255) NOT NULL,
        is_public BOOLEAN DEFAULT FALSE,
        settings JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        CONSTRAINT fk_chat_rooms_created_by 
            FOREIGN KEY (created_by) 
            REFERENCES users(id) 
            ON DELETE SET NULL
        )
        `,

      // Room participants
      `
        CREATE TABLE IF NOT EXISTS room_participants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id UUID NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        role VARCHAR(50) CHECK (role IN ('member', 'admin', 'owner')) DEFAULT 'member',
        joined_at TIMESTAMPTZ DEFAULT NOW(),
        last_read_at TIMESTAMPTZ DEFAULT NOW(),
        settings JSONB DEFAULT '{}',
        UNIQUE(room_id, user_id),
        CONSTRAINT fk_room_participants_room 
            FOREIGN KEY (room_id) 
            REFERENCES chat_rooms(id) 
            ON DELETE CASCADE,
        CONSTRAINT fk_room_participants_user 
            FOREIGN KEY (user_id) 
            REFERENCES users(id) 
            ON DELETE CASCADE
        )
        `,

      // Messages
      `
        CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id UUID NOT NULL,
        sender_id VARCHAR(255) NOT NULL,
        content TEXT,
        type VARCHAR(50) CHECK (type IN ('text', 'image', 'file', 'system', 'yjs_update')) DEFAULT 'text',
        metadata JSONB DEFAULT '{}',
        yjs_awareness_state JSONB,
        reply_to UUID,
        deleted BOOLEAN DEFAULT FALSE,
        deleted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT fk_messages_room 
            FOREIGN KEY (room_id) 
            REFERENCES chat_rooms(id) 
            ON DELETE CASCADE,
        CONSTRAINT fk_messages_sender 
            FOREIGN KEY (sender_id) 
            REFERENCES users(id) 
            ON DELETE CASCADE
        )
        `,
    ];

    const supabaseClient =
      this.supabase.getAdminClient() || this.supabase.getClient();

    for (const tableSQL of tables) {
      try {
        // Extract table name for logging
        const tableMatch = tableSQL.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
        const tableName = tableMatch ? tableMatch[1] : "unknown";

        console.log(`Creating/ensuring table: ${tableName}`);

        // Execute the SQL
        const { error } = await supabaseClient.rpc("exec_sql", {
          sql: tableSQL,
        });

        if (error && !error.message.includes("already exists")) {
          console.warn(`Table ${tableName} creation warning:`, error.message);
        }

        // Disable RLS for each table
        const disableRLSSQL = `ALTER TABLE ${tableName} DISABLE ROW LEVEL SECURITY;`;
        await supabaseClient
          .rpc("exec_sql", { sql: disableRLSSQL })
          .catch(() => {});
      } catch (error) {
        console.error(`Failed to create table:`, error.message);
      }
    }

    console.log("Supabase schema initialization completed");
  }

  async getMySQLStats() {
    try {
      const [userCount] = await this.mysql.query(
        "SELECT COUNT(*) as count FROM users",
      );
      const [sessionCount] = await this.mysql.query(
        "SELECT COUNT(*) as count FROM user_sessions WHERE revoked_at IS NULL",
      );

      return {
        users: userCount[0].count,
        active_sessions: sessionCount[0].count,
        connection_status: this.mysql.isConnected
          ? "connected"
          : "disconnected",
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  async getSupabaseStats() {
    try {
      const { count: roomCount } = await this.supabase
        .from("chat_rooms")
        .select("*", { count: "exact", head: true });

      const { count: documentCount } = await this.supabase
        .from("yjs_documents")
        .select("*", { count: "exact", head: true });

      const { count: messageCount } = await this.supabase
        .from("messages")
        .select("*", { count: "exact", head: true });

      return {
        rooms: roomCount,
        yjs_documents: documentCount,
        messages: messageCount,
        connection_status: this.supabase.isConnected
          ? "connected"
          : "disconnected",
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  async getStats() {
    const mysqlStats = await this.getMySQLStats();
    const supabaseStats = await this.getSupabaseStats();

    return {
      mysql: mysqlStats,
      supabase: supabaseStats,
      timestamp: new Date().toISOString(),
      hybrid_status: this.isInitialized ? "initialized" : "not_initialized",
    };
  }

  async healthCheck() {
    const checks = [];

    // MySQL health check
    try {
      const startTime = Date.now();
      await this.mysql.query("SELECT 1");
      const latency = Date.now() - startTime;

      checks.push({
        database: "mysql",
        status: "healthy",
        latency,
        connected: this.mysql.isConnected,
      });
    } catch (error) {
      checks.push({
        database: "mysql",
        status: "unhealthy",
        error: error.message,
        connected: false,
      });
    }

    // Supabase health check
    try {
      const startTime = Date.now();
      await this.supabase.from("yjs_documents").select("count").limit(1);
      const latency = Date.now() - startTime;

      checks.push({
        database: "supabase",
        status: "healthy",
        latency,
        connected: this.supabase.isConnected,
      });
    } catch (error) {
      checks.push({
        database: "supabase",
        status: "unhealthy",
        error: error.message,
        connected: false,
      });
    }

    return {
      checks,
      all_healthy: checks.every((check) => check.status === "healthy"),
      timestamp: new Date().toISOString(),
    };
  }

  async syncUserToSupabase(userId, role) {
    try {
      console.log("Starting syncUserToSupabase for user:", userId, role);

      if (!this.supabase || !this.supabase.isConnected) {
        this.logger.debug("Supabase not connected, skipping user sync");
        return false;
      }

      const supabaseClient = this.supabase.getClient();
      console.log("Supabase client available:", !!supabaseClient);

      if (!supabaseClient) {
        this.logger.error("Supabase client not available");
        return false;
      }

      // Import User model
      const User = (await import("../models/MySQL/UserModel.js")).default;
      const userModel = new User();

      // Get user data from MySQL
      const user = await userModel.syncToSupabase(userId, role);

      if (!user) {
        this.logger.warn("User not found in MySQL for Supabase sync", {
          userId,
        });
        return false;
      }

      // console.log("User data from MySQL:", JSON.stringify(user, null, 2));

      // Generate a deterministic UUID from the numeric ID
      // This ensures the same MySQL user always maps to the same UUID in Supabase
      const generateUUIDFromId = (id) => {
        // Create a UUID v5 using a namespace and the ID
        const namespace = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"; // DNS namespace
        const hash = crypto.createHash("sha1");
        hash.update(namespace + id);
        const bytes = hash.digest();

        // Set version bits (5 for SHA1) and variant bits
        bytes[6] = (bytes[6] & 0x0f) | 0x50; // Version 5
        bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant RFC 4122

        // Convert to UUID string
        const hex = bytes.toString("hex");
        return `${hex.substr(0, 8)}-${hex.substr(8, 4)}-${hex.substr(12, 4)}-${hex.substr(16, 4)}-${hex.substr(20, 12)}`;
      };

      // Use the deterministic UUID
      const supabaseUserId = generateUUIDFromId(userId.toString());

      // Prepare the data for upsert
      const userData = {
        id: user.id, // Use UUID instead of string "1"
        email: user.email || "",
        username: user.username || user.email?.split("@")[0] || "user",
        role: user.role || "user",
        avatar_url: user.avatar_url || null,
        status: user.status || "online",
        last_seen: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // console.log("Prepared user data for Supabase:", JSON.stringify(userData, null, 2));

      // Try to insert/update the user
      const { data, error } = await supabaseClient
        .from("users")
        .upsert(userData, {
          onConflict: "id",
          ignoreDuplicates: false,
        })
        .select();

      // console.log("Upsert result:", { data, error });

      if (error) {
        console.error("Supabase upsert error:", error);

        // Try alternative: Insert with ignore conflicts
        const { data: insertData, error: insertError } = await supabaseClient
          .from("users")
          .insert(userData)
          .select();

        if (insertError) {
          console.error("Insert also failed:", insertError);

          // Check if it's a duplicate key error
          if (insertError.code === "23505") {
            // Unique violation
            console.log("User already exists, trying update...");
            const { data: updateData, error: updateError } =
              await supabaseClient
                .from("users")
                .update(userData)
                .eq("id", supabaseUserId)
                .select();

            if (updateError) {
              console.error("Update failed:", updateError);
              this.logger.error("All sync attempts failed for user:", userId);
              return false;
            }

            console.log("Update succeeded:", updateData);
            return true;
          }

          this.logger.error("Failed to sync user to Supabase:", {
            userId,
            supabaseUserId,
            error: insertError.message,
          });
          return false;
        }

        console.log("Insert succeeded:", insertData);
      }

      this.logger.info(
        `Successfully synced user ${userId} to Supabase (UUID: ${supabaseUserId})`,
      );
      console.log(`User ${userId} synced to Supabase successfully`);
      return true;
    } catch (error) {
      console.error("Full sync error:", error);
      this.logger.error(`Failed to sync user ${userId} to Supabase:`, {
        message: error.message,
        stack: error.stack,
      });
      return false;
    }
  }

  // Fallback method using raw SQL if available
  async tryRawSqlInsert(supabaseClient, userData) {
    try {
      console.log("Trying raw SQL insert as fallback...");

      // Construct SQL query for upsert
      const sql = `
            INSERT INTO users (id, email, username, role, avatar_url, status, last_seen, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (id) DO UPDATE SET
                email = EXCLUDED.email,
                username = EXCLUDED.username,
                role = EXCLUDED.role,
                avatar_url = EXCLUDED.avatar_url,
                status = EXCLUDED.status,
                last_seen = EXCLUDED.last_seen,
                updated_at = EXCLUDED.updated_at
            RETURNING *;
            `;

      const params = [
        userData.id,
        userData.email,
        userData.username,
        userData.role,
        userData.avatar_url,
        userData.status,
        userData.last_seen,
        userData.created_at,
        userData.updated_at,
      ];

      // Try to execute raw SQL
      const { data, error } = await supabaseClient.rpc("exec_sql", {
        sql: sql,
        params: params,
      });

      if (error) {
        console.error("Raw SQL insert also failed:", error);
      } else {
        console.log("Raw SQL insert succeeded:", data);
      }
    } catch (sqlError) {
      console.error("Raw SQL execution error:", sqlError);
    }
  }
}

// Singleton instance
export const hybridDatabase = new HybridDatabase();
