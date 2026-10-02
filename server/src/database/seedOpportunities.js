/**
 * Verified Opportunity Dataset & Idempotent Seeder (Milestone 5)
 *
 * Every opportunity below has been individually verified against its official source page.
 * - `official_eligibility` and `required_skills` reflect ONLY what is stated on the official page.
 * - `suggested_skills` stores relevant technical skills separately for SkillUP discovery and
 *   future Milestone 6 skill-gap analysis.
 * - `edition_slug` uniquely identifies each specific event/program edition so multiple editions
 *   of the same program (e.g., MLH Global Hack Week editions) can coexist in MySQL while keeping
 *   imports idempotent via `ON DUPLICATE KEY UPDATE`.
 */

export const VERIFIED_OPPORTUNITIES = [
  {
    edition_slug: 'sih-2026-edition',
    title: 'Smart India Hackathon (SIH) 2026 — Software & Hardware Edition',
    type: 'Hackathon',
    organization: "Ministry of Education's Innovation Cell (MIC) & AICTE",
    description:
      'Premier nationwide open innovation initiative engaging students across India to solve real-world problem statements submitted by Central and State Ministries, Departments, PSUs, Industries, and NGOs across themes including Smart Automation, MedTech, FinTech, Cybersecurity, Space Technology, and Smart Education.',
    deadline: '2026-10-05',
    start_date: '2026-10-02',
    location_mode: 'Hybrid (Campus Internal Hackathon + Nodal Center Grand Finale)',
    official_eligibility:
      'Students enrolled in Higher Education Institutions (HEIs) in India. Teams must be nominated by their respective College/Institute Single Point of Contact (SPOC) following the internal campus hackathon (up to 30 best teams + 5 waitlisted teams per institute).',
    required_skills: [
      'Problem Solving',
      'Idea Pitching & PPT Presentation',
      'Software or Hardware Prototyping',
    ],
    suggested_skills: [
      'Web Development',
      'React',
      'JavaScript',
      'Python',
      'Machine Learning',
      'SQL',
    ],
    source_url: 'https://www.sih.gov.in/',
    status: 'Open',
    last_verified_at: '2026-10-02',
  },
  {
    edition_slug: 'mlh-ghw-hacktoberfest-2026',
    title: 'MLH Global Hack Week: Hacktoberfest 2026',
    type: 'Hackathon',
    organization: 'Major League Hacking (MLH)',
    description:
      'A week-long global hacker festival (October 9–15, 2026) hosted by Major League Hacking in partnership with Hacktoberfest, featuring live technical sessions, hands-on challenges, community networking, and open-weight AI model exploration.',
    deadline: '2026-10-15',
    start_date: '2026-10-09',
    location_mode: 'Online (Global)',
    official_eligibility:
      'Free for anyone, anywhere to participate ("It’s free for anyone, anywhere"). Participants must abide by the MLH Code of Conduct.',
    required_skills: [
      'Open Source Contribution',
      'Open Weight AI Models',
    ],
    suggested_skills: [
      'Git',
      'Python',
      'Machine Learning',
      'JavaScript',
      'Web Development',
    ],
    source_url: 'https://ghw.mlh.io/events/open-source',
    status: 'Upcoming',
    last_verified_at: '2026-10-02',
  },
  {
    edition_slug: 'mlh-ghw-builders-week-2026',
    title: 'MLH Global Hack Week: Builders Week 2026',
    type: 'Hackathon',
    organization: 'Major League Hacking (MLH)',
    description:
      'Spend a week (November 6–12, 2026) building technical projects, completing beginner-friendly daily challenges, and attending live streams with the global MLH community.',
    deadline: '2026-11-12',
    start_date: '2026-11-06',
    location_mode: 'Online (Global)',
    official_eligibility:
      'Free for anyone, anywhere to attend, including beginner developers and students. Participants must follow the MLH Code of Conduct.',
    required_skills: [
      'Project Building',
      'Technical Challenges',
    ],
    suggested_skills: [
      'Web Development',
      'JavaScript',
      'React',
      'Python',
      'Git',
    ],
    source_url: 'https://ghw.mlh.io/events/builders-week',
    status: 'Upcoming',
    last_verified_at: '2026-10-02',
  },
  {
    edition_slug: 'lfx-mentorship-program-2026',
    title: 'Linux Foundation (LFX) Mentorship Program',
    type: 'Internship',
    organization: 'The Linux Foundation',
    description:
      'Structured 12-week full-time and 24-week part-time remote open-source mentorships across Spring (Mar–May), Summer (Jun–Aug), and Fall (Sep–Nov) terms. Mentees learn directly from top open-source project contributors and receive free access to Linux Foundation training and PPP-based stipends ($1,000–$6,600 USD).',
    deadline: null,
    start_date: null,
    location_mode: 'Online (Remote)',
    official_eligibility:
      'Open to developers applying to participating Linux Foundation open-source projects via an LFX Mentee Profile. Mentees are not employees of the Linux Foundation and must receive satisfactory progress evaluations to receive stipend installments. Project-specific application windows open ~4 weeks before each term.',
    required_skills: [
      'Open Source Software Contribution',
      'Version Control & Issue Tracking',
    ],
    suggested_skills: [
      'Operating Systems',
      'Linux',
      'C++',
      'Python',
      'Git',
      'Cloud',
    ],
    source_url: 'https://docs.linuxfoundation.org/lfx/mentorship/mentees',
    status: 'Check Official Page',
    last_verified_at: '2026-10-02',
  },
  {
    edition_slug: 'outreachy-open-source-internships',
    title: 'Outreachy Open Source Paid Remote Internships',
    type: 'Internship',
    organization: 'Software Freedom Conservancy (Outreachy)',
    description:
      'Paid 3-month remote internships ($7,000 USD total stipend) working with experienced mentors in open-source and open-science communities. Projects may include programming, user experience, documentation, graphical design, or data science across two annual cohorts (May–August and December–March).',
    deadline: null,
    start_date: null,
    location_mode: 'Online (Remote)',
    official_eligibility:
      'Open to applicants worldwide who face systemic bias or underrepresentation in the technical industry of their country of residence, have at least 49 consecutive days free from full-time commitments during the internship period, and have not previously been an Outreachy or Google Summer of Code intern. Initial applications run January–February (May cohort) and August–September (December cohort).',
    required_skills: [
      'Open Source Collaboration',
      'Contribution Phase Project Tasks',
    ],
    suggested_skills: [
      'Python',
      'JavaScript',
      'React',
      'Web Development',
      'Git',
    ],
    source_url: 'https://www.outreachy.org/',
    status: 'Check Official Page',
    last_verified_at: '2026-10-02',
  },
  {
    edition_slug: 'google-summer-of-code-global',
    title: 'Google Summer of Code (GSoC)',
    type: 'Internship',
    organization: 'Google Open Source',
    description:
      'Global online mentorship program focused on bringing new contributors into open-source software development. GSoC Contributors work with an accepted open-source mentoring organization on a 12+ week programming project under the guidance of experienced mentors.',
    deadline: null,
    start_date: null,
    location_mode: 'Online (Global)',
    official_eligibility:
      'Open to new and beginner contributors to open-source software development who meet the age, work-eligibility, and program rules published on summerofcode.withgoogle.com/rules. Prospective contributors should reach out to mentoring organizations early and check the official site for the next cohort application window.',
    required_skills: [
      'Open Source Software Development',
      'Programming',
    ],
    suggested_skills: [
      'Python',
      'C++',
      'Java',
      'JavaScript',
      'React',
      'DSA',
    ],
    source_url: 'https://summerofcode.withgoogle.com/',
    status: 'Check Official Page',
    last_verified_at: '2026-10-02',
  },
  {
    edition_slug: 'icpc-collegiate-programming-contest',
    title: 'The ICPC International Collegiate Programming Contest',
    type: 'Competition',
    organization: 'ICPC Foundation',
    description:
      'The oldest, largest, and most prestigious algorithmic programming contest for college students worldwide. Teams of three students representing their university work together under pressure to solve complex algorithmic and mathematical problems across regional qualifiers and World Finals.',
    deadline: null,
    start_date: null,
    location_mode: 'On-site / Regional & World Finals',
    official_eligibility:
      'College students competing in teams of three representing their university. Regional contest registration dates and specific eligibility rules vary by regional contest site on icpc.global.',
    required_skills: [
      'Algorithmic Programming',
      'Problem Solving Under Pressure',
      'Team Collaboration',
    ],
    suggested_skills: [
      'DSA',
      'DSA in C++',
      'DSA in Java',
      'C++',
      'Java',
      'Python',
    ],
    source_url: 'https://icpc.global/',
    status: 'Check Official Page',
    last_verified_at: '2026-10-02',
  },
  {
    edition_slug: 'microsoft-imagine-cup-startups',
    title: 'Microsoft Imagine Cup — Global Student Startups Competition',
    type: 'Competition',
    organization: 'Microsoft',
    description:
      'Global student technology and startup competition organized by Microsoft where student founders build innovative AI and cloud-powered software solutions to address real-world challenges, gain mentorship, and compete on the world stage.',
    deadline: null,
    start_date: null,
    location_mode: 'Online & Global Finals',
    official_eligibility:
      'Student competitors building technology startups. Full student enrollment, age, and category submission rules require registering or signing in on the official Microsoft Imagine Cup portal.',
    required_skills: [
      'Software Prototyping',
      'Cloud & AI Solution Design',
      'Startup Pitching',
    ],
    suggested_skills: [
      'Machine Learning',
      'Web Development',
      'React',
      'JavaScript',
      'Python',
    ],
    source_url: 'https://imaginecup.microsoft.com/en-us',
    status: 'Check Official Page',
    last_verified_at: '2026-10-02',
  },
  {
    edition_slug: 'aws-educate-cloud-hands-on-labs',
    title: 'AWS Educate: Cloud Computing & Databases Hands-On Labs',
    type: 'Workshop',
    organization: 'Amazon Web Services (AWS)',
    description:
      'No-cost, self-paced interactive cloud workshops and hands-on labs developed by AWS experts. Includes practical labs on Amazon S3 (Storage), Amazon EC2 (Compute), Amazon VPC (Networking), Amazon RDS (Databases), and Cloud Operations, with digital badges upon completion.',
    deadline: null,
    start_date: null,
    location_mode: 'Online (Self-Paced Hands-On Labs)',
    official_eligibility:
      'Open to any individual aged 13 or older with an email address, regardless of where they are in their education, technical experience, or career journey (no credit card required). Learners aged 18+ also gain access to the AWS Educate Job Board.',
    required_skills: [
      'Amazon EC2 (Compute)',
      'Amazon S3 (Storage)',
      'Amazon RDS (Relational Databases)',
      'Amazon VPC (Networking)',
    ],
    suggested_skills: [
      'SQL',
      'SQL & DBMS',
      'DBMS',
      'Operating Systems',
      'Web Development',
    ],
    source_url: 'https://aws.amazon.com/education/awseducate/',
    status: 'Open',
    last_verified_at: '2026-10-02',
  },
  {
    edition_slug: 'github-skills-intro-to-github',
    title: 'GitHub Skills: Introduction to GitHub Interactive Workshop',
    type: 'Workshop',
    organization: 'GitHub',
    description:
      'Interactive, automated hands-on workshop guided by GitHub Actions that teaches repositories, branches, commits, Markdown profile READMEs, and pull requests in less than one hour.',
    deadline: null,
    start_date: null,
    location_mode: 'Online (Interactive GitHub Repository)',
    official_eligibility:
      'Open to new developers, new GitHub users, and students with a free GitHub account. Prerequisites: None.',
    required_skills: [
      'GitHub Repositories & Branches',
      'Commits & Pull Requests',
      'Markdown Formatting',
    ],
    suggested_skills: [
      'Git',
      'Web Development',
      'JavaScript',
      'Python',
      'React',
    ],
    source_url: 'https://github.com/skills/introduction-to-github',
    status: 'Open',
    last_verified_at: '2026-10-02',
  },
  {
    edition_slug: 'mlh-ghw-data-week-2026-past',
    title: 'MLH Global Hack Week: Data Week 2026 (Past Edition)',
    type: 'Hackathon',
    organization: 'Major League Hacking (MLH)',
    description:
      'Week-long MLH community event (September 11–17, 2026) dedicated to data engineering and analytics, teaching job-ready technical skills including programming in SQL, implementing databases, and building data visualizations.',
    deadline: '2026-09-17',
    start_date: '2026-09-11',
    location_mode: 'Online (Global)',
    official_eligibility:
      'Free for anyone, anywhere. Note: This specific September 2026 edition has concluded; see upcoming Global Hack Week editions for active registration.',
    required_skills: [
      'SQL Programming',
      'Database Implementation',
      'Data Visualization',
    ],
    suggested_skills: [
      'SQL & DBMS',
      'SQL',
      'DBMS',
      'Python',
      'Machine Learning',
    ],
    source_url: 'https://ghw.mlh.io/events/data-week',
    status: 'Expired',
    last_verified_at: '2026-10-02',
  },
];

/**
 * General Opportunity Discovery Platforms
 * Kept separate from individual opportunities per Milestone 5 guidelines so general portals
 * are never misrepresented as single events.
 */
export const EXPLORE_PLATFORMS = [
  {
    id: 'platform-unstop',
    name: 'Unstop',
    category: 'Hackathons, Internships & Competitions',
    organization: 'Unstop',
    description:
      'Discover hackathons, internships, competitions and other student opportunities.',
    url: 'https://unstop.com/',
    buttonLabel: 'Explore Unstop',
  },
  {
    id: 'platform-devpost',
    name: 'Devpost Hackathons Directory',
    category: 'Hackathons',
    organization: 'Devpost',
    description:
      'Browse hundreds of online and in-person student and developer hackathons worldwide by theme, prize pool, and deadline.',
    url: 'https://devpost.com/hackathons',
    buttonLabel: 'Visit Directory',
  },
  {
    id: 'platform-aicte-internship',
    name: 'AICTE National Internship Portal',
    category: 'Internships',
    organization: 'All India Council for Technical Education (AICTE)',
    description:
      'Official Government of India portal connecting Indian engineering and diploma students with verified government and corporate internships.',
    url: 'https://internship.aicte-india.org/',
    buttonLabel: 'Visit Directory',
  },
  {
    id: 'platform-mlh-season',
    name: 'Major League Hacking (MLH) Season Events',
    category: 'Hackathons & Workshops',
    organization: 'Major League Hacking',
    description:
      'Official directory of student hackathons and monthly Global Hack Week events accredited by Major League Hacking.',
    url: 'https://mlh.io/seasons/2026/events',
    buttonLabel: 'Visit Directory',
  },
  {
    id: 'platform-kaggle-competitions',
    name: 'Kaggle Machine Learning Competitions',
    category: 'Competitions',
    organization: 'Kaggle (Google)',
    description:
      'Explore ongoing data science, machine learning, and AI competitions ranging from Getting Started benchmarks to research challenges.',
    url: 'https://www.kaggle.com/competitions',
    buttonLabel: 'Visit Directory',
  },
];

/**
 * Upserts all verified opportunities into the MySQL `opportunities` table idempotently.
 * Uses `edition_slug` as the unique key so multiple editions of the same program are stored
 * separately without creating duplicates on repeated runs.
 *
 * @param {import('mysql2/promise').Connection | import('mysql2/promise').Pool} db
 */
export async function seedOpportunities(db) {
  const upsertSql = `
    INSERT INTO opportunities (
      edition_slug,
      title,
      type,
      organization,
      description,
      deadline,
      start_date,
      location_mode,
      official_eligibility,
      required_skills,
      suggested_skills,
      source_url,
      status,
      last_verified_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      title = VALUES(title),
      type = VALUES(type),
      organization = VALUES(organization),
      description = VALUES(description),
      deadline = VALUES(deadline),
      start_date = VALUES(start_date),
      location_mode = VALUES(location_mode),
      official_eligibility = VALUES(official_eligibility),
      required_skills = VALUES(required_skills),
      suggested_skills = VALUES(suggested_skills),
      source_url = VALUES(source_url),
      status = VALUES(status),
      last_verified_at = VALUES(last_verified_at)
  `;

  let count = 0;
  for (const opp of VERIFIED_OPPORTUNITIES) {
    await db.query(upsertSql, [
      opp.edition_slug,
      opp.title,
      opp.type,
      opp.organization,
      opp.description,
      opp.deadline,
      opp.start_date,
      opp.location_mode,
      opp.official_eligibility,
      JSON.stringify(opp.required_skills),
      JSON.stringify(opp.suggested_skills),
      opp.source_url,
      opp.status,
      opp.last_verified_at,
    ]);
    count += 1;
  }

  return count;
}
