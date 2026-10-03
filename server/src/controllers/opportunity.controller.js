import pool from '../config/db.js';
import { EXPLORE_PLATFORMS } from '../database/seedOpportunities.js';
import {
  analyzeStudentSkillsForOpportunity,
  areSkillsEquivalent,
} from '../services/skillAnalysis.service.js';

const ALLOWED_TYPES = new Set(['Hackathon', 'Internship', 'Competition', 'Workshop']);

/**
 * Safely parse a MySQL JSON column or JSON string into an array of strings.
 */
function parseJsonArray(val) {
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
 * Format a Date or YYYY-MM-DD value into a clean YYYY-MM-DD string, or null.
 */
function formatDateIso(dateVal) {
  if (!dateVal) return null;
  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.slice(0, 10);
    }
  }
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Compute dynamic status and deadline metadata so past deadlines are automatically
 * flagged as Expired without assuming opportunities with null deadlines are open.
 */
function computeDeadlineStatus(row) {
  const deadlineIso = formatDateIso(row.deadline);
  const startDateIso = formatDateIso(row.start_date);
  const lastVerifiedIso = formatDateIso(row.last_verified_at);

  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;

  let effectiveStatus = row.status || 'Check Official Page';
  let daysRemaining = null;

  if (deadlineIso) {
    const deadlineMs = new Date(`${deadlineIso}T00:00:00Z`).getTime();
    const todayMs = new Date(`${todayIso}T00:00:00Z`).getTime();
    const diffDays = Math.round((deadlineMs - todayMs) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      effectiveStatus = 'Expired';
      daysRemaining = diffDays;
    } else {
      daysRemaining = diffDays;
    }
  }

  const isExpired = effectiveStatus === 'Expired';

  return {
    deadlineIso,
    startDateIso,
    lastVerifiedIso,
    effectiveStatus,
    isExpired,
    daysRemaining,
  };
}

/**
 * Normalize a skill or keyword token for deterministic comparison.
 */
function normalizeToken(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if a student skill matches an opportunity skill using strict canonical equivalence.
 */
function skillsMatch(studentSkill, oppSkill) {
  return areSkillsEquivalent(studentSkill, oppSkill);
}

/**
 * Compute deterministic, explainable relevance between a student's profile/skills
 * and an opportunity.
 *
 * IMPORTANT:
 * - Never fabricates match percentages.
 * - Clearly separates profile-based relevance suggestions from official eligibility.
 * - Expired opportunities are never marked as recommended.
 */
function evaluateRelevance(opp, userSkills, profile) {
  if (opp.isExpired) {
    return {
      isRecommended: false,
      relevanceScore: 0,
      matchedKnowsSkills: [],
      matchedLearningSkills: [],
      matchedInterests: [],
      relevanceReason: null,
    };
  }

  const allOppSkills = [...opp.requiredSkills, ...opp.suggestedSkills];
  const matchedKnowsSet = new Set();
  const matchedLearningSet = new Set();

  for (const us of userSkills) {
    const skillName = String(us.skill || '').trim();
    if (!skillName) continue;

    const hasMatch = allOppSkills.some((oppSkill) => skillsMatch(skillName, oppSkill));
    if (hasMatch) {
      if (us.status === 'Knows') {
        matchedKnowsSet.add(skillName);
      } else {
        matchedLearningSet.add(skillName);
      }
    }
  }

  // Check student interests & career goals against opportunity skills, title, and type
  const matchedInterestsSet = new Set();
  const rawInterests = [profile?.interests || '', profile?.career_goals || '']
    .join(',')
    .split(/[,;/|]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2);

  const searchableText = normalizeToken(
    `${opp.title} ${opp.type} ${opp.description} ${allOppSkills.join(' ')}`
  );

  for (const interest of rawInterests) {
    const normInterest = normalizeToken(interest);
    if (!normInterest || normInterest.length < 2) continue;

    const matchesSkill = allOppSkills.some((oppSkill) => skillsMatch(interest, oppSkill));
    const matchesText = searchableText.includes(normInterest);
    const matchesTypeOrDomain =
      (normInterest.includes('hackathon') && opp.type === 'Hackathon') ||
      (normInterest.includes('internship') && opp.type === 'Internship') ||
      (normInterest.includes('competitive programm') && opp.type === 'Competition') ||
      (normInterest.includes('open source') && searchableText.includes('open source')) ||
      (normInterest.includes('machine learning') && searchableText.includes('machine learning')) ||
      (normInterest.includes('cloud') && searchableText.includes('cloud')) ||
      (normInterest.includes('full-stack') && searchableText.includes('web development'));

    if (matchesSkill || matchesText || matchesTypeOrDomain) {
      matchedInterestsSet.add(interest);
    }
  }

  const matchedKnowsSkills = Array.from(matchedKnowsSet);
  const matchedLearningSkills = Array.from(matchedLearningSet);
  const matchedInterests = Array.from(matchedInterestsSet);

  // Internal sorting score (never displayed as a percentage)
  const relevanceScore =
    matchedKnowsSkills.length * 3 +
    matchedLearningSkills.length * 2 +
    matchedInterests.length * 1;

  const isRecommended = relevanceScore > 0;

  let relevanceReason = null;
  if (isRecommended) {
    const parts = [];
    if (matchedKnowsSkills.length > 0) {
      parts.push(`skills you know (${matchedKnowsSkills.join(', ')})`);
    }
    if (matchedLearningSkills.length > 0) {
      parts.push(`skills you are learning (${matchedLearningSkills.join(', ')})`);
    }
    if (matchedInterests.length > 0 && parts.length === 0) {
      parts.push(`your interests/goals (${matchedInterests.slice(0, 2).join(', ')})`);
    }
    relevanceReason = `Suggested based on ${parts.join(' and ')}. Relevance suggestion only — check official eligibility requirements before applying.`;
  }

  return {
    isRecommended,
    relevanceScore,
    matchedKnowsSkills,
    matchedLearningSkills,
    matchedInterests,
    relevanceReason,
  };
}

const GENERIC_UNSTOP_PATHS = new Set([
  '',
  '/',
  '/hackathons',
  '/competitions',
  '/internships',
  '/workshops',
  '/scholarships',
  '/quizzes',
  '/jobs',
]);

/**
 * Detect whether an opportunity's source URL points to a specific listing hosted on Unstop
 * (excluding Unstop's root homepage or generic category directories).
 */
export function detectHostingMetadata(sourceUrl, isExpired = false) {
  let isUnstopListing = false;
  try {
    const parsed = new URL(String(sourceUrl || '').trim());
    const host = parsed.hostname.toLowerCase();
    const cleanPath = parsed.pathname.replace(/\/+$/, '').toLowerCase();
    if (
      (host === 'unstop.com' || host.endsWith('.unstop.com')) &&
      !GENERIC_UNSTOP_PATHS.has(cleanPath)
    ) {
      isUnstopListing = true;
    }
  } catch {
    isUnstopListing = false;
  }

  return {
    hostingPlatform: isUnstopListing ? 'Unstop' : null,
    isUnstopListing,
    applyButtonLabel: isUnstopListing
      ? isExpired
        ? 'View on Unstop'
        : 'Apply on Unstop'
      : isExpired
      ? 'View Past Edition Archive'
      : 'Visit Official Page / Apply',
  };
}

const STATUS_ORDER = {
  Open: 1,
  Upcoming: 2,
  'Check Official Page': 3,
  Expired: 4,
};

/**
 * Transform a raw MySQL opportunity row into a structured API response object.
 */
export function serializeOpportunity(row, userSkills, profile) {
  const requiredSkills = parseJsonArray(row.required_skills);
  const suggestedSkills = parseJsonArray(row.suggested_skills);
  const {
    deadlineIso,
    startDateIso,
    lastVerifiedIso,
    effectiveStatus,
    isExpired,
    daysRemaining,
  } = computeDeadlineStatus(row);

  const hostingMeta = detectHostingMetadata(row.source_url, isExpired);

  const baseOpp = {
    id: row.id,
    editionSlug: row.edition_slug,
    title: row.title,
    type: row.type,
    organization: row.organization,
    description: row.description,
    deadline: deadlineIso,
    deadlineDisplay: deadlineIso || 'Deadline not specified on official page',
    startDate: startDateIso,
    locationMode: row.location_mode || 'Online',
    officialEligibility: row.official_eligibility,
    requiredSkills,
    suggestedSkills,
    sourceUrl: row.source_url,
    status: effectiveStatus,
    isExpired,
    daysRemaining,
    lastVerifiedAt: lastVerifiedIso,
    ...hostingMeta,
  };

  const relevance = evaluateRelevance(baseOpp, userSkills, profile);

  return {
    ...baseOpp,
    ...relevance,
  };
}

/**
 * Compute sorted non-expired recommended opportunities from raw DB rows using
 * the shared Milestone 5 recommendation and sorting rules.
 */
export function getRecommendedOpportunitiesFromRows(rows, userSkills, profile) {
  const serialized = (rows || []).map((row) =>
    serializeOpportunity(row, userSkills, profile)
  );

  serialized.sort((a, b) => {
    const statusDiff =
      (STATUS_ORDER[a.status] || 99) - (STATUS_ORDER[b.status] || 99);
    if (statusDiff !== 0) return statusDiff;
    if (a.deadline && b.deadline) {
      return a.deadline.localeCompare(b.deadline);
    }
    if (a.deadline && !b.deadline) return -1;
    if (!a.deadline && b.deadline) return 1;
    return a.id - b.id;
  });

  const recommendedList = serialized
    .filter((opp) => opp.isRecommended && !opp.isExpired)
    .sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      return (STATUS_ORDER[a.status] || 99) - (STATUS_ORDER[b.status] || 99);
    });

  return {
    serialized,
    recommendedList,
  };
}

/**
 * Fetch the logged-in student's profile and skills for relevance suggestions.
 */
async function getStudentContext(userId) {
  const [[profileRows], [skillRows]] = await Promise.all([
    pool.query(
      'SELECT branch, college_year, interests, career_goals FROM profiles WHERE user_id = ? LIMIT 1',
      [userId]
    ),
    pool.query('SELECT skill, status FROM user_skills WHERE user_id = ?', [userId]),
  ]);

  return {
    profile: profileRows[0] || null,
    userSkills: skillRows || [],
  };
}

/**
 * GET /api/opportunities
 * Lists opportunities with optional category filter, keyword search, and profile relevance.
 */
export async function getOpportunities(req, res, next) {
  try {
    const userId = req.user.id;
    const { type, search, recommended, includeExpired = 'true' } = req.query;

    if (type && type !== 'All' && !ALLOWED_TYPES.has(type)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid opportunity type '${type}'. Allowed types: Hackathon, Internship, Competition, Workshop.`,
      });
    }

    const [{ profile, userSkills }, [rows]] = await Promise.all([
      getStudentContext(userId),
      pool.query('SELECT * FROM opportunities ORDER BY id ASC'),
    ]);

    const { serialized } = getRecommendedOpportunitiesFromRows(
      rows,
      userSkills,
      profile
    );

    // Apply optional filters
    const searchQuery = String(search || '').trim().toLowerCase();
    const filtered = serialized.filter((opp) => {
      if (includeExpired === 'false' && opp.isExpired) {
        return false;
      }
      if (type && type !== 'All' && opp.type !== type) {
        return false;
      }
      if (recommended === 'true' && !opp.isRecommended) {
        return false;
      }
      if (searchQuery) {
        const haystack = [
          opp.title,
          opp.organization,
          opp.type,
          opp.description,
          opp.locationMode,
          opp.hostingPlatform || '',
          ...opp.requiredSkills,
          ...opp.suggestedSkills,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(searchQuery)) {
          return false;
        }
      }
      return true;
    });

    // Recommended subset (sorted by relevanceScore desc, then STATUS_ORDER)
    const recommendedList = filtered
      .filter((opp) => opp.isRecommended && !opp.isExpired)
      .sort((a, b) => {
        if (b.relevanceScore !== a.relevanceScore) {
          return b.relevanceScore - a.relevanceScore;
        }
        return (STATUS_ORDER[a.status] || 99) - (STATUS_ORDER[b.status] || 99);
      });

    return res.status(200).json({
      status: 'ok',
      opportunities: filtered,
      recommendedOpportunities: recommendedList,
      explorePlatforms: EXPLORE_PLATFORMS,
      studentContext: {
        hasSkillsOrInterests:
          userSkills.length > 0 ||
          Boolean(profile?.interests?.trim()) ||
          Boolean(profile?.career_goals?.trim()),
        skillCount: userSkills.length,
        skills: userSkills,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/opportunities/:id
 * Returns full details for a single verified opportunity.
 */
export async function getOpportunityById(req, res, next) {
  try {
    const userId = req.user.id;
    const opportunityId = Number.parseInt(req.params.id, 10);

    if (!Number.isInteger(opportunityId) || opportunityId <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid opportunity ID.',
      });
    }

    const [{ profile, userSkills }, [rows]] = await Promise.all([
      getStudentContext(userId),
      pool.query('SELECT * FROM opportunities WHERE id = ? LIMIT 1', [opportunityId]),
    ]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Opportunity not found.',
      });
    }

    const opportunity = serializeOpportunity(rows[0], userSkills, profile);

    return res.status(200).json({
      status: 'ok',
      opportunity,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/opportunities/:id/analyze
 * Performs deterministic skill-matching and gap analysis comparing the authenticated
 * student's latest saved profile skills against the selected opportunity's skills,
 * while keeping Official Eligibility and Official Focus Areas strictly separate.
 */
export async function analyzeOpportunity(req, res, next) {
  try {
    const userId = req.user.id;
    const opportunityId = Number.parseInt(req.params.id, 10);

    if (!Number.isInteger(opportunityId) || opportunityId <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid opportunity ID.',
      });
    }

    const [{ profile, userSkills }, [rows]] = await Promise.all([
      getStudentContext(userId),
      pool.query('SELECT * FROM opportunities WHERE id = ? LIMIT 1', [opportunityId]),
    ]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Opportunity not found.',
      });
    }

    const opportunity = serializeOpportunity(rows[0], userSkills, profile);
    const analysis = analyzeStudentSkillsForOpportunity({
      opportunity,
      userSkills,
      profile,
      userId,
    });

    return res.status(200).json({
      status: 'ok',
      ...analysis,
    });
  } catch (err) {
    next(err);
  }
}

