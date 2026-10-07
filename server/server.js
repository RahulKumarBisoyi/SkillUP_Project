import dotenv from 'dotenv';

// Load environment variables from .env if present
dotenv.config();

import app from './src/app.js';

const PORT = parseInt(process.env.PORT || '5000', 10);

const server = app.listen(PORT, () => {
  console.log(`[SkillUp Backend] Server is running on port ${PORT}`);
  console.log(`[SkillUp Backend] Health check available at: http://localhost:${PORT}/api/health`);
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(
      `[SkillUp Backend] Port ${PORT} is already in use. Another server instance may already be running.`
    );
    process.exit(1);
  }
  console.error('[SkillUp Backend] Server startup error:', err);
  process.exit(1);
});

function gracefulShutdown(signal) {
  console.log(`[SkillUp Backend] Received ${signal}. Closing HTTP server...`);
  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
