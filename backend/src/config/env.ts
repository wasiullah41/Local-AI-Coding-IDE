import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '127.0.0.1',
  nodeEnv: process.env.NODE_ENV || 'development',
  dbPath: process.env.DB_PATH || path.join(__dirname, '../../data/ide.sqlite'),
  logLevel: process.env.LOG_LEVEL || 'debug',
  isDev: (process.env.NODE_ENV || 'development') === 'development',
};
