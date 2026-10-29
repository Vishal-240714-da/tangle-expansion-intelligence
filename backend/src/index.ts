import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { healthRouter } from './routes/health';
import { analysisRouter } from './routes/analysis';
import { scenarioRouter } from './routes/scenarios';
import { reportRouter } from './routes/reports';
import { errorHandler, AppError } from './middleware/errorHandler';
import { initializeDatabase } from './models/database';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: corsOrigin,
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/health', healthRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/scenarios', scenarioRouter);
app.use('/api/reports', reportRouter);
// Serve the built React frontend from the same Render service
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');

app.use(express.static(frontendDistPath));

// Return the React app for browser routes, but preserve API 404 responses
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }

  res.sendFile(path.join(frontendDistPath, 'index.html'), (err) => {
    if (err) next(err);
  });
});

// 404 handler for unmatched routes
app.use((req, res, next) => {
  next(new AppError(404, `Route ${req.method} ${req.originalUrl} not found`));
});

// Error handling
app.use(errorHandler);

// Start server if not running in test mode
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    console.log(`TANGLE Backend running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`CORS origin: ${corsOrigin}`);

    // Initialize database if DATABASE_URL is configured
    if (process.env.DATABASE_URL) {
      try {
        await initializeDatabase();
        console.log('Database initialized successfully');
      } catch (error) {
        console.error('Failed to initialize database:', error);
        console.log('Server will continue without database persistence');
      }
    } else {
      console.log('DATABASE_URL not configured. Database features disabled.');
    }
  });
}

export { app };
export default app;
