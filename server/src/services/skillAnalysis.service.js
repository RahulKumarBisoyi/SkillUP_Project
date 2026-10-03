import crypto from 'crypto';

/**
 * Deterministic Skill Matching and Gap Analysis Service (Milestone 6 & 7)
 *
 * Compares a student's latest saved profile skills (`Knows` / `Learning`) against
 * an opportunity's associated technical skills, and provides secure validation
 * for the Milestone 7 Bridge My Skill Gap learning journey.
 *
 * Key Guarantees:
 * 1. Purely deterministic, case-insensitive, whitespace-normalized comparison.
 * 2. Supports only genuinely equivalent skill aliases (e.g., JS <-> JavaScript,
 *    Py <-> Python, ML <-> Machine Learning, C++ <-> CPP).
 * 3. Never equates distinct or broader/narrower skills (e.g., C++ != DSA,
 *    Python != Machine Learning, React != JavaScript, HTML != Web Development,
 *    Git != GitHub, Full-Stack Web Development != Web Development).
 * 4. Strictly separates:
 *    - Verified Mandatory Skill Requirements
 *    - Official Focus Areas / Domains (published on the source page)
 *    - Suggested Technical Skills (inferred for preparation/alignment)
 * 5. Never declares a student officially eligible even when all associated skills match,
 *    and never produces arbitrary numerical match scores.
 */

export const PREDEFINED_LEARNING_TOPICS = [
  'DSA in C++',
  'DSA in Java',
  'Python',
  'JavaScript',
  'React',
  'Web Development',
  'SQL & DBMS',
  'Machine Learning',
  'Operating Systems',
];

const BRIDGE_JOURNEY_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const validatedBridgeJourneys = new Map();

function getBridgeHmacSecret() {
  return process.env.JWT_SECRET || 'skillup_milestone7_bridge_context_secret';
}


const STRICT_ALIAS_TO_CANONICAL = new Map([
  // JavaScript
  ['javascript', 'javascript'],
  ['js', 'javascript'],
  ['ecmascript', 'javascript'],

  // TypeScript
  ['typescript', 'typescript'],
  ['ts', 'typescript'],

  // Python
  ['python', 'python'],
  ['py', 'python'],
  ['python3', 'python'],
  ['python 3', 'python'],

  // C++
  ['c++', 'c++'],
  ['cpp', 'c++'],
  ['c plus plus', 'c++'],

  // C#
  ['c#', 'c#'],
  ['csharp', 'c#'],
  ['c sharp', 'c#'],

  // React
  ['react', 'react'],
  ['reactjs', 'react'],
  ['react.js', 'react'],

  // Node.js
  ['node.js', 'node.js'],
  ['nodejs', 'node.js'],

  // DSA
  ['dsa', 'dsa'],
  ['data structures and algorithms', 'dsa'],
  ['data structures & algorithms', 'dsa'],

  // DSA in C++
  ['dsa in c++', 'dsa in c++'],
  ['data structures and algorithms in c++', 'dsa in c++'],
  ['data structures & algorithms in c++', 'dsa in c++'],

  // DSA in Java
  ['dsa in java', 'dsa in java'],
  ['data structures and algorithms in java', 'dsa in java'],
  ['data structures & algorithms in java', 'dsa in java'],

  // SQL
  ['sql', 'sql'],
  ['structured query language', 'sql'],

  // DBMS
  ['dbms', 'dbms'],
  ['database management systems', 'dbms'],
  ['database management system', 'dbms'],

  // SQL & DBMS
  ['sql & dbms', 'sql & dbms'],
  ['sql and dbms', 'sql & dbms'],
  ['dbms & sql', 'sql & dbms'],
  ['dbms and sql', 'sql & dbms'],

  // Machine Learning
  ['machine learning', 'machine learning'],
  ['ml', 'machine learning'],

  // Operating Systems
  ['operating systems', 'operating systems'],
  ['operating system', 'operating systems'],
  ['os', 'operating systems'],

  // AWS (distinct from general Cloud Computing)
  ['aws', 'aws'],
  ['amazon web services', 'aws'],

  // Cloud (general Cloud Computing, distinct from AWS)
  ['cloud', 'cloud'],
  ['cloud computing', 'cloud'],

  // Linux
  ['linux', 'linux'],
  ['gnu/linux', 'linux'],
]);

/**
 * Authoritative Predefined Skill Catalog shared across Profile Skill Picker,
 * Learning Resource Discovery, Opportunity Recommendations, Milestone 6 Skill
 * Analysis, and Milestone 7 Bridge My Skill Gap.
 */
export const PREDEFINED_SKILL_CATALOG = [
  // 1. Programming Languages
  {
    name: 'Python',
    category: 'Programming Languages',
    aliases: ['Py', 'Python 3', 'Python3'],
    isLearningTopic: true,
  },
  {
    name: 'JavaScript',
    category: 'Programming Languages',
    aliases: ['JS', 'ECMAScript'],
    isLearningTopic: true,
  },
  {
    name: 'TypeScript',
    category: 'Programming Languages',
    aliases: ['TS'],
    isLearningTopic: false,
  },
  {
    name: 'C++',
    category: 'Programming Languages',
    aliases: ['CPP', 'C Plus Plus'],
    isLearningTopic: false,
  },
  {
    name: 'Java',
    category: 'Programming Languages',
    aliases: [],
    isLearningTopic: false,
  },
  {
    name: 'C#',
    category: 'Programming Languages',
    aliases: ['CSharp', 'C Sharp'],
    isLearningTopic: false,
  },

  // 2. Data Structures & Algorithms
  {
    name: 'DSA',
    category: 'Data Structures & Algorithms',
    aliases: ['Data Structures and Algorithms', 'Data Structures & Algorithms'],
    isLearningTopic: false,
  },
  {
    name: 'DSA in C++',
    category: 'Data Structures & Algorithms',
    aliases: [
      'Data Structures and Algorithms in C++',
      'Data Structures & Algorithms in C++',
    ],
    isLearningTopic: true,
  },
  {
    name: 'DSA in Java',
    category: 'Data Structures & Algorithms',
    aliases: [
      'Data Structures and Algorithms in Java',
      'Data Structures & Algorithms in Java',
    ],
    isLearningTopic: true,
  },

  // 3. Web & Application Development
  {
    name: 'Web Development',
    category: 'Web & Application Development',
    aliases: [],
    isLearningTopic: true,
  },
  {
    name: 'Full-Stack Web Development',
    category: 'Web & Application Development',
    aliases: [],
    isLearningTopic: false,
  },
  {
    name: 'React',
    category: 'Web & Application Development',
    aliases: ['ReactJS', 'React.js'],
    isLearningTopic: true,
  },
  {
    name: 'Node.js',
    category: 'Web & Application Development',
    aliases: ['NodeJS'],
    isLearningTopic: false,
  },
  {
    name: 'HTML',
    category: 'Web & Application Development',
    aliases: [],
    isLearningTopic: false,
  },
  {
    name: 'CSS',
    category: 'Web & Application Development',
    aliases: [],
    isLearningTopic: false,
  },

  // 4. Databases & Data
  {
    name: 'SQL & DBMS',
    category: 'Databases & Data',
    aliases: ['SQL and DBMS', 'DBMS & SQL', 'DBMS and SQL'],
    isLearningTopic: true,
  },
  {
    name: 'SQL',
    category: 'Databases & Data',
    aliases: ['Structured Query Language'],
    isLearningTopic: false,
  },
  {
    name: 'DBMS',
    category: 'Databases & Data',
    aliases: ['Database Management Systems', 'Database Management System'],
    isLearningTopic: false,
  },
  {
    name: 'MySQL',
    category: 'Databases & Data',
    aliases: [],
    isLearningTopic: false,
  },
  {
    name: 'MongoDB',
    category: 'Databases & Data',
    aliases: [],
    isLearningTopic: false,
  },

  // 5. AI, Cloud & Systems
  {
    name: 'Machine Learning',
    category: 'AI, Cloud & Systems',
    aliases: ['ML'],
    isLearningTopic: true,
  },
  {
    name: 'Operating Systems',
    category: 'AI, Cloud & Systems',
    aliases: ['OS', 'Operating System'],
    isLearningTopic: true,
  },
  {
    name: 'Linux',
    category: 'AI, Cloud & Systems',
    aliases: ['GNU/Linux'],
    isLearningTopic: false,
  },
  {
    name: 'Cloud',
    category: 'AI, Cloud & Systems',
    aliases: ['Cloud Computing'],
    isLearningTopic: false,
  },
  {
    name: 'AWS',
    category: 'AI, Cloud & Systems',
    aliases: ['Amazon Web Services'],
    isLearningTopic: false,
  },

  // 6. Developer Tools & DevOps
  {
    name: 'Git',
    category: 'Developer Tools & DevOps',
    aliases: [],
    isLearningTopic: false,
  },
  {
    name: 'GitHub',
    category: 'Developer Tools & DevOps',
    aliases: [],
    isLearningTopic: false,
  },
  {
    name: 'Docker',
    category: 'Developer Tools & DevOps',
    aliases: [],
    isLearningTopic: false,
  },
];

/**
 * Normalize whitespace and case of a raw skill string.
 */
export function normalizeSkillString(rawSkill) {
  return String(rawSkill || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Convert a skill string to its canonical identifier using only genuinely
 * equivalent aliases. If not in the alias table, returns the normalized string.
 */
export function getCanonicalSkillKey(rawSkill) {
  const normalized = normalizeSkillString(rawSkill);
  if (!normalized) return '';
  return STRICT_ALIAS_TO_CANONICAL.get(normalized) || normalized;
}

/**
 * Check whether two skill strings refer to the exact same canonical skill.
 */
export function areSkillsEquivalent(skillA, skillB) {
  const keyA = getCanonicalSkillKey(skillA);
  const keyB = getCanonicalSkillKey(skillB);
  if (!keyA || !keyB) return false;
  return keyA === keyB;
}

/**
 * Resolve a raw skill string against PREDEFINED_SKILL_CATALOG (and any optional
 * verified opportunity skills from the database). Returns the canonical skill
 * entry `{ name, category, aliases, isLearningTopic }` if valid, or `null` if
 * the skill is not part of the supported catalog.
 */
export function resolveCanonicalCatalogSkill(rawSkill, extraCatalogEntries = []) {
  const key = getCanonicalSkillKey(rawSkill);
  if (!key) return null;

  for (const item of PREDEFINED_SKILL_CATALOG) {
    if (getCanonicalSkillKey(item.name) === key) {
      return item;
    }
  }

  for (const item of extraCatalogEntries) {
    if (item && item.name && getCanonicalSkillKey(item.name) === key) {
      return item;
    }
  }

  return null;
}

/**
 * Retrieve the full canonical skill catalog, dynamically including any verified
 * technical skills associated with opportunities in the MySQL `opportunities`
 * table that are not already in `PREDEFINED_SKILL_CATALOG`.
 */
export async function getFullSkillCatalog(pool) {
  const catalog = [...PREDEFINED_SKILL_CATALOG];
  const seenKeys = new Set(catalog.map((item) => getCanonicalSkillKey(item.name)));

  if (!pool) return catalog;

  try {
    const [rows] = await pool.query(
      `SELECT required_skills, suggested_skills FROM opportunities`
    );
    for (const row of rows) {
      let suggested = [];
      let required = [];
      try {
        suggested = Array.isArray(row.suggested_skills)
          ? row.suggested_skills
          : JSON.parse(row.suggested_skills || '[]');
      } catch {
        suggested = [];
      }
      try {
        required = Array.isArray(row.required_skills)
          ? row.required_skills
          : JSON.parse(row.required_skills || '[]');
      } catch {
        required = [];
      }

      // Include all skills from both required_skills and suggested_skills
      const associatedSkills = [
        ...(Array.isArray(required) ? required : []),
        ...(Array.isArray(suggested) ? suggested : []),
      ];

      if (associatedSkills.length > 0) {
        for (const raw of associatedSkills) {
          const trimmed = String(raw || '').trim();
          const key = getCanonicalSkillKey(trimmed);
          if (trimmed && key && !seenKeys.has(key)) {
            seenKeys.add(key);
            catalog.push({
              name: trimmed,
              category: 'Opportunity-Specific Skills',
              aliases: [],
              isLearningTopic: false,
            });
          }
        }
      }
    }
  } catch {
    // Fallback to static PREDEFINED_SKILL_CATALOG if query fails
  }

  return catalog;
}

/**
 * Predefined Engineering Technical & Learning Interests Catalog.
 */
export const PREDEFINED_INTERESTS_CATALOG = [
  {
    name: 'Web Development',
    category: 'Web & Mobile',
    aliases: ['Web', 'Web App Development', 'Web Applications'],
  },
  {
    name: 'Full-Stack Web Development',
    category: 'Web & Mobile',
    aliases: ['Full-Stack', 'Full Stack Development', 'Full-Stack Development'],
  },
  {
    name: 'Frontend Engineering',
    category: 'Web & Mobile',
    aliases: ['Frontend', 'Frontend Development', 'UI/UX Engineering'],
  },
  {
    name: 'Backend Engineering',
    category: 'Web & Mobile',
    aliases: ['Backend', 'Backend Development', 'APIs & Microservices'],
  },
  {
    name: 'Mobile App Development',
    category: 'Web & Mobile',
    aliases: ['Mobile Apps', 'Mobile Development', 'Android & iOS'],
  },
  {
    name: 'Data Structures & Algorithms',
    category: 'Algorithms & Programming',
    aliases: ['DSA', 'Algorithms'],
  },
  {
    name: 'Competitive Programming',
    category: 'Algorithms & Programming',
    aliases: ['CP', 'Algorithmic Programming', 'Sports Programming'],
  },
  {
    name: 'Machine Learning',
    category: 'AI & Data',
    aliases: [
      'ML',
      'AI',
      'Artificial Intelligence',
      'AI & ML',
      'Artificial Intelligence & Machine Learning',
    ],
  },
  {
    name: 'Data Science & Analytics',
    category: 'AI & Data',
    aliases: ['Data Science', 'Data Analytics', 'Big Data'],
  },
  {
    name: 'Database Systems',
    category: 'AI & Data',
    aliases: ['Databases', 'SQL & DBMS', 'DBMS'],
  },
  {
    name: 'Cloud Computing',
    category: 'Cloud, Systems & Security',
    aliases: ['Cloud', 'Cloud Infrastructure', 'AWS & Cloud'],
  },
  {
    name: 'DevOps & Automation',
    category: 'Cloud, Systems & Security',
    aliases: ['DevOps', 'CI/CD', 'Site Reliability'],
  },
  {
    name: 'Open Source',
    category: 'Cloud, Systems & Security',
    aliases: ['Open Source Contribution', 'FOSS', 'OSS'],
  },
  {
    name: 'Systems Programming',
    category: 'Cloud, Systems & Security',
    aliases: ['Systems', 'Operating Systems', 'Linux & Systems'],
  },
  {
    name: 'Distributed Systems',
    category: 'Cloud, Systems & Security',
    aliases: ['Scalable Systems', 'High Performance Computing'],
  },
  {
    name: 'Cybersecurity',
    category: 'Cloud, Systems & Security',
    aliases: ['Security', 'Information Security', 'Network Security'],
  },
  {
    name: 'Embedded Systems & IoT',
    category: 'Cloud, Systems & Security',
    aliases: ['Embedded Systems', 'IoT', 'Hardware & Robotics'],
  },
];

/**
 * Predefined Engineering Career Goals Catalog.
 */
export const PREDEFINED_CAREER_GOALS_CATALOG = [
  {
    name: 'Software Engineer',
    category: 'Engineering Roles',
    aliases: ['SDE', 'Software Developer', 'Software Engineering'],
  },
  {
    name: 'Software Engineering Internship',
    category: 'Internships & Early Career',
    aliases: [
      'SDE Intern',
      'Summer Software Engineering Internship',
      'Internship',
      'Software Engineering Internship & Full-Stack Product Roles',
    ],
  },
  {
    name: 'Full-Stack Developer',
    category: 'Engineering Roles',
    aliases: ['Full-Stack Engineer', 'Full Stack Developer'],
  },
  {
    name: 'Frontend Engineer',
    category: 'Engineering Roles',
    aliases: ['Frontend Developer', 'UI Engineer'],
  },
  {
    name: 'Backend Engineer',
    category: 'Engineering Roles',
    aliases: ['Backend Developer', 'Systems & API Engineer'],
  },
  {
    name: 'Machine Learning Engineer',
    category: 'AI, Data & Cloud Roles',
    aliases: ['ML Engineer', 'AI Engineer'],
  },
  {
    name: 'Data Scientist / Data Analyst',
    category: 'AI, Data & Cloud Roles',
    aliases: ['Data Scientist', 'Data Analyst', 'Data Engineer'],
  },
  {
    name: 'Cloud & DevOps Engineer',
    category: 'AI, Data & Cloud Roles',
    aliases: ['Cloud Engineer', 'DevOps Engineer', 'Site Reliability Engineer', 'SRE'],
  },
  {
    name: 'Systems & Infrastructure Engineer',
    category: 'Engineering Roles',
    aliases: ['Systems Engineer', 'Linux / Kernel Developer'],
  },
  {
    name: 'Cybersecurity Engineer',
    category: 'AI, Data & Cloud Roles',
    aliases: ['Security Engineer', 'Cybersecurity Analyst'],
  },
  {
    name: 'Mobile Application Developer',
    category: 'Engineering Roles',
    aliases: ['Mobile Engineer', 'Android / iOS Developer'],
  },
  {
    name: 'Open Source Contributor',
    category: 'Competitions & Community',
    aliases: [
      'Open Source Mentee',
      'GSoC / LFX Contributor',
      'Win hackathons and build open-source projects',
    ],
  },
  {
    name: 'Hackathon Finalist & Builder',
    category: 'Competitions & Community',
    aliases: ['Hackathons', 'Hackathon Winner', 'Crack Google Hackathon'],
  },
  {
    name: 'Competitive Programmer',
    category: 'Competitions & Community',
    aliases: ['ICPC Contestant', 'Algorithmic Competitor'],
  },
  {
    name: 'Product Engineering & Startups',
    category: 'Internships & Early Career',
    aliases: ['Product Engineer', 'Founding Engineer'],
  },
  {
    name: 'Higher Studies & Research',
    category: 'Internships & Early Career',
    aliases: ['Research Intern', 'MS / PhD Research', 'R&D Engineer'],
  },
];

/**
 * Predefined MVP Supported Branches Catalog (CSE, IT, and related specializations).
 */
export const PREDEFINED_BRANCH_CATALOG = [
  {
    name: 'Computer Science and Engineering (CSE)',
    category: 'Core Computing',
    aliases: [
      'CSE',
      'CS',
      'Computer Science',
      'Computer Science & Engineering',
      'Computer Science and Engineering',
      'Computer Science & Engineering (CSE)',
      'B.Tech CSE',
      'B.E. CSE',
    ],
  },
  {
    name: 'CSE – Artificial Intelligence & Machine Learning',
    category: 'CSE Specialization',
    aliases: [
      'CSE - Artificial Intelligence & Machine Learning',
      'CSE (AI & ML)',
      'CSE - AI & ML',
      'CSE – AI & ML',
      'CSE AIML',
      'CSE - AIML',
      'CSE – AIML',
      'Computer Science (AI & ML)',
    ],
  },
  {
    name: 'CSE – Data Science',
    category: 'CSE Specialization',
    aliases: [
      'CSE - Data Science',
      'CSE (Data Science)',
      'CSE (DS)',
      'CSE - DS',
      'CSE – DS',
      'Computer Science (Data Science)',
    ],
  },
  {
    name: 'CSE – Cybersecurity',
    category: 'CSE Specialization',
    aliases: [
      'CSE - Cybersecurity',
      'CSE (Cybersecurity)',
      'CSE - Cyber Security',
      'CSE – Cyber Security',
      'Computer Science (Cybersecurity)',
    ],
  },
  {
    name: 'CSE – Internet of Things (IoT)',
    category: 'CSE Specialization',
    aliases: [
      'CSE - Internet of Things (IoT)',
      'CSE - IoT',
      'CSE – IoT',
      'CSE (IoT)',
      'CSE - Internet of Things',
      'CSE – Internet of Things',
    ],
  },
  {
    name: 'Information Technology (IT)',
    category: 'Core Computing',
    aliases: ['IT', 'Information Technology', 'B.Tech IT', 'B.E. IT'],
  },
  {
    name: 'Artificial Intelligence & Data Science (AI & DS)',
    category: 'AI & Data Specialization',
    aliases: [
      'AI & DS',
      'AIDS',
      'AI and DS',
      'Artificial Intelligence and Data Science',
      'Artificial Intelligence & Data Science',
      'Artificial Intelligence and Data Science (AI & DS)',
    ],
  },
];

function normalizeOptionComparisonKey(str) {
  return String(str || '')
    .replace(/[–—]/g, '-')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Resolve a raw option string against a predefined catalog (matching canonical name or aliases).
 */
export function resolveCanonicalCatalogOption(rawOption, catalog = []) {
  const norm = normalizeOptionComparisonKey(rawOption);
  if (!norm) return null;

  for (const item of catalog) {
    if (normalizeOptionComparisonKey(item.name) === norm) {
      return item;
    }
    if (
      Array.isArray(item.aliases) &&
      item.aliases.some((alias) => normalizeOptionComparisonKey(alias) === norm)
    ) {
      return item;
    }
  }
  return null;
}

/**
 * Normalize and validate the single-select Branch / Major profile field.
 * - Empty string is allowed (optional field before selection).
 * - Resolves supported branches and genuinely equivalent aliases to canonical names.
 * - Preserves a student's own previously saved legacy branch without silently overwriting or deleting it.
 * - Rejects newly submitted unsupported branch values with 400 Bad Request.
 */
export function normalizeAndValidateProfileBranch({
  rawBranch,
  existingSavedBranch = '',
  allowAllExistingAsLegacy = false,
}) {
  if (rawBranch === null || rawBranch === undefined || rawBranch === '') {
    return { valid: true, branch: '', isLegacy: false };
  }
  if (typeof rawBranch !== 'string') {
    return {
      valid: false,
      message: 'Branch / Major must be a valid string.',
      branch: '',
      isLegacy: false,
    };
  }

  const trimmed = rawBranch.trim();
  if (!trimmed) {
    return { valid: true, branch: '', isLegacy: false };
  }

  const catalogMatch = resolveCanonicalCatalogOption(
    trimmed,
    PREDEFINED_BRANCH_CATALOG
  );
  if (catalogMatch) {
    return {
      valid: true,
      branch: catalogMatch.name,
      isLegacy: false,
    };
  }

  const existingTrimmed =
    typeof existingSavedBranch === 'string' ? existingSavedBranch.trim() : '';
  const isExistingLegacyMatch =
    existingTrimmed &&
    !resolveCanonicalCatalogOption(existingTrimmed, PREDEFINED_BRANCH_CATALOG) &&
    normalizeOptionComparisonKey(trimmed) ===
      normalizeOptionComparisonKey(existingTrimmed);

  if (allowAllExistingAsLegacy || isExistingLegacyMatch) {
    return {
      valid: true,
      branch: existingTrimmed || trimmed,
      isLegacy: true,
    };
  }

  return {
    valid: false,
    message: `Unsupported branch "${trimmed}". SkillUP currently supports CSE, IT and related specializations.`,
    branch: '',
    isLegacy: false,
  };
}


/**
 * Parse a comma/semicolon/pipe-separated string or array of strings into trimmed tokens.
 */
export function parseProfileMultiSelectTokens(rawInput) {
  if (rawInput === null || rawInput === undefined || rawInput === '') {
    return { valid: true, tokens: [] };
  }
  if (Array.isArray(rawInput)) {
    const tokens = [];
    for (const entry of rawInput) {
      if (typeof entry === 'string') {
        const trimmed = entry.trim();
        if (trimmed) tokens.push(trimmed);
      } else if (entry && typeof entry === 'object' && typeof entry.name === 'string') {
        const trimmed = entry.name.trim();
        if (trimmed) tokens.push(trimmed);
      } else {
        return { valid: false, tokens: [] };
      }
    }
    return { valid: true, tokens };
  }
  if (typeof rawInput === 'string') {
    const tokens = rawInput
      .split(/[,;|]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return { valid: true, tokens };
  }
  return { valid: false, tokens: [] };
}

/**
 * Normalize, deduplicate, and validate a multi-select profile field (Interests or Career Goals).
 * - Resolves catalog items and aliases to canonical names.
 * - Allows retaining only the student's own previously saved legacy tokens.
 * - Rejects newly submitted arbitrary values when allowAllExistingAsLegacy is false.
 */
export function normalizeAndValidateProfileMultiSelect({
  rawInput,
  catalog,
  existingSavedRaw = '',
  fieldLabel = 'option',
  allowAllExistingAsLegacy = false,
}) {
  const parsed = parseProfileMultiSelectTokens(rawInput);
  if (!parsed.valid) {
    return {
      valid: false,
      message: `${fieldLabel} must be an array of strings or a comma-separated string.`,
      items: [],
      serialized: '',
    };
  }

  const existingLegacyMap = new Map();
  const existingParsed = parseProfileMultiSelectTokens(existingSavedRaw);
  for (const tok of existingParsed.tokens) {
    if (!resolveCanonicalCatalogOption(tok, catalog)) {
      existingLegacyMap.set(normalizeSkillString(tok), tok);
    }
  }
  const fullExistingTrimmed =
    typeof existingSavedRaw === 'string' ? existingSavedRaw.trim() : '';
  if (
    fullExistingTrimmed &&
    !resolveCanonicalCatalogOption(fullExistingTrimmed, catalog)
  ) {
    existingLegacyMap.set(
      normalizeSkillString(fullExistingTrimmed),
      fullExistingTrimmed
    );
  }

  const dedupMap = new Map();
  for (const token of parsed.tokens) {
    const catalogMatch = resolveCanonicalCatalogOption(token, catalog);
    if (catalogMatch) {
      const key = normalizeSkillString(catalogMatch.name);
      if (!dedupMap.has(key)) {
        dedupMap.set(key, {
          name: catalogMatch.name,
          category: catalogMatch.category,
          isLegacy: false,
        });
      }
    } else {
      const legacyKey = normalizeSkillString(token);
      if (allowAllExistingAsLegacy || existingLegacyMap.has(legacyKey)) {
        const preservedName = existingLegacyMap.get(legacyKey) || token;
        if (!dedupMap.has(legacyKey)) {
          dedupMap.set(legacyKey, {
            name: preservedName,
            category: 'Legacy (Saved Entry)',
            isLegacy: true,
          });
        }
      } else {
        return {
          valid: false,
          message: `Unsupported ${fieldLabel.toLowerCase()} "${token}". Please select from the predefined ${fieldLabel} catalog.`,
          items: [],
          serialized: '',
        };
      }
    }
  }

  const items = Array.from(dedupMap.values());
  return {
    valid: true,
    items,
    serialized: items.map((i) => i.name).join(', '),
  };
}

/**
 * Format a list of strings into natural English ("A", "A and B", "A, B, and C").
 */
function formatSkillList(items) {
  if (!Array.isArray(items) || items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

/**
 * Build a clear, honest human-readable summary of the skill comparison.
 */
function buildAnalysisSummary({
  analysisType,
  knownSkills,
  learningSkills,
  missingSkills,
  studentSkillCount,
}) {
  if (analysisType === 'no_skills_specified') {
    return 'Official technical skill requirements are not specified for this opportunity, and no suggested technical skills are listed. Please review the official eligibility criteria and organizer page directly.';
  }

  if (studentSkillCount === 0) {
    return `You have not added any skills to your SkillUP profile yet. For suggested skill alignment with this opportunity, consider adding or developing ${formatSkillList(
      missingSkills
    )}. Note: these are suggested technical skills for preparation, not mandatory eligibility requirements.`;
  }

  const parts = [];

  if (knownSkills.length > 0 && learningSkills.length > 0) {
    parts.push(
      `Your profile includes ${formatSkillList(
        knownSkills
      )} (marked as Knows), and you are currently learning ${formatSkillList(learningSkills)}.`
    );
  } else if (knownSkills.length > 0) {
    parts.push(
      `Your profile includes ${formatSkillList(knownSkills)} (marked as Knows).`
    );
  } else if (learningSkills.length > 0) {
    parts.push(
      `You are currently learning ${formatSkillList(
        learningSkills
      )}, which aligns with this opportunity's suggested skills.`
    );
  } else {
    parts.push(
      'None of the suggested technical skills associated with this opportunity are currently listed in your profile.'
    );
  }

  if (missingSkills.length === 0) {
    parts.push(
      'All suggested technical skills associated with this opportunity are present in your profile. Remember that profile skills are self-reported and matching suggested skills does not automatically confirm official eligibility.'
    );
  } else if (knownSkills.length > 0 || learningSkills.length > 0) {
    parts.push(
      `${formatSkillList(
        missingSkills
      )} ${
        missingSkills.length === 1 ? 'is an additional suggested skill' : 'are additional suggested skills'
      } associated with this opportunity that ${
        missingSkills.length === 1 ? 'is' : 'are'
      } not yet listed in your profile.`
    );
  } else {
    parts.push(
      `${formatSkillList(
        missingSkills
      )} ${
        missingSkills.length === 1 ? 'is a suggested skill' : 'are suggested skills'
      } to develop or add to your profile if you already have experience with ${
        missingSkills.length === 1 ? 'it' : 'them'
      }.`
    );
  }

  return parts.join(' ');
}

/**
 * Build a concise, encouraging 1-line summary for visual-first display.
 */
function buildConciseSummary({
  analysisType,
  knownSkills,
  learningSkills,
  missingSkills,
  studentSkillCount,
}) {
  if (analysisType === 'no_skills_specified') {
    return 'No specific technical skills are listed for this opportunity — check the official eligibility checklist below.';
  }

  const totalSkills =
    knownSkills.length + learningSkills.length + missingSkills.length;

  if (studentSkillCount === 0) {
    return `Add skills you know or are learning in your Profile to compare them with the ${totalSkills} suggested skills for this opportunity.`;
  }

  if (missingSkills.length === 0 && totalSkills > 0) {
    return `All ${totalSkills} suggested skills are in your profile! Review the official eligibility checklist below before applying.`;
  }

  const matchedCount = knownSkills.length + learningSkills.length;
  if (matchedCount > 0) {
    const breakdown = [
      knownSkills.length > 0 ? `${knownSkills.length} known` : null,
      learningSkills.length > 0 ? `${learningSkills.length} currently learning` : null,
    ]
      .filter(Boolean)
      .join(' and ');
    return `You already have ${breakdown} out of ${totalSkills} suggested skills in your profile, with ${missingSkills.length} more to explore at your own pace.`;
  }

  return `Explore ${totalSkills} suggested skills for this opportunity below, or update your Profile if you already use any of them.`;
}

/**
 * Build individual eligibility criteria rows with deterministic status indicators:
 * - 'matches_profile' ('Matches Profile')
 * - 'does_not_match' ('Does Not Match')
 * - 'needs_confirmation' ('Needs Confirmation')
 */
function buildEligibilityCriteria({
  opportunity,
  profile,
  verifiedRequiredSkills = [],
  knownSkills = [],
  hasVerifiedEligibilityText = false,
}) {
  const criteria = [];
  const rawEligibility = String(opportunity?.officialEligibility || '').trim();
  const slug = String(opportunity?.editionSlug || '').trim();

  // 1. Application Window & Edition Status
  if (opportunity?.isExpired) {
    criteria.push({
      id: 'application-window',
      title: 'Application Window & Edition Status',
      detail: `This edition's deadline (${
        opportunity.deadline || 'previous cohort'
      }) has already passed and is closed for new applications.`,
      status: 'does_not_match',
      statusLabel: 'Does Not Match',
    });
  } else if (
    opportunity?.status === 'Open' ||
    opportunity?.status === 'Upcoming'
  ) {
    criteria.push({
      id: 'application-window',
      title: 'Application Window & Edition Status',
      detail: opportunity.deadline
        ? `${opportunity.status} for participation — recorded deadline: ${opportunity.deadline}.`
        : `${opportunity.status} for participation (${
            opportunity.locationMode || 'Online'
          }).`,
      status: 'matches_profile',
      statusLabel: 'Matches Profile',
    });
  } else {
    criteria.push({
      id: 'application-window',
      title: 'Application Window & Edition Status',
      detail:
        'Application windows open by cohort or term — check the official page for active dates.',
      status: 'needs_confirmation',
      statusLabel: 'Needs Confirmation',
    });
  }

  // 2. Participant & Academic Profile
  const hasAcademicProfile = Boolean(profile?.branch && profile?.college_year);
  const academicLabel = hasAcademicProfile
    ? `${profile.branch}, Year ${profile.college_year}`
    : null;

  if (!hasVerifiedEligibilityText) {
    criteria.push({
      id: 'academic-profile',
      title: 'Participant & Academic Background',
      detail:
        'Official academic or participant requirements could not be verified from the source listing.',
      status: 'needs_confirmation',
      statusLabel: 'Needs Confirmation',
    });
  } else if (slug === 'outreachy-open-source-internships') {
    criteria.push({
      id: 'academic-profile',
      title: 'Time Commitment & Representation Criteria',
      detail: academicLabel
        ? `Your profile lists ${academicLabel}. Confirm you have 49 consecutive days free from full-time coursework and meet Outreachy’s representation rules.`
        : 'Requires 49 consecutive days free from full-time commitments and meeting Outreachy’s representation criteria.',
      status: 'needs_confirmation',
      statusLabel: 'Needs Confirmation',
    });
  } else if (
    /enrolled in higher education|college students|student competitors/i.test(
      rawEligibility
    )
  ) {
    if (hasAcademicProfile) {
      criteria.push({
        id: 'academic-profile',
        title: 'Student Enrollment Profile',
        detail: `Your saved academic profile (${academicLabel}) aligns with student participation criteria.`,
        status: 'matches_profile',
        statusLabel: 'Matches Profile',
      });
    } else {
      criteria.push({
        id: 'academic-profile',
        title: 'Student Enrollment Profile',
        detail:
          'Requires college/university student enrollment. Add your branch and college year in Profile to match this criterion.',
        status: 'needs_confirmation',
        statusLabel: 'Needs Confirmation',
      });
    }
  } else if (
    /free for anyone|aged 13 or older|new developers, new github users, and students/i.test(
      rawEligibility
    )
  ) {
    criteria.push({
      id: 'academic-profile',
      title: 'Participant Background',
      detail:
        'Open to students and beginner developers with no restrictive academic degree prerequisites.',
      status: 'matches_profile',
      statusLabel: 'Matches Profile',
    });
  } else {
    criteria.push({
      id: 'academic-profile',
      title: 'Participant & Academic Background',
      detail: academicLabel
        ? `Your profile lists ${academicLabel}. Confirm age, enrollment, and work-authorization rules on the official page.`
        : 'Confirm participant age, enrollment, and work-authorization rules on the official page.',
      status: 'needs_confirmation',
      statusLabel: 'Needs Confirmation',
    });
  }

  // 3. Mandatory Technical Skill Prerequisites
  if (!hasVerifiedEligibilityText) {
    criteria.push({
      id: 'mandatory-skills',
      title: 'Mandatory Technical Skill Prerequisites',
      detail:
        'Official mandatory skill prerequisites are not specified on the source listing.',
      status: 'needs_confirmation',
      statusLabel: 'Needs Confirmation',
    });
  } else if (verifiedRequiredSkills.length === 0) {
    criteria.push({
      id: 'mandatory-skills',
      title: 'Mandatory Technical Skill Prerequisites',
      detail:
        'No mandatory programming language or technical skill prerequisites are enforced by the organizer to register.',
      status: 'matches_profile',
      statusLabel: 'Matches Profile',
    });
  } else {
    const missingMandatory = verifiedRequiredSkills.filter(
      (reqSkill) =>
        !knownSkills.some((k) => areSkillsEquivalent(k, reqSkill))
    );
    if (missingMandatory.length === 0) {
      criteria.push({
        id: 'mandatory-skills',
        title: 'Mandatory Technical Skill Prerequisites',
        detail: `Your profile includes all stated required skills (${verifiedRequiredSkills.join(
          ', '
        )}).`,
        status: 'matches_profile',
        statusLabel: 'Matches Profile',
      });
    } else {
      criteria.push({
        id: 'mandatory-skills',
        title: 'Mandatory Technical Skill Prerequisites',
        detail: `Your profile does not yet list required skills: ${missingMandatory.join(
          ', '
        )}.`,
        status: 'does_not_match',
        statusLabel: 'Does Not Match',
      });
    }
  }

  // 4. Official Organizer Registration & Rules
  let organizerRuleDetail =
    'Requires reviewing full terms and completing registration on the official organizer website.';
  if (slug === 'sih-2026-edition') {
    organizerRuleDetail =
      'Teams must be nominated by their institute’s Single Point of Contact (SPOC) following the internal campus hackathon.';
  } else if (slug.startsWith('mlh-ghw-')) {
    organizerRuleDetail =
      'Requires registering on the official MLH event page and following the MLH Code of Conduct.';
  } else if (slug === 'lfx-mentorship-program-2026') {
    organizerRuleDetail =
      'Requires an LFX Mentee Profile and applying directly to a participating Linux Foundation project term.';
  } else if (slug === 'outreachy-open-source-internships') {
    organizerRuleDetail =
      'Requires passing the initial eligibility application and completing a project contribution task.';
  } else if (slug === 'google-summer-of-code-global') {
    organizerRuleDetail =
      'Requires submitting a project proposal to a mentoring organization during the official GSoC window.';
  } else if (slug === 'icpc-collegiate-programming-contest') {
    organizerRuleDetail =
      'Requires competing in a university team of 3 students registered by an official faculty coach on icpc.global.';
  } else if (slug === 'microsoft-imagine-cup-startups') {
    organizerRuleDetail =
      'Requires registering your student startup team on the official Microsoft Imagine Cup portal.';
  } else if (slug === 'aws-educate-cloud-hands-on-labs') {
    organizerRuleDetail =
      'Requires creating a free AWS Educate account with an email address (age 13+, or 18+ for Job Board access).';
  } else if (slug === 'github-skills-intro-to-github') {
    organizerRuleDetail =
      'Requires a free GitHub account to copy the interactive template repository.';
  }

  criteria.push({
    id: 'organizer-rules',
    title: 'Organizer Registration & Program Rules',
    detail: organizerRuleDetail,
    status: 'needs_confirmation',
    statusLabel: 'Needs Confirmation',
  });

  return criteria;
}

/**
 * Evaluate Official Eligibility metadata separately from technical skill alignment.
 */
function buildOfficialEligibilityReport(
  opportunity,
  profile,
  verifiedRequiredSkills = [],
  knownSkills = []
) {
  const rawEligibility = String(opportunity?.officialEligibility || '').trim();
  const hasVerifiedEligibilityText = rawEligibility.length > 0;

  const information = hasVerifiedEligibilityText
    ? rawEligibility
    : 'Official eligibility could not be fully determined. Check the original opportunity page.';

  const assessment = hasVerifiedEligibilityText
    ? 'Requires official confirmation on the organizer page — technical skill alignment does not confirm official eligibility.'
    : 'Official eligibility could not be fully determined. Check the original opportunity page.';

  const notes = [
    'Technical skill alignment is based on self-reported profile skills and does not confirm official academic, enrollment, or regional eligibility.',
  ];

  if (opportunity?.isExpired) {
    notes.push(
      `This opportunity's recorded deadline (${opportunity.deadline}) has passed. Check the official page for upcoming cohorts.`
    );
  } else if (opportunity?.deadline) {
    notes.push(`Recorded application/event deadline: ${opportunity.deadline}.`);
  } else {
    notes.push(
      'No single static cutoff deadline is specified on the official page; check the organizer website for active cohort dates.'
    );
  }

  if (profile?.branch || profile?.college_year) {
    const studentAcademicSummary = [
      profile.branch ? `Branch: ${profile.branch}` : null,
      profile.college_year ? `Year: ${profile.college_year}` : null,
    ]
      .filter(Boolean)
      .join(', ');
    notes.push(
      `Your saved profile academic info (${studentAcademicSummary}) should be verified directly against the organizer's official rules above.`
    );
  }

  const criteria = buildEligibilityCriteria({
    opportunity,
    profile,
    verifiedRequiredSkills,
    knownSkills,
    hasVerifiedEligibilityText,
  });

  return {
    information,
    hasVerifiedEligibilityText,
    assessment,
    criteria,
    notes,
    deadline: opportunity?.deadline || null,
    deadlineDisplay:
      opportunity?.deadlineDisplay || 'Deadline not specified on official page',
    status: opportunity?.status || 'Check Official Page',
    locationMode: opportunity?.locationMode || 'Online',
    sourceUrl: opportunity?.sourceUrl || '',
    lastVerifiedAt: opportunity?.lastVerifiedAt || null,
  };
}

/**
 * Perform deterministic skill comparison between a student's saved skills and an opportunity.
 *
 * @param {Object} params
 * @param {Object} params.opportunity - Serialized opportunity object
 * @param {Array<{skill: string, status: 'Knows'|'Learning'}>} params.userSkills - Student's latest saved skills
 * @param {Object|null} params.profile - Student's latest saved profile
 */
export function analyzeStudentSkillsForOpportunity({
  opportunity,
  userSkills = [],
  profile = null,
  userId = null,
}) {
  // Build lookup maps of the student's canonical skills -> status & original label
  const studentKnowsMap = new Map();
  const studentLearningMap = new Map();

  for (const item of userSkills) {
    const rawName = String(item?.skill || '').trim();
    if (!rawName) continue;
    const canonicalKey = getCanonicalSkillKey(rawName);
    if (!canonicalKey) continue;

    if (item.status === 'Knows') {
      studentKnowsMap.set(canonicalKey, rawName);
      studentLearningMap.delete(canonicalKey);
    } else if (!studentKnowsMap.has(canonicalKey)) {
      studentLearningMap.set(canonicalKey, rawName);
    }
  }

  // Distinguish:
  // 1) Verified mandatory technical skill requirements (only if explicitly flagged on opportunity; default empty)
  // 2) Official focus areas / domains published on the official page (`opportunity.requiredSkills`)
  // 3) Suggested technical skills inferred for preparation (`opportunity.suggestedSkills`)
  const verifiedRequiredSkills = Array.isArray(opportunity?.verifiedRequiredSkills)
    ? opportunity.verifiedRequiredSkills.filter(Boolean)
    : [];
  const officialFocusAreas = Array.isArray(opportunity?.requiredSkills)
    ? opportunity.requiredSkills.filter(Boolean)
    : [];
  const suggestedSkills = Array.isArray(opportunity?.suggestedSkills)
    ? opportunity.suggestedSkills.filter(Boolean)
    : [];

  // Determine the target technical skills to compare against
  let targetSkills = [];
  let analysisType = 'suggested_skill_alignment';
  let basisLabel =
    'Suggested Technical Skills (inferred from opportunity focus areas — not mandatory eligibility requirements)';
  let officialSkillRequirementsNote =
    officialFocusAreas.length > 0
      ? 'Official mandatory programming language requirements are not specified by the organizer; the official page publishes general focus areas/domains. The analysis below compares your profile with SkillUP’s suggested technical skills.'
      : 'Official technical skill requirements are not specified on the source page. The analysis below compares your profile with SkillUP’s suggested technical skills.';

  if (suggestedSkills.length > 0) {
    targetSkills = suggestedSkills;
  } else if (verifiedRequiredSkills.length > 0) {
    targetSkills = verifiedRequiredSkills;
    analysisType = 'verified_required_skill_alignment';
    basisLabel = 'Verified Required Technical Skills (stated on official source page)';
    officialSkillRequirementsNote =
      'The skills compared below are explicitly stated on the official opportunity page.';
  } else {
    targetSkills = [];
    analysisType = 'no_skills_specified';
    basisLabel = 'No Technical Skills Specified';
    officialSkillRequirementsNote =
      'Official technical skill requirements are not specified for this opportunity, and no suggested technical skills are recorded.';
  }

  const knownSkills = [];
  const learningSkills = [];
  const missingSkills = [];
  const seenTargetCanonical = new Set();

  for (const oppSkill of targetSkills) {
    const cleanOppSkill = String(oppSkill || '').trim();
    if (!cleanOppSkill) continue;

    const canonicalKey = getCanonicalSkillKey(cleanOppSkill);
    if (!canonicalKey || seenTargetCanonical.has(canonicalKey)) continue;
    seenTargetCanonical.add(canonicalKey);

    if (studentKnowsMap.has(canonicalKey)) {
      knownSkills.push(cleanOppSkill);
    } else if (studentLearningMap.has(canonicalKey)) {
      learningSkills.push(cleanOppSkill);
    } else {
      missingSkills.push(cleanOppSkill);
    }
  }

  const studentSkillCount = studentKnowsMap.size + studentLearningMap.size;

  const summary = buildAnalysisSummary({
    analysisType,
    knownSkills,
    learningSkills,
    missingSkills,
    studentSkillCount,
  });

  const conciseSummary = buildConciseSummary({
    analysisType,
    knownSkills,
    learningSkills,
    missingSkills,
    studentSkillCount,
  });

  const officialEligibility = buildOfficialEligibilityReport(
    opportunity,
    profile,
    verifiedRequiredSkills,
    knownSkills
  );

  // If userId is supplied, record validated missing skills for Bridge My Skill Gap
  // and issue signed context tokens for each missing skill.
  const bridgeContextTokens = {};
  if (userId && opportunity?.id) {
    for (const mSkill of missingSkills) {
      recordValidatedBridgeSkill(userId, opportunity.id, mSkill);
      bridgeContextTokens[mSkill] = createBridgeContextToken({
        userId,
        opportunityId: opportunity.id,
        targetSkill: mSkill,
      });
    }
  }

  return {
    opportunityId: opportunity.id,
    opportunityTitle: opportunity.title,
    organization: opportunity.organization,
    opportunityType: opportunity.type,
    analysisType,
    basisLabel,
    knownSkills,
    learningSkills,
    missingSkills,
    verifiedRequiredSkills,
    officialFocusAreas,
    suggestedSkills,
    officialSkillRequirementsNote,
    studentSkillCount,
    summary,
    conciseSummary,
    officialEligibility,
    bridgeContextTokens,
  };
}

/**
 * Check if a topic matches one of the 9 predefined Milestone 3 learning topics.
 * Returns the exact predefined title if matched, or null otherwise.
 */
export function findPredefinedTopicMatch(rawTopic) {
  const clean = String(rawTopic || '').trim().toLowerCase();
  if (!clean) return null;
  for (const title of PREDEFINED_LEARNING_TOPICS) {
    if (title.toLowerCase() === clean) {
      return title;
    }
  }
  return null;
}

/**
 * Create an HMAC-SHA256 signed token binding a validated Bridge My Skill Gap context
 * to the authenticated student, opportunity ID, and canonical target skill.
 */
export function createBridgeContextToken({ userId, opportunityId, targetSkill }) {
  const canonicalSkill = getCanonicalSkillKey(targetSkill);
  const exp = Date.now() + BRIDGE_JOURNEY_TTL_MS;
  const payload = JSON.stringify({
    u: Number(userId),
    o: Number(opportunityId),
    s: canonicalSkill,
    l: String(targetSkill || '').trim(),
    e: exp,
  });
  const encoded = Buffer.from(payload, 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getBridgeHmacSecret())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

/**
 * Verify an HMAC-SHA256 signed Bridge My Skill Gap context token.
 */
export function verifyBridgeContextToken(token, { userId, opportunityId, targetSkill }) {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return false;
  }
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return false;

  const expectedSig = crypto
    .createHmac('sha256', getBridgeHmacSecret())
    .update(encoded)
    .digest('base64url');

  const sigBuf = Buffer.from(sig, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return false;
  }

  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (!parsed || typeof parsed !== 'object') return false;
    if (Number(parsed.e) < Date.now()) return false;
    if (Number(parsed.u) !== Number(userId)) return false;
    if (Number(parsed.o) !== Number(opportunityId)) return false;
    if (parsed.s !== getCanonicalSkillKey(targetSkill)) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Record in server memory that (userId, opportunityId, targetSkill) was validated
 * as a missing skill (Skill to Develop) during the student's active session.
 */
export function recordValidatedBridgeSkill(userId, opportunityId, targetSkill) {
  const canonicalSkill = getCanonicalSkillKey(targetSkill);
  if (!userId || !opportunityId || !canonicalSkill) return;
  const key = `${Number(userId)}::${Number(opportunityId)}::${canonicalSkill}`;
  validatedBridgeJourneys.set(key, {
    timestamp: Date.now(),
    canonicalLabel: String(targetSkill || '').trim(),
  });
}

/**
 * Check whether (userId, opportunityId, targetSkill) was previously validated
 * as a missing skill in the student's active Bridge My Skill Gap journey.
 */
export function hasValidatedBridgeJourney(userId, opportunityId, targetSkill) {
  const canonicalSkill = getCanonicalSkillKey(targetSkill);
  if (!userId || !opportunityId || !canonicalSkill) return false;
  const key = `${Number(userId)}::${Number(opportunityId)}::${canonicalSkill}`;
  const entry = validatedBridgeJourneys.get(key);
  if (!entry) return false;
  if (Date.now() - entry.timestamp > BRIDGE_JOURNEY_TTL_MS) {
    validatedBridgeJourneys.delete(key);
    return false;
  }
  return true;
}

function parseJsonStringArray(val) {
  if (Array.isArray(val)) {
    return val.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof val === 'string' && val.trim()) {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Validate optional opportunity context (`opportunityId` and `targetSkill`) against
 * the MySQL database and the authenticated student's latest saved profile skills.
 *
 * Rules enforced:
 * 1. `opportunityId` must be a valid positive integer and exist in `opportunities`.
 * 2. `targetSkill` must be a non-empty string belonging to the opportunity's technical skills.
 * 3. `targetSkill` must currently appear in the opportunity's `missingSkills` (Skills to Develop)
 *    for this student — OR, if the student updated their profile skill from Missing to Learning
 *    after starting a validated Bridge My Skill Gap journey (verified via `contextToken` or
 *    `hasValidatedBridgeJourney`), the validated journey is preserved!
 * 4. Forged/arbitrary opportunity IDs, skills not belonging to the opportunity, skills already
 *    marked as `Knows`, or `Learning` skills without a prior validated Bridge journey are rejected.
 */
export async function validateOpportunitySkillContext({
  pool,
  userId,
  opportunityId,
  targetSkill,
  contextToken = null,
}) {
  const parsedOppId =
    typeof opportunityId === 'number'
      ? opportunityId
      : typeof opportunityId === 'string' && /^\d+$/.test(opportunityId.trim())
      ? Number.parseInt(opportunityId.trim(), 10)
      : NaN;

  if (!Number.isInteger(parsedOppId) || parsedOppId <= 0) {
    return {
      valid: false,
      statusCode: 400,
      message: 'Invalid opportunity ID. Opportunity ID must be a positive integer.',
    };
  }

  const rawTargetSkill = typeof targetSkill === 'string' ? targetSkill.trim() : '';
  if (!rawTargetSkill || rawTargetSkill.length > 200) {
    return {
      valid: false,
      statusCode: 400,
      message: 'A valid target skill is required when linking to an opportunity.',
    };
  }

  const [[oppRows], [profileRows], [skillRows]] = await Promise.all([
    pool.query('SELECT * FROM opportunities WHERE id = ? LIMIT 1', [parsedOppId]),
    pool.query(
      'SELECT branch, college_year, interests, career_goals, learning_hours_per_day FROM profiles WHERE user_id = ? LIMIT 1',
      [userId]
    ),
    pool.query('SELECT skill, status FROM user_skills WHERE user_id = ?', [userId]),
  ]);

  if (!oppRows || oppRows.length === 0) {
    return {
      valid: false,
      statusCode: 404,
      message: 'The selected opportunity is no longer available in the database.',
    };
  }

  const row = oppRows[0];
  const opportunity = {
    id: row.id,
    editionSlug: row.edition_slug,
    title: row.title,
    type: row.type,
    organization: row.organization,
    description: row.description,
    deadline: row.deadline,
    startDate: row.start_date,
    locationMode: row.location_mode || 'Online',
    officialEligibility: row.official_eligibility,
    requiredSkills: parseJsonStringArray(row.required_skills),
    suggestedSkills: parseJsonStringArray(row.suggested_skills),
    sourceUrl: row.source_url,
    status: row.status,
  };

  const analysis = analyzeStudentSkillsForOpportunity({
    opportunity,
    userSkills: skillRows || [],
    profile: profileRows[0] || null,
    userId,
  });

  // 1. Check if targetSkill is currently in Skills to Develop (missingSkills)
  const matchedMissingSkill = analysis.missingSkills.find((s) =>
    areSkillsEquivalent(s, rawTargetSkill)
  );

  if (matchedMissingSkill) {
    recordValidatedBridgeSkill(userId, parsedOppId, matchedMissingSkill);
    const issuedToken = createBridgeContextToken({
      userId,
      opportunityId: parsedOppId,
      targetSkill: matchedMissingSkill,
    });

    return {
      valid: true,
      opportunity,
      normalizedTargetSkill: matchedMissingSkill,
      contextToken: issuedToken,
      analysis,
    };
  }

  // 2. Adjustment 1: Check if the student updated the skill from Missing to Learning
  // during an already-validated Bridge My Skill Gap journey
  const matchedLearningSkill = analysis.learningSkills.find((s) =>
    areSkillsEquivalent(s, rawTargetSkill)
  );

  if (matchedLearningSkill) {
    const tokenValid = verifyBridgeContextToken(contextToken, {
      userId,
      opportunityId: parsedOppId,
      targetSkill: matchedLearningSkill,
    });
    const sessionJourneyValid = hasValidatedBridgeJourney(
      userId,
      parsedOppId,
      matchedLearningSkill
    );

    if (tokenValid || sessionJourneyValid) {
      const issuedToken = createBridgeContextToken({
        userId,
        opportunityId: parsedOppId,
        targetSkill: matchedLearningSkill,
      });

      return {
        valid: true,
        opportunity,
        normalizedTargetSkill: matchedLearningSkill,
        contextToken: issuedToken,
        analysis,
        preservedFromLearningTransition: true,
      };
    }

    return {
      valid: false,
      statusCode: 400,
      message: `Skill "${matchedLearningSkill}" is already marked as Learning in your profile and is not in Skills to Develop for "${opportunity.title}".`,
    };
  }

  // 3. Check if the skill is already marked as Knows
  const matchedKnownSkill = analysis.knownSkills.find((s) =>
    areSkillsEquivalent(s, rawTargetSkill)
  );
  if (matchedKnownSkill) {
    return {
      valid: false,
      statusCode: 400,
      message: `Skill "${matchedKnownSkill}" is already marked as Knows in your profile and is not in Skills to Develop for "${opportunity.title}".`,
    };
  }

  // 4. Otherwise, the skill is not associated with this opportunity at all
  return {
    valid: false,
    statusCode: 400,
    message: `Skill "${rawTargetSkill}" is not a valid Skill to Develop for "${opportunity.title}".`,
  };
}

