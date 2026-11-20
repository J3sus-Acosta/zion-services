// Configuración de entorno y Logger estructurado seguro
import dotenv from 'dotenv';
dotenv.config();

const SENSITIVE_KEYS = [
  'password',
  'token',
  'jwt_secret',
  'jwt_refresh_secret',
  'secret',
  'cookie_secret',
  'authorization',
  'database_url'
];

function sanitize(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitize);

  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.some((sensitive) => key.toLowerCase().includes(sensitive))) {
      clean[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      clean[key] = sanitize(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
    const timestamp = new Date().toISOString();
    const entry: Record<string, unknown> = {
      timestamp,
      level,
      message
    };
    if (meta) {
      entry.meta = sanitize(meta);
    }
    const output = JSON.stringify(entry);
    if (level === 'error') {
      console.error(output);
    } else if (level === 'warn') {
      console.warn(output);
    } else {
      console.log(output);
    }
  }

  info(message: string, meta?: Record<string, unknown>) {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>) {
    this.log('warn', message, meta);
  }

  error(message: string, meta?: Record<string, unknown>) {
    this.log('error', message, meta);
  }

  debug(message: string, meta?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== 'production') {
      this.log('debug', message, meta);
    }
  }
}

export const logger = new Logger();
