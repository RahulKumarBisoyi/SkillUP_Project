import { useState, useEffect, useMemo } from 'react';
import * as api from '../../services/api';
import ResourceCard from './ResourceCard';
import TrackPreview from '../tracks/TrackPreview';
import { scrollToTop } from '../../utils/scroll';
import {
  LEARNING_TOPICS,
  LEARNING_GOALS,
  LEARNING_TIMES,
} from '../../constants/learningTopics';

function mapHoursToLearningTime(hoursVal) {
  const hrs = Number(hoursVal);
  if (!hrs || Number.isNaN(hrs) || hrs <= 0) return '';
  if (hrs <= 0.6) return '30 minutes/day';
  if (hrs <= 1.4) return '1 hour/day';
  if (hrs <= 2.4) return '2 hours/day';
  if (hrs <= 3.4) return '3 hours/day';
  return '4+ hours/day';
}

export default function LearnView({
  onTrackCreated,
  bridgeContext = null,
  onReturnToOpportunity,
  onClearBridgeContext,
}) {
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('Beginner');
  const [goal, setGoal] = useState('');
  const [availableTime, setAvailableTime] = useState('');
  const [savedProfileTime, setSavedProfileTime] = useState('');
  const [activeContextToken, setActiveContextToken] = useState(
    bridgeContext?.contextToken || null
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resultsData, setResultsData] = useState(null);

  const [creatingVideoId, setCreatingVideoId] = useState(null);
  const [previewData, setPreviewData] = useState(null);

  // Load student's saved learning_hours_per_day preference once
  useEffect(() => {
    let isMounted = true;
    api
      .getProfile()
      .then((res) => {
        if (!isMounted) return;
        const mapped = mapHoursToLearningTime(
          res?.profile?.learning_hours_per_day
        );
        if (mapped) {
          setSavedProfileTime(mapped);
          setAvailableTime((prev) => prev || mapped);
        }
      })
      .catch(() => {
        // Non-blocking fallback if profile has not been configured yet
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Build topic list: includes predefined topics + validated context-provided opportunity skill if not in catalog
  const availableTopics = useMemo(() => {
    if (!bridgeContext?.targetSkill) {
      return LEARNING_TOPICS;
    }
    const targetClean = String(bridgeContext.targetSkill).trim();
    const existingCatalogItem = LEARNING_TOPICS.find(
      (t) => t.title.toLowerCase() === targetClean.toLowerCase()
    );
    if (existingCatalogItem) {
      return LEARNING_TOPICS;
    }
    return [
      {
        id: 'bridge-opportunity-skill',
        title: targetClean,
        category: 'Opportunity Skill',
        description: `Validated skill to develop for ${
          bridgeContext.opportunityTitle || 'your selected opportunity'
        }`,
        icon: '🎯',
        isOpportunitySkill: true,
      },
      ...LEARNING_TOPICS,
    ];
  }, [bridgeContext]);

  // Build goal options: prepend opportunity-specific preparation goal when bridgeContext is active
  const availableGoals = useMemo(() => {
    if (!bridgeContext?.opportunityTitle) {
      return LEARNING_GOALS;
    }
    const oppGoalValue = `Prepare for ${bridgeContext.opportunityTitle}`;
    return [
      {
        value: oppGoalValue,
        label: oppGoalValue,
        isOpportunityGoal: true,
      },
      ...LEARNING_GOALS,
    ];
  }, [bridgeContext]);

  // Prepopulate topic, Beginner level, opportunity goal, and saved time when bridgeContext arrives
  useEffect(() => {
    if (!bridgeContext?.targetSkill) return;
    const targetClean = String(bridgeContext.targetSkill).trim();
    const catalogMatch = LEARNING_TOPICS.find(
      (t) => t.title.toLowerCase() === targetClean.toLowerCase()
    );
    const resolvedTopic = catalogMatch ? catalogMatch.title : targetClean;

    setTopic(resolvedTopic);
    setLevel('Beginner');
    if (bridgeContext.opportunityTitle) {
      setGoal(`Prepare for ${bridgeContext.opportunityTitle}`);
    }
    if (savedProfileTime) {
      setAvailableTime((prev) => prev || savedProfileTime);
    }
    setActiveContextToken(bridgeContext.contextToken || null);
    setResultsData(null);
    setPreviewData(null);
    setError(null);
  }, [
    bridgeContext?.opportunityId,
    bridgeContext?.targetSkill,
    bridgeContext?.opportunityTitle,
    bridgeContext?.contextToken,
    savedProfileTime,
  ]);

  useEffect(() => {
    scrollToTop();
  }, [previewData, bridgeContext?.opportunityId, bridgeContext?.targetSkill]);

  const isTopicLinkedToBridgeSkill = useMemo(() => {
    if (!bridgeContext?.opportunityId || !bridgeContext?.targetSkill || !topic) {
      return false;
    }
    return (
      topic.trim().toLowerCase() ===
      String(bridgeContext.targetSkill).trim().toLowerCase()
    );
  }, [bridgeContext, topic]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (loading || creatingVideoId) return;
    if (!topic.trim()) {
      setError('Please select a learning topic from the available options.');
      return;
    }

    setLoading(true);
    setError(null);
    setPreviewData(null);

    try {
      const payload = {
        topic: topic.trim(),
        level,
        goal: goal.trim(),
        availableTime: availableTime.trim(),
      };

      if (isTopicLinkedToBridgeSkill) {
        payload.opportunityId = bridgeContext.opportunityId;
        payload.targetSkill = bridgeContext.targetSkill;
        if (activeContextToken || bridgeContext.contextToken) {
          payload.contextToken = activeContextToken || bridgeContext.contextToken;
        }
      }

      const response = await api.getRecommendations(payload);
      if (response?.opportunityContext?.contextToken) {
        setActiveContextToken(response.opportunityContext.contextToken);
      }
      setResultsData(response);
    } catch (err) {
      setError(err.message || 'Failed to retrieve recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrack = async (selectedResource) => {
    if (!selectedResource?.videoId || creatingVideoId) return;

    setCreatingVideoId(selectedResource.videoId);
    setError(null);

    try {
      const activeTopic = resultsData?.topic || topic.trim();
      const payload = {
        videoId: selectedResource.videoId,
        topic: activeTopic,
        level: resultsData?.level || level,
        goal: goal.trim(),
        availableTime: availableTime.trim(),
      };

      if (
        bridgeContext?.opportunityId &&
        bridgeContext?.targetSkill &&
        activeTopic.toLowerCase() ===
          String(bridgeContext.targetSkill).trim().toLowerCase()
      ) {
        payload.opportunityId = bridgeContext.opportunityId;
        payload.targetSkill = bridgeContext.targetSkill;
        if (activeContextToken || bridgeContext.contextToken) {
          payload.contextToken = activeContextToken || bridgeContext.contextToken;
        }
      }

      const res = await api.generateTrackPreview(payload);

      if (res && res.preview) {
        if (res.preview.contextToken) {
          setActiveContextToken(res.preview.contextToken);
        }
        setPreviewData(res.preview);
      }
    } catch (err) {
      setError(err.message || 'Failed to generate learning track schedule. Please try again.');
    } finally {
      setCreatingVideoId(null);
    }
  };

  const handleSelectTopic = (selectedTitle) => {
    setTopic(selectedTitle);
    setError(null);
  };

  if (previewData) {
    return (
      <TrackPreview
        preview={previewData}
        onBack={() => setPreviewData(null)}
        onReturnToOpportunity={onReturnToOpportunity}
        onTrackSaved={(savedTrackId) => {
          setPreviewData(null);
          if (typeof onTrackCreated === 'function') {
            onTrackCreated(savedTrackId);
          }
        }}
      />
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Opportunity Context Banner when Bridge My Skill Gap is active */}
      {bridgeContext?.opportunityId && (
        <div
          role="region"
          aria-label="Opportunity learning context"
          className="p-5 sm:p-6 su-hero-mint flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider px-3 py-0.5 rounded-full bg-white text-[#3B5BDB] border border-[#C7D2FE]">
                <span>🎯</span>
                <span>Bridge My Skill Gap</span>
              </span>
              {bridgeContext.organization && (
                <span className="text-xs text-[#4B4869] font-semibold">
                  {bridgeContext.organization}
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-[#1E1B3A]">
              Learning{' '}
              <span className="text-[#4F7DF3]">
                {topic || bridgeContext.targetSkill}
              </span>{' '}
              for{' '}
              <span className="text-[#15803D]">
                {bridgeContext.opportunityTitle}
              </span>
            </h3>
            <p className="text-xs text-[#4B4869]">
              Review or adjust your level, daily time, and goal below, then
              click <strong className="text-[#1E1B3A]">Find Learning Resources</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onReturnToOpportunity && (
              <button
                type="button"
                onClick={() =>
                  onReturnToOpportunity(bridgeContext.opportunityId)
                }
                className="text-xs font-bold px-4 py-2 rounded-full bg-white hover:bg-[#F7F5FF] text-[#1E1B3A] border border-[#CDECE1] transition-colors cursor-pointer shadow-2xs"
              >
                ← Return to Opportunity
              </button>
            )}
            {bridgeContext.sourceUrl && (
              <a
                href={bridgeContext.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold px-4 py-2 rounded-full bg-white hover:bg-[#EEF2FF] text-[#4F7DF3] border border-[#CDECE1] transition-colors inline-flex items-center gap-1 shadow-2xs"
              >
                <span>Official Page</span>
                <span aria-hidden="true">↗</span>
              </a>
            )}
            {onClearBridgeContext && (
              <button
                type="button"
                onClick={() => {
                  onClearBridgeContext();
                  if (
                    availableTopics.some(
                      (t) => t.isOpportunitySkill && t.title === topic
                    )
                  ) {
                    setTopic('');
                  }
                }}
                className="text-xs font-bold px-3 py-2 rounded-full text-[#6E6A8F] hover:text-[#1E1B3A] transition-colors cursor-pointer"
                title="Switch to general learning without opportunity link"
              >
                ✕ Clear Context
              </button>
            )}
          </div>
        </div>
      )}

      {/* Search Header & Discovery Card (Screenshot 3 inspired) */}
      <div className="su-card p-6 sm:p-8">
        <div className="max-w-3xl mb-7 space-y-2">
          <span className="text-xs font-extrabold tracking-wider text-[#4F7DF3] block">
            {bridgeContext?.opportunityId
              ? 'Bridge My Skill Gap'
              : 'Personalized Learning — Discover Real Learning Resources'}
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#1E1B3A] tracking-tight">
            What do you want to learn?
          </h1>
          <p className="text-[#4B4869] text-sm sm:text-base leading-relaxed">
            Tell us your goal. SkillUP will shortlist long-form YouTube courses that fit your level, schedule, and career direction.
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="space-y-6">
          {/* Step 1: Predefined Learning Topic Cards and Dropdown */}
          <div className="space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label
                htmlFor="topic-select"
                className="block text-xs font-extrabold uppercase tracking-wider text-[#4B4869]"
              >
                Select Learning Topic <span className="text-[#DC2626]">*</span>
              </label>
              <div className="w-full sm:w-80">
                <select
                  id="topic-select"
                  value={topic}
                  onChange={(e) => handleSelectTopic(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#F7F5FF] border border-[#DFD9F7] rounded-full text-[#1E1B3A] font-semibold focus:bg-white focus:border-[#4F7DF3] text-xs cursor-pointer"
                >
                  <option value="">-- Choose from available topics --</option>
                  {availableTopics.map((t) => (
                    <option key={t.id} value={t.title}>
                      {t.title} ({t.category})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selectable Topic Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {availableTopics.map((item) => {
                const isSelected = topic === item.title;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTopic(item.title)}
                    className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#EEF2FF] border-[#4F7DF3] ring-2 ring-[#4F7DF3]/25 shadow-sm'
                        : 'bg-[#F7F5FF] border-[#E4DFFA] hover:border-[#C7D2FE] hover:bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-base">{item.icon}</span>
                        <span
                          className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${
                            item.isOpportunitySkill
                              ? 'bg-[#DCFCE7] text-[#15803D] border-[#A7F3D0]'
                              : 'bg-white text-[#5A567A] border-[#DFD9F7]'
                          }`}
                        >
                          {item.category}
                        </span>
                      </div>
                      <h4
                        className={`text-sm font-extrabold ${
                          isSelected ? 'text-[#3B5BDB]' : 'text-[#1E1B3A]'
                        }`}
                      >
                        {item.title}
                      </h4>
                      <p className="text-xs text-[#6E6A8F] mt-1 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-[#E4DFFA] flex items-center justify-between text-[11px]">
                      <span
                        className={
                          isSelected
                            ? 'text-[#3B5BDB] font-bold'
                            : 'text-[#726E91] font-medium'
                        }
                      >
                        {isSelected ? '✓ Selected' : 'Click to select'}
                      </span>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-[#4F7DF3]" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Level, Time, and Goal Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[#E8E4F8]">
            {/* Current Level */}
            <div>
              <label
                htmlFor="level-select"
                className="block text-xs font-extrabold uppercase tracking-wider text-[#4B4869] mb-1.5"
              >
                Current Level
              </label>
              <select
                id="level-select"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#F7F5FF] border border-[#DFD9F7] rounded-2xl text-[#1E1B3A] font-medium focus:bg-white focus:border-[#4F7DF3] text-xs sm:text-sm cursor-pointer"
              >
                <option value="Beginner">Beginner (Starting from scratch)</option>
                <option value="Intermediate">Intermediate (Have basic understanding)</option>
                <option value="Advanced">Advanced (Deep dive / Interview prep)</option>
              </select>
            </div>

            {/* Available Learning Time */}
            <div>
              <label
                htmlFor="time-select"
                className="block text-xs font-extrabold uppercase tracking-wider text-[#4B4869] mb-1.5"
              >
                Available Learning Time
              </label>
              <select
                id="time-select"
                value={availableTime}
                onChange={(e) => setAvailableTime(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#F7F5FF] border border-[#DFD9F7] rounded-2xl text-[#1E1B3A] font-medium focus:bg-white focus:border-[#4F7DF3] text-xs sm:text-sm cursor-pointer"
              >
                <option value="">Select available time</option>
                {LEARNING_TIMES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {LEARNING_TIMES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setAvailableTime(t.value)}
                    className={`text-[10px] px-2.5 py-1 rounded-full transition-colors cursor-pointer font-semibold ${
                      availableTime === t.value
                        ? 'bg-[#4F7DF3] text-white'
                        : 'bg-[#F7F5FF] border border-[#E4DFFA] text-[#5A567A] hover:text-[#1E1B3A]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Learning Goal */}
            <div>
              <label
                htmlFor="goal-select"
                className="block text-xs font-extrabold uppercase tracking-wider text-[#4B4869] mb-1.5"
              >
                Learning Goal
              </label>
              <select
                id="goal-select"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#F7F5FF] border border-[#DFD9F7] rounded-2xl text-[#1E1B3A] font-medium focus:bg-white focus:border-[#4F7DF3] text-xs sm:text-sm cursor-pointer"
              >
                <option value="">Select learning goal</option>
                {availableGoals.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {availableGoals.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGoal(g.value)}
                    className={`text-[10px] px-2.5 py-1 rounded-full transition-colors cursor-pointer truncate max-w-full font-semibold ${
                      goal === g.value
                        ? 'bg-[#4F7DF3] text-white'
                        : 'bg-[#F7F5FF] border border-[#E4DFFA] text-[#5A567A] hover:text-[#1E1B3A]'
                    }`}
                  >
                    {g.isOpportunityGoal ? '🎯 Prepare for Opportunity' : g.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading || !topic}
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#4F7DF3] hover:bg-[#3B6CE6] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Searching YouTube &amp; Ranking with AI...</span>
                </>
              ) : (
                <>
                  <span aria-hidden="true">🔍</span>
                  <span>Find Learning Resources</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-sm flex items-center justify-between font-medium"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-[#991B1B] hover:text-[#7F1D1D] font-bold ml-2 text-xs cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Results Section */}
      {resultsData && (
        <div className="space-y-5">
          {/* Results Summary Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 su-card">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-extrabold text-[#1E1B3A]">
                  Recommended resources for &ldquo;{resultsData.topic}&rdquo;
                </h2>
                {resultsData.opportunityContext?.opportunityTitle && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] border border-[#A7F3D0]">
                    <span>🎯</span>
                    <span>
                      Learning {resultsData.opportunityContext.targetSkill} for{' '}
                      {resultsData.opportunityContext.opportunityTitle}
                    </span>
                  </span>
                )}
              </div>
              <p className="text-xs text-[#6E6A8F] mt-1">
                Target Level:{' '}
                <span className="text-[#1E1B3A] font-bold">{resultsData.level}</span>
                {goal && (
                  <span>
                    {' '}
                    • Goal: <span className="text-[#1E1B3A] font-bold">{goal}</span>
                  </span>
                )}
                {availableTime && (
                  <span>
                    {' '}
                    • Time:{' '}
                    <span className="text-[#1E1B3A] font-bold">{availableTime}</span>
                  </span>
                )}{' '}
                • Found{' '}
                <span className="text-[#4F7DF3] font-extrabold">
                  {resultsData.resources?.length || 0}
                </span>{' '}
                educational videos
              </p>
            </div>

            <div>
              {resultsData.aiPersonalized ? (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#EEF2FF] border border-[#C7D2FE] text-[#3B5BDB] text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-[#4F7DF3] animate-pulse" />
                  Personalized &amp; Ranked by Gemini AI
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#F7F5FF] border border-[#DFD9F7] text-[#4B4869] text-xs font-bold">
                  Verified YouTube Search Results
                </span>
              )}
            </div>
          </div>

          {/* Cards Grid or Empty Notice */}
          {resultsData.resources && resultsData.resources.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resultsData.resources.map((resource) => (
                <ResourceCard
                  key={resource.videoId}
                  resource={resource}
                  onCreateTrack={handleCreateTrack}
                  isCreatingTrack={creatingVideoId === resource.videoId}
                  disableCreateTrack={Boolean(creatingVideoId)}
                />
              ))}
            </div>
          ) : (
            <div className="p-12 text-center su-card text-[#6E6A8F]">
              <p className="text-base font-extrabold text-[#1E1B3A] mb-1">
                No videos found
              </p>
              <p className="text-xs">Try selecting another topic or level.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
