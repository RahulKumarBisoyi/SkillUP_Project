import pool from '../config/db.js';

/**
 * GET /api/profile
 * Retrieve profile information and skills for the authenticated student.
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

    const profileData = profiles.length > 0 ? {
      branch: profiles[0].branch || '',
      college_year: profiles[0].college_year !== null ? parseInt(profiles[0].college_year, 10) : null,
      interests: profiles[0].interests || '',
      career_goals: profiles[0].career_goals || '',
      learning_hours_per_day: profiles[0].learning_hours_per_day !== null
        ? parseFloat(profiles[0].learning_hours_per_day)
        : 0,
    } : null;

    return res.status(200).json({
      status: 'ok',
      profile: profileData,
      skills: skills.map((s) => ({
        id: s.id,
        skill: s.skill,
        status: s.status,
      })),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/profile
 * Create or update profile information and skills for the authenticated student.
 */
export async function updateProfile(req, res, next) {
  const userId = req.user.id;
  let conn;

  try {
    const {
      branch = '',
      college_year = null,
      interests = '',
      career_goals = '',
      learning_hours_per_day = 0,
      skills = [],
    } = req.body;

    // Validate college_year
    let parsedYear = null;
    if (college_year !== null && college_year !== '' && college_year !== undefined) {
      parsedYear = parseInt(college_year, 10);
      if (isNaN(parsedYear) || parsedYear < 1 || parsedYear > 10) {
        return res.status(400).json({
          status: 'error',
          message: 'College year must be a valid number between 1 and 10.',
        });
      }
    }

    // Validate learning_hours_per_day
    let parsedHours = 0;
    if (learning_hours_per_day !== null && learning_hours_per_day !== undefined && learning_hours_per_day !== '') {
      parsedHours = parseFloat(learning_hours_per_day);
      if (isNaN(parsedHours) || parsedHours < 0 || parsedHours > 24) {
        return res.status(400).json({
          status: 'error',
          message: 'Learning hours per day must be a number between 0 and 24.',
        });
      }
    }

    // Validate skills array
    if (!Array.isArray(skills)) {
      return res.status(400).json({
        status: 'error',
        message: 'Skills must be an array of skill objects.',
      });
    }

    const validatedSkills = [];
    const seenSkills = new Set();

    for (const item of skills) {
      if (!item || typeof item.skill !== 'string') continue;
      const skillName = item.skill.trim();
      if (!skillName) continue;

      const normalizedSkill = skillName.toLowerCase();
      if (seenSkills.has(normalizedSkill)) continue; // Prevent duplicates
      seenSkills.add(normalizedSkill);

      const status = item.status === 'Knows' ? 'Knows' : 'Learning';
      validatedSkills.push({ skill: skillName, status });
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

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
        typeof branch === 'string' ? branch.trim() : '',
        parsedYear,
        typeof interests === 'string' ? interests.trim() : '',
        typeof career_goals === 'string' ? career_goals.trim() : '',
        parsedHours,
      ]
    );

    // Sync skills: Delete existing and re-insert valid skills
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
        branch: typeof branch === 'string' ? branch.trim() : '',
        college_year: parsedYear,
        interests: typeof interests === 'string' ? interests.trim() : '',
        career_goals: typeof career_goals === 'string' ? career_goals.trim() : '',
        learning_hours_per_day: parsedHours,
      },
      skills: validatedSkills,
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
