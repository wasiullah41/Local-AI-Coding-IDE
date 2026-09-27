import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes';
import { errorMiddleware } from './middleware/error.middleware';
import { requestLogger } from './middleware/requestLogger.middleware';

const app = express();

// Security
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// CORS - allow Electron frontend
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'app://.' ],
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(requestLogger);

// API routes
app.use('/api', routes);

// Error handling
app.use(errorMiddleware);

export default app;
