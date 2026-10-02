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
]);

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

