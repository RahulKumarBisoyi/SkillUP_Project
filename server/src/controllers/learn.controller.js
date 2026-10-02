import pool from '../config/db.js';
import { searchYouTubeVideos } from '../services/youtube.service.js';
import { rankAndExplainResources } from '../services/gemini.service.js';
import {
  areSkillsEquivalent,
  findPredefinedTopicMatch,
  validateOpportunitySkillContext,
} from '../services/skillAnalysis.service.js';

/**
 * POST /api/learn/recommend
 * Discover and rank real YouTube learning resources tailored to the student.
 * Filters strictly for long-form educational content (no Shorts, duration >= 8 mins).
 * Supports both predefined catalog topics and backend-validated opportunity skills (Milestone 7).
 */
export async function getRecommendations(req, res, next) {
  try {
    const userId = req.user.id;
    const {
      topic,
      level,
      goal,
      availableTime,
      opportunityId,
      targetSkill,
      contextToken,
    } = req.body;

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

    const rawTopic = topic.trim();
    const hasOpportunityContext =
      (opportunityId !== undefined && opportunityId !== null && opportunityId !== '') ||
      (targetSkill !== undefined && targetSkill !== null && String(targetSkill).trim() !== '');

    let sanitizedTopic = rawTopic;
    let validatedOpportunityContext = null;

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

      // Ensure topic matches either the validated target skill or a predefined catalog topic
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

      validatedOpportunityContext = {
        opportunityId: ctxValidation.opportunity.id,
        opportunityTitle: ctxValidation.opportunity.title,
        organization: ctxValidation.opportunity.organization,
        targetSkill: ctxValidation.normalizedTargetSkill,
        sourceUrl: ctxValidation.opportunity.sourceUrl,
        contextToken: ctxValidation.contextToken,
      };
    } else {
      // Ordinary Learn journey: enforce predefined learning topic catalog (no unrestricted free-text)
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
        opportunityContext: validatedOpportunityContext,
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
      opportunityContext: validatedOpportunityContext,
      resources: limitedResources,
    });
  } catch (error) {
    next(error);
  }
}

export default {
  getRecommendations,
};

