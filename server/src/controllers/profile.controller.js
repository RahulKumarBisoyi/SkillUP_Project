import pool from '../config/db.js';
import {
  getCanonicalSkillKey,
  getFullSkillCatalog,
  normalizeAndValidateProfileBranch,
  normalizeAndValidateProfileMultiSelect,
  normalizeSkillString,
  PREDEFINED_BRANCH_CATALOG,
  PREDEFINED_CAREER_GOALS_CATALOG,
  PREDEFINED_INTERESTS_CATALOG,
  resolveCanonicalCatalogSkill,
} from '../services/skillAnalysis.service.js';

/**
 * Normalize and deduplicate a list of saved DB skill rows against the canonical
 * skill catalog while preserving any pre-existing legacy rows.
 * If duplicate/alias entries exist (e.g., "JS" and "JavaScript"), preserves
 * "Knows" if either entry is marked "Knows".
 */
export function normalizeSavedUserSkills(dbSkillRows, skillCatalog) {
  const dedupMap = new Map();

  for (const row of dbSkillRows) {
    if (!row || typeof row.skill !== 'string') continue;
    const rawSkill = row.skill.trim();
    if (!rawSkill) continue;

    const status = row.status === 'Knows' ? 'Knows' : 'Learning';
    const catalogMatch = resolveCanonicalCatalogSkill(rawSkill, skillCatalog);

    const canonicalName = catalogMatch ? catalogMatch.name : rawSkill;
    const dedupKey = catalogMatch
      ? getCanonicalSkillKey(catalogMatch.name)
      : normalizeSkillString(rawSkill);
    const category = catalogMatch
      ? catalogMatch.category
      : 'Legacy (Saved Skill)';
    const isLegacy = !catalogMatch;

    if (dedupMap.has(dedupKey)) {
      const existing = dedupMap.get(dedupKey);
      if (status === 'Knows') {
        existing.status = 'Knows';
      }
    } else {
      dedupMap.set(dedupKey, {
        id: row.id,
        skill: canonicalName,
        status,
        category,
        isLegacy,
      });
    }
  }

  return Array.from(dedupMap.values());
}

/**
 * GET /api/profile
 * Retrieve profile information, normalized skills, and the canonical catalogs
 * for the authenticated student.
 */
export async function getProfile(req, res, next) {
  try {
    const userId = req.user.id;

    // Fetch profile details
    const [profiles] = await pool.execute(
      `SELECT branch, college_year, interests, career_goals, learning_hours_per_day
       FROM profiles
       WHERE user_id = ?
       LIMIT 1`,
      [userId]
    );

    // Fetch skills
    const [skills] = await pool.execute(
      `SELECT id, skill, status
       FROM user_skills
       WHERE user_id = ?
       ORDER BY id ASC`,
      [userId]
    );

    const skillCatalog = await getFullSkillCatalog(pool);
    const normalizedSkills = normalizeSavedUserSkills(skills, skillCatalog);

    let profileData = null;
    if (profiles.length > 0) {
      const normBranch = normalizeAndValidateProfileBranch({
        rawBranch: profiles[0].branch || '',
        existingSavedBranch: profiles[0].branch || '',
        allowAllExistingAsLegacy: true,
      });
      const normInterests = normalizeAndValidateProfileMultiSelect({
        rawInput: profiles[0].interests || '',
        catalog: PREDEFINED_INTERESTS_CATALOG,
        existingSavedRaw: profiles[0].interests || '',
        fieldLabel: 'Technical & Learning Interests',
        allowAllExistingAsLegacy: true,
      });
      const normCareerGoals = normalizeAndValidateProfileMultiSelect({
        rawInput: profiles[0].career_goals || '',
        catalog: PREDEFINED_CAREER_GOALS_CATALOG,
        existingSavedRaw: profiles[0].career_goals || '',
        fieldLabel: 'Career Goals',
        allowAllExistingAsLegacy: true,
      });

      profileData = {
        branch: normBranch.branch,
        branchIsLegacy: normBranch.isLegacy,
        college_year:
          profiles[0].college_year !== null
            ? parseInt(profiles[0].college_year, 10)
            : null,
        interests: normInterests.serialized,
        interestsList: normInterests.items,
        career_goals: normCareerGoals.serialized,
        careerGoalsList: normCareerGoals.items,
        learning_hours_per_day:
          profiles[0].learning_hours_per_day !== null
            ? parseFloat(profiles[0].learning_hours_per_day)
            : 0,
      };
    }

    return res.status(200).json({
      status: 'ok',
      profile: profileData,
      skills: normalizedSkills,
      skillCatalog,
      branchCatalog: PREDEFINED_BRANCH_CATALOG,
      interestCatalog: PREDEFINED_INTERESTS_CATALOG,
      careerGoalCatalog: PREDEFINED_CAREER_GOALS_CATALOG,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/profile
 * Create or update profile information and skills for the authenticated student.
 * Enforces canonical catalog selection for branch, skills, interests, and career goals,
 * normalizes genuine aliases, deduplicates entries, and allows retaining/updating
 * only the student's own previously saved legacy entries.
 */
export async function updateProfile(req, res, next) {
  const userId = req.user.id;
  let conn;

  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const hasBranchProp = Object.prototype.hasOwnProperty.call(body, 'branch') && body.branch !== undefined;
    const hasYearProp = Object.prototype.hasOwnProperty.call(body, 'college_year') && body.college_year !== undefined;
    const hasInterestsProp = Object.prototype.hasOwnProperty.call(body, 'interests') && body.interests !== undefined;
    const hasGoalsProp = Object.prototype.hasOwnProperty.call(body, 'career_goals') && body.career_goals !== undefined;
    const hasHoursProp =
      Object.prototype.hasOwnProperty.call(body, 'learning_hours_per_day') &&
      body.learning_hours_per_day !== undefined;
    const hasSkillsProp = Object.prototype.hasOwnProperty.call(body, 'skills') && body.skills !== undefined;

    // Validate skills array if provided
    if (hasSkillsProp && !Array.isArray(body.skills)) {
      return res.status(400).json({
        status: 'error',
        message: 'Skills must be an array of skill objects.',
      });
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    // Load the student's existing profile row inside the transaction to preserve omitted fields and legacy values
    const [existingProfileRows] = await conn.execute(
      `SELECT branch, college_year, interests, career_goals, learning_hours_per_day
       FROM profiles
       WHERE user_id = ?
       FOR UPDATE`,
      [userId]
    );
    const existingRow = existingProfileRows.length > 0 ? existingProfileRows[0] : null;
    const existingBranchRaw = existingRow?.branch || '';
    const existingInterestsRaw = existingRow?.interests || '';
    const existingCareerGoalsRaw = existingRow?.career_goals || '';
    const existingYearRaw =
      existingRow && existingRow.college_year !== null && existingRow.college_year !== undefined
        ? parseInt(existingRow.college_year, 10)
        : null;
    const existingHoursRaw =
      existingRow &&
      existingRow.learning_hours_per_day !== null &&
      existingRow.learning_hours_per_day !== undefined
        ? parseFloat(existingRow.learning_hours_per_day)
        : 0;

    // Validate college_year (use existing value if omitted from request body)
    let parsedYear = existingYearRaw;
    if (hasYearProp) {
      const rawYear = body.college_year;
      if (rawYear === null || rawYear === '') {
        parsedYear = null;
      } else {
        parsedYear = parseInt(rawYear, 10);
        if (isNaN(parsedYear) || parsedYear < 1 || parsedYear > 10) {
          await conn.rollback();
          return res.status(400).json({
            status: 'error',
            message: 'College year must be a valid number between 1 and 10.',
          });
        }
      }
    }

    // Validate learning_hours_per_day (use existing value if omitted from request body)
    let parsedHours = existingHoursRaw;
    if (hasHoursProp) {
      const rawHours = body.learning_hours_per_day;
      if (rawHours === null || rawHours === '') {
        parsedHours = 0;
      } else {
        parsedHours = parseFloat(rawHours);
        if (isNaN(parsedHours) || parsedHours < 0 || parsedHours > 24) {
          await conn.rollback();
          return res.status(400).json({
            status: 'error',
            message: 'Learning hours per day must be a number between 0 and 24.',
          });
        }
      }
    }

    const branchInput = hasBranchProp ? body.branch : existingBranchRaw;
    const validatedBranch = normalizeAndValidateProfileBranch({
      rawBranch: branchInput,
      existingSavedBranch: existingBranchRaw,
      allowAllExistingAsLegacy: false,
    });
    if (!validatedBranch.valid) {
      await conn.rollback();
      return res.status(400).json({
        status: 'error',
        message: validatedBranch.message,
      });
    }

    const interestsInput = hasInterestsProp ? body.interests : existingInterestsRaw;
    const validatedInterests = normalizeAndValidateProfileMultiSelect({
      rawInput: interestsInput,
      catalog: PREDEFINED_INTERESTS_CATALOG,
      existingSavedRaw: existingInterestsRaw,
      fieldLabel: 'Technical & Learning Interests',
      allowAllExistingAsLegacy: false,
    });
    if (!validatedInterests.valid) {
      await conn.rollback();
      return res.status(400).json({
        status: 'error',
        message: validatedInterests.message,
      });
    }

    const careerGoalsInput = hasGoalsProp ? body.career_goals : existingCareerGoalsRaw;
    const validatedCareerGoals = normalizeAndValidateProfileMultiSelect({
      rawInput: careerGoalsInput,
      catalog: PREDEFINED_CAREER_GOALS_CATALOG,
      existingSavedRaw: existingCareerGoalsRaw,
      fieldLabel: 'Career Goals',
      allowAllExistingAsLegacy: false,
    });
    if (!validatedCareerGoals.valid) {
      await conn.rollback();
      return res.status(400).json({
        status: 'error',
        message: validatedCareerGoals.message,
      });
    }

    // Load full canonical catalog (predefined + verified opportunity skills)
    const skillCatalog = await getFullSkillCatalog(conn);

    // Load the student's own previously saved skills inside the transaction
    // so only their own legacy entries can be retained or have their status updated
    const [existingSkillRows] = await conn.execute(
      `SELECT skill, status FROM user_skills WHERE user_id = ? ORDER BY id ASC FOR UPDATE`,
      [userId]
    );

    const existingLegacyMap = new Map();
    for (const row of existingSkillRows) {
      if (!row || typeof row.skill !== 'string') continue;
      const trimmed = row.skill.trim();
      if (!trimmed) continue;
      const catalogMatch = resolveCanonicalCatalogSkill(trimmed, skillCatalog);
      if (!catalogMatch) {
        existingLegacyMap.set(normalizeSkillString(trimmed), trimmed);
      }
    }

    const skillsToProcess = hasSkillsProp
      ? body.skills
      : existingSkillRows.map((r) => ({ skill: r.skill, status: r.status }));

    const dedupMap = new Map();

    for (const item of skillsToProcess) {
      if (!item || typeof item !== 'object' || typeof item.skill !== 'string') {
        await conn.rollback();
        return res.status(400).json({
          status: 'error',
          message: 'Each skill entry must include a valid skill name string.',
        });
      }

      const rawSkill = item.skill.trim();
      if (!rawSkill) {
        await conn.rollback();
        return res.status(400).json({
          status: 'error',
          message: 'Skill name cannot be empty.',
        });
      }

      if (
        item.status !== undefined &&
        item.status !== 'Knows' &&
        item.status !== 'Learning'
      ) {
        await conn.rollback();
        return res.status(400).json({
          status: 'error',
          message: `Invalid status "${item.status}" for skill "${rawSkill}". Status must be "Knows" or "Learning".`,
        });
      }

      const status = item.status === 'Knows' ? 'Knows' : 'Learning';
      const catalogMatch = resolveCanonicalCatalogSkill(rawSkill, skillCatalog);

      let canonicalSkillName;
      let dedupKey;
      let category;
      let isLegacy = false;

      if (catalogMatch) {
        canonicalSkillName = catalogMatch.name;
        dedupKey = getCanonicalSkillKey(catalogMatch.name);
        category = catalogMatch.category;
      } else {
        const legacyKey = normalizeSkillString(rawSkill);
        if (existingLegacyMap.has(legacyKey)) {
          canonicalSkillName = existingLegacyMap.get(legacyKey);
          dedupKey = legacyKey;
          category = 'Legacy (Saved Skill)';
          isLegacy = true;
        } else {
          await conn.rollback();
          return res.status(400).json({
            status: 'error',
            message: `Unsupported skill "${rawSkill}". Please select skills from the predefined SkillUP catalog.`,
          });
        }
      }

      if (dedupMap.has(dedupKey)) {
        const existing = dedupMap.get(dedupKey);
        if (status === 'Knows') {
          existing.status = 'Knows';
        }
      } else {
        dedupMap.set(dedupKey, {
          skill: canonicalSkillName,
          status,
          category,
          isLegacy,
        });
      }
    }

    const validatedSkills = Array.from(dedupMap.values());

    // Upsert into profiles table
    await conn.execute(
      `INSERT INTO profiles (user_id, branch, college_year, interests, career_goals, learning_hours_per_day)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         branch = VALUES(branch),
         college_year = VALUES(college_year),
         interests = VALUES(interests),
         career_goals = VALUES(career_goals),
         learning_hours_per_day = VALUES(learning_hours_per_day)`,
      [
        userId,
        validatedBranch.branch,
        parsedYear,
        validatedInterests.serialized,
        validatedCareerGoals.serialized,
        parsedHours,
      ]
    );

    // Sync skills transactionally: Delete existing and re-insert normalized, deduplicated skills
    await conn.execute('DELETE FROM user_skills WHERE user_id = ?', [userId]);

    for (const s of validatedSkills) {
      await conn.execute(
        'INSERT INTO user_skills (user_id, skill, status) VALUES (?, ?, ?)',
        [userId, s.skill, s.status]
      );
    }

    await conn.commit();

    return res.status(200).json({
      status: 'ok',
      message: 'Profile updated successfully',
      profile: {
        branch: validatedBranch.branch,
        branchIsLegacy: validatedBranch.isLegacy,
        college_year: parsedYear,
        interests: validatedInterests.serialized,
        interestsList: validatedInterests.items,
        career_goals: validatedCareerGoals.serialized,
        careerGoalsList: validatedCareerGoals.items,
        learning_hours_per_day: parsedHours,
      },
      skills: validatedSkills,
      skillCatalog,
      branchCatalog: PREDEFINED_BRANCH_CATALOG,
      interestCatalog: PREDEFINED_INTERESTS_CATALOG,
      careerGoalCatalog: PREDEFINED_CAREER_GOALS_CATALOG,
    });
  } catch (error) {
    if (conn) {
      try {
        await conn.rollback();
      } catch (rollbackErr) {
        console.error('Error during transaction rollback:', rollbackErr);
      }
    }
    next(error);
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

