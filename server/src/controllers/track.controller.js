import pool from '../config/db.js';
import { getYouTubeVideoById } from '../services/youtube.service.js';
import {
  generateTrackSchedule,
  parseDailyBudgetMinutes,
} from '../services/gemini.service.js';
import {
  areSkillsEquivalent,
  findPredefinedTopicMatch,
  validateOpportunitySkillContext,
} from '../services/skillAnalysis.service.js';

const ALLOWED_LEVELS = new Set(['Beginner', 'Intermediate', 'Advanced']);
const ALLOWED_TASK_TYPES = new Set(['Watch', 'Practice', 'Revision']);

/**
 * Strictly validate the confirmed task list before saving to MySQL.
 * Checks task count, types, sequence/day numbers, estimated minutes, and daily time limit.
 */
function validateConfirmedTasks(tasks, dailyBudgetMinutes) {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return { valid: false, message: 'At least one task is required to save a learning track.' };
  }

  if (tasks.length > 60) {
    return { valid: false, message: 'A learning track cannot exceed 60 tasks.' };
  }

  const maxDaily = Math.max(15, Math.min(720, Number(dailyBudgetMinutes) || 60));
  const dayTotals = new Map();
  const validated = [];
  let previousDay = 1;

  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    if (!t || typeof t !== 'object') {
      return { valid: false, message: `Task at index ${i} is invalid.` };
    }

    const title = typeof t.title === 'string' ? t.title.trim() : '';
    if (!title || title.length > 255) {
      return {
        valid: false,
        message: `Task ${i + 1} must have a valid title (1–255 characters).`,
      };
    }

    if (/https?:\/\/\S+/i.test(title)) {
      return {
        valid: false,
        message: `Task ${i + 1} title must not contain external URLs.`,
      };
    }

    const description = typeof t.description === 'string' ? t.description.trim() : '';
    if (description.length > 1000) {
      return {
        valid: false,
        message: `Task ${i + 1} description exceeds maximum length (1000 characters).`,
      };
    }

    const taskType = typeof (t.taskType ?? t.task_type) === 'string' ? (t.taskType ?? t.task_type).trim() : '';
    if (!ALLOWED_TASK_TYPES.has(taskType)) {
      return {
        valid: false,
        message: `Task ${i + 1} has an invalid taskType "${taskType}". Allowed values: Watch, Practice, Revision.`,
      };
    }

    const dayNumber = Number(t.dayNumber ?? t.day_number);
    if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 60) {
      return {
        valid: false,
        message: `Task ${i + 1} must have an integer dayNumber between 1 and 60.`,
      };
    }

    if (i === 0 && dayNumber !== 1) {
      return {
        valid: false,
        message: 'Task schedule must start on Day 1.',
      };
    }

    if (dayNumber < previousDay || dayNumber > previousDay + 1) {
      return {
        valid: false,
        message: `Task ${i + 1} has an out-of-sequence dayNumber (${dayNumber}). Days must be sequential starting from 1.`,
      };
    }
    previousDay = dayNumber;

    const estimatedMinutes = Number(t.estimatedMinutes ?? t.estimated_minutes);
    if (!Number.isInteger(estimatedMinutes) || estimatedMinutes < 5 || estimatedMinutes > maxDaily) {
      return {
        valid: false,
        message: `Task ${i + 1} estimatedMinutes (${estimatedMinutes}) must be an integer between 5 and ${maxDaily} minutes.`,
      };
    }

    const newDayTotal = (dayTotals.get(dayNumber) || 0) + estimatedMinutes;
    if (newDayTotal > maxDaily) {
      return {
        valid: false,
        message: `Combined tasks on Day ${dayNumber} (${newDayTotal} mins) exceed the selected daily learning time (${maxDaily} mins).`,
      };
    }
    dayTotals.set(dayNumber, newDayTotal);

    validated.push({
      dayNumber,
      title,
      description,
      taskType,
      estimatedMinutes,
      sortOrder: i + 1,
    });
  }

  return { valid: true, tasks: validated };
}

/**
 * POST /api/tracks/generate
 * Generate a personalized learning track preview without saving to MySQL.
 * Supports optional, backend-validated opportunity context (Milestone 7).
 */
export async function generateTrackPreview(req, res, next) {
  try {
    const userId = req.user.id;
    const {
      videoId,
      topic,
      level,
      goal,
      availableTime,
      opportunityId,
      targetSkill,
      contextToken,
    } = req.body;

    if (!videoId || typeof videoId !== 'string' || !videoId.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'A valid YouTube videoId is required.',
      });
    }

    if (!topic || typeof topic !== 'string' || !topic.trim() || topic.trim().length > 200) {
      return res.status(400).json({
        status: 'error',
        message: 'A valid learning topic is required (max 200 characters).',
      });
    }

    const rawTopic = topic.trim();
    const hasOpportunityContext =
      (opportunityId !== undefined && opportunityId !== null && opportunityId !== '') ||
      (targetSkill !== undefined && targetSkill !== null && String(targetSkill).trim() !== '');

    let sanitizedTopic = rawTopic;
    let validatedOpportunity = null;
    let normalizedTargetSkill = null;
    let issuedContextToken = null;

    if (hasOpportunityContext) {
      const skillToValidate =
        typeof targetSkill === 'string' && targetSkill.trim()
          ? targetSkill.trim()
          : rawTopic;

      const ctxValidation = await validateOpportunitySkillContext({
        pool,
        userId,
        opportunityId,
        targetSkill: skillToValidate,
        contextToken,
      });

      if (!ctxValidation.valid) {
        return res.status(ctxValidation.statusCode || 400).json({
          status: 'error',
          message: ctxValidation.message,
        });
      }

      const predefinedMatch = findPredefinedTopicMatch(rawTopic);
      if (areSkillsEquivalent(rawTopic, ctxValidation.normalizedTargetSkill)) {
        sanitizedTopic = predefinedMatch || ctxValidation.normalizedTargetSkill;
      } else if (predefinedMatch) {
        sanitizedTopic = predefinedMatch;
      } else {
        return res.status(400).json({
          status: 'error',
          message: `Topic "${rawTopic}" does not match the validated target skill "${ctxValidation.normalizedTargetSkill}".`,
        });
      }

      validatedOpportunity = ctxValidation.opportunity;
      normalizedTargetSkill = ctxValidation.normalizedTargetSkill;
      issuedContextToken = ctxValidation.contextToken;
    } else {
      const predefinedMatch = findPredefinedTopicMatch(rawTopic);
      if (!predefinedMatch) {
        return res.status(400).json({
          status: 'error',
          message:
            'Unsupported learning topic. Please select a topic from the predefined catalog or start from an opportunity’s Skills to Develop.',
        });
      }
      sanitizedTopic = predefinedMatch;
    }

    const sanitizedLevel =
      level && typeof level === 'string' && ALLOWED_LEVELS.has(level.trim())
        ? level.trim()
        : 'Beginner';
    const sanitizedGoal =
      goal && typeof goal === 'string' && goal.trim()
        ? goal.trim().slice(0, 500)
        : validatedOpportunity
        ? `Prepare for ${validatedOpportunity.title}`
        : 'General learning';
    const sanitizedTime =
      availableTime && typeof availableTime === 'string' && availableTime.trim()
        ? availableTime.trim().slice(0, 100)
        : '1 hour/day';

    // 1. Verify YouTube resource metadata authoritatively from YouTube service
    let verifiedResource;
    try {
      verifiedResource = await getYouTubeVideoById(videoId.trim());
    } catch (ytErr) {
      return res.status(ytErr.statusCode || 502).json({
        status: 'error',
        message: ytErr.message || 'Failed to verify YouTube video metadata.',
      });
    }

    if (!verifiedResource) {
      return res.status(404).json({
        status: 'error',
        message: 'The selected YouTube video could not be verified or found.',
      });
    }

    // 2. Load student profile for additional context if available
    const [profileRows] = await pool.query(
      'SELECT branch, college_year, interests, career_goals, learning_hours_per_day FROM profiles WHERE user_id = ?',
      [userId]
    );
    const profile = profileRows[0] || null;

    // 3. Generate study schedule (Gemini with 8s timeout + deterministic fallback)
    const { tasks, aiGenerated, dailyBudgetMinutes } = await generateTrackSchedule({
      topic: sanitizedTopic,
      level: sanitizedLevel,
      goal: sanitizedGoal,
      availableTime: sanitizedTime,
      resource: verifiedResource,
      profile,
    });

    const estimatedDays = tasks.length > 0 ? Math.max(...tasks.map((t) => t.dayNumber)) : 1;
    const totalMinutes = tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);

    return res.status(200).json({
      status: 'ok',
      preview: {
        topic: sanitizedTopic,
        level: sanitizedLevel,
        goal: sanitizedGoal,
        availableTime: sanitizedTime,
        dailyBudgetMinutes,
        estimatedDays,
        totalMinutes,
        aiGenerated,
        resource: verifiedResource,
        tasks,
        opportunityId: validatedOpportunity ? validatedOpportunity.id : null,
        targetSkill: normalizedTargetSkill || null,
        opportunityTitle: validatedOpportunity ? validatedOpportunity.title : null,
        opportunityOrganization: validatedOpportunity ? validatedOpportunity.organization : null,
        opportunityType: validatedOpportunity ? validatedOpportunity.type : null,
        opportunitySourceUrl: validatedOpportunity ? validatedOpportunity.sourceUrl : null,
        contextToken: issuedContextToken || null,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/tracks
 * Save a confirmed learning track and its tasks to MySQL inside a transaction.
 * Supports optional, backend-validated opportunity context (Milestone 7).
 */
export async function createTrack(req, res, next) {
  let connection;
  try {
    const userId = req.user.id;
    const {
      videoId,
      topic,
      level,
      goal,
      availableTime,
      aiGenerated,
      tasks,
      opportunityId,
      targetSkill,
      contextToken,
    } = req.body;

    if (!videoId || typeof videoId !== 'string' || !videoId.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'A valid YouTube videoId is required.',
      });
    }

    if (!topic || typeof topic !== 'string' || !topic.trim() || topic.trim().length > 200) {
      return res.status(400).json({
        status: 'error',
        message: 'A valid learning topic is required (max 200 characters).',
      });
    }

    const rawTopic = topic.trim();
    const hasOpportunityContext =
      (opportunityId !== undefined && opportunityId !== null && opportunityId !== '') ||
      (targetSkill !== undefined && targetSkill !== null && String(targetSkill).trim() !== '');

    let sanitizedTopic = rawTopic;
    let validatedOpportunityId = null;
    let validatedTargetSkill = null;

    if (hasOpportunityContext) {
      const skillToValidate =
        typeof targetSkill === 'string' && targetSkill.trim()
          ? targetSkill.trim()
          : rawTopic;

      const ctxValidation = await validateOpportunitySkillContext({
        pool,
        userId,
        opportunityId,
        targetSkill: skillToValidate,
        contextToken,
      });

      if (!ctxValidation.valid) {
        return res.status(ctxValidation.statusCode || 400).json({
          status: 'error',
          message: ctxValidation.message,
        });
      }

      const predefinedMatch = findPredefinedTopicMatch(rawTopic);
      if (areSkillsEquivalent(rawTopic, ctxValidation.normalizedTargetSkill)) {
        sanitizedTopic = predefinedMatch || ctxValidation.normalizedTargetSkill;
      } else if (predefinedMatch) {
        sanitizedTopic = predefinedMatch;
      } else {
        return res.status(400).json({
          status: 'error',
          message: `Topic "${rawTopic}" does not match the validated target skill "${ctxValidation.normalizedTargetSkill}".`,
        });
      }

      validatedOpportunityId = ctxValidation.opportunity.id;
      validatedTargetSkill = ctxValidation.normalizedTargetSkill;
    } else {
      const predefinedMatch = findPredefinedTopicMatch(rawTopic);
      if (!predefinedMatch) {
        return res.status(400).json({
          status: 'error',
          message:
            'Unsupported learning topic. Please select a topic from the predefined catalog or start from an opportunity’s Skills to Develop.',
        });
      }
      sanitizedTopic = predefinedMatch;
    }

    const sanitizedLevel =
      level && typeof level === 'string' && ALLOWED_LEVELS.has(level.trim())
        ? level.trim()
        : 'Beginner';
    const sanitizedGoal =
      goal && typeof goal === 'string' ? goal.trim().slice(0, 500) : '';
    const sanitizedTime =
      availableTime && typeof availableTime === 'string' ? availableTime.trim().slice(0, 100) : '1 hour/day';

    // Load student profile to check fallback daily hours if needed
    const [profileRows] = await pool.query(
      'SELECT learning_hours_per_day FROM profiles WHERE user_id = ?',
      [userId]
    );
    const dailyBudgetMinutes = parseDailyBudgetMinutes(
      sanitizedTime,
      profileRows[0]?.learning_hours_per_day
    );

    // Strictly validate confirmed tasks against schema and daily learning time budget
    const validation = validateConfirmedTasks(tasks, dailyBudgetMinutes);
    if (!validation.valid) {
      return res.status(400).json({
        status: 'error',
        message: validation.message,
      });
    }

    // Verify authoritative YouTube video metadata (never trust arbitrary frontend metadata)
    let verifiedResource;
    try {
      verifiedResource = await getYouTubeVideoById(videoId.trim());
    } catch (ytErr) {
      return res.status(ytErr.statusCode || 502).json({
        status: 'error',
        message: ytErr.message || 'Failed to verify YouTube video metadata.',
      });
    }

    if (!verifiedResource) {
      return res.status(404).json({
        status: 'error',
        message: 'The selected YouTube video could not be verified.',
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [trackResult] = await connection.query(
      `INSERT INTO learning_tracks (
        user_id, opportunity_id, target_skill, topic, learning_goal, level, available_time,
        resource_video_id, resource_title, resource_channel,
        resource_url, resource_thumbnail, resource_duration,
        ai_generated, start_date, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), 'Active')`,
      [
        userId,
        validatedOpportunityId,
        validatedTargetSkill,
        sanitizedTopic,
        sanitizedGoal,
        sanitizedLevel,
        sanitizedTime,
        verifiedResource.videoId,
        verifiedResource.title,
        verifiedResource.channel,
        verifiedResource.url,
        verifiedResource.thumbnail,
        verifiedResource.duration || '',
        aiGenerated ? 1 : 0,
      ]
    );

    const trackId = trackResult.insertId;

    const taskValues = validation.tasks.map((t) => [
      trackId,
      t.dayNumber,
      t.title,
      t.description,
      t.taskType,
      t.estimatedMinutes,
      0,
      null,
      t.sortOrder,
    ]);

    await connection.query(
      `INSERT INTO track_tasks (
        track_id, day_number, title, description, task_type,
        estimated_minutes, completed, completed_at, sort_order
      ) VALUES ?`,
      [taskValues]
    );

    await connection.commit();

    return res.status(201).json({
      status: 'ok',
      message: 'Learning track saved successfully.',
      trackId,
      opportunityId: validatedOpportunityId,
      targetSkill: validatedTargetSkill,
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    next(error);
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * GET /api/tracks
 * Return all saved learning tracks belonging to the authenticated student,
 * including optional linked opportunity metadata (Milestone 7).
 */
export async function getUserTracks(req, res, next) {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      `SELECT
        lt.id,
        lt.opportunity_id AS opportunityId,
        lt.target_skill AS targetSkill,
        lt.topic,
        lt.learning_goal AS learningGoal,
        lt.level,
        lt.available_time AS availableTime,
        lt.resource_video_id AS resourceVideoId,
        lt.resource_title AS resourceTitle,
        lt.resource_channel AS resourceChannel,
        lt.resource_url AS resourceUrl,
        lt.resource_thumbnail AS resourceThumbnail,
        lt.resource_duration AS resourceDuration,
        lt.ai_generated AS aiGenerated,
        lt.start_date AS startDate,
        lt.status,
        lt.created_at AS createdAt,
        lt.updated_at AS updatedAt,
        o.title AS opportunityTitle,
        o.organization AS opportunityOrganization,
        o.type AS opportunityType,
        o.source_url AS opportunitySourceUrl,
        COUNT(tt.id) AS totalTasks,
        COALESCE(SUM(CASE WHEN tt.completed = 1 THEN 1 ELSE 0 END), 0) AS completedTasks,
        COALESCE(MAX(tt.day_number), 0) AS totalDays,
        COALESCE(SUM(tt.estimated_minutes), 0) AS totalMinutes
      FROM learning_tracks lt
      LEFT JOIN opportunities o ON o.id = lt.opportunity_id
      LEFT JOIN track_tasks tt ON tt.track_id = lt.id
      WHERE lt.user_id = ?
      GROUP BY lt.id
      ORDER BY lt.created_at DESC, lt.id DESC`,
      [userId]
    );

    const tracks = rows.map((r) => {
      const totalTasks = Number(r.totalTasks) || 0;
      const completedTasks = Number(r.completedTasks) || 0;
      const progressPercentage =
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        id: r.id,
        opportunityId: r.opportunityId || null,
        targetSkill: r.targetSkill || null,
        opportunityTitle: r.opportunityTitle || null,
        opportunityOrganization: r.opportunityOrganization || null,
        opportunityType: r.opportunityType || null,
        opportunitySourceUrl: r.opportunitySourceUrl || null,
        opportunityAvailable: Boolean(r.opportunityId && r.opportunityTitle),
        topic: r.topic,
        learningGoal: r.learningGoal,
        level: r.level,
        availableTime: r.availableTime,
        resourceVideoId: r.resourceVideoId,
        resourceTitle: r.resourceTitle,
        resourceChannel: r.resourceChannel,
        resourceUrl: r.resourceUrl,
        resourceThumbnail: r.resourceThumbnail,
        resourceDuration: r.resourceDuration,
        aiGenerated: Boolean(r.aiGenerated),
        startDate: r.startDate,
        status: totalTasks > 0 && completedTasks === totalTasks ? 'Completed' : r.status,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        totalTasks,
        completedTasks,
        totalDays: Number(r.totalDays) || 1,
        totalMinutes: Number(r.totalMinutes) || 0,
        progressPercentage,
      };
    });

    return res.status(200).json({
      status: 'ok',
      tracks,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/tracks/:id
 * Return full details and ordered tasks for a single learning track owned by the student.
 */
export async function getTrackById(req, res, next) {
  try {
    const userId = req.user.id;
    const trackId = parseInt(req.params.id, 10);

    if (!Number.isInteger(trackId) || trackId <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid track ID.',
      });
    }

    const [trackRows] = await pool.query(
      `SELECT
        lt.id, lt.user_id, lt.opportunity_id AS opportunityId, lt.target_skill AS targetSkill,
        lt.topic, lt.learning_goal AS learningGoal, lt.level,
        lt.available_time AS availableTime, lt.resource_video_id AS resourceVideoId,
        lt.resource_title AS resourceTitle, lt.resource_channel AS resourceChannel,
        lt.resource_url AS resourceUrl, lt.resource_thumbnail AS resourceThumbnail,
        lt.resource_duration AS resourceDuration, lt.ai_generated AS aiGenerated,
        lt.start_date AS startDate, lt.status, lt.created_at AS createdAt, lt.updated_at AS updatedAt,
        o.title AS opportunityTitle, o.organization AS opportunityOrganization,
        o.type AS opportunityType, o.source_url AS opportunitySourceUrl
      FROM learning_tracks lt
      LEFT JOIN opportunities o ON o.id = lt.opportunity_id
      WHERE lt.id = ?`,
      [trackId]
    );

    if (trackRows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Learning track not found.',
      });
    }

    const trackRow = trackRows[0];
    if (trackRow.user_id !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to view this learning track.',
      });
    }

    const [taskRows] = await pool.query(
      `SELECT
        id, track_id AS trackId, day_number AS dayNumber, title, description,
        task_type AS taskType, estimated_minutes AS estimatedMinutes,
        completed, completed_at AS completedAt, sort_order AS sortOrder
      FROM track_tasks
      WHERE track_id = ?
      ORDER BY day_number ASC, sort_order ASC, id ASC`,
      [trackId]
    );

    const tasks = taskRows.map((t) => ({
      id: t.id,
      trackId: t.trackId,
      dayNumber: t.dayNumber,
      title: t.title,
      description: t.description,
      taskType: t.taskType,
      estimatedMinutes: t.estimatedMinutes,
      completed: Boolean(t.completed),
      completedAt: t.completedAt,
      sortOrder: t.sortOrder,
    }));

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.completed).length;
    const progressPercentage =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const totalDays = tasks.length > 0 ? Math.max(...tasks.map((t) => t.dayNumber)) : 1;
    const totalMinutes = tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);

    return res.status(200).json({
      status: 'ok',
      track: {
        id: trackRow.id,
        opportunityId: trackRow.opportunityId || null,
        targetSkill: trackRow.targetSkill || null,
        opportunityTitle: trackRow.opportunityTitle || null,
        opportunityOrganization: trackRow.opportunityOrganization || null,
        opportunityType: trackRow.opportunityType || null,
        opportunitySourceUrl: trackRow.opportunitySourceUrl || null,
        opportunityAvailable: Boolean(trackRow.opportunityId && trackRow.opportunityTitle),
        topic: trackRow.topic,
        learningGoal: trackRow.learningGoal,
        level: trackRow.level,
        availableTime: trackRow.availableTime,
        resourceVideoId: trackRow.resourceVideoId,
        resourceTitle: trackRow.resourceTitle,
        resourceChannel: trackRow.resourceChannel,
        resourceUrl: trackRow.resourceUrl,
        resourceThumbnail: trackRow.resourceThumbnail,
        resourceDuration: trackRow.resourceDuration,
        aiGenerated: Boolean(trackRow.aiGenerated),
        startDate: trackRow.startDate,
        status: totalTasks > 0 && completedTasks === totalTasks ? 'Completed' : trackRow.status,
        createdAt: trackRow.createdAt,
        updatedAt: trackRow.updatedAt,
        totalTasks,
        completedTasks,
        totalDays,
        totalMinutes,
        progressPercentage,
        tasks,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/tracks/:id/tasks/:taskId
 * Update a task's completion status and recalculate overall track status.
 */
export async function updateTaskCompletion(req, res, next) {
  try {
    const userId = req.user.id;
    const trackId = parseInt(req.params.id, 10);
    const taskId = parseInt(req.params.taskId, 10);
    const { completed } = req.body;

    if (!Number.isInteger(trackId) || trackId <= 0 || !Number.isInteger(taskId) || taskId <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid track ID or task ID.',
      });
    }

    if (typeof completed !== 'boolean') {
      return res.status(400).json({
        status: 'error',
        message: 'Field "completed" must be a boolean.',
      });
    }

    // 1. Verify track ownership
    const [trackRows] = await pool.query(
      'SELECT id, user_id FROM learning_tracks WHERE id = ?',
      [trackId]
    );

    if (trackRows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Learning track not found.',
      });
    }

    if (trackRows[0].user_id !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to modify this learning track.',
      });
    }

    // 2. Verify task belongs to this track
    const [taskRows] = await pool.query(
      'SELECT id FROM track_tasks WHERE id = ? AND track_id = ?',
      [taskId, trackId]
    );

    if (taskRows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found in this learning track.',
      });
    }

    // 3. Update task completion
    await pool.query(
      `UPDATE track_tasks
       SET completed = ?, completed_at = ?
       WHERE id = ? AND track_id = ?`,
      [completed ? 1 : 0, completed ? new Date() : null, taskId, trackId]
    );

    // 4. Recalculate track completion status
    const [statsRows] = await pool.query(
      `SELECT
        COUNT(*) AS totalTasks,
        COALESCE(SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END), 0) AS completedTasks
       FROM track_tasks
       WHERE track_id = ?`,
      [trackId]
    );

    const totalTasks = Number(statsRows[0]?.totalTasks) || 0;
    const completedTasks = Number(statsRows[0]?.completedTasks) || 0;
    const progressPercentage =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const newStatus =
      totalTasks > 0 && completedTasks === totalTasks ? 'Completed' : 'Active';

    await pool.query(
      'UPDATE learning_tracks SET status = ? WHERE id = ?',
      [newStatus, trackId]
    );

    return res.status(200).json({
      status: 'ok',
      message: 'Task status updated.',
      task: {
        id: taskId,
        trackId,
        completed,
      },
      progress: {
        totalTasks,
        completedTasks,
        progressPercentage,
        status: newStatus,
      },
    });
  } catch (error) {
    next(error);
  }
}

export default {
  generateTrackPreview,
  createTrack,
  getUserTracks,
  getTrackById,
  updateTaskCompletion,
};
