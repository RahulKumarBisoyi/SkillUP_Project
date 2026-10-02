import dotenv from 'dotenv';

dotenv.config();

// In-memory cache to avoid redundant YouTube API searches for the same topic (15 minutes TTL)
const YOUTUBE_CACHE_TTL_MS = 15 * 60 * 1000;
const YOUTUBE_FETCH_TIMEOUT_MS = 8000;
const youtubeCache = new Map();
const videoByIdCache = new Map();
const inFlightSearches = new Map();

/**
 * Decode common HTML entities from YouTube titles and descriptions.
 */
function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

/**
 * Parse an ISO 8601 duration string (e.g. PT1H25M30S, PT45M, PT59S) into total seconds.
 */
export function parseISO8601Duration(isoDuration) {
  if (!isoDuration || typeof isoDuration !== 'string') return 0;
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Format total seconds into a readable string (e.g. "1h 45m", "28m", "8m 15s").
 */
export function formatDuration(totalSeconds) {
  if (!totalSeconds || totalSeconds <= 0) return 'N/A';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }
  return `${seconds}s`;
}

// Minimum duration threshold in seconds (8 minutes = 480 seconds)
const MIN_DURATION_SECONDS = 480;

// Keywords that indicate non-educational, clickbait, or short-form content
const EXCLUDED_PATTERNS = [
  /#shorts\b/i,
  /\bshorts\b/i,
  /#short\b/i,
  /\breel\b/i,
  /\breels\b/i,
  /\btiktok\b/i,
  /\bmotivational\b/i,
  /\bmotivation\b/i,
  /\binterview experience\b/i,
  /\bmy salary\b/i,
  /\bsalary\b/i,
  /\bday in the life\b/i,
  /\bvlog\b/i,
  /\breaction\b/i,
  /\bcompilation\b/i,
  /\bpodcast clip\b/i,
  /\bunboxing\b/i,
  /\broast\b/i,
  /\bnews\b/i,
];

/**
 * Check if video title or description matches non-educational/shorts patterns.
 */
function isExcludedContent(title, description) {
  const combined = `${title} ${description}`.toLowerCase();
  for (const pattern of EXCLUDED_PATTERNS) {
    if (pattern.test(combined)) {
      return true;
    }
  }
  return false;
}

/**
 * Calculate educational suitability score to prioritize comprehensive courses & lectures.
 */
function computeEducationalScore(title, description, durationSeconds) {
  const text = `${title} ${description}`.toLowerCase();
  let score = 0;

  if (text.includes('full course') || text.includes('complete course')) score += 10;
  if (text.includes('tutorial')) score += 6;
  if (text.includes('lecture') || text.includes('walkthrough')) score += 5;
  if (text.includes('for beginners') || text.includes('roadmap')) score += 4;
  if (text.includes('crash course')) score += 5;

  // Reward substantive, deep-dive durations
  if (durationSeconds >= 3600) score += 6; // 1hr+
  else if (durationSeconds >= 1800) score += 4; // 30m - 1hr
  else if (durationSeconds >= 900) score += 2; // 15m - 30m

  return score;
}

/**
 * Internal helper to execute the YouTube search + video details + filtering pipeline.
 */
async function performYouTubeSearch(topic, targetCandidates, apiKey) {
  const tSearchStart = performance.now();

  // Target comprehensive long-form content
  const searchQuery = `${topic.trim()} full course tutorial lecture walkthrough`;
  const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
  searchUrl.searchParams.set('part', 'snippet');
  searchUrl.searchParams.set('type', 'video');
  searchUrl.searchParams.set('q', searchQuery);
  searchUrl.searchParams.set('maxResults', '25'); // Fetch wide pool to filter accurately
  searchUrl.searchParams.set('relevanceLanguage', 'en');
  searchUrl.searchParams.set('key', apiKey);

  let searchResponse;
  try {
    searchResponse = await fetch(searchUrl.toString(), {
      signal: AbortSignal.timeout(YOUTUBE_FETCH_TIMEOUT_MS),
    });
  } catch (netErr) {
    const error = new Error('Network error or timeout while reaching YouTube search service.');
    error.statusCode = 502;
    throw error;
  }

  if (!searchResponse.ok) {
    const errorData = await searchResponse.json().catch(() => ({}));
    const message = errorData.error?.message || `YouTube API returned status ${searchResponse.status}`;
    const isQuotaError =
      searchResponse.status === 403 &&
      (message.toLowerCase().includes('quota') || message.toLowerCase().includes('exceeded'));

    const error = new Error(
      isQuotaError
        ? 'YouTube API daily quota exceeded. Please try again later.'
        : `YouTube search failed: ${message}`
    );
    error.statusCode = isQuotaError ? 429 : 502;
    throw error;
  }

  const searchData = await searchResponse.json();
  const searchMs = Math.round(performance.now() - tSearchStart);

  const searchItems = searchData.items || [];
  const videoIds = searchItems.map((item) => item.id?.videoId).filter(Boolean);

  if (videoIds.length === 0) {
    return [];
  }

  // Fetch duration and detailed metadata via YouTube videos endpoint
  const tVideosStart = performance.now();
  const videosUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
  videosUrl.searchParams.set('part', 'snippet,contentDetails');
  videosUrl.searchParams.set('id', videoIds.join(','));
  videosUrl.searchParams.set('key', apiKey);

  let videosResponse;
  try {
    videosResponse = await fetch(videosUrl.toString(), {
      signal: AbortSignal.timeout(YOUTUBE_FETCH_TIMEOUT_MS),
    });
  } catch (netErr) {
    const error = new Error('Network error or timeout while retrieving YouTube video details.');
    error.statusCode = 502;
    throw error;
  }

  if (!videosResponse.ok) {
    const errorData = await videosResponse.json().catch(() => ({}));
    const message = errorData.error?.message || `YouTube Videos API returned status ${videosResponse.status}`;
    const error = new Error(`Failed to fetch YouTube video details: ${message}`);
    error.statusCode = 502;
    throw error;
  }

  const videosData = await videosResponse.json();
  const videosMs = Math.round(performance.now() - tVideosStart);

  // Filter and score candidates
  const tFilterStart = performance.now();
  const videoItems = videosData.items || [];
  const candidates = [];

  for (const item of videoItems) {
    const videoId = item.id;
    if (!videoId) continue;

    const snippet = item.snippet || {};
    const contentDetails = item.contentDetails || {};

    const rawDuration = contentDetails.duration || '';
    const durationSeconds = parseISO8601Duration(rawDuration);

    // Rule 1: Exclude shorts and very short videos (< 8 minutes / 480 seconds)
    if (durationSeconds < MIN_DURATION_SECONDS) {
      continue;
    }

    const title = decodeHtmlEntities(snippet.title || 'Untitled Video');
    const channel = decodeHtmlEntities(snippet.channelTitle || 'Unknown Channel');
    const description = decodeHtmlEntities(snippet.description || '');
    const publishedAt = snippet.publishedAt || null;

    // Rule 2: Exclude non-educational, motivational, shorts, and vlog content
    if (isExcludedContent(title, description)) {
      continue;
    }

    const duration = formatDuration(durationSeconds);

    const thumbnail =
      snippet.thumbnails?.high?.url ||
      snippet.thumbnails?.medium?.url ||
      snippet.thumbnails?.default?.url ||
      `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    const score = computeEducationalScore(title, description, durationSeconds);

    candidates.push({
      videoId,
      title,
      channel,
      description,
      thumbnail,
      publishedAt,
      duration,
      durationSeconds,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      score,
    });
  }

  // Sort by educational score descending to keep highest quality courses/tutorials
  candidates.sort((a, b) => b.score - a.score);

  const finalCandidates = candidates.slice(0, targetCandidates).map(({ score, ...rest }) => {
    videoByIdCache.set(rest.videoId, {
      timestamp: Date.now(),
      data: rest,
    });
    return rest;
  });
  const filterMs = Number((performance.now() - tFilterStart).toFixed(2));

  console.log(
    `[YouTube Service] Topic "${topic}" | search=${searchMs}ms, details=${videosMs}ms, filter=${filterMs}ms | kept=${finalCandidates.length}/${videoItems.length}`
  );

  return finalCandidates;
}

/**
 * Search YouTube Data API v3 and fetch detailed video metadata including duration.
 * Strictly excludes YouTube Shorts, videos < 8 minutes, and non-educational content.
 * Uses an in-memory cache and in-flight deduplication to avoid repeated API requests.
 *
 * @param {string} topic - Topic to search for.
 * @param {number} [targetCandidates=10] - Number of long-form candidates to return.
 * @returns {Promise<Array<Object>>} Filtered authentic long-form YouTube video candidates.
 */
export async function searchYouTubeVideos(topic, targetCandidates = 10) {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    const error = new Error('YouTube API key is not configured on the server.');
    error.statusCode = 500;
    throw error;
  }

  const normalizedKey = `${topic.trim().toLowerCase()}::${targetCandidates}`;

  // 1. Check in-memory TTL cache to avoid repeated YouTube searches
  const cached = youtubeCache.get(normalizedKey);
  if (cached && Date.now() - cached.timestamp < YOUTUBE_CACHE_TTL_MS) {
    console.log(`[YouTube Service] Cache HIT for topic "${topic.trim()}" (0ms API overhead)`);
    return cached.data.map((item) => ({ ...item }));
  }

  // 2. Deduplicate concurrent in-flight requests for the same topic
  if (inFlightSearches.has(normalizedKey)) {
    console.log(`[YouTube Service] Joining in-flight request for topic "${topic.trim()}"`);
    const sharedResult = await inFlightSearches.get(normalizedKey);
    return sharedResult.map((item) => ({ ...item }));
  }

  const searchPromise = performYouTubeSearch(topic, targetCandidates, apiKey)
    .then((results) => {
      if (results && results.length > 0) {
        youtubeCache.set(normalizedKey, {
          timestamp: Date.now(),
          data: results,
        });
      }
      return results;
    })
    .finally(() => {
      inFlightSearches.delete(normalizedKey);
    });

  inFlightSearches.set(normalizedKey, searchPromise);

  const results = await searchPromise;
  return results.map((item) => ({ ...item }));
}

/**
 * Retrieve verified YouTube video metadata by videoId.
 * Uses cached metadata if available, or queries YouTube Data API v3 videos endpoint directly.
 *
 * @param {string} videoId - YouTube video ID.
 * @returns {Promise<Object|null>} Verified video metadata or null if not found.
 */
export async function getYouTubeVideoById(videoId) {
  if (!videoId || typeof videoId !== 'string' || !/^[a-zA-Z0-9_-]{6,20}$/.test(videoId.trim())) {
    return null;
  }

  const cleanId = videoId.trim();

  // 1. Check in-memory cache first
  const cached = videoByIdCache.get(cleanId);
  if (cached && Date.now() - cached.timestamp < YOUTUBE_CACHE_TTL_MS) {
    return { ...cached.data };
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    const error = new Error('YouTube API key is not configured on the server.');
    error.statusCode = 500;
    throw error;
  }

  const videosUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
  videosUrl.searchParams.set('part', 'snippet,contentDetails');
  videosUrl.searchParams.set('id', cleanId);
  videosUrl.searchParams.set('key', apiKey);

  let videosResponse;
  try {
    videosResponse = await fetch(videosUrl.toString(), {
      signal: AbortSignal.timeout(YOUTUBE_FETCH_TIMEOUT_MS),
    });
  } catch (netErr) {
    const error = new Error('Network error or timeout while verifying YouTube video metadata.');
    error.statusCode = 502;
    throw error;
  }

  if (!videosResponse.ok) {
    const errorData = await videosResponse.json().catch(() => ({}));
    const message = errorData.error?.message || `YouTube Videos API returned status ${videosResponse.status}`;
    const error = new Error(`Failed to verify YouTube video metadata: ${message}`);
    error.statusCode = 502;
    throw error;
  }

  const videosData = await videosResponse.json();
  const item = videosData.items?.[0];
  if (!item || !item.id) {
    return null;
  }

  const snippet = item.snippet || {};
  const contentDetails = item.contentDetails || {};
  const durationSeconds = parseISO8601Duration(contentDetails.duration || '');
  const duration = formatDuration(durationSeconds);
  const title = decodeHtmlEntities(snippet.title || 'Untitled Video');
  const channel = decodeHtmlEntities(snippet.channelTitle || 'Unknown Channel');
  const description = decodeHtmlEntities(snippet.description || '');
  const publishedAt = snippet.publishedAt || null;
  const thumbnail =
    snippet.thumbnails?.high?.url ||
    snippet.thumbnails?.medium?.url ||
    snippet.thumbnails?.default?.url ||
    `https://img.youtube.com/vi/${cleanId}/hqdefault.jpg`;

  const verifiedVideo = {
    videoId: cleanId,
    title,
    channel,
    description,
    thumbnail,
    publishedAt,
    duration,
    durationSeconds,
    url: `https://www.youtube.com/watch?v=${cleanId}`,
  };

  videoByIdCache.set(cleanId, {
    timestamp: Date.now(),
    data: verifiedVideo,
  });

  return { ...verifiedVideo };
}

export default {
  searchYouTubeVideos,
  getYouTubeVideoById,
  parseISO8601Duration,
  formatDuration,
};
