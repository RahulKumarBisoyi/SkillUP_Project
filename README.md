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
- **Database**: MySQL *(scheduled for a future milestone)*
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
│   │   │   └── common/          # Shared components (buttons, badges, modals)
│   │   ├── pages/               # Application view pages
│   │   ├── services/            # API service layers
│   │   │   └── api.js           # Central API client
│   │   ├── App.jsx              # Starter application component
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
│   │   ├── config/              # Configuration files (database, env)
│   │   ├── controllers/         # Request handling & business logic
│   │   ├── middlewares/         # Express middlewares (auth, validation)
│   │   ├── routes/              # Route definitions
│   │   │   └── health.routes.js # GET /api/health endpoint
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

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+ recommended, tested on v24)
- [npm](https://www.npmjs.com/) (v10+)

---

### 1. Backend Setup

#### Install Dependencies
Navigate to the `server/` directory and install dependencies:
```bash
cd server
npm install
```

#### Environment Configuration (Optional)
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default configuration:
```env
PORT=5000
NODE_ENV=development
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
The backend server will run on `http://localhost:5000`.

#### Test Health Endpoint
Open `http://localhost:5000/api/health` in your browser or run:
```bash
# Windows PowerShell
Invoke-RestMethod -Uri "http://localhost:5000/api/health"

# curl
curl http://localhost:5000/api/health
```

Expected JSON response:
```json
{
  "status": "ok",
  "message": "Server is running",
  "timestamp": "2026-09-22T07:35:12.823Z"
}
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
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default configuration:
```env
VITE_API_URL=http://localhost:5000
```
*(Note: When running locally, Vite's dev proxy automatically forwards `/api` requests to `http://localhost:5000`)*

#### Run Frontend Server
```bash
npm run dev
```
The React frontend will start on `http://localhost:5173`.

---

## Milestone Status

- [x] **Milestone 1: Project Foundation**
  - Scaffolding of React + Vite frontend
  - Tailwind CSS configuration
  - Express backend setup
  - Health check endpoint (`GET /api/health`)
  - Clean, scalable folder structure
  - Environment templates and gitignore rules
- [ ] **Milestone 2**: Database schema & MySQL integration *(upcoming)*
- [ ] **Milestone 3**: Authentication *(upcoming)*
- [ ] **Milestone 4**: Learning tracks and resource discovery *(upcoming)*
- [ ] **Milestone 5**: Opportunity matching & skill-gap analysis *(upcoming)*
