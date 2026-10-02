-- SkillUp Milestone 2, 4 & 5 Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  branch VARCHAR(255),
  college_year INT,
  interests TEXT,
  career_goals TEXT,
  learning_hours_per_day DECIMAL(4, 2) DEFAULT 0.00,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Skills table
CREATE TABLE IF NOT EXISTS user_skills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  skill VARCHAR(255) NOT NULL,
  status ENUM('Knows', 'Learning') NOT NULL DEFAULT 'Learning',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_skill (user_id, skill)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Milestone 4: Learning Tracks table
CREATE TABLE IF NOT EXISTS learning_tracks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  topic VARCHAR(255) NOT NULL,
  learning_goal VARCHAR(500) DEFAULT '',
  level ENUM('Beginner', 'Intermediate', 'Advanced') NOT NULL DEFAULT 'Beginner',
  available_time VARCHAR(100) DEFAULT '',
  resource_video_id VARCHAR(64) NOT NULL,
  resource_title VARCHAR(500) NOT NULL,
  resource_channel VARCHAR(255) DEFAULT '',
  resource_url VARCHAR(500) NOT NULL,
  resource_thumbnail VARCHAR(500) DEFAULT '',
  resource_duration VARCHAR(64) DEFAULT '',
  ai_generated TINYINT(1) NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  status ENUM('Active', 'Completed') NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_tracks_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Milestone 4: Track Tasks table
CREATE TABLE IF NOT EXISTS track_tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  track_id INT NOT NULL,
  day_number INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  task_type ENUM('Watch', 'Practice', 'Revision') NOT NULL DEFAULT 'Watch',
  estimated_minutes INT NOT NULL DEFAULT 30,
  completed TINYINT(1) NOT NULL DEFAULT 0,
  completed_at TIMESTAMP NULL DEFAULT NULL,
  sort_order INT NOT NULL DEFAULT 1,
  FOREIGN KEY (track_id) REFERENCES learning_tracks(id) ON DELETE CASCADE,
  INDEX idx_tasks_track_id (track_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Milestone 5: Opportunities table
CREATE TABLE IF NOT EXISTS opportunities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  edition_slug VARCHAR(150) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  type ENUM('Hackathon', 'Internship', 'Competition', 'Workshop') NOT NULL,
  organization VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  deadline DATE NULL DEFAULT NULL,
  start_date DATE NULL DEFAULT NULL,
  location_mode VARCHAR(150) NOT NULL DEFAULT 'Online',
  official_eligibility TEXT NOT NULL,
  required_skills JSON NOT NULL,
  suggested_skills JSON NOT NULL,
  source_url VARCHAR(500) NOT NULL,
  status ENUM('Open', 'Upcoming', 'Check Official Page', 'Expired') NOT NULL DEFAULT 'Check Official Page',
  last_verified_at DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_opportunities_type (type),
  INDEX idx_opportunities_status (status),
  INDEX idx_opportunities_deadline (deadline)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

