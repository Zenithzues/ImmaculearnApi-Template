// src/utils/SimpleLogger.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SimpleLogger {
  constructor(service = 'Application') {
    this.service = service;
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      http: 3,
      debug: 4
    };
    this.colors = {
      error: '\x1b[31m',
      warn: '\x1b[33m',
      info: '\x1b[32m',
      http: '\x1b[35m',
      debug: '\x1b[36m',
      reset: '\x1b[0m'
    };
    this.logDir = path.join(__dirname, '../../logs');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  formatTimestamp() {
    return new Date().toISOString().replace('T', ' ').substring(0, 23);
  }

  writeToFile(level, message, meta = {}) {
    if (process.env.NODE_ENV === 'production') {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        service: this.service,
        message,
        ...meta
      };
      
      const logFile = path.join(this.logDir, `${level}.log`);
      fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    }
  }

  log(level, message, meta = {}) {
    const timestamp = this.formatTimestamp();
    const color = this.colors[level] || this.colors.reset;
    const reset = this.colors.reset;
    
    // Console output
    console.log(`${color}[${timestamp}] [${this.service}] ${level.toUpperCase()}: ${message}${reset}`);
    
    if (Object.keys(meta).length > 0) {
      console.log(JSON.stringify(meta, null, 2));
    }
    
    // File output in production
    this.writeToFile(level, message, meta);
  }

  error(message, meta = {}) {
    this.log('error', message, meta);
  }

  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  debug(message, meta = {}) {
    if (process.env.NODE_ENV !== 'production') {
      this.log('debug', message, meta);
    }
  }

  http(message, meta = {}) {
    this.log('http', message, meta);
  }

  // Specialized methods
  apiRequest(req, res, responseTime) {
    this.info('API Request', {
      method: req.method,
      url: req.url,
      ip: req.ip,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`
    });
  }

  databaseQuery(query, params, executionTime) {
    if (process.env.LOG_LEVEL === 'debug') {
      this.debug('Database Query', {
        query: this.maskSensitiveData(query),
        params: this.maskSensitiveParams(params),
        executionTime: `${executionTime}ms`
      });
    }
  }

  maskSensitiveData(query) {
    if (typeof query !== 'string') return query;
    return query
      .replace(/password\s*=\s*'[^']*'/gi, "password='***'")
      .replace(/token\s*=\s*'[^']*'/gi, "token='***'")
      .replace(/secret\s*=\s*'[^']*'/gi, "secret='***'");
  }

  maskSensitiveParams(params) {
    if (!params || typeof params !== 'object') return params;
    
    const sensitiveKeys = ['password', 'token', 'secret', 'key'];
    const masked = Array.isArray(params) ? [...params] : { ...params };
    
    sensitiveKeys.forEach(key => {
      if (masked[key]) {
        masked[key] = '***';
      }
    });
    
    return masked;
  }

  startTimer(label) {
    const start = Date.now();
    return {
      label,
      end: () => {
        const duration = Date.now() - start;
        this.debug(`Timer ${label}`, { duration: `${duration}ms` });
        return duration;
      }
    };
  }
}

// Singleton instance
let globalLogger = null;

export function getLogger(service = 'Application') {
  if (!globalLogger) {
    globalLogger = new SimpleLogger(service);
  }
  return globalLogger;
}

export { SimpleLogger as Logger };