import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import profileRoutes from './routes/profile.routes.js';
import learnRoutes from './routes/learn.routes.js';
import trackRoutes from './routes/track.routes.js';
import opportunityRoutes from './routes/opportunity.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';

dotenv.config();

const app = express();

// Trust first reverse proxy in production so secure cookies work behind HTTPS load balancers
app.set('trust proxy', 1);

// Configure CORS for frontend with credentials support (supports comma-separated origins and strips trailing slashes)
const rawClientUrls = process.env.CLIENT_URL || 'http://localhost:5173';
const allowedOrigins = new Set(
  rawClientUrls
    .split(',')
    .map((u) => u.trim().replace(/\/+$/, ''))
    .filter(Boolean)
);

app.use(
  cors({
    origin(origin, callback) {
      // Allow same-origin / server-to-server requests with no Origin header
      if (!origin) {
        return callback(null, true);
      }
      const normalizedOrigin = origin.trim().replace(/\/+$/, '');
      if (allowedOrigins.has(normalizedOrigin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  })
);

// Parse cookies and incoming JSON request bodies
app.use(cookieParser());
app.use(express.json({ limit: '256kb' }));

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/learn', learnRoutes);
app.use('/api/tracks', trackRoutes);
app.use('/api/opportunities', opportunityRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Central error-handling middleware (never leaks internal DB credentials or SQL traces on 500s)
app.use((err, req, res, next) => {
  if (err && (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && err.status === 400 && 'body' in err))) {
    return res.status(400).json({
      status: 'error',
      message: 'Malformed JSON request body.',
    });
  }

  const statusCode =
    Number.isInteger(err?.status || err?.statusCode) && (err.status || err.statusCode) >= 400
      ? err.status || err.statusCode
      : 500;

  if (statusCode >= 500) {
    console.error('[Server Error]:', err?.message || err);
  }

  return res.status(statusCode).json({
    status: 'error',
    message:
      statusCode < 500 && err?.message
        ? err.message
        : 'Internal Server Error',
  });
});

export default app;
