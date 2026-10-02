import { searchYouTubeVideos } from '../services/youtube.service.js';
import { rankAndExplainResources } from '../services/gemini.service.js';

/**
 * POST /api/learn/recommend
 * Discover and rank real YouTube learning resources tailored to the student.
 * Filters strictly for long-form educational content (no Shorts, duration >= 8 mins).
 */
export async function getRecommendations(req, res, next) {
  try {
    const { topic, level, goal, availableTime } = req.body;

    // Validate topic (required)
    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Topic is required. Please specify what you want to learn.',
      });
    }

    if (topic.trim().length > 200) {
      return res.status(400).json({
        status: 'error',
        message: 'Topic is too long (maximum 200 characters).',
      });
    }

    // Sanitize optional fields
    const sanitizedTopic = topic.trim();
    const sanitizedLevel =
      level && typeof level === 'string' && ['Beginner', 'Intermediate', 'Advanced'].includes(level.trim())
        ? level.trim()
        : 'Beginner';
    const sanitizedGoal =
      goal && typeof goal === 'string' ? goal.trim().slice(0, 500) : '';
    const sanitizedTime =
      availableTime && typeof availableTime === 'string' ? availableTime.trim().slice(0, 100) : '';

    // Step 1: Retrieve real long-form candidate videos from YouTube Data API
    const reqStart = performance.now();
    let candidates;
    try {
      candidates = await searchYouTubeVideos(sanitizedTopic, 10);
    } catch (ytErr) {
      return res.status(ytErr.statusCode || 502).json({
        status: 'error',
        message: ytErr.message || 'Failed to retrieve videos from YouTube.',
      });
    }
    const youtubeMs = Math.round(performance.now() - reqStart);

    if (!candidates || candidates.length === 0) {
      return res.status(200).json({
        status: 'ok',
        topic: sanitizedTopic,
        level: sanitizedLevel,
        aiPersonalized: false,
        resources: [],
      });
    }

    // Step 2: Attempt AI personalization and ranking via Gemini (budgeted <= ~8s)
    const geminiStart = performance.now();
    let aiPersonalized = false;
    let finalResources = null;

    try {
      const ranked = await rankAndExplainResources({
        topic: sanitizedTopic,
        level: sanitizedLevel,
        goal: sanitizedGoal,
        availableTime: sanitizedTime,
        candidates,
      });

      if (ranked && ranked.length > 0) {
        finalResources = ranked;
        aiPersonalized = true;
      }
    } catch (aiErr) {
      console.warn('[Learn Controller] Gemini error, proceeding to fallback:', aiErr.message);
    }
    const geminiMs = Math.round(performance.now() - geminiStart);

    // Step 3: Graceful fallback if Gemini was unavailable or failed/timed out
    if (!finalResources) {
      finalResources = candidates.map((video) => ({
        ...video,
        whyRecommended: 'Relevant YouTube result for your search.',
      }));
      aiPersonalized = false;
    }

    // Limit to 5-6 top recommendations as specified
    const limitedResources = finalResources.slice(0, 6);
    const totalMs = Math.round(performance.now() - reqStart);

    console.log(
      `[Learn Controller] Completed "${sanitizedTopic}" in ${totalMs}ms (youtube=${youtubeMs}ms, gemini=${geminiMs}ms, aiPersonalized=${aiPersonalized})`
    );

    return res.status(200).json({
      status: 'ok',
      topic: sanitizedTopic,
      level: sanitizedLevel,
      aiPersonalized,
      resources: limitedResources,
    });
  } catch (error) {
    next(error);
  }
}

export default {
  getRecommendations,
};
