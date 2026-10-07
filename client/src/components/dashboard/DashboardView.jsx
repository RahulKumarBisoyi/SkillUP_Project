import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import * as api from '../../services/api';
import { scrollToTop } from '../../utils/scroll';

const TASK_TYPE_BADGE = {
  Watch: 'bg-[#EEF2FF] text-[#3B5BDB] border-[#C7D2FE]',
  Practice: 'bg-[#DCFCE7] text-[#15803D] border-[#A7F3D0]',
  Revision: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]',
};

const OPPORTUNITY_TYPE_BADGE = {
  Hackathon: 'bg-[#EEF2FF] text-[#3B5BDB] border-[#C7D2FE]',
  Internship: 'bg-[#DCFCE7] text-[#15803D] border-[#A7F3D0]',
  Competition: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]',
  Workshop: 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]',
};

export default function DashboardView({
  onNavigateTab,
  onOpenTrack,
  onOpenOpportunity,
  onNavigateToProfile,
}) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isFetchingRef = useRef(false);

  const loadDashboard = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getDashboard();
      setData(res);
    } catch (err) {
      if (err.status === 401) {
        return;
      }
      setError(err.message || 'Failed to load your personalized dashboard.');
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!loading) {
      scrollToTop();
    }
  }, [loading]);

  const handlePrimaryAction = (action) => {
    if (!action) return;
    if (action.type === 'complete_profile') {
      onNavigateToProfile();
    } else if (action.type === 'continue_learning' && action.trackId) {
      onOpenTrack(action.trackId);
    } else if (action.type === 'discover_resources') {
      onNavigateTab('learn');
    } else if (action.type === 'explore_opportunities') {
      onNavigateTab('opportunities');
    } else if (action.targetTab) {
      onNavigateTab(action.targetTab);
    }
  };

  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="w-full max-w-6xl mx-auto p-12 su-card flex flex-col items-center justify-center text-[#5A567A]"
      >
        <div className="w-9 h-9 border-4 border-[#4F7DF3] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-[#1E1B3A]">
          Loading your personalized dashboard...
        </p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div
        role="alert"
        className="w-full max-w-3xl mx-auto p-7 su-card border-[#FECACA] text-center space-y-4"
      >
        <div className="w-11 h-11 rounded-full bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] flex items-center justify-center mx-auto font-extrabold">
          !
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-extrabold text-[#1E1B3A]">Unable to Load Dashboard</h2>
          <p className="text-sm text-[#B91C1C]">{error}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <button
            type="button"
            onClick={loadDashboard}
            className="px-5 py-2.5 rounded-full bg-[#4F7DF3] hover:bg-[#3B6CE6] text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Retry Loading Dashboard
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('learn')}
            className="px-5 py-2.5 rounded-full bg-[#F7F5FF] hover:bg-[#ECE8FF] border border-[#DFD9F7] text-[#1E1B3A] text-xs font-bold transition-colors cursor-pointer"
          >
            Go to Discover Resources
          </button>
        </div>
      </div>
    );
  }

  const studentName = data?.student?.name || user?.name || 'Student';
  const profile = data?.profile || {};
  const summary = data?.summary || {
    activeTracksCount: 0,
    completedTracksCount: 0,
    totalTracksCount: 0,
    completedTasksCount: 0,
    totalTasksCount: 0,
    knownSkillsCount: 0,
    learningSkillsCount: 0,
    totalSkillsCount: 0,
    recommendedOpportunitiesCount: 0,
  };
  const primaryAction = data?.primaryAction || {
    type: 'discover_resources',
    label: 'Discover Learning Resources',
    subtitle: 'Ready to continue learning?',
    targetTab: 'learn',
  };
  const skills = data?.skills || { knows: [], learning: [], totalCount: 0 };
  const activeTracks = Array.isArray(data?.activeTracks) ? data.activeTracks : [];
  const recentlyCompletedTracks = Array.isArray(data?.recentlyCompletedTracks)
    ? data.recentlyCompletedTracks
    : [];
  const recommendedOpportunities = Array.isArray(data?.recommendedOpportunities)
    ? data.recommendedOpportunities
    : [];

  // Correction 1: Calculate real task-completion percentage safely (completedTasksCount / totalTasksCount)
  const completedTasks = Number(summary.completedTasksCount) || 0;
  const totalTasks = Number(summary.totalTasksCount) || 0;
  const taskCompletionPercent =
    totalTasks > 0 ? Math.min(100, Math.round((completedTasks / totalTasks) * 100)) : 0;

  // SVG Ring geometry
  const ringRadius = 42;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringStrokeOffset =
    ringCircumference - (taskCompletionPercent / 100) * ringCircumference;

  // Verified upcoming deadlines from real recommended opportunities
  const upcomingDeadlines = recommendedOpportunities
    .filter((opp) => opp.deadline && String(opp.deadline).trim().length > 0)
    .slice(0, 3);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* 1. HERO WELCOME CARD (Screenshot 1 inspired mint-to-white hero + real Task Completion ring) */}
      <section
        aria-label="Student Welcome Banner"
        className="p-6 sm:p-8 su-hero-mint flex flex-col lg:flex-row lg:items-center justify-between gap-6"
      >
        <div className="space-y-3 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#3B5BDB]">
              Personalized Overview
            </span>
            {profile.branch && (
              <span className="text-xs px-3 py-0.5 rounded-full bg-white/90 text-[#1E1B3A] border border-[#CDECE1] font-semibold truncate max-w-xs sm:max-w-md shadow-2xs">
                {profile.branch}
                {profile.college_year ? ` • Year ${profile.college_year}` : ''}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#1E1B3A] tracking-tight leading-tight">
            Welcome back, {studentName}!
          </h1>

          <p className="text-sm sm:text-base text-[#4B4869] max-w-2xl leading-relaxed">
            {primaryAction.subtitle}
          </p>

          {!profile.isProfileComplete &&
            Array.isArray(profile.missingProfileFields) &&
            profile.missingProfileFields.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-xs font-bold text-[#B45309]">
                  Needed to complete profile:
                </span>
                {profile.missingProfileFields.map((field) => (
                  <span
                    key={field}
                    className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] font-semibold"
                  >
                    {field}
                  </span>
                ))}
              </div>
            )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              id="dashboard-primary-action-btn"
              onClick={() => handlePrimaryAction(primaryAction)}
              className="px-5 py-3 rounded-full bg-[#1E1B3A] hover:bg-[#2E2A54] text-white text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer flex items-center gap-2"
            >
              <span aria-hidden="true">▷</span>
              <span>{primaryAction.label} →</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('opportunities')}
              className="px-4 py-3 rounded-full bg-white hover:bg-[#F7F5FF] border border-[#CDECE1] text-[#1E1B3A] text-xs sm:text-sm font-bold transition-colors cursor-pointer shadow-2xs"
            >
              Explore opportunities
            </button>
            <button
              type="button"
              onClick={loadDashboard}
              aria-label="Refresh dashboard data"
              className="px-3.5 py-3 rounded-full bg-white/80 hover:bg-white border border-[#CDECE1] text-[#4B4869] hover:text-[#1E1B3A] text-xs font-bold transition-colors cursor-pointer"
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Real Task Completion Circular Progress Ring (Correction 1) */}
        <div
          id="dashboard-task-completion-ring"
          className="bg-white/90 border border-[#CDECE1] rounded-3xl p-5 flex items-center gap-4 shrink-0 shadow-xs self-start lg:self-center"
        >
          <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
              <circle
                cx="50"
                cy="50"
                r={ringRadius}
                fill="transparent"
                stroke="#E8E4F8"
                strokeWidth="9"
              />
              <circle
                cx="50"
                cy="50"
                r={ringRadius}
                fill="transparent"
                stroke="#4F7DF3"
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringStrokeOffset}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span
                data-testid="task-completion-percentage"
                className="text-xl font-extrabold text-[#1E1B3A] leading-none"
              >
                {taskCompletionPercent}%
              </span>
              <span className="text-[10px] font-bold text-[#726E91] mt-0.5">
                {completedTasks}/{totalTasks}
              </span>
            </div>
          </div>
          <div className="space-y-1 pr-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#4F7DF3] block">
              Task Completion
            </span>
            <p className="text-xs font-bold text-[#1E1B3A]">
              {totalTasks > 0
                ? `${completedTasks} of ${totalTasks} tasks done`
                : 'No track tasks yet'}
            </p>
            <p className="text-[11px] text-[#726E91] max-w-[150px] leading-snug">
              Calculated from your saved learning track checklists.
            </p>
          </div>
        </div>
      </section>

      {/* 2. DASHBOARD OVERVIEW CARDS */}
      <section
        aria-label="Dashboard Summary Statistics"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4"
      >
        {/* Card 1: Active Learning Tracks */}
        <div
          id="stat-card-active-tracks"
          className="p-4 sm:p-5 su-card flex flex-col justify-between gap-2"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6E6A8F]">
              Active Learning Tracks
            </span>
            <span
              aria-hidden="true"
              className="w-8 h-8 rounded-2xl bg-[#EEF2FF] text-[#4F7DF3] flex items-center justify-center text-xs font-extrabold"
            >
              ▶
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              data-testid="count-active-tracks"
              className="text-2xl sm:text-3xl font-extrabold text-[#1E1B3A]"
            >
              {summary.activeTracksCount}
            </span>
            <span className="text-xs text-[#726E91] font-medium">
              {summary.completedTracksCount} completed
            </span>
          </div>
        </div>

        {/* Card 2: Completed Learning Tasks */}
        <div
          id="stat-card-completed-tasks"
          className="p-4 sm:p-5 su-card flex flex-col justify-between gap-2"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6E6A8F]">
              Completed Learning Tasks
            </span>
            <span
              aria-hidden="true"
              className="w-8 h-8 rounded-2xl bg-[#DCFCE7] text-[#15803D] flex items-center justify-center text-xs font-extrabold"
            >
              ✓
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              data-testid="count-completed-tasks"
              className="text-2xl sm:text-3xl font-extrabold text-[#1E1B3A]"
            >
              {summary.completedTasksCount}
            </span>
            <span className="text-xs text-[#726E91] font-medium">
              of {summary.totalTasksCount} total tasks
            </span>
          </div>
        </div>

        {/* Card 3: Known Skills */}
        <div
          id="stat-card-known-skills"
          className="p-4 sm:p-5 su-card flex flex-col justify-between gap-2"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6E6A8F]">
              Known Skills
            </span>
            <span
              aria-hidden="true"
              className="w-8 h-8 rounded-2xl bg-[#E0F2FE] text-[#0369A1] flex items-center justify-center text-xs font-extrabold"
            >
              ★
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              data-testid="count-known-skills"
              className="text-2xl sm:text-3xl font-extrabold text-[#1E1B3A]"
            >
              {summary.knownSkillsCount}
            </span>
            <span className="text-xs text-[#4F7DF3] font-bold">
              +{summary.learningSkillsCount} learning
            </span>
          </div>
        </div>

        {/* Card 4: Recommended Opportunities */}
        <div
          id="stat-card-recommended-opportunities"
          className="p-4 sm:p-5 su-card flex flex-col justify-between gap-2"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6E6A8F]">
              Recommended Opportunities
            </span>
            <span
              aria-hidden="true"
              className="w-8 h-8 rounded-2xl bg-[#FEF3C7] text-[#B45309] flex items-center justify-center text-xs font-extrabold"
            >
              ✦
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              data-testid="count-recommended-opportunities"
              className="text-2xl sm:text-3xl font-extrabold text-[#1E1B3A]"
            >
              {summary.recommendedOpportunitiesCount}
            </span>
            <span className="text-xs text-[#726E91] font-medium">matched to profile</span>
          </div>
        </div>
      </section>

      {/* MAIN TWO-COLUMN GRID: CONTINUE LEARNING + OPPORTUNITIES / SKILLS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (7 cols): CONTINUE LEARNING + RECENTLY COMPLETED TRACKS */}
        <div className="lg:col-span-7 space-y-6">
          {/* 3. CONTINUE LEARNING SECTION */}
          <section
            id="dashboard-continue-learning"
            aria-label="Continue Learning"
            className="p-6 su-card space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-extrabold text-[#1E1B3A]">Continue Learning</h2>
                <p className="text-xs text-[#6E6A8F]">
                  Your most recently updated active study tracks
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                {totalTasks > 0 && (
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#DCFCE7] text-[#15803D]">
                    {completedTasks} of {totalTasks} done
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onNavigateTab('tracks')}
                  className="text-xs font-bold text-[#4F7DF3] hover:text-[#3B6CE6] transition-colors cursor-pointer shrink-0"
                >
                  View All Tracks →
                </button>
              </div>
            </div>

            {activeTracks.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#F7F5FF] border border-dashed border-[#D5CFF0] text-center space-y-3">
                <p className="text-sm font-bold text-[#1E1B3A]">
                  {summary.completedTracksCount > 0
                    ? 'All your saved learning tracks are completed!'
                    : 'No active learning tracks yet'}
                </p>
                <p className="text-xs text-[#6E6A8F] max-w-md mx-auto leading-relaxed">
                  Discover long-form YouTube courses and generate a day-by-day study schedule tailored to your daily learning time.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigateTab('learn')}
                  className="px-5 py-2.5 rounded-full bg-[#4F7DF3] hover:bg-[#3B6CE6] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  Explore Learning Resources →
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {activeTracks.map((track) => (
                  <div
                    key={track.id}
                    data-track-id={track.id}
                    className="p-4 sm:p-5 rounded-2xl bg-[#F7F5FF] border border-[#E4DFFA] hover:border-[#C7D2FE] transition-colors space-y-3.5"
                  >
                    {/* Top Row: Thumbnail + Topic + Resource Title + Progress Percentage */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        {track.resourceThumbnail && (
                          <img
                            src={track.resourceThumbnail}
                            alt={track.resourceTitle}
                            className="w-16 h-11 object-cover rounded-xl border border-[#DFD9F7] shrink-0 hidden sm:block"
                            loading="lazy"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-extrabold text-[#1E1B3A]">
                              {track.topic}
                            </span>
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white text-[#4B4869] border border-[#DFD9F7]">
                              {track.level}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-[#4B4869] truncate mt-0.5">
                            {track.resourceTitle}
                          </p>
                          {track.resourceChannel && (
                            <p className="text-[11px] text-[#726E91] truncate">
                              {track.resourceChannel}
                              {track.resourceDuration
                                ? ` • ${track.resourceDuration}`
                                : ''}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-sm font-extrabold text-[#4F7DF3]">
                          {track.progressPercentage}%
                        </span>
                        <p className="text-[11px] text-[#726E91] font-medium">
                          {track.completedTasks}/{track.totalTasks} tasks
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div
                      role="progressbar"
                      aria-valuenow={track.progressPercentage}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${track.topic} progress`}
                      className="w-full h-2 rounded-full bg-[#E4DFFA] overflow-hidden"
                    >
                      <div
                        className="h-full bg-[#4F7DF3] rounded-full transition-all duration-300"
                        style={{ width: `${track.progressPercentage}%` }}
                      />
                    </div>

                    {/* Opportunity-Linked Context (only when linked) */}
                    {(track.opportunityId || track.targetSkill) && (
                      <div className="px-3.5 py-2.5 rounded-xl bg-white border border-[#DFD9F7] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="text-xs text-[#4B4869] min-w-0">
                          <span className="font-bold text-[#4F7DF3]">
                            Bridge Skill Gap:
                          </span>{' '}
                          {track.opportunityAvailable ? (
                            <span className="font-bold text-[#1E1B3A]">
                              {track.opportunityTitle}
                            </span>
                          ) : (
                            <span className="text-[#726E91] italic">
                              Original opportunity unavailable
                            </span>
                          )}
                          {track.targetSkill && (
                            <span className="ml-1.5 inline-block text-[11px] px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] border border-[#A7F3D0] font-bold">
                              Target: {track.targetSkill}
                            </span>
                          )}
                        </div>

                        {track.opportunityAvailable && track.opportunityId && (
                          <button
                            type="button"
                            onClick={() => onOpenOpportunity(track.opportunityId)}
                            className="text-[11px] font-bold text-[#4F7DF3] hover:text-[#1E1B3A] underline cursor-pointer shrink-0 self-start sm:self-center"
                          >
                            View Opportunity →
                          </button>
                        )}
                      </div>
                    )}

                    {/* Bottom Row: Next Incomplete Task + Continue Learning CTA */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 bg-white p-3 rounded-xl border border-[#EAE6FA]">
                      {track.nextTask ? (
                        <div className="text-xs text-[#4B4869] flex flex-wrap items-center gap-2 min-w-0">
                          <span
                            aria-hidden="true"
                            className="w-6 h-6 rounded-full bg-[#FEF3C7] text-[#B45309] flex items-center justify-center text-[11px] font-bold shrink-0"
                          >
                            ◷
                          </span>
                          <span className="text-[11px] font-bold text-[#6E6A8F]">
                            Next:
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              TASK_TYPE_BADGE[track.nextTask.taskType] ||
                              TASK_TYPE_BADGE.Watch
                            }`}
                          >
                            Day {track.nextTask.dayNumber} • {track.nextTask.taskType}
                          </span>
                          <span className="truncate font-bold text-[#1E1B3A] max-w-xs">
                            {track.nextTask.title}
                          </span>
                          <span className="text-[11px] text-[#726E91]">
                            ({track.nextTask.estimatedMinutes}m)
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-[#6E6A8F] font-medium">
                          Ready to start Day 1 tasks
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => onOpenTrack(track.id)}
                        className="px-4 py-2 rounded-full bg-[#4F7DF3] hover:bg-[#3B6CE6] text-white text-xs font-bold transition-colors cursor-pointer shrink-0 self-start sm:self-center shadow-2xs"
                      >
                        Continue Learning →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 6. RECENTLY COMPLETED TRACKS SECTION */}
          <section
            id="dashboard-completed-tracks"
            aria-label="Recently Completed Tracks"
            className="p-6 su-card space-y-3.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-extrabold text-[#1E1B3A]">
                  Recently Completed Tracks
                </h2>
                <p className="text-xs text-[#6E6A8F]">
                  Completed study schedules ({summary.completedTracksCount} total)
                </p>
              </div>
              {summary.totalTracksCount > 0 && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('tracks')}
                  className="text-xs font-bold text-[#4F7DF3] hover:text-[#3B6CE6] transition-colors cursor-pointer"
                >
                  View All →
                </button>
              )}
            </div>

            {recentlyCompletedTracks.length === 0 ? (
              <div className="px-4 py-4 rounded-2xl bg-[#F7F5FF] border border-dashed border-[#D5CFF0] text-xs text-[#6E6A8F]">
                No completed tracks yet. Complete all tasks in an active learning track to see it listed here.
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentlyCompletedTracks.map((track) => (
                  <div
                    key={track.id}
                    data-completed-track-id={track.id}
                    className="p-4 rounded-2xl bg-[#F7F5FF] border border-[#E4DFFA] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-extrabold text-[#1E1B3A]">
                          {track.topic}
                        </span>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] border border-[#A7F3D0]">
                          ✓ Completed ({track.completedTasks}/{track.totalTasks})
                        </span>
                      </div>
                      {(track.opportunityId || track.targetSkill) && (
                        <p className="text-xs text-[#4B4869] truncate">
                          {track.opportunityAvailable
                            ? `Prepared for: ${track.opportunityTitle}`
                            : 'Opportunity-linked track'}
                          {track.targetSkill
                            ? ` • Target Skill: ${track.targetSkill}`
                            : ''}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {track.opportunityId && track.targetSkill && (
                        <button
                          type="button"
                          onClick={() =>
                            onNavigateToProfile({
                              opportunityId: track.opportunityId,
                              opportunityTitle: track.opportunityTitle,
                              targetSkill: track.targetSkill,
                            })
                          }
                          className="px-3 py-1.5 rounded-full bg-[#DCFCE7] hover:bg-[#BBF7D0] border border-[#86EFAC] text-[#14532D] text-xs font-bold transition-colors cursor-pointer"
                        >
                          Update My Skills
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenTrack(track.id)}
                        className="px-3.5 py-1.5 rounded-full bg-white hover:bg-[#EEF2FF] border border-[#DFD9F7] text-[#1E1B3A] text-xs font-bold transition-colors cursor-pointer"
                      >
                        View Track
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* QUICK LEARN ENTRY CARD (Screenshot 2 inspired) */}
          <section
            aria-label="Quick Learning Discovery"
            className="p-6 su-card flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#4F7DF3]">
                Personalized Learning
              </span>
              <h2 className="text-base font-extrabold text-[#1E1B3A]">
                What do you want to learn next?
              </h2>
              <p className="text-xs text-[#6E6A8F]">
                Shortlist curated long-form YouTube courses that fit your level and schedule.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('learn')}
              className="px-5 py-2.5 rounded-full bg-[#1E1B3A] hover:bg-[#2E2A54] text-white text-xs font-bold transition-colors cursor-pointer shrink-0 self-start sm:self-center"
            >
              Find resources →
            </button>
          </section>
        </div>

        {/* RIGHT COLUMN (5 cols): PERSONALIZED OPPORTUNITIES + UPCOMING DEADLINES + MY SKILLS OVERVIEW */}
        <div className="lg:col-span-5 space-y-6">
          {/* 4. PERSONALIZED OPPORTUNITIES SECTION (Screenshot 2 inspired mint highlight + cards) */}
          <section
            id="dashboard-recommended-opportunities"
            aria-label="Personalized Opportunities"
            className="p-6 su-card space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-extrabold text-[#1E1B3A]">
                  Recommended Opportunities
                </h2>
                <p className="text-xs text-[#6E6A8F]">
                  Matched to your skills, interests, and career goals
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('opportunities')}
                className="text-xs font-bold text-[#4F7DF3] hover:text-[#3B6CE6] transition-colors cursor-pointer shrink-0"
              >
                View All Opportunities →
              </button>
            </div>

            {recommendedOpportunities.length === 0 ? (
              <div className="p-5 rounded-2xl bg-[#F7F5FF] border border-dashed border-[#D5CFF0] text-center space-y-3">
                <p className="text-sm font-bold text-[#1E1B3A]">
                  No personalized matches yet
                </p>
                <p className="text-xs text-[#6E6A8F] leading-relaxed">
                  Add skills, technical interests, or career goals to your profile to see relevant hackathons, internships, and competitions.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => onNavigateToProfile()}
                    className="px-4 py-2 rounded-full bg-[#4F7DF3] hover:bg-[#3B6CE6] text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Add Skills &amp; Interests
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('opportunities')}
                    className="px-4 py-2 rounded-full bg-white hover:bg-[#EEF2FF] border border-[#DFD9F7] text-[#1E1B3A] text-xs font-bold transition-colors cursor-pointer"
                  >
                    Browse All Opportunities
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {recommendedOpportunities.map((opp, idx) => (
                  <div
                    key={opp.id}
                    data-opportunity-id={opp.id}
                    className={`p-4 rounded-2xl border transition-colors space-y-2.5 ${
                      idx === 0
                        ? 'su-hero-mint'
                        : 'bg-[#F7F5FF] border-[#E4DFFA] hover:border-[#C7D2FE]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          {idx === 0 && (
                            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white text-[#15803D] border border-[#A7F3D0]">
                              Recommended for you
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                              OPPORTUNITY_TYPE_BADGE[opp.type] ||
                              OPPORTUNITY_TYPE_BADGE.Hackathon
                            }`}
                          >
                            {opp.type}
                          </span>
                          {opp.isUnstopListing && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]">
                              Unstop
                            </span>
                          )}
                          <span className="text-[11px] text-[#6E6A8F] font-medium">
                            {opp.deadline
                              ? `Deadline: ${opp.deadline}`
                              : 'Check Official Page'}
                          </span>
                        </div>
                        <h3 className="text-sm font-extrabold text-[#1E1B3A] leading-snug">
                          {opp.title}
                        </h3>
                        <p className="text-xs text-[#5A567A] font-medium">
                          {opp.organization}
                        </p>
                      </div>
                    </div>

                    {opp.relevanceReason && (
                      <p className="text-xs text-[#3B5BDB] bg-white/90 border border-[#C7D2FE] rounded-xl px-3 py-2 leading-relaxed font-medium">
                        {opp.relevanceReason}
                      </p>
                    )}

                    <div className="flex items-center justify-end pt-0.5">
                      <button
                        type="button"
                        onClick={() => onOpenOpportunity(opp.id)}
                        className="px-4 py-1.5 rounded-full bg-[#1E1B3A] hover:bg-[#2E2A54] text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        View Details →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* UPCOMING DEADLINES CARD (Screenshot 2 inspired, using only verified real deadlines) */}
          {upcomingDeadlines.length > 0 && (
            <section
              aria-label="Upcoming Deadlines"
              className="p-6 su-card space-y-3.5"
            >
              <div>
                <h2 className="text-base font-extrabold text-[#1E1B3A]">
                  Upcoming deadlines
                </h2>
                <p className="text-xs text-[#6E6A8F]">
                  Verified dates from your matched opportunities
                </p>
              </div>
              <div className="space-y-2.5">
                {upcomingDeadlines.map((opp) => {
                  const dayNum = String(opp.deadline).split('-')[2] || '•';
                  return (
                    <button
                      key={`deadline-${opp.id}`}
                      type="button"
                      onClick={() => onOpenOpportunity(opp.id)}
                      className="w-full p-3 rounded-2xl bg-[#F7F5FF] hover:bg-[#EEF2FF] border border-[#E4DFFA] flex items-center gap-3 text-left transition-colors cursor-pointer"
                    >
                      <span className="w-10 h-10 rounded-full bg-[#FEF3C7] text-[#B45309] font-extrabold text-xs flex items-center justify-center shrink-0">
                        {dayNum}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-extrabold text-[#1E1B3A] truncate">
                          {opp.title}
                        </p>
                        <p className="text-[11px] text-[#6E6A8F] font-medium">
                          Deadline: {opp.deadline}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-[#4F7DF3] shrink-0">→</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* 5. MY SKILLS OVERVIEW SECTION */}
          <section
            id="dashboard-skills-overview"
            aria-label="My Skills Overview"
            className="p-6 su-card space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-extrabold text-[#1E1B3A]">My Skills Overview</h2>
                <p className="text-xs text-[#6E6A8F]">
                  Self-reported profile skills ({skills.totalCount} total)
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateToProfile()}
                className="px-3.5 py-1.5 rounded-full bg-[#F7F5FF] hover:bg-[#EEF2FF] border border-[#DFD9F7] text-[#4F7DF3] hover:text-[#1E1B3A] text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                {skills.totalCount === 0 ? '+ Add Your Skills' : 'Edit My Skills'}
              </button>
            </div>

            {skills.totalCount === 0 ? (
              <div className="p-5 rounded-2xl bg-[#F7F5FF] border border-dashed border-[#D5CFF0] text-center space-y-3">
                <p className="text-sm font-bold text-[#1E1B3A]">
                  No skills added yet
                </p>
                <p className="text-xs text-[#6E6A8F] leading-relaxed">
                  Select skills you know or are currently learning from the SkillUP catalog to power skill-gap analysis and recommendations.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigateToProfile()}
                  className="px-5 py-2 rounded-full bg-[#4F7DF3] hover:bg-[#3B6CE6] text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Add Your Skills →
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {/* Known Skills */}
                <div className="p-4 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#15803D]">
                      Known Skills (Knows)
                    </span>
                    <span className="text-xs font-bold text-[#15803D]">
                      {skills.knows.length}
                    </span>
                  </div>
                  {skills.knows.length === 0 ? (
                    <p className="text-xs text-[#6E6A8F]">
                      No skills marked as Knows yet.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {skills.knows.map((item) => (
                        <span
                          key={item.skill}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white border border-[#86EFAC] text-[#14532D] text-xs font-bold shadow-2xs"
                        >
                          <span aria-hidden="true" className="text-[#16A34A] font-extrabold">
                            ✓
                          </span>
                          <span>{item.skill}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Currently Learning Skills */}
                <div className="p-4 rounded-2xl bg-[#F7F5FF] border border-[#DFD9F7] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#4F7DF3]">
                      Currently Learning (Learning)
                    </span>
                    <span className="text-xs font-bold text-[#4F7DF3]">
                      {skills.learning.length}
                    </span>
                  </div>
                  {skills.learning.length === 0 ? (
                    <p className="text-xs text-[#6E6A8F]">
                      No skills marked as Currently Learning yet.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {skills.learning.map((item) => (
                        <span
                          key={item.skill}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white border border-[#C7D2FE] text-[#3B5BDB] text-xs font-bold shadow-2xs"
                        >
                          <span aria-hidden="true" className="text-[#4F7DF3] font-extrabold">
                            ◎
                          </span>
                          <span>{item.skill}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
