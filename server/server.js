import dotenv from 'dotenv';
import app from './src/app.js';

// Load environment variables from .env if present
dotenv.config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`[SkillUp Backend] Server is running on port ${PORT}`);
  console.log(`[SkillUp Backend] Health check available at: http://localhost:${PORT}/api/health`);
});
