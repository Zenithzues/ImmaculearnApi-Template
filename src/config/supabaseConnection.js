// src/config/supabaseConnection.js
import { createClient } from '@supabase/supabase-js';
import { Logger } from '../utils/Logger.js';

export class SupabaseConnection {
  constructor() {
    this.logger = new Logger('Supabase');
    this.client = null;
    this.adminClient = null;
    this.isConnected = false;
    this.connectionPromise = null;
  }

  async connect() {
    // If already connecting, return the existing promise
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = (async () => {
      try {
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
          throw new Error('Supabase environment variables are not set');
        }

        this.client = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_ANON_KEY,
          {
            auth: {
              persistSession: false,
              autoRefreshToken: false
            },
            db: {
              schema: 'public'
            },
            global: {
              headers: {
                'X-Client-Info': 'yjs-collaboration-app'
              }
            }
          }
        );

        // Admin client for operations requiring service role
        if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
          this.adminClient = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            {
              auth: {
                persistSession: false,
                autoRefreshToken: false
              }
            }
          );
        }

        // // Test connection (optional - can be removed in production)
        // try {
        //   const { data, error } = await this.client
        //     .from('yjs_documents')
        //     .select('count')
        //     .limit(1);

        //   if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        //     this.logger.warn('Supabase test query warning:', error.message);
        //   }
        // } catch (testError) {
        //   // Just log warning, don't fail connection
        //   this.logger.warn('Supabase connection test warning:', testError.message);
        // }

        this.isConnected = true;
        this.logger.info('Supabase connected successfully');
        
        return this;
      } catch (error) {
        this.logger.error('Failed to connect to Supabase:', error);
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

  getClient() {
    if (!this.client) {
      throw new Error('Supabase client not initialized. Call connect() or ensureConnected() first.');
    }
    return this.client;
  }

  getAdminClient() {
    if (!this.adminClient) {
      throw new Error('Supabase admin client not initialized. Make sure SUPABASE_SERVICE_ROLE_KEY is set and call connect() first.');
    }
    return this.adminClient;
  }

  async from(table) {
    await this.ensureConnected();
    return this.getClient().from(table);
  }

  async fromAdmin(table) {
    await this.ensureConnected();
    return this.getAdminClient().from(table);
  }

  async callRPC(functionName, params = {}) {
    await this.ensureConnected();
    
    try {
      const { data, error } = await this.getClient()
        .rpc(functionName, params);
      
      if (error) throw error;
      return data;
    } catch (error) {
      this.logger.error('RPC call error:', { functionName, params, error });
      throw error;
    }
  }

  async healthCheck() {
    try {
      await this.ensureConnected();
      const startTime = Date.now();
      
      const { data, error } = await this.getClient()
        .from('yjs_documents')
        .select('count', { count: 'exact', head: true })
        .limit(1);
      
      const latency = Date.now() - startTime;
      
      return {
        connected: !error,
        latency,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Singleton instance
const supabaseConnection = new SupabaseConnection();

// Auto-connect when the module is imported (optional)
if (process.env.SUPABASE_AUTO_CONNECT !== 'false') {
  supabaseConnection.connect().catch(error => {
    console.error('Failed to auto-connect Supabase:', error.message);
  });
}

export { supabaseConnection };