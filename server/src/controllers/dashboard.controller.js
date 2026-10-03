import pool from '../config/db.js';
import {
  getFullSkillCatalog,
  normalizeAndValidateProfileBranch,
  normalizeAndValidateProfileMultiSelect,
  PREDEFINED_CAREER_GOALS_CATALOG,
  PREDEFINED_INTERESTS_CATALOG,
} from '../services/skillAnalysis.service.js';
import { normalizeSavedUserSkills } from './profile.controller.js';
import { getRecommendedOpportunitiesFromRows } from './opportunity.controller.js';

const MAX_DASHBOARD_ACTIVE_TRACKS = 3;
const MAX_DASHBOARD_COMPLETED_TRACKS = 3;
const MAX_DASHBOARD_OPPORTUNITIES = 3;

/**
 * Determine whether the student's profile is complete using the actual required
 * Profile fields (Correction 1):
 * - Branch / Major
 * - College Year (1–10)
 * - Available Learning Hours Per Day (> 0)
 * - Technical & Learning Interests (at least 1 selection)
 * - Career Goals (at least 1 selection)
 * - Skills (at least 1 skill in Knows or Learning)
 */
export function evaluateProfileCompletion(profileData, normalizedSkills = []) {
  const missingFields = [];

  const hasBranch = Boolean(
    profileData &&
      typeof profileData.branch === 'string' &&
      profileData.branch.trim().length > 0
  );
  if (!hasBranch) {
    missingFields.push('Branch / Major');
  }

  const year = profileData?.college_year;
  const hasCollegeYear =
    Number.isInteger(year) && year >= 1 && year <= 10;
  if (!hasCollegeYear) {
    missingFields.push('College Year');
  }

  const hours = profileData?.learning_hours_per_day;
  const hasLearningHours =
    typeof hours === 'number' && !Number.isNaN(hours) && hours > 0 && hours <= 24;
  if (!hasLearningHours) {
    missingFields.push('Learning Hours / Day');
  }

  const hasInterests =
    Array.isArray(profileData?.interestsList) &&
    profileData.interestsList.length > 0;
  if (!hasInterests) {
    missingFields.push('Technical & Learning Interests');
  }

  const hasCareerGoals =
    Array.isArray(profileData?.careerGoalsList) &&
    profileData.careerGoalsList.length > 0;
  if (!hasCareerGoals) {
    missingFields.push('Career Goals');
  }

  const hasSkills = Array.isArray(normalizedSkills) && normalizedSkills.length > 0;
  if (!hasSkills) {
    missingFields.push('Skills');
  }

  return {
    isProfileComplete: missingFields.length === 0,
    missingProfileFields: missingFields,
  };
}

/**
 * Compute deterministic primary next action for the Personalized Welcome banner.
 * No external AI calls are made.
 */
function computePrimaryNextAction({
  isProfileComplete,
  missingProfileFields,
  activeTracks,
  totalTracksCount,
}) {
  if (!isProfileComplete) {
    return {
      type: 'complete_profile',
      label: 'Complete Your Profile',
      subtitle: 'Finish setting up your academic profile and skills to get tailored recommendations.',
      missingFields: missingProfileFields,
      targetTab: 'profile',
      trackId: null,
      opportunityId: null,
    };
  }

  if (activeTracks.length > 0) {
    const primaryTrack = activeTracks[0];
    return {
      type: 'continue_learning',
      label: 'Continue Learning',
      subtitle: `Resume "${primaryTrack.topic}" (${primaryTrack.progressPercentage}% complete).`,
      missingFields: [],
      targetTab: 'tracks',
      trackId: primaryTrack.id,
      opportunityId: null,
    };
  }

  if (totalTracksCount === 0) {
    return {
      type: 'discover_resources',
      label: 'Discover Learning Resources',
      subtitle: 'Find curated long-form YouTube courses and create your first learning track.',
      missingFields: [],
      targetTab: 'learn',
      trackId: null,
      opportunityId: null,
    };
  }

  return {
    type: 'explore_opportunities',
    label: 'Explore Opportunities',
    subtitle: 'Your active tracks are complete! Check out verified hackathons, internships, and competitions.',
    missingFields: [],
    targetTab: 'opportunities',
    trackId: null,
    opportunityId: null,
  };
}

/**
 * GET /api/dashboard
 * Protected aggregation endpoint returning real MySQL statistics, active/completed tracks,
 * next incomplete tasks, skills overview, and personalized opportunity recommendations
 * for the authenticated student.
 */
export async function getDashboard(req, res, next) {
  try {
    const userId = req.user.id;

    // Execute core queries in parallel using parameterized SQL (no N+1 queries, no YouTube/Gemini calls)
    const [
      [userRows],
      [profileRows],
      [skillRows],
      [trackRows],
      [opportunityRows],
      skillCatalog,
    ] = await Promise.all([
      pool.execute(
        'SELECT id, name, email, created_at FROM users WHERE id = ? LIMIT 1',
        [userId]
      ),
      pool.execute(
        `SELECT branch, college_year, interests, career_goals, learning_hours_per_day
         FROM profiles
         WHERE user_id = ?
         LIMIT 1`,
        [userId]
      ),
      pool.execute(
        `SELECT id, skill, status
         FROM user_skills
         WHERE user_id = ?
         ORDER BY id ASC`,
        [userId]
      ),
      pool.query(
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
        ORDER BY lt.updated_at DESC, lt.created_at DESC, lt.id DESC`,
        [userId]
      ),
      pool.query('SELECT * FROM opportunities ORDER BY id ASC'),
      getFullSkillCatalog(pool),
    ]);

    if (userRows.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'User account no longer exists.',
      });
    }

    const student = {
      id: userRows[0].id,
      name: userRows[0].name,
      email: userRows[0].email,
    };

    // 1. Normalize skills
    const normalizedSkills = normalizeSavedUserSkills(skillRows, skillCatalog);
    const knownSkills = normalizedSkills.filter((s) => s.status === 'Knows');
    const learningSkills = normalizedSkills.filter((s) => s.status !== 'Knows');

    // 2. Normalize profile & evaluate profile completion (Correction 1)
    let profileData = {
      branch: '',
      branchIsLegacy: false,
      college_year: null,
      interests: '',
      interestsList: [],
      career_goals: '',
      careerGoalsList: [],
      learning_hours_per_day: 0,
    };

    if (profileRows.length > 0) {
      const rawProf = profileRows[0];
      const normBranch = normalizeAndValidateProfileBranch({
        rawBranch: rawProf.branch || '',
        existingSavedBranch: rawProf.branch || '',
        allowAllExistingAsLegacy: true,
      });
      const normInterests = normalizeAndValidateProfileMultiSelect({
        rawInput: rawProf.interests || '',
        catalog: PREDEFINED_INTERESTS_CATALOG,
        existingSavedRaw: rawProf.interests || '',
        fieldLabel: 'Technical & Learning Interests',
        allowAllExistingAsLegacy: true,
      });
      const normCareerGoals = normalizeAndValidateProfileMultiSelect({
        rawInput: rawProf.career_goals || '',
        catalog: PREDEFINED_CAREER_GOALS_CATALOG,
        existingSavedRaw: rawProf.career_goals || '',
        fieldLabel: 'Career Goals',
        allowAllExistingAsLegacy: true,
      });

      profileData = {
        branch: normBranch.branch,
        branchIsLegacy: normBranch.isLegacy,
        college_year:
          rawProf.college_year !== null && rawProf.college_year !== undefined
            ? parseInt(rawProf.college_year, 10)
            : null,
        interests: normInterests.serialized,
        interestsList: normInterests.items,
        career_goals: normCareerGoals.serialized,
        careerGoalsList: normCareerGoals.items,
        learning_hours_per_day:
          rawProf.learning_hours_per_day !== null &&
          rawProf.learning_hours_per_day !== undefined
            ? parseFloat(rawProf.learning_hours_per_day)
            : 0,
      };
    }

    const { isProfileComplete, missingProfileFields } = evaluateProfileCompletion(
      profileData,
      normalizedSkills
    );

    // 3. Serialize tracks and calculate progress/completion strictly from actual task records (Correction 2)
    let totalTasksAcrossAllTracks = 0;
    let completedTasksAcrossAllTracks = 0;

    const allTracks = trackRows.map((r) => {
      const totalTasks = Number(r.totalTasks) || 0;
      const completedTasks = Number(r.completedTasks) || 0;
      totalTasksAcrossAllTracks += totalTasks;
      completedTasksAcrossAllTracks += completedTasks;

      const progressPercentage =
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      const derivedStatus =
        totalTasks > 0 && completedTasks === totalTasks ? 'Completed' : 'Active';

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
        status: derivedStatus,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        totalTasks,
        completedTasks,
        totalDays: Number(r.totalDays) || 1,
        totalMinutes: Number(r.totalMinutes) || 0,
        progressPercentage,
        nextTask: null,
      };
    });

    const allActiveTracks = allTracks.filter((t) => t.status === 'Active');
    const allCompletedTracks = allTracks.filter((t) => t.status === 'Completed');

    // Prioritize most recently updated active tracks and take a compact slice (Correction 3)
    const displayedActiveTracks = allActiveTracks.slice(0, MAX_DASHBOARD_ACTIVE_TRACKS);
    const displayedCompletedTracks = allCompletedTracks.slice(
      0,
      MAX_DASHBOARD_COMPLETED_TRACKS
    );

    // 4. Fetch the next incomplete task for the displayed active tracks in a single batch query (Zero N+1)
    if (displayedActiveTracks.length > 0) {
      const activeIds = displayedActiveTracks.map((t) => t.id);
      const [incompleteTaskRows] = await pool.query(
        `SELECT
          id,
          track_id AS trackId,
          day_number AS dayNumber,
          title,
          task_type AS taskType,
          estimated_minutes AS estimatedMinutes,
          sort_order AS sortOrder
         FROM track_tasks
         WHERE track_id IN (?) AND completed = 0
         ORDER BY track_id ASC, day_number ASC, sort_order ASC, id ASC`,
        [activeIds]
      );

      const nextTaskByTrackId = new Map();
      for (const taskRow of incompleteTaskRows) {
        if (!nextTaskByTrackId.has(taskRow.trackId)) {
          nextTaskByTrackId.set(taskRow.trackId, {
            id: taskRow.id,
            dayNumber: taskRow.dayNumber,
            title: taskRow.title,
            taskType: taskRow.taskType,
            estimatedMinutes: taskRow.estimatedMinutes,
          });
        }
      }

      for (const track of displayedActiveTracks) {
        track.nextTask = nextTaskByTrackId.get(track.id) || null;
      }
    }

    // 5. Reuse Milestone 5 opportunity recommendation engine
    const { recommendedList } = getRecommendedOpportunitiesFromRows(
      opportunityRows,
      normalizedSkills,
      profileData
    );

    const displayedOpportunities = recommendedList
      .slice(0, MAX_DASHBOARD_OPPORTUNITIES)
      .map((opp) => ({
        id: opp.id,
        title: opp.title,
        organization: opp.organization,
        type: opp.type,
        status: opp.status,
        isExpired: opp.isExpired,
        deadline: opp.deadline,
        deadlineDisplay: opp.deadlineDisplay,
        daysRemaining: opp.daysRemaining,
        locationMode: opp.locationMode,
        hostingPlatform: opp.hostingPlatform,
        isUnstopListing: opp.isUnstopListing,
        relevanceReason: opp.relevanceReason,
        matchedKnowsSkills: opp.matchedKnowsSkills,
        matchedLearningSkills: opp.matchedLearningSkills,
        matchedInterests: opp.matchedInterests,
      }));

    // 6. Compute deterministic Primary Next Action
    const primaryAction = computePrimaryNextAction({
      isProfileComplete,
      missingProfileFields,
      activeTracks: allActiveTracks,
      totalTracksCount: allTracks.length,
    });

    return res.status(200).json({
      status: 'ok',
      student,
      profile: {
        ...profileData,
        isProfileComplete,
        missingProfileFields,
      },
      summary: {
        activeTracksCount: allActiveTracks.length,
        completedTracksCount: allCompletedTracks.length,
        totalTracksCount: allTracks.length,
        completedTasksCount: completedTasksAcrossAllTracks,
        totalTasksCount: totalTasksAcrossAllTracks,
        knownSkillsCount: knownSkills.length,
        learningSkillsCount: learningSkills.length,
        totalSkillsCount: normalizedSkills.length,
        recommendedOpportunitiesCount: recommendedList.length,
      },
      primaryAction,
      skills: {
        knows: knownSkills,
        learning: learningSkills,
        totalCount: normalizedSkills.length,
      },
      activeTracks: displayedActiveTracks,
      hasMoreActiveTracks: allActiveTracks.length > MAX_DASHBOARD_ACTIVE_TRACKS,
      recentlyCompletedTracks: displayedCompletedTracks,
      hasMoreCompletedTracks:
        allCompletedTracks.length > MAX_DASHBOARD_COMPLETED_TRACKS,
      recommendedOpportunities: displayedOpportunities,
      hasMoreRecommendedOpportunities:
        recommendedList.length > MAX_DASHBOARD_OPPORTUNITIES,
    });
  } catch (error) {
    next(error);
  }
}

export default {
  getDashboard,
  evaluateProfileCompletion,
};
