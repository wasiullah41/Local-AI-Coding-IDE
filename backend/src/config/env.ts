import path from 'path';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '127.0.0.1',
  nodeEnv: process.env.NODE_ENV || 'development',
  dbPath: process.env.DB_PATH || path.join(__dirname, '../../data/ide.sqlite'),
  logLevel: process.env.LOG_LEVEL || 'debug',
  isDev: (process.env.NODE_ENV || 'development') === 'development',
  // Local LLM configuration. Nothing here has a usable default that would
  // silently phone home: the default is a local Ollama server.
  llmProvider: process.env.LLM_PROVIDER || 'ollama',
  llmBaseUrl: process.env.LLM_BASE_URL || '',
  llmModel: process.env.LLM_MODEL || '',
  /** Read from the environment only; never written to disk by this project. */
  llmApiKey: process.env.LLM_API_KEY || '',
};
