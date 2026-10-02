# SkillUp

An AI-powered learning and opportunity platform designed for engineering students.

SkillUp connects students to curated learning tracks, hackathons, internships, competitions, and workshops while providing skill-gap analysis and targeted recommendations.

### Core Product Loop
```
Learn ──> Track ──> Discover ──> Match ──> Find Skill Gaps ──> Learn Again
```

---

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS
- **Backend**: Node.js, Express
- **Database**: MySQL 8 (via `mysql2` connection pool)
- **Security & Auth**: `bcryptjs` (password hashing), `jsonwebtoken` (JWT), `cookie-parser` (httpOnly cookies)
- **External Services & AI**:
  - **YouTube Data API v3**: Authentic educational video discovery and metadata retrieval
  - **Google Gemini API**: Cognitive ranking and personalized "Why Recommended" justifications
- **Architecture**: Modular Client-Server decoupled architecture

---

## Project Structure

```text
Skillup_hackathon/
├── client/                      # Frontend Application (React + Vite + Tailwind CSS)
│   ├── public/                  # Static assets
│   ├── src/
│   │   ├── assets/              # Images, SVGs, and visual assets
│   │   ├── components/          # Reusable UI components
│   │   │   ├── auth/            # Authentication forms (LoginForm, RegisterForm)
│   │   │   ├── common/          # Shared components (buttons, badges, modals)
│   │   │   ├── learn/           # Learning Resource Discovery (LearnView, ResourceCard)
│   │   │   └── profile/         # Student Profile & Skills management view
│   │   ├── context/             # React Contexts (AuthContext for user state)
│   │   ├── pages/               # Application view pages
│   │   ├── services/            # API service layers
│   │   │   └── api.js           # Central API client (fetch with credentials)
│   │   ├── App.jsx              # Main application shell, navigation & view switcher
│   │   ├── main.jsx             # React entry point
│   │   └── index.css            # Tailwind CSS directives
│   ├── .env.example             # Frontend environment variables template
│   ├── .gitignore               # Frontend gitignore rules
│   ├── index.html               # Main HTML entrypoint
│   ├── package.json             # Frontend dependencies and scripts
│   └── vite.config.js           # Vite configuration with Tailwind and dev proxy
│
├── server/                      # Backend API (Node.js + Express)
│   ├── src/
│   │   ├── config/              # Configuration files
│   │   │   └── db.js            # MySQL2 connection pool
│   │   ├── controllers/         # Request handling & business logic
│   │   │   ├── auth.controller.js
│   │   │   ├── learn.controller.js # Learning recommendation controller
│   │   │   └── profile.controller.js
│   │   ├── database/            # Database schema & setup scripts
│   │   │   ├── schema.sql       # Reproducible DDL script
│   │   │   └── initDb.js        # Automated migration runner (npm run db:init)
│   │   ├── middlewares/         # Express middlewares
│   │   │   └── auth.middleware.js # JWT verification (cookie & Bearer)
│   │   ├── routes/              # Route definitions
│   │   │   ├── auth.routes.js   # /api/auth endpoints (register, login, me, logout)
│   │   │   ├── health.routes.js # GET /api/health endpoint
│   │   │   ├── learn.routes.js  # POST /api/learn/recommend endpoint
│   │   │   └── profile.routes.js# /api/profile endpoints (get, update)
│   │   ├── services/            # External integration services
│   │   │   ├── gemini.service.js  # AI ranking & explanation service
│   │   │   └── youtube.service.js # YouTube Data API v3 search service
│   │   └── app.js               # Express application configuration
│   ├── .env.example             # Backend environment variables template
│   ├── .gitignore               # Backend gitignore rules
│   ├── package.json             # Backend dependencies and scripts
│   └── server.js                # Server entry point
│
├── .gitignore                   # Root repository gitignore rules
└── README.md                    # Project documentation
```

---

## Learning Resource Discovery Architecture (Milestone 3)

### How It Works
1. **Student Request**: Authenticated student enters a learning topic (e.g., `"DSA in C++"`), current skill level, learning goal, and available study time.
2. **Factual Resource Discovery (YouTube Data API v3)**:
   - Queries YouTube Data API v3 for targeted educational videos.
   - Extracts authentic metadata: `videoId`, `title`, `channel`, `description`, `thumbnail`, `publishedAt`, and verified URL (`https://www.youtube.com/watch?v=<videoId>`).
   - Limits retrieval to a compact candidate set (8 videos) only on explicit search submission.
3. **Cognitive Personalization (Google Gemini API)**:
   - Evaluates real candidates against the student's level, goals, and time commitment.
   - Emits structured JSON ranking the candidate `videoId`s and providing concise, customized "Why Recommended" justifications.
   - Gemini **never** creates synthetic URLs, video IDs, or metadata; the backend maps Gemini's IDs strictly back to verified YouTube objects.
4. **Resilient Fallback**:
   - If Gemini encounters high-demand spikes or transient errors, the server gracefully returns the real YouTube search candidates with a standard notice (`"Relevant YouTube result for your search."`).
   - If YouTube fails, the server returns a clear error banner without fabricating videos.

---

## Database & Schema Design

The application connects to a MySQL 8 database (`skillup_db`) with the following tables:

1. **`users`**
   - `id`: INT AUTO_INCREMENT PRIMARY KEY
   - `name`: VARCHAR(255) NOT NULL
   - `email`: VARCHAR(255) NOT NULL UNIQUE
   - `password_hash`: VARCHAR(255) NOT NULL (bcrypt hash)
   - `created_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP

2. **`profiles`**
   - `id`: INT AUTO_INCREMENT PRIMARY KEY
   - `user_id`: INT NOT NULL UNIQUE (FK -> `users.id` ON DELETE CASCADE)
   - `branch`: VARCHAR(255)
   - `college_year`: INT
   - `interests`: TEXT
   - `career_goals`: TEXT
   - `learning_hours_per_day`: DECIMAL(4, 2) DEFAULT 0.00

3. **`user_skills`**
   - `id`: INT AUTO_INCREMENT PRIMARY KEY
   - `user_id`: INT NOT NULL (FK -> `users.id` ON DELETE CASCADE)
   - `skill`: VARCHAR(255) NOT NULL
   - `status`: ENUM('Knows', 'Learning') NOT NULL
   - UNIQUE KEY (`user_id`, `skill`): Prevents duplicate skills per user

---

## Authentication Strategy

- **Password Security**: Passwords are never stored in plaintext. They are salted and hashed using `bcryptjs` with 10 salt rounds before persistence.
- **JWT Tokens**: On successful registration or login, a signed JSON Web Token (valid for 7 days) is issued containing the safe user payload (`id`, `email`).
- **Cookie-Based Storage (httpOnly)**: The JWT is transmitted in a secure `httpOnly`, `SameSite=Lax` cookie. This prevents client-side JavaScript access and safeguards against Cross-Site Scripting (XSS) token theft.
- **Header Fallback**: The auth middleware also supports standard `Authorization: Bearer <token>` headers, enabling easy programmatic testing.
- **Logout**: Handled via `POST /api/auth/logout`, which instructs the client browser to immediately clear the `token` cookie.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+ recommended, tested on v24)
- [npm](https://www.npmjs.com/) (v10+)
- [MySQL Server 8.0+](https://dev.mysql.com/downloads/mysql/) running locally on port 3306
- YouTube Data API v3 Key
- Google Gemini API Key

---

### 1. Backend Setup

#### Install Dependencies
Navigate to the `server/` directory and install dependencies:
```bash
cd server
npm install
```

#### Environment Configuration
Create a `.env` file in the `server/` directory based on `.env.example`:
```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=skillup_db
JWT_SECRET=your_jwt_secret_key
CLIENT_URL=http://localhost:5173
YOUTUBE_API_KEY=your_youtube_api_key
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.8-flash
```
*(Never commit `.env` to Git. The `.gitignore` rules ensure `.env` remains strictly local.)*

#### Initialize Database Schema
Run the automated schema runner to create the `skillup_db` database and execute all table definitions:
```bash
npm run db:init
```

#### Run Backend Server
- **Development mode (with auto-reload)**:
  ```bash
  npm run dev
  ```
- **Production mode**:
  ```bash
  npm start
  ```
The backend server runs on `http://localhost:5000`.

#### Test Endpoints
```bash
# Health check
curl http://localhost:5000/api/health

# Registration
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alex","email":"alex@college.edu","password":"password123"}'

# Learning Resource Recommendations (Protected)
curl -X POST http://localhost:5000/api/learn/recommend \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_jwt_token>" \
  -d '{"topic":"DSA in C++","level":"Beginner","goal":"Placement prep","availableTime":"1 hour per day"}'
```

---

### 2. Frontend Setup

#### Install Dependencies
Navigate to the `client/` directory and install dependencies:
```bash
cd client
npm install
```

#### Environment Configuration (Optional)
Optionally copy `.env.example` to `.env`:
```env
VITE_API_URL=http://localhost:5000
```
*(Vite's dev proxy automatically forwards `/api` requests to `http://localhost:5000` during local development)*

#### Run Frontend Server
```bash
npm run dev
```
The React frontend starts on `http://localhost:5173`.

---

## Milestone Status

- [x] **Milestone 1: Project Foundation**
  - Scaffolding of React + Vite frontend
  - Tailwind CSS configuration
  - Express backend setup
  - Health check endpoint (`GET /api/health`)
  - Clean, scalable folder structure
  - Environment templates and gitignore rules
- [x] **Milestone 2: MySQL Database + Authentication + Student Profile**
  - MySQL connection pool (`mysql2`)
  - Database schema (`users`, `profiles`, `user_skills`)
  - Automated schema migration runner (`npm run db:init`)
  - Secure bcrypt password hashing and JWT authentication
  - Protected endpoints (`/api/auth/me`, `/api/profile`)
  - httpOnly cookie session management & logout
  - Student Profile & Skills matrix CRUD with MySQL persistence
  - Frontend authentication (Sign In, Sign Up) & Student Profile UI
- [x] **Milestone 3: Learning Resource Discovery**
  - YouTube Data API v3 integration with authentic video metadata
  - Google Gemini API integration for personalized ranking and explanations
  - Resilient fallback for Gemini transient spikes (standard YouTube results)
  - Protected recommendation endpoint `POST /api/learn/recommend`
  - Frontend Learn Page with responsive YouTube resource cards
  - Safe external YouTube links (`target="_blank" rel="noopener noreferrer"`)
- [ ] **Milestone 4**: Personalized learning tracks & progress tracking *(upcoming)*
- [ ] **Milestone 5**: Opportunity discovery & skill-gap matching *(upcoming)*
