import dotenv from 'dotenv';

dotenv.config();

// Maximum total time budget for Gemini ranking (8 seconds)
const GEMINI_BUDGET_MS = 8000;
// Minimum remaining budget required to attempt a fallback model
const MIN_RETRY_BUDGET_MS = 2500;

/**
 * Safely parse JSON from model output, handling potential markdown codeblocks.
 */
function cleanAndParseJson(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;
  let text = rawText.trim();
  if (text.startsWith('```json')) {
    text = text.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (text.startsWith('```')) {
    text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  try {
    return JSON.parse(text);
  } catch (parseErr) {
    return null;
  }
}

/**
 * Execute request against Gemini API with an explicit AbortSignal.
 */
async function callGeminiApi(modelName, apiKey, body, signal) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  return response;
}

/**
 * Use Gemini API to rank real YouTube candidate videos and explain their suitability.
 * Enforces a strict ~8-second total time budget and avoids sequential retries once budget is spent.
 *
 * @param {Object} params
 * @param {string} params.topic - Topic the student wants to learn.
 * @param {string} [params.level] - Student's current level (Beginner, Intermediate, Advanced).
 * @param {string} [params.goal] - Student's learning goal.
 * @param {string} [params.availableTime] - Available study time per day.
 * @param {Array<Object>} params.candidates - Authentic candidate videos from YouTube Data API.
 * @returns {Promise<Array<Object>|null>} Ranked and explained resources, or null if Gemini fails/times out.
 */
export async function rankAndExplainResources({
  topic,
  level = 'Beginner',
  goal = 'General learning',
  availableTime = 'Flexible',
  candidates = [],
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  const primaryModel = process.env.GEMINI_MODEL || 'gemini-flash-latest';

  if (!apiKey || candidates.length === 0) {
    return null; // Triggers clean fallback
  }

  const startTime = performance.now();
  const budgetController = new AbortController();
  const budgetTimer = setTimeout(() => {
    budgetController.abort(new Error('Gemini ranking time budget (8s) exceeded'));
  }, GEMINI_BUDGET_MS);

  // Map candidates for quick verification
  const candidateMap = new Map(candidates.map((c) => [c.videoId, c]));

  // Simplified candidate representation for Gemini prompt including duration
  const candidateSummaries = candidates.map((c) => ({
    videoId: c.videoId,
    title: c.title,
    channel: c.channel,
    duration: c.duration,
    description: c.description.slice(0, 150),
  }));

  const prompt = `You are an expert engineering curriculum advisor. A student wants learning recommendations for:
Topic: "${topic}"
Current Skill Level: "${level || 'Beginner'}"
Learning Goal: "${goal || 'Placement preparation / general proficiency'}"
Available Time: "${availableTime || '1 hour per day'}"

Below is a list of REAL, long-form educational YouTube videos (all >= 8 minutes, comprehensive courses and tutorials) retrieved from the YouTube API:
${JSON.stringify(candidateSummaries, null, 2)}

TASK:
1. Review the candidate videos, their depth, and durations against this student's level, goal, and study time constraints.
2. Select and rank the top 5 to 6 most suitable videos in order of recommendation.
3. For each selected video, provide a concise explanation (1-2 sentences) in "whyRecommended" explaining specifically why this video matches the student's level, time commitment, and goals.
4. IMPORTANT: You must ONLY use the exact "videoId" values provided above. Never invent or hallucinate video IDs or links.

Return ONLY a valid JSON object matching this schema:
{
  "recommendations": [
    {
      "videoId": "STRING_MATCHING_CANDIDATE_ID",
      "whyRecommended": "STRING_EXPLANATION"
    }
  ]
}`;

  const requestBody = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.3,
    },
  };

  try {
    // 1. Try primary configured model within the shared 8-second master budget
    let response;
    try {
      response = await callGeminiApi(primaryModel, apiKey, requestBody, budgetController.signal);
    } catch (primaryErr) {
      const elapsedMs = Math.round(performance.now() - startTime);
      console.warn(
        `[Gemini Service] Primary model (${primaryModel}) aborted/failed after ${elapsedMs}ms. Skipping retry and using fallback.`
      );
      return null;
    }

    // 2. If primary model returns 503 or 404, only retry if enough budget remains
    if (response.status === 503 || response.status === 404) {
      const elapsedMs = Math.round(performance.now() - startTime);
      const remainingBudgetMs = GEMINI_BUDGET_MS - elapsedMs;
      const fallbackModel = 'gemini-flash-lite-latest';

      if (primaryModel !== fallbackModel && remainingBudgetMs >= MIN_RETRY_BUDGET_MS && !budgetController.signal.aborted) {
        console.warn(
          `[Gemini Service] Primary model (${primaryModel}) returned ${response.status} in ${elapsedMs}ms. Retrying with ${fallbackModel} (remaining budget: ${remainingBudgetMs}ms)...`
        );
        response = await callGeminiApi(fallbackModel, apiKey, requestBody, budgetController.signal);
      } else {
        console.warn(
          `[Gemini Service] Primary model (${primaryModel}) returned ${response.status} after ${elapsedMs}ms (remaining budget: ${remainingBudgetMs}ms). Skipping retry to respect 8s budget.`
        );
        return null;
      }
    }

    if (!response.ok) {
      const elapsedMs = Math.round(performance.now() - startTime);
      console.warn(
        `[Gemini Service] API returned status ${response.status} after ${elapsedMs}ms. Using fallback ranking.`
      );
      return null;
    }

    const data = await response.json();
    const candidateOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateOutput) {
      console.warn('[Gemini Service] Empty model output received. Using fallback.');
      return null;
    }

    const parsed = cleanAndParseJson(candidateOutput);
    if (!parsed || !Array.isArray(parsed.recommendations)) {
      console.warn('[Gemini Service] Invalid JSON structure from model. Using fallback.');
      return null;
    }

    const rankedResults = [];
    const seenIds = new Set();

    // Match Gemini recommendations back to genuine YouTube metadata
    for (const rec of parsed.recommendations) {
      if (!rec || !rec.videoId) continue;
      const realVideo = candidateMap.get(rec.videoId);
      if (!realVideo || seenIds.has(rec.videoId)) continue;

      seenIds.add(rec.videoId);
      rankedResults.push({
        ...realVideo,
        whyRecommended:
          typeof rec.whyRecommended === 'string' && rec.whyRecommended.trim()
            ? rec.whyRecommended.trim()
            : 'Recommended based on your current level and goals.',
      });
    }

    // Append any remaining YouTube candidates with standard fallback label
    for (const candidate of candidates) {
      if (!seenIds.has(candidate.videoId)) {
        rankedResults.push({
          ...candidate,
          whyRecommended: 'Relevant YouTube result for your search.',
        });
        seenIds.add(candidate.videoId);
      }
    }

    const totalGeminiMs = Math.round(performance.now() - startTime);
    console.log(`[Gemini Service] Ranked ${rankedResults.length} candidates in ${totalGeminiMs}ms`);

    return rankedResults.length > 0 ? rankedResults : null;
  } catch (error) {
    const elapsedMs = Math.round(performance.now() - startTime);
    console.warn(`[Gemini Service] Error/timeout after ${elapsedMs}ms (${error.message}). Using fallback.`);
    return null; // Immediately fall back to real YouTube results
  } finally {
    clearTimeout(budgetTimer);
  }
}

const VALID_TASK_TYPES = new Set(['Watch', 'Practice', 'Revision']);

/**
 * Parse the student's daily available learning time into minutes.
 * Supports strings like "30 minutes/day", "1 hour/day", "2 hours/day", "3 hours/day", "4+ hours/day",
 * or falls back to profile learning_hours_per_day or 60 minutes.
 */
export function parseDailyBudgetMinutes(availableTime, profileHoursPerDay = null) {
  if (availableTime && typeof availableTime === 'string') {
    const lower = availableTime.toLowerCase().trim();
    if (lower.includes('30 min')) return 30;
    const hourMatch = lower.match(/(\d+(?:\.\d+)?)\s*\+?\s*hour/);
    if (hourMatch) {
      const hrs = parseFloat(hourMatch[1]);
      if (hrs > 0 && hrs <= 12) return Math.round(hrs * 60);
    }
    const minMatch = lower.match(/(\d+)\s*min/);
    if (minMatch) {
      const mins = parseInt(minMatch[1], 10);
      if (mins >= 15 && mins <= 720) return mins;
    }
  }
  if (profileHoursPerDay && Number(profileHoursPerDay) > 0) {
    return Math.min(720, Math.max(30, Math.round(Number(profileHoursPerDay) * 60)));
  }
  return 60; // Default 1 hour/day
}

/**
 * Normalize tasks, strip any fabricated URLs/timestamps, and strictly enforce that
 * the sum of estimated_minutes on any day never exceeds dailyBudgetMinutes.
 */
export function normalizeAndEnforceDailyBudget(rawTasks, dailyBudgetMinutes) {
  if (!Array.isArray(rawTasks) || rawTasks.length === 0) return [];

  const maxDaily = Math.max(15, Math.min(720, Number(dailyBudgetMinutes) || 60));
  const sanitized = [];

  for (const item of rawTasks) {
    if (!item || typeof item !== 'object') continue;
    const rawTitle = typeof item.title === 'string' ? item.title.trim() : '';
    if (!rawTitle) continue;

    // Remove any fabricated URLs from title/description
    const cleanTitle = rawTitle.replace(/https?:\/\/\S+/gi, '').trim().slice(0, 250);
    const rawDesc = typeof item.description === 'string' ? item.description.trim() : '';
    const cleanDesc = rawDesc.replace(/https?:\/\/\S+/gi, '').trim().slice(0, 1000);

    let taskType = typeof item.taskType === 'string' ? item.taskType.trim() : 'Watch';
    // Normalize case
    if (taskType.toLowerCase() === 'watch') taskType = 'Watch';
    else if (taskType.toLowerCase() === 'practice') taskType = 'Practice';
    else if (taskType.toLowerCase() === 'revision' || taskType.toLowerCase() === 'review') taskType = 'Revision';
    if (!VALID_TASK_TYPES.has(taskType)) taskType = 'Practice';

    let mins = parseInt(item.estimatedMinutes ?? item.estimated_minutes, 10);
    if (Number.isNaN(mins) || mins < 5) mins = Math.min(20, maxDaily);
    // Single task cannot exceed the daily budget
    if (mins > maxDaily) mins = maxDaily;

    sanitized.push({
      requestedDay: parseInt(item.dayNumber ?? item.day_number, 10) || 0,
      title: cleanTitle || `${taskType} Session`,
      description: cleanDesc || `Complete this ${taskType.toLowerCase()} task for your learning track.`,
      taskType,
      estimatedMinutes: mins,
      completed: false,
    });
  }

  if (sanitized.length === 0) return [];

  // Pack tasks into days respecting both requested day boundaries and the strict daily time budget
  const finalTasks = [];
  let currentDay = 1;
  let currentDayMinutes = 0;
  let lastRequestedDay = sanitized[0].requestedDay;

  for (let i = 0; i < sanitized.length; i++) {
    const t = sanitized[i];
    const requestedNewDay = t.requestedDay > 0 && t.requestedDay > lastRequestedDay && currentDayMinutes > 0;
    const wouldExceedBudget = currentDayMinutes > 0 && currentDayMinutes + t.estimatedMinutes > maxDaily;

    if (requestedNewDay || wouldExceedBudget) {
      currentDay += 1;
      currentDayMinutes = 0;
    }

    if (t.requestedDay > 0) {
      lastRequestedDay = t.requestedDay;
    }

    currentDayMinutes += t.estimatedMinutes;
    finalTasks.push({
      dayNumber: currentDay,
      title: t.title,
      description: t.description,
      taskType: t.taskType,
      estimatedMinutes: t.estimatedMinutes,
      completed: false,
      sortOrder: i + 1,
    });
  }

  return finalTasks.slice(0, 60); // Reasonable cap on total tasks
}

/**
 * Deterministic, clearly labelled non-AI study schedule fallback when Gemini is unavailable.
 * Calculates realistic duration from verified video length, supplementary practice, and daily time budget.
 */
export function buildFallbackSchedule({
  topic,
  level = 'Beginner',
  goal = 'General learning',
  resource,
  dailyBudgetMinutes = 60,
}) {
  const maxDaily = Math.max(15, Math.min(720, Number(dailyBudgetMinutes) || 60));
  const videoSeconds = Number(resource?.durationSeconds) || 1800; // Default 30m if unknown
  const totalVideoMinutes = Math.max(10, Math.ceil(videoSeconds / 60));

  const rawTasks = [];
  let remainingVideoMins = totalVideoMinutes;
  let sessionIndex = 1;
  const totalWatchSessions = Math.max(
    1,
    Math.min(14, Math.ceil(totalVideoMinutes / Math.max(15, Math.floor(maxDaily * 0.65))))
  );

  while (remainingVideoMins > 0 && rawTasks.length < 40) {
    // Allocate ~65% of daily budget to watching and ~35% to supplementary practice
    const watchMinutes =
      maxDaily >= 30
        ? Math.min(remainingVideoMins, Math.max(15, Math.floor(maxDaily * 0.65)))
        : Math.min(remainingVideoMins, maxDaily);

    remainingVideoMins -= watchMinutes;

    rawTasks.push({
      dayNumber: sessionIndex,
      title:
        totalWatchSessions === 1
          ? `Watch "${resource.title}"`
          : `Watch "${resource.title}" — Study Session ${sessionIndex}`,
      description: `Watch approximately ${watchMinutes} minutes of the verified video "${resource.title}" by ${resource.channel} and take structured notes on key ${topic} concepts.`,
      taskType: 'Watch',
      estimatedMinutes: watchMinutes,
    });

    const leftoverToday = maxDaily - watchMinutes;
    if (leftoverToday >= 10) {
      rawTasks.push({
        dayNumber: sessionIndex,
        title: `Supplementary ${topic} Practice — Session ${sessionIndex}`,
        description: `Supplementary learning activity (outside the video): practice applying the ${topic} concepts covered in Session ${sessionIndex} at a ${level} level toward your goal (${goal || 'skill building'}).`,
        taskType: 'Practice',
        estimatedMinutes: leftoverToday,
      });
    }

    sessionIndex += 1;
  }

  // Final day dedicated to hands-on practice and comprehensive revision
  const practiceMins = Math.max(10, Math.floor(maxDaily * 0.5));
  const revisionMins = Math.max(10, maxDaily - practiceMins);

  rawTasks.push({
    dayNumber: sessionIndex,
    title: `Hands-On ${topic} Consolidation Exercise`,
    description: `Supplementary learning activity: solve practice problems or build a small exercise in ${topic} without looking at your notes.`,
    taskType: 'Practice',
    estimatedMinutes: practiceMins,
  });

  if (revisionMins >= 10 && practiceMins + revisionMins <= maxDaily) {
    rawTasks.push({
      dayNumber: sessionIndex,
      title: `Final ${topic} Concept Revision & Self-Check`,
      description: `Supplementary revision activity: review your notes from "${resource.title}" and identify any areas needing additional practice.`,
      taskType: 'Revision',
      estimatedMinutes: revisionMins,
    });
  }

  return normalizeAndEnforceDailyBudget(rawTasks, maxDaily);
}

/**
 * Generate a personalized daily study schedule using Gemini (process.env.GEMINI_MODEL)
 * within an 8-second master budget, falling back cleanly to a deterministic schedule if unavailable.
 */
export async function generateTrackSchedule({
  topic,
  level = 'Beginner',
  goal = 'General learning',
  availableTime = '1 hour/day',
  resource,
  profile = null,
}) {
  const dailyBudgetMinutes = parseDailyBudgetMinutes(
    availableTime,
    profile?.learning_hours_per_day
  );
  const videoMinutes = Math.max(10, Math.ceil((Number(resource?.durationSeconds) || 1800) / 60));

  // Calculate flexible target days based on verified video length + ~40% practice/revision overhead
  const totalEstimatedEffortMinutes = Math.ceil(videoMinutes * 1.45);
  const suggestedDays = Math.max(
    2,
    Math.min(21, Math.ceil(totalEstimatedEffortMinutes / dailyBudgetMinutes))
  );

  const apiKey = process.env.GEMINI_API_KEY;
  const primaryModel = process.env.GEMINI_MODEL || 'gemini-flash-latest';

  if (!apiKey) {
    const fallbackTasks = buildFallbackSchedule({
      topic,
      level,
      goal,
      resource,
      dailyBudgetMinutes,
    });
    return { tasks: fallbackTasks, aiGenerated: false, dailyBudgetMinutes };
  }

  const startTime = performance.now();
  const budgetController = new AbortController();
  const budgetTimer = setTimeout(() => {
    budgetController.abort(new Error('Gemini track generation budget (8s) exceeded'));
  }, GEMINI_BUDGET_MS);

  const profileContext = profile
    ? `Student Profile Context: Branch="${profile.branch || 'Engineering'}", Year="${profile.college_year || 'N/A'}", Career Goals="${profile.career_goals || 'N/A'}".`
    : '';

  const prompt = `You are an expert engineering mentor creating a personalized study schedule for a student.

STUDENT PREFERENCES:
- Topic: "${topic}"
- Current Level: "${level}"
- Learning Goal: "${goal || 'Build strong foundational and practical skills'}"
- Daily Available Learning Time: "${availableTime || `${dailyBudgetMinutes} minutes/day`}" (STRICT MAXIMUM: ${dailyBudgetMinutes} minutes per day)
${profileContext}

VERIFIED YOUTUBE RESOURCE:
- Video Title: "${resource.title}"
- Channel: "${resource.channel}"
- Verified Duration: "${resource.duration || `${videoMinutes} minutes`}" (${videoMinutes} total minutes)
- Verified Description Excerpt: "${(resource.description || '').slice(0, 400)}"

STRICT SCHEDULE & CONTENT ACCURACY RULES:
1. Flexible Duration: Based on the ${videoMinutes}-minute video plus supplementary practice and revision at <= ${dailyBudgetMinutes} minutes/day, structure a realistic ${suggestedDays}-day study plan (you may adjust by +/- 2 days if appropriate, between 2 and 21 days).
2. Daily Time Limit: The combined "estimatedMinutes" of ALL tasks on any given "dayNumber" MUST NOT exceed ${dailyBudgetMinutes} minutes.
3. Content Honesty:
   - Do NOT invent YouTube URLs, video IDs, video chapters, or timestamps.
   - Do NOT claim the video covers subtopics unless supported by the verified title/description above.
   - For "Practice" and "Revision" tasks, explicitly frame them as supplementary learning activities/exercises to reinforce "${topic}".
4. Task Types: Every task must have "taskType" set to exactly one of: "Watch", "Practice", or "Revision".

Return ONLY a valid JSON object matching this exact schema:
{
  "tasks": [
    {
      "dayNumber": 1,
      "title": "STRING_TASK_TITLE",
      "description": "STRING_CONCISE_DESCRIPTION",
      "taskType": "Watch",
      "estimatedMinutes": 30
    }
  ]
}`;

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.3,
    },
  };

  try {
    let response;
    try {
      response = await callGeminiApi(primaryModel, apiKey, requestBody, budgetController.signal);
    } catch (primaryErr) {
      const elapsedMs = Math.round(performance.now() - startTime);
      console.warn(
        `[Gemini Track Service] Primary model (${primaryModel}) aborted/failed after ${elapsedMs}ms. Using non-AI fallback schedule.`
      );
      const fallbackTasks = buildFallbackSchedule({
        topic,
        level,
        goal,
        resource,
        dailyBudgetMinutes,
      });
      return { tasks: fallbackTasks, aiGenerated: false, dailyBudgetMinutes };
    }

    if (response.status === 503 || response.status === 404) {
      const elapsedMs = Math.round(performance.now() - startTime);
      const remainingBudgetMs = GEMINI_BUDGET_MS - elapsedMs;
      const fallbackModel = 'gemini-flash-lite-latest';

      if (
        primaryModel !== fallbackModel &&
        remainingBudgetMs >= MIN_RETRY_BUDGET_MS &&
        !budgetController.signal.aborted
      ) {
        console.warn(
          `[Gemini Track Service] Primary model (${primaryModel}) returned ${response.status} in ${elapsedMs}ms. Retrying with ${fallbackModel} (remaining budget: ${remainingBudgetMs}ms)...`
        );
        response = await callGeminiApi(fallbackModel, apiKey, requestBody, budgetController.signal);
      } else {
        console.warn(
          `[Gemini Track Service] Primary model (${primaryModel}) returned ${response.status} after ${elapsedMs}ms. Using non-AI fallback schedule.`
        );
        const fallbackTasks = buildFallbackSchedule({
          topic,
          level,
          goal,
          resource,
          dailyBudgetMinutes,
        });
        return { tasks: fallbackTasks, aiGenerated: false, dailyBudgetMinutes };
      }
    }

    if (!response.ok) {
      console.warn(
        `[Gemini Track Service] API returned status ${response.status}. Using non-AI fallback schedule.`
      );
      const fallbackTasks = buildFallbackSchedule({
        topic,
        level,
        goal,
        resource,
        dailyBudgetMinutes,
      });
      return { tasks: fallbackTasks, aiGenerated: false, dailyBudgetMinutes };
    }

    const data = await response.json();
    const candidateOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = cleanAndParseJson(candidateOutput);

    if (!parsed || !Array.isArray(parsed.tasks) || parsed.tasks.length === 0) {
      console.warn('[Gemini Track Service] Invalid JSON task array from model. Using non-AI fallback.');
      const fallbackTasks = buildFallbackSchedule({
        topic,
        level,
        goal,
        resource,
        dailyBudgetMinutes,
      });
      return { tasks: fallbackTasks, aiGenerated: false, dailyBudgetMinutes };
    }

    const validatedTasks = normalizeAndEnforceDailyBudget(parsed.tasks, dailyBudgetMinutes);
    if (validatedTasks.length === 0) {
      const fallbackTasks = buildFallbackSchedule({
        topic,
        level,
        goal,
        resource,
        dailyBudgetMinutes,
      });
      return { tasks: fallbackTasks, aiGenerated: false, dailyBudgetMinutes };
    }

    const totalMs = Math.round(performance.now() - startTime);
    console.log(
      `[Gemini Track Service] Generated ${validatedTasks.length} tasks across ${validatedTasks[validatedTasks.length - 1].dayNumber} days in ${totalMs}ms`
    );

    return { tasks: validatedTasks, aiGenerated: true, dailyBudgetMinutes };
  } catch (err) {
    const elapsedMs = Math.round(performance.now() - startTime);
    console.warn(
      `[Gemini Track Service] Error/timeout after ${elapsedMs}ms (${err.message}). Using non-AI fallback schedule.`
    );
    const fallbackTasks = buildFallbackSchedule({
      topic,
      level,
      goal,
      resource,
      dailyBudgetMinutes,
    });
    return { tasks: fallbackTasks, aiGenerated: false, dailyBudgetMinutes };
  } finally {
    clearTimeout(budgetTimer);
  }
}

export default {
  rankAndExplainResources,
  generateTrackSchedule,
  parseDailyBudgetMinutes,
  normalizeAndEnforceDailyBudget,
  buildFallbackSchedule,
};
