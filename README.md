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
│   │   │   ├── dashboard/       # Personalized Student Dashboard (DashboardView)
│   │   │   ├── learn/           # Learning Resource Discovery (LearnView, ResourceCard)
│   │   │   ├── opportunities/   # Verified Opportunity Discovery & Details (OpportunitiesView)
│   │   │   ├── profile/         # Student Profile & Skills management view
│   │   │   └── tracks/          # Personalized Learning Tracks (TrackPreview, MyTracksView, TrackDetailView)
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
│   │   │   ├── dashboard.controller.js   # Personalized Student Dashboard aggregation controller
│   │   │   ├── learn.controller.js       # Learning recommendation controller
│   │   │   ├── opportunity.controller.js # Verified opportunity discovery & relevance controller
│   │   │   ├── profile.controller.js
│   │   │   └── track.controller.js       # Personalized learning track controller
│   │   ├── database/            # Database schema & setup scripts
│   │   │   ├── schema.sql            # Reproducible DDL script
│   │   │   ├── seedOpportunities.js  # Curated, verified opportunities & idempotent seeder
│   │   │   └── initDb.js             # Automated migration & seeding runner (npm run db:init)
│   │   ├── middlewares/         # Express middlewares
│   │   │   └── auth.middleware.js # JWT verification (cookie & Bearer)
│   │   ├── routes/              # Route definitions
│   │   │   ├── auth.routes.js        # /api/auth endpoints (register, login, me, logout)
│   │   │   ├── dashboard.routes.js   # GET /api/dashboard endpoint
│   │   │   ├── health.routes.js      # GET /api/health endpoint
│   │   │   ├── learn.routes.js       # POST /api/learn/recommend endpoint
│   │   │   ├── opportunity.routes.js # /api/opportunities endpoints (list, detail, analyze)
│   │   │   ├── profile.routes.js     # /api/profile endpoints (get, update)
│   │   │   └── track.routes.js       # /api/tracks endpoints
│   │   ├── services/            # External & domain services
│   │   │   ├── gemini.service.js        # AI ranking, explanation & schedule service
│   │   │   ├── skillAnalysis.service.js # Deterministic skill matching & gap analysis service
│   │   │   └── youtube.service.js       # YouTube Data API v3 search & verification service
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

4. **`learning_tracks`** *(Milestone 4)*
   - `id`: INT AUTO_INCREMENT PRIMARY KEY
   - `user_id`: INT NOT NULL (FK -> `users.id` ON DELETE CASCADE)
   - `topic`: VARCHAR(255) NOT NULL
   - `learning_goal`: VARCHAR(500)
   - `level`: ENUM('Beginner', 'Intermediate', 'Advanced')
   - `available_time`: VARCHAR(100)
   - `resource_video_id`: VARCHAR(64) NOT NULL
   - `resource_title`: VARCHAR(500) NOT NULL
   - `resource_channel`: VARCHAR(255)
   - `resource_url`: VARCHAR(500) NOT NULL
   - `resource_thumbnail`: VARCHAR(500)
   - `resource_duration`: VARCHAR(64)
   - `ai_generated`: TINYINT(1) DEFAULT 0
   - `start_date`: DATE NOT NULL
   - `status`: ENUM('Active', 'Completed') DEFAULT 'Active'
   - `created_at` / `updated_at`: TIMESTAMP

5. **`track_tasks`** *(Milestone 4)*
   - `id`: INT AUTO_INCREMENT PRIMARY KEY
   - `track_id`: INT NOT NULL (FK -> `learning_tracks.id` ON DELETE CASCADE)
   - `day_number`: INT NOT NULL
   - `title`: VARCHAR(255) NOT NULL
   - `description`: TEXT
   - `task_type`: ENUM('Watch', 'Practice', 'Revision')
   - `estimated_minutes`: INT NOT NULL
   - `completed`: TINYINT(1) DEFAULT 0
   - `completed_at`: TIMESTAMP NULL
   - `sort_order`: INT NOT NULL

6. **`opportunities`** *(Milestone 5)*
   - `id`: INT AUTO_INCREMENT PRIMARY KEY
   - `edition_slug`: VARCHAR(150) NOT NULL UNIQUE *(allows multiple event editions of the same recurring program to coexist while keeping `npm run db:init` seeding idempotent)*
   - `title`: VARCHAR(255) NOT NULL
   - `type`: ENUM('Hackathon', 'Internship', 'Competition', 'Workshop') NOT NULL
   - `organization`: VARCHAR(255) NOT NULL
   - `description`: TEXT NOT NULL
   - `deadline`: DATE NULL *(explicitly `NULL` when not published on the official page; never fabricated)*
   - `start_date`: DATE NULL
   - `location_mode`: VARCHAR(100) NOT NULL DEFAULT 'Online'
   - `official_eligibility`: TEXT NOT NULL *(official student/enrollment/age eligibility rules from the organizer)*
   - `required_skills`: JSON NOT NULL *(only skills explicitly mandated by the official rules)*
   - `suggested_skills`: JSON NOT NULL *(inferred/relevant technical skills mapped to SkillUP learning topics for discovery & future skill-gap analysis)*
   - `source_url`: VARCHAR(500) NOT NULL *(verified `https://` official program page)*
   - `status`: ENUM('Open', 'Upcoming', 'Check Official Page', 'Expired') NOT NULL DEFAULT 'Check Official Page'
   - `last_verified_at`: DATE NOT NULL
   - `created_at` / `updated_at`: TIMESTAMP

---

## Personalized Learning Tracks Architecture (Milestone 4)

### How Track Generation Works
1. **Explicit Resource Selection**: On the Learn page, each recommended YouTube card includes a **Create My Track** button.
2. **Authoritative YouTube Metadata Verification**: When clicked, the backend (`POST /api/tracks/generate`) verifies the selected `videoId` directly via `getYouTubeVideoById` so title, channel, thumbnail, URL, and duration come from YouTube rather than untrusted frontend input.
3. **Flexible Schedule & Daily Time Budget**:
   - The backend parses the student's daily available time (`30 minutes/day` to `4+ hours/day`) into a strict daily minute budget.
   - Schedule duration scales flexibly based on the verified video length, supplementary practice, and daily time budget.
   - Using `process.env.GEMINI_MODEL` (with an 8-second master timeout budget), Gemini generates daily `Watch`, `Practice`, and `Revision` tasks without inventing URLs or timestamps.
   - If Gemini is unavailable or times out, a deterministic non-AI fallback schedule is generated from the verified video duration and clearly labeled in the UI.
   - Post-processing and backend validation ensure that the combined estimated minutes of all tasks on any day never exceed the student's daily learning time.

### How Track Progress Is Stored
- **Preview Before Persistence**: Generated schedules are returned as a preview first (`TrackPreview.jsx`) and are only saved to MySQL when the student clicks **Save My Track**.
- **Transactional Persistence (`POST /api/tracks`)**: The backend strictly validates the task list (task types, sequential day numbers starting at Day 1, per-task and per-day minute limits) and inserts the track and all tasks inside a single MySQL transaction.
- **Task Completion & Progress Calculation (`PATCH /api/tracks/:id/tasks/:taskId`)**:
  - Checking or unchecking a task updates `completed` and `completed_at` in `track_tasks` after verifying track ownership (`user_id = req.user.id`).
  - Overall progress percentage is computed from stored completion data (`Math.round((completedTasks / totalTasks) * 100)`), and the track status automatically updates to `'Completed'` when all tasks are finished.

### Milestone 4 Backend Endpoints (All Protected by JWT Auth)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/tracks/generate` | Generate a study schedule preview for a verified YouTube video without saving to DB |
| `POST` | `/api/tracks` | Validate and save a confirmed learning track and its tasks in a MySQL transaction |
| `GET` | `/api/tracks` | List all saved learning tracks and progress metrics for the authenticated student |
| `GET` | `/api/tracks/:id` | Retrieve full details and ordered daily tasks for a specific owned learning track |
| `PATCH` | `/api/tracks/:id/tasks/:taskId` | Toggle a task's completion status and recalculate track progress/status |

---

## Verified Opportunity Discovery Architecture (Milestone 5)

### How Opportunity Discovery & Relevance Work
1. **Curated, Individually Verified Opportunities**:
   - `server/src/database/seedOpportunities.js` seeds 11 individually verified engineering student opportunities across **Hackathons**, **Internships**, **Competitions**, and **Workshops** (including Smart India Hackathon, MLH Global Hack Week editions, Linux Foundation LFX Mentorship, Outreachy, Google Summer of Code, ICPC, Microsoft Imagine Cup, AWS Educate Labs, and GitHub Skills).
   - General discovery portals (**Unstop**, Devpost Hackathons Directory, AICTE National Internship Portal, MLH Season Directory, Kaggle Competitions) are never disguised as single opportunities; instead, they are returned in a dedicated `explorePlatforms` section (**Explore General Discovery Platforms**).
   - Specific verified opportunities hosted on Unstop (`unstop.com/<category>/<slug>`) are supported natively in the MySQL `opportunities` table and serialized with `hostingPlatform: "Unstop"`, `isUnstopListing: true`, and `Apply on Unstop ↗` buttons linking directly to the specific listing URL rather than Unstop's homepage.
2. **Multi-Edition Storage & Idempotent Seeding**:
   - Each opportunity record is uniquely identified by `edition_slug` (e.g., `mlh-ghw-hacktoberfest-2026`, `mlh-ghw-builders-week-2026`, `mlh-ghw-data-week-2026-past`), allowing multiple editions of the same recurring program to coexist in MySQL while keeping `npm run db:init` 100% idempotent via `INSERT ... ON DUPLICATE KEY UPDATE`.
3. **Strict Separation of Official Eligibility vs. Suggested Technical Skills**:
   - Every opportunity separates organizer-published rules (`officialEligibility` and `requiredSkills`) from SkillUP's mapped technical skills (`suggestedSkills`), preparing a clean foundation for Milestone 6 skill-gap analysis.
4. **Honest Status & Deadline Handling**:
   - Opportunities with a past deadline (`deadline < today`) are automatically flagged as `Expired` (`isExpired: true`) and excluded from **Recommended for Your Profile & Skills**.
   - Opportunities without a single static cutoff date on their official page use `deadline: null` (`"Deadline not specified on official page"`) and `status: "Check Official Page"` rather than assuming they are currently open.
5. **Explainable Relevance Suggestions**:
   - `GET /api/opportunities` compares each non-expired opportunity against the logged-in student's `user_skills` (`Knows` and `Learning`) and `profiles` (`interests`, `career_goals`).
   - Instead of fabricated match percentages, each recommended opportunity displays a transparent explanation (e.g., *"Suggested based on skills you know (JavaScript, React) and skills you are learning (Python, SQL & DBMS). Relevance suggestion only — check official eligibility requirements before applying."*).

### Milestone 5 Backend Endpoints (All Protected by JWT Auth)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/opportunities` | List verified opportunities with optional `?type=`, `?search=`, `?recommended=true`, and `?includeExpired=` filters, plus `recommendedOpportunities` and `explorePlatforms` |
| `GET` | `/api/opportunities/:id` | Retrieve full details, official eligibility, required skills, suggested skills, and profile relevance for a single opportunity |

---

## Skill Matching & Gap Analysis Architecture (Milestone 6)

### 1. Overview & Skill-Comparison Approach
When an authenticated student opens an opportunity's details view (or clicks **Analyze My Skills**), SkillUP calls `POST /api/opportunities/:id/analyze` to compare the student's latest saved `user_skills` against the opportunity's associated technical skills using [`skillAnalysis.service.js`](file:///c:/Users/rahul/OneDrive/Desktop/Skillup_hackathon/server/src/services/skillAnalysis.service.js).

- **Deterministic Normalization & Canonical Alias Matching**:
  - Skill names are trimmed, whitespace-normalized, and compared case-insensitively.
  - Only **genuinely equivalent aliases** map to the same canonical skill (`JS` $\leftrightarrow$ `JavaScript`, `TS` $\leftrightarrow$ `TypeScript`, `Py` $\leftrightarrow$ `Python`, `CPP` $\leftrightarrow$ `C++`, `ML` $\leftrightarrow$ `Machine Learning`, `OS` $\leftrightarrow$ `Operating Systems`, `Data Structures and Algorithms` $\leftrightarrow$ `DSA`).
  - **Strict Non-Equivalence**: Related or broader/narrower skills are **never** treated as identical (`C++` $\neq$ `DSA`, `C++` $\neq$ `DSA in C++`, `Python` $\neq$ `Machine Learning`, `HTML` $\neq$ `Web Development`, `React` $\neq$ `JavaScript`, `Git` $\neq$ `GitHub`, `Full-Stack Web Development` $\neq$ `Web Development`).
- **No Dependency on External AI Calls**:
  - The skill comparison is 100% deterministic in the backend, ensuring `<20ms` latency, zero risk of `503` service interruptions, and zero hallucinated requirements.

### 2. Three Skill Categories
1. **Known Skills (`knownSkills`)**: Associated technical skills that match a skill the student has marked as **`Knows`** in their profile.
2. **Currently Learning (`learningSkills`)**: Associated technical skills that match a skill the student has marked as **`Learning`** in their profile.
3. **Skills to Develop (`missingSkills`)**: Associated technical skills that are not yet listed in the student's profile (presented as skills to develop or add if already known, never claiming the student lacks ability).

### 3. Official Eligibility vs. Official Focus Areas vs. Suggested Skill Alignment
SkillUP strictly separates three distinct types of opportunity metadata:
- **Official Eligibility (`officialEligibility`)**: The organizer's verified enrollment, academic, age, or participation rules from the source page. Even when a student lists **every** associated skill (`missingSkills = []`), SkillUP never declares the student automatically eligible and always indicates that official confirmation on the organizer's page is required. If eligibility text is missing, SkillUP displays: *"Official eligibility could not be fully determined. Check the original opportunity page."*
- **Official Focus Areas / Domains (`officialFocusAreas`)**: The general themes, problem domains, or cloud services published on the official page (e.g., `"Problem Solving"`, `"Open Source Contribution"`, `"Algorithmic Programming"`). These are displayed separately and never misrepresented as mandatory programming language prerequisites.
- **Suggested Technical Skills (`suggestedSkills`)**: Concrete technical skills inferred by SkillUP to help students prepare or align their learning tracks (`analysisType: "suggested_skill_alignment"`).

### 4. Milestone 6 Backend Endpoint (Protected by JWT Auth)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/opportunities/:id/analyze` | Compare the authenticated student's latest saved `user_skills` with opportunity `:id` and return `knownSkills`, `learningSkills`, `missingSkills`, `summary`, and `officialEligibility` |

### 5. Current Limitations
- Student profile skills are self-reported (`Knows` / `Learning`) and are not formally verified assessments.
- Most student hackathons, internships, and competitions publish general focus areas rather than mandatory programming language lock-ins; therefore, technical comparisons represent **Suggested Skill Alignment** rather than mandatory application prerequisites.

---

## Bridge My Skill Gap Architecture (Milestone 7)

### 1. Overview & Complete User Journey
Milestone 7 connects Opportunity Discovery & Skill Gap Analysis (Milestones 5 & 6) directly to YouTube Learning Resource Discovery (Milestone 3), Personalized Learning Tracks (Milestone 4), and Student Profile Updates (Milestone 2):

$$\text{Discover Opportunity} \rightarrow \text{Analyze Skills} \rightarrow \text{Identify Skills to Develop} \rightarrow \text{Bridge My Skill Gap} \rightarrow \text{Find Resources} \rightarrow \text{Create My Track} \rightarrow \text{Complete Tasks} \rightarrow \text{Update Profile} \rightarrow \text{Reanalyze Opportunity}$$

1. **Opportunity Details → Bridge My Skill Gap**:
   - Inside **My Skill Analysis → Skills to Develop**, every missing skill returned by `POST /api/opportunities/:id/analyze` renders a **Learn This Skill →** action button alongside a **Bridge My Skill Gap** selector.
   - If the student already lists all associated skills (`missingSkills = []`), no redundant gap-bridging buttons are displayed.
2. **Pre-Populated Resource Discovery (`LearnView`)**:
   - Clicking **Learn This Skill** or **Bridge My Skill Gap** navigates to **Discover Resources** with a contextual banner (*"Learning [Skill] for [Opportunity Title]"*, **← Return to Opportunity**, and **Official Page ↗**) and pre-populates:
     - **Topic / Skill**: Exact missing skill from the opportunity (or its canonical predefined catalog match when applicable).
     - **Level**: Defaults to **`Beginner`** when the student's level for that skill is unknown (never assuming `Intermediate` from related skills), while allowing the student to change the level before searching.
     - **Learning Goal**: `"Prepare for [Opportunity Title]"`.
     - **Available Daily Time**: Pre-selected from the student's saved `learning_hours_per_day` in MySQL (editable before searching).
3. **Backend Opportunity-Skill Validation & Journey Preservation**:
   - Rather than adding duplicate routes or trusting arbitrary client-supplied free text, `POST /api/learn/recommend`, `POST /api/tracks/generate`, and `POST /api/tracks` validate `{ opportunityId, targetSkill, contextToken }` via `validateOpportunitySkillContext` in [`skillAnalysis.service.js`](file:///c:/Users/rahul/OneDrive/Desktop/Skillup_hackathon/server/src/services/skillAnalysis.service.js):
     - Verifies that `opportunityId` exists in `opportunities`.
     - Verifies that `targetSkill` belongs to that opportunity's associated technical skills.
     - Rejects skills the student already marked as `Knows`, while **preserving the validated learning journey** (via HMAC-signed `contextToken` and session validation) if the student updates the skill from Missing to **`Learning`** after generating a track preview but before saving it.
     - Rejects forged tokens, non-existent opportunities, and unassociated skills with `400`/`404`.
4. **Database Migration (`learning_tracks`)**:
   - `learning_tracks` is migrated idempotently via `npm run db:init` (`migrateLearningTracksOpportunityColumns` in [`initDb.js`](file:///c:/Users/rahul/OneDrive/Desktop/Skillup_hackathon/server/src/database/initDb.js)) to add:
     - `opportunity_id INT NULL DEFAULT NULL` (with foreign key `ON DELETE SET NULL` referencing `opportunities(id)`)
     - `target_skill VARCHAR(255) NULL DEFAULT NULL`
   - Ordinary tracks created outside the Bridge flow store `NULL` for both columns.
5. **Track Progress, Profile Skill Update & Fresh Opportunity Reanalysis**:
   - Opportunity-linked tracks in **My Tracks** and **Track Detail** display *"Preparing for: [Opportunity Title]"*, *"Target Skill: [Skill]"*, and a **View Opportunity** button.
   - Completing all tasks (`100%` / `Completed`) displays next-step actions (**Update My Skills** and **Reanalyze Opportunity**) while explicitly noting that completing a learning track does not automatically prove skill mastery or official eligibility.
   - **Update My Skills** supports **every** validated opportunity-linked target skill (including skills outside the 9-topic catalog such as `Git`, `Linux`, `C++`, `Java`, `Cloud`, `SQL`, `DBMS`, `DSA`), never auto-marks a skill as `Knows`, and upon saving returns the student to the original opportunity and triggers a fresh `POST /api/opportunities/:id/analyze` call.

---

## Personalized Student Dashboard Architecture (Milestone 8)

### 1. Overview & Visual-First Design
Milestone 8 integrates all SkillUP features into a scannable, visual-first **Personalized Student Dashboard** ([`DashboardView.jsx`](file:///c:/Users/rahul/OneDrive/Desktop/Skillup_hackathon/client/src/components/dashboard/DashboardView.jsx)) that opens as the primary landing page after login. Every count, progress bar, skill chip, and recommendation is computed directly from real MySQL records without calling external YouTube or Gemini APIs when the dashboard loads.

### 2. Dashboard Sections & Components
1. **Personalized Welcome Banner**:
   - Greets the authenticated student by name (`Welcome back, [Name]!`), shows their computing branch and college year badge when available, and presents **one** deterministic primary action:
     - **Complete Your Profile**: Shown when any required Profile field (`Branch / Major`, `College Year`, `Learning Hours / Day`, `Technical & Learning Interests`, `Career Goals`, or `Skills`) is missing, listing the exact missing fields.
     - **Continue Learning**: Shown when the student has at least one active learning track, opening the most recently updated active track.
     - **Discover Learning Resources**: Shown when the student's profile is complete and no tracks have been created yet.
     - **Explore Opportunities**: Shown when the student's profile is complete and all saved learning tracks have reached `100% Completed`.
2. **Dashboard Overview Cards**:
   - **Active Learning Tracks**: Count of active tracks (`activeTracksCount`) alongside completed tracks (`completedTracksCount`).
   - **Completed Learning Tasks**: Total completed tasks (`completedTasksCount`) out of `totalTasksCount` across all tracks owned by the student.
   - **Known Skills**: Count of `Knows` skills (`knownSkillsCount`) plus `+X learning` (`learningSkillsCount`).
   - **Recommended Opportunities**: Count of non-expired opportunities matching the student's skills, interests, and career goals (`recommendedOpportunitiesCount`).
3. **Continue Learning (Active Tracks)**:
   - Displays up to 3 most recently updated active tracks (`ORDER BY lt.updated_at DESC, lt.created_at DESC, lt.id DESC`) with a **View All Tracks →** header action.
   - Each card shows the topic, level, YouTube resource title/channel/duration/thumbnail, `completedTasks / totalTasks`, progress bar (`progressPercentage%`), **Next Incomplete Task** callout (`Day X • Watch/Practice/Revision • Ym`), and a **Continue Learning →** button.
   - For **Opportunity-Linked Tracks (Bridge My Skill Gap)**, displays `Bridge Skill Gap: [Opportunity Title]`, `Target: [Skill]`, and a **View Opportunity →** button (handling deleted/unavailable opportunities gracefully).
4. **Recommended Opportunities**:
   - Reuses Milestone 5's `getRecommendedOpportunitiesFromRows` engine to display up to 3 non-expired recommended opportunities with title, organization, type badge, Unstop badge (when applicable), verified deadline (or `"Check Official Page"`), concise `relevanceReason`, **View Details →**, and **View All Opportunities →**.
5. **My Skills Overview**:
   - Displays **Known Skills (`Knows`)** and **Currently Learning (`Learning`)** as compact visual chips with an **Edit My Skills** (or **+ Add Your Skills**) button opening `ProfileView`.
6. **Recently Completed Tracks**:
   - Displays up to 3 recently completed tracks (`✓ Completed (X/X)`), linked opportunity & target skill (if any), **View Track**, and **Update My Skills** for opportunity-linked tracks.

### 3. How Statistics, Profile Completion & Progress Are Calculated (`GET /api/dashboard`)
| Metric / State | Calculation Rule |
| :--- | :--- |
| **`isProfileComplete`** | `true` only when all 6 required Profile sections are present: non-empty `branch`, valid `college_year` (1–10), `learning_hours_per_day > 0`, $\ge 1$ `interestsList` item, $\ge 1$ `careerGoalsList` item, and $\ge 1$ normalized skill in `user_skills`. |
| **Track `progressPercentage`** | `totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0`. Zero-task tracks safely evaluate to `0%`. |
| **Track `status`** | Derived strictly from actual task completion rows: `totalTasks > 0 && completedTasks === totalTasks ? 'Completed' : 'Active'`. Reopening a completed task immediately updates the track back to `'Active'` in both `My Tracks` and `Dashboard`. |
| **`nextTask`** | Fetched in a single batch SQL query (`WHERE track_id IN (?) AND completed = 0 ORDER BY track_id ASC, day_number ASC, sort_order ASC, id ASC`) with zero N+1 queries. |

### 4. Data-Refresh Behavior & Bidirectional Navigation
- **Fresh Data on Navigation**: Returning to the **Dashboard** tab mounts `DashboardView` and fetches fresh state from `GET /api/dashboard`, immediately reflecting profile edits, skill status toggles, newly created tracks, task completions, and reopened tasks without requiring a browser reload.
- **Anti-Duplicate Request Guard**: `isFetchingRef` prevents duplicate concurrent requests during ordinary React re-renders.
- **Expired Session Handling**: Any `401 Unauthorized` response dispatches a `skillup:unauthorized` window event handled by `AuthContext`, cleanly returning the user to the Sign In screen.
- **Bidirectional Navigation**:
  - `Dashboard ↔ Profile` (preserving `Profile → Learn` on ordinary save and `Bridge My Skill Gap → Profile → Original Opportunity` on Bridge save)
  - `Dashboard ↔ Discover Resources`
  - `Dashboard ↔ My Tracks` (both full list via **View All Tracks →** and direct track detail via **Continue Learning →** / **View Track**)
  - `Dashboard ↔ Opportunities` (both full list via **View All Opportunities →** and specific opportunity detail via **View Details →** / **View Opportunity →**)

### 5. Milestone 8 Backend Endpoint (Protected by JWT Auth)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/dashboard` | Aggregate student profile completion, summary statistics, active tracks + next incomplete tasks, recently completed tracks, skills overview, and top recommended opportunities |

### 6. Manual Testing Instructions (Milestone 8)
1. Sign in or register a new student account at `http://localhost:5173` — verify **Dashboard** opens as the default landing page.
2. For a newly registered student, verify the welcome banner shows **Complete Your Profile →** and lists the missing profile fields.
3. Click **Complete Your Profile →**, select a supported computing branch (e.g., `Computer Science and Engineering (CSE)`), college year, daily study hours, technical interests, career goals, and skills (`Knows` and `Learning`), then save — verify ordinary save navigates to **Discover Resources**.
4. Click **Dashboard** in the top navigation bar — verify the overview cards, **My Skills Overview** chips, and **Recommended Opportunities** reflect your saved profile, and the primary action updates to **Discover Learning Resources →**.
5. Create a learning track from **Discover Resources** (or via **Opportunities → View Details → Learn This Skill →**), complete one or more daily tasks in **My Tracks**, and return to **Dashboard** — verify `Active Learning Tracks`, `Completed Learning Tasks`, the track's progress bar, and the `Next:` incomplete task update immediately.
6. Complete all tasks in a track and return to **Dashboard** — verify the track moves from **Continue Learning** to **Recently Completed Tracks**, and reopening a task moves it back to **Continue Learning**.

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

#### Initialize / Migrate Database Schema & Seed Verified Opportunities
Run the automated schema runner to create `skillup_db`, initialize and migrate all tables (`users`, `profiles`, `user_skills`, `opportunities`, `learning_tracks`, `track_tasks`), and idempotently seed the verified opportunities dataset without losing existing data:
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

# Analyze Student Skills Against Opportunity #1 (Protected - Milestone 6 & 7)
curl -X POST http://localhost:5000/api/opportunities/1/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_jwt_token>"

# Discover Resources for a Validated Opportunity Missing Skill (Protected - Milestone 7)
curl -X POST http://localhost:5000/api/learn/recommend \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_jwt_token>" \
  -d '{"topic":"Git","level":"Beginner","goal":"Prepare for Smart India Hackathon (SIH)","availableTime":"2 hours/day","opportunityId":1,"targetSkill":"Git"}'

# Generate an Opportunity-Linked Track Preview (Protected - Milestone 7)
curl -X POST http://localhost:5000/api/tracks/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_jwt_token>" \
  -d '{"videoId":"-TkoO8Z07hI","topic":"DSA in C++","level":"Beginner","goal":"Prepare for ICPC","availableTime":"1 hour/day","opportunityId":7,"targetSkill":"C++"}'

# List Saved Learning Tracks with Opportunity Context (Protected)
curl http://localhost:5000/api/tracks \
  -H "Authorization: Bearer <your_jwt_token>"

# Retrieve Personalized Student Dashboard Aggregation (Protected - Milestone 8)
curl http://localhost:5000/api/dashboard \
  -H "Authorization: Bearer <your_jwt_token>"
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
  - YouTube Data API v3 integration with authentic video metadata & caching
  - Long-form video filtering (`>= 8 mins`, excluding Shorts)
  - Google Gemini API integration for personalized ranking and explanations (8s time budget)
  - Resilient fallback for Gemini transient spikes
  - Protected recommendation endpoint `POST /api/learn/recommend`
  - Frontend Learn Page with selectable topics, goals, daily times, and resource cards
- [x] **Milestone 4: Personalized Learning Tracks**
  - MySQL tables `learning_tracks` and `track_tasks` with transactional persistence
  - Authoritative YouTube single-video metadata verification (`getYouTubeVideoById`)
  - Gemini personalized study plan generation (`generateTrackSchedule`) with flexible duration, strict daily time limit enforcement, and non-AI fallback
  - Protected REST endpoints (`POST /api/tracks/generate`, `POST /api/tracks`, `GET /api/tracks`, `GET /api/tracks/:id`, `PATCH /api/tracks/:id/tasks/:taskId`)
  - Frontend **Create My Track**, **Track Preview**, **My Tracks**, and **Track Detail** progress tracking views
- [x] **Milestone 5: Opportunity Discovery**
  - MySQL `opportunities` table with multi-edition support (`edition_slug`) and idempotent seeding (`npm run db:init`)
  - 11 individually verified student opportunities across Hackathons, Internships, Competitions, and Workshops
  - Strict separation of `official_eligibility` & `required_skills` from `suggested_skills`
  - Dedicated **Explore General Discovery Platforms** section for general directories (Unstop, Devpost, AICTE, MLH, Kaggle) and specific Unstop listing support
  - Honest status & deadline computation (`Open`, `Upcoming`, `Check Official Page`, `Expired`)
  - Protected endpoints (`GET /api/opportunities`, `GET /api/opportunities/:id`) with explainable profile-based relevance suggestions
  - Frontend **Opportunities** discovery page, filters, search, and **Opportunity Details** view with safe external links
- [x] **Milestone 6: Skill Matching and Gap Analysis**
  - Deterministic skill-comparison service (`skillAnalysis.service.js`) with strict canonical alias matching and non-equivalence protection
  - Protected endpoint `POST /api/opportunities/:id/analyze` retrieving the authenticated student's live profile skills
  - Three-category classification (**Known Skills**, **Currently Learning**, **Skills to Develop**) with plain-language explanations
  - Strict separation between **Official Eligibility**, **Official Focus Areas**, and **Suggested Skill Alignment**
  - Integrated **My Skill Analysis** and **Official Eligibility** UI sections in `OpportunitiesView.jsx`
- [x] **Milestone 7: Bridge My Skill Gap**
  - **Learn This Skill** and **Bridge My Skill Gap** actions in Opportunity Details reusing Milestone 6 `missingSkills`
  - Pre-populated **Discover Resources** view with opportunity context banner, default `Beginner` level, `"Prepare for [Opportunity Title]"` goal, and profile-derived daily time
  - Backend opportunity-skill validation (`validateOpportunitySkillContext`) supporting both predefined catalog topics and non-catalog opportunity skills (`Git`, `Linux`, `C++`, `SQL`, etc.) while preserving validated journeys across `Missing → Learning` updates
  - Safe MySQL schema migration adding `opportunity_id` (`ON DELETE SET NULL`) and `target_skill` to `learning_tracks`
  - Opportunity context in **Track Preview**, **My Tracks**, and **Track Detail**, plus **Update My Skills** and **Reanalyze Opportunity** completion workflow
- [x] **Profile Skill, Branch, Interests & Career Goals Picker Enhancements**
  - **MVP Supported Computing Branches (`PREDEFINED_BRANCH_CATALOG`)**: Single-select searchable Branch / Major dropdown restricted to the 7 supported computing specializations (`Computer Science and Engineering (CSE)`, `CSE – Artificial Intelligence & Machine Learning`, `CSE – Data Science`, `CSE – Cybersecurity`, `CSE – Internet of Things (IoT)`, `Information Technology (IT)`, and `Artificial Intelligence & Data Science (AI & DS)`), with equivalent alias normalization (`CSE`, `Computer Science`, `IT`, `AI & DS`), legacy branch preservation for previously saved profiles, and backend rejection (`400 Bad Request`) of unsupported new branch submissions
  - **Predefined Technical & Learning Interests & Career Goals**: Searchable multi-select dropdowns (`PREDEFINED_INTEREST_CATALOG` and `PREDEFINED_CAREER_GOAL_CATALOG`) with removable chips, duplicate prevention, legacy preservation, backend validation, and compatibility with opportunity relevance recommendations
  - **Searchable Predefined Canonical Skill Catalog**: (`PREDEFINED_SKILL_CATALOG` + verified opportunity skills via `getFullSkillCatalog`) replacing unrestricted free-text profile skill entry
  - **Strict Non-Equivalence**: Preserves distinctions between specific technologies and broader fields (`AWS` $\neq$ `Cloud`, `Git` $\neq$ `GitHub`, `Full-Stack Web Development` $\neq$ `Web Development`, `HTML`/`CSS` $\neq$ `Web Development`, `C++`/`Java` $\neq$ `DSA`/`DSA in C++`/`DSA in Java`, `Python` $\neq$ `Machine Learning`, `React` $\neq$ `JavaScript`, `MySQL`/`MongoDB` $\neq$ `SQL`/`DBMS`/`SQL & DBMS`)
  - **Transactional Normalization & Legacy Preservation**: Normalizes equivalent aliases on profile load/save and `npm run db:init` (preserving `Knows` when merging equivalent aliases such as `JS` + `JavaScript`) and allows students to retain, update, or remove only their own previously saved legacy entries (`SELECT ... FOR UPDATE`), while rejecting newly submitted arbitrary values with `400 Bad Request`
  - **Visual-First Profile Skills Matrix**: Searchable combobox, grouped **Known Skills (`Knows`)** and **Currently Learning (`Learning`)** cards, and an expandable **Browse Full Skill Catalog by Category** browser
- [x] **Milestone 8: Personalized Student Dashboard & Complete Integration**
  - **Dashboard as Primary Home Page**: Opens automatically after login with a dedicated **Dashboard** navigation tab while preserving `Profile → Learn` and `Bridge My Skill Gap → Profile → Original Opportunity` flows
  - **Protected Aggregation Endpoint (`GET /api/dashboard`)**: Parameterized parallel SQL queries with zero N+1 queries and zero YouTube/Gemini API calls on load
  - **Strict Profile Completion & Deterministic Next Action**: Evaluates all 6 required Profile sections (`Branch / Major`, `College Year`, `Learning Hours / Day`, `Technical & Learning Interests`, `Career Goals`, and `Skills`) so partially filled profiles are accurately flagged as incomplete
  - **Consistent Task-Driven Track Progress**: Calculates `progressPercentage` and `Active`/`Completed` status strictly from stored `track_tasks` rows (handling zero-task tracks and reopened tasks identically across `Dashboard` and `My Tracks`)
  - **Visual-First Overview, Continue Learning, Opportunities, Skills & Completed Tracks**: Compact cards prioritized by `updated_at DESC`, next incomplete task preview, Milestone 7 opportunity-linked track integration, shared Milestone 5 opportunity recommendations, and automatic refresh upon returning to the Dashboard
- [x] **Milestone 9: Complete System Testing, Quality Assurance & Stabilization**
  - **Partial Profile Field Preservation**: `PUT /api/profile` preserves existing saved profile fields and skills when omitted from partial update payloads while allowing explicit clearing (`""`, `[]`, `null`, `0`)
  - **Authentication & Input Validation Hardening**: Strict string type and length checks (`name <= 120`, `email <= 254` with RFC-style format validation, `password <= 128`), non-string payload safety on login/register, and `COOKIE_SAMESITE` + `trust proxy` support for HTTPS deployments
  - **Strict Positive-Integer ID Validation**: Rejects partially numeric or malformed route parameters (`1abc`, `1.5`, `-1`, `0`) with `400 Bad Request` across `/api/tracks/:id`, `/api/tracks/:id/tasks/:taskId`, `/api/opportunities/:id`, and `/api/opportunities/:id/analyze`
  - **Central Error Masking & Duplicate Server Guard**: Masks internal `500` error details (`Internal Server Error`) to prevent leaking database/SQL diagnostics, handles malformed JSON request bodies with `400 Malformed JSON request body.`, and guards `server.js` against duplicate port binds (`EADDRINUSE`)

---

## Production & Deployment-Readiness Checklist (Milestone 11 Preparation)

1. **Environment Variables (`server/.env`)**:
   - `NODE_ENV=production` — Enables `secure: true` on `httpOnly` JWT cookies.
   - `PORT=5000` (or platform-assigned `PORT`).
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME=skillup_db` — Production MySQL 8+ credentials.
   - `JWT_SECRET` — Replace development secret with a strong cryptographic random secret ($\ge 32$ bytes).
   - `CLIENT_URL` — Set to the deployed HTTPS frontend origin(s) (comma-separated if multiple, e.g. `https://skillup.example.com`).
   - `COOKIE_SAMESITE` — Defaults to `lax` (same-site deployment). Set to `none` if frontend and backend are deployed on separate domains over HTTPS.
   - `YOUTUBE_API_KEY` — Google Cloud YouTube Data API v3 key.
   - `GEMINI_API_KEY` & `GEMINI_MODEL` — Google Gemini API key and model name (e.g. `gemini-2.5-flash` or `gemini-flash-latest`).
2. **Frontend Environment (`client/.env.production`)**:
   - `VITE_API_URL` — Set to the deployed backend origin (e.g. `https://api.skillup.example.com`), or leave empty (`""`) if `/api` is reverse-proxied from the same origin.
3. **Database Initialization & Migrations**:
   - Run `npm run db:init` inside `server/` once against the production MySQL database to create tables, apply idempotent Milestone 7 columns/foreign keys, normalize skills, and upsert the 11 verified opportunities.
4. **Build & Start Commands**:
   - Frontend build: `cd client && npm install && npm run build` (outputs static bundle to `client/dist/`).
   - Backend start: `cd server && npm install --omit=dev && npm start` (runs `node server.js` with `EADDRINUSE` and `SIGINT`/`SIGTERM` handlers).

---

## Remaining Limitations & Known Scope Boundaries

- **MVP Academic Branch Scope**: New profile branch selections are intentionally scoped to CSE, IT, and closely related computing specializations (`7` canonical branches), while preserving previously saved legacy branches.
- **External API Quota & Availability**: Live YouTube search requires a valid `YOUTUBE_API_KEY` with available daily quota (mitigated by a 15-minute in-memory TTL cache and in-flight request deduplication). Gemini API ranking and schedule generation enforce an 8-second master time budget and fall back deterministically if the model is unavailable or rate-limited.
- **In-Memory Caching**: YouTube search caching and Milestone 7 signed context token replay tracking use process-local memory (appropriate for single-instance MVP deployment; multi-instance horizontal scaling would use Redis).
