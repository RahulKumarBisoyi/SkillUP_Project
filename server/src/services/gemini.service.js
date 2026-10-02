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

export default {
  rankAndExplainResources,
};
