import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import * as api from '../../services/api';
import { scrollToTop } from '../../utils/scroll';

const TASK_TYPE_BADGE = {
  Watch: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  Practice: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Revision: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
};

const OPPORTUNITY_TYPE_BADGE = {
  Hackathon: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  Internship: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Competition: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Workshop: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
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
        className="w-full max-w-6xl mx-auto p-12 flex flex-col items-center justify-center text-slate-400"
      >
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-medium">Loading your personalized dashboard...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div
        role="alert"
        className="w-full max-w-3xl mx-auto p-6 rounded-2xl bg-slate-800/90 border border-rose-500/40 text-center space-y-4"
      >
        <div className="w-10 h-10 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto font-bold">
          !
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-white">Unable to Load Dashboard</h2>
          <p className="text-sm text-rose-300">{error}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <button
            type="button"
            onClick={loadDashboard}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Retry Loading Dashboard
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('learn')}
            className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
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

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* 1. PERSONALIZED WELCOME BANNER */}
      <section
        aria-label="Student Welcome Banner"
        className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-800/95 via-slate-800/90 to-indigo-950/60 border border-slate-700/80 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Student Dashboard
            </span>
            {profile.branch && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-900/80 text-slate-300 border border-slate-700 truncate max-w-xs sm:max-w-md">
                {profile.branch}
                {profile.college_year ? ` • Year ${profile.college_year}` : ''}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Welcome back, {studentName}!
          </h1>

          <p className="text-sm text-slate-300">{primaryAction.subtitle}</p>

          {!profile.isProfileComplete &&
            Array.isArray(profile.missingProfileFields) &&
            profile.missingProfileFields.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-semibold text-amber-300">
                  Needed to complete profile:
                </span>
                {profile.missingProfileFields.map((field) => (
                  <span
                    key={field}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium"
                  >
                    {field}
                  </span>
                ))}
              </div>
            )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            id="dashboard-primary-action-btn"
            onClick={() => handlePrimaryAction(primaryAction)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
          >
            {primaryAction.label} →
          </button>
          <button
            type="button"
            onClick={loadDashboard}
            aria-label="Refresh dashboard data"
            className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            ↻ Refresh
          </button>
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
          className="p-4 sm:p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between gap-2"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active Learning Tracks
            </span>
            <span
              aria-hidden="true"
              className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 flex items-center justify-center text-xs font-bold"
            >
              ▶
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              data-testid="count-active-tracks"
              className="text-2xl sm:text-3xl font-extrabold text-white"
            >
              {summary.activeTracksCount}
            </span>
            <span className="text-xs text-slate-400">
              {summary.completedTracksCount} completed
            </span>
          </div>
        </div>

        {/* Card 2: Completed Learning Tasks */}
        <div
          id="stat-card-completed-tasks"
          className="p-4 sm:p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between gap-2"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Completed Learning Tasks
            </span>
            <span
              aria-hidden="true"
              className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center justify-center text-xs font-bold"
            >
              ✓
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              data-testid="count-completed-tasks"
              className="text-2xl sm:text-3xl font-extrabold text-white"
            >
              {summary.completedTasksCount}
            </span>
            <span className="text-xs text-slate-400">
              of {summary.totalTasksCount} total tasks
            </span>
          </div>
        </div>

        {/* Card 3: Known Skills */}
        <div
          id="stat-card-known-skills"
          className="p-4 sm:p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between gap-2"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Known Skills
            </span>
            <span
              aria-hidden="true"
              className="w-7 h-7 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300 flex items-center justify-center text-xs font-bold"
            >
              ★
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              data-testid="count-known-skills"
              className="text-2xl sm:text-3xl font-extrabold text-white"
            >
              {summary.knownSkillsCount}
            </span>
            <span className="text-xs text-sky-300 font-medium">
              +{summary.learningSkillsCount} learning
            </span>
          </div>
        </div>

        {/* Card 4: Recommended Opportunities */}
        <div
          id="stat-card-recommended-opportunities"
          className="p-4 sm:p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between gap-2"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Recommended Opportunities
            </span>
            <span
              aria-hidden="true"
              className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center justify-center text-xs font-bold"
            >
              ✦
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              data-testid="count-recommended-opportunities"
              className="text-2xl sm:text-3xl font-extrabold text-white"
            >
              {summary.recommendedOpportunitiesCount}
            </span>
            <span className="text-xs text-slate-400">matched to profile</span>
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
            className="p-5 sm:p-6 rounded-2xl bg-slate-800/90 border border-slate-700/80 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-white">Continue Learning</h2>
                <p className="text-xs text-slate-400">
                  Your most recently updated active study tracks
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('tracks')}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer shrink-0"
              >
                View All Tracks →
              </button>
            </div>

            {activeTracks.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-900/70 border border-dashed border-slate-700 text-center space-y-3">
                <p className="text-sm font-semibold text-slate-200">
                  {summary.completedTracksCount > 0
                    ? 'All your saved learning tracks are completed!'
                    : 'No active learning tracks yet'}
                </p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Discover long-form YouTube courses and generate a day-by-day study schedule tailored to your daily learning time.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigateTab('learn')}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer"
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
                    className="p-4 rounded-xl bg-slate-900/90 border border-slate-700/80 hover:border-indigo-500/40 transition-colors space-y-3"
                  >
                    {/* Top Row: Thumbnail + Topic + Resource Title + Progress Fraction */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        {track.resourceThumbnail && (
                          <img
                            src={track.resourceThumbnail}
                            alt={track.resourceTitle}
                            className="w-16 h-11 object-cover rounded-lg border border-slate-700 shrink-0 hidden sm:block"
                            loading="lazy"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-bold text-white">
                              {track.topic}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                              {track.level}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 truncate mt-0.5">
                            {track.resourceTitle}
                          </p>
                          {track.resourceChannel && (
                            <p className="text-[11px] text-slate-400 truncate">
                              {track.resourceChannel}
                              {track.resourceDuration
                                ? ` • ${track.resourceDuration}`
                                : ''}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-indigo-300">
                          {track.progressPercentage}%
                        </span>
                        <p className="text-[11px] text-slate-400">
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
                      className="w-full h-2 rounded-full bg-slate-800 overflow-hidden"
                    >
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                        style={{ width: `${track.progressPercentage}%` }}
                      />
                    </div>

                    {/* Milestone 7 Opportunity-Linked Context (only when linked) */}
                    {(track.opportunityId || track.targetSkill) && (
                      <div className="px-3 py-2 rounded-lg bg-indigo-950/40 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="text-xs text-slate-300 min-w-0">
                          <span className="font-semibold text-indigo-300">
                            Bridge Skill Gap:
                          </span>{' '}
                          {track.opportunityAvailable ? (
                            <span className="font-medium text-white">
                              {track.opportunityTitle}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">
                              Original opportunity unavailable
                            </span>
                          )}
                          {track.targetSkill && (
                            <span className="ml-1.5 inline-block text-[11px] px-2 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                              Target: {track.targetSkill}
                            </span>
                          )}
                        </div>

                        {track.opportunityAvailable && track.opportunityId && (
                          <button
                            type="button"
                            onClick={() => onOpenOpportunity(track.opportunityId)}
                            className="text-[11px] font-semibold text-indigo-300 hover:text-white underline cursor-pointer shrink-0 self-start sm:self-center"
                          >
                            View Opportunity →
                          </button>
                        )}
                      </div>
                    )}

                    {/* Bottom Row: Next Incomplete Task + Continue Learning CTA */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                      {track.nextTask ? (
                        <div className="text-xs text-slate-300 flex flex-wrap items-center gap-1.5 min-w-0">
                          <span className="text-[11px] font-semibold text-slate-400">
                            Next:
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                              TASK_TYPE_BADGE[track.nextTask.taskType] ||
                              TASK_TYPE_BADGE.Watch
                            }`}
                          >
                            Day {track.nextTask.dayNumber} • {track.nextTask.taskType}
                          </span>
                          <span className="truncate font-medium text-slate-200 max-w-xs">
                            {track.nextTask.title}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            ({track.nextTask.estimatedMinutes}m)
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Ready to start Day 1 tasks
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => onOpenTrack(track.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer shrink-0 self-start sm:self-center"
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
            className="p-5 sm:p-6 rounded-2xl bg-slate-800/90 border border-slate-700/80 space-y-3.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-white">
                  Recently Completed Tracks
                </h2>
                <p className="text-xs text-slate-400">
                  Completed study schedules ({summary.completedTracksCount} total)
                </p>
              </div>
              {summary.totalTracksCount > 0 && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('tracks')}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                >
                  View All →
                </button>
              )}
            </div>

            {recentlyCompletedTracks.length === 0 ? (
              <div className="px-4 py-3.5 rounded-xl bg-slate-900/60 border border-dashed border-slate-700/80 text-xs text-slate-400">
                No completed tracks yet. Complete all tasks in an active learning track to see it listed here.
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentlyCompletedTracks.map((track) => (
                  <div
                    key={track.id}
                    data-completed-track-id={track.id}
                    className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-700/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-white">
                          {track.topic}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          ✓ Completed ({track.completedTasks}/{track.totalTasks})
                        </span>
                      </div>
                      {(track.opportunityId || track.targetSkill) && (
                        <p className="text-xs text-slate-300 truncate">
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
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Update My Skills
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenTrack(track.id)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        View Track
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT COLUMN (5 cols): PERSONALIZED OPPORTUNITIES + MY SKILLS OVERVIEW */}
        <div className="lg:col-span-5 space-y-6">
          {/* 4. PERSONALIZED OPPORTUNITIES SECTION */}
          <section
            id="dashboard-recommended-opportunities"
            aria-label="Personalized Opportunities"
            className="p-5 sm:p-6 rounded-2xl bg-slate-800/90 border border-slate-700/80 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Recommended Opportunities
                </h2>
                <p className="text-xs text-slate-400">
                  Matched to your skills, interests, and career goals
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('opportunities')}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer shrink-0"
              >
                View All Opportunities →
              </button>
            </div>

            {recommendedOpportunities.length === 0 ? (
              <div className="p-5 rounded-xl bg-slate-900/70 border border-dashed border-slate-700 text-center space-y-3">
                <p className="text-sm font-semibold text-slate-200">
                  No personalized matches yet
                </p>
                <p className="text-xs text-slate-400">
                  Add skills, technical interests, or career goals to your profile to see relevant hackathons, internships, and competitions.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => onNavigateToProfile()}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Add Skills & Interests
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('opportunities')}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Browse All Opportunities
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {recommendedOpportunities.map((opp) => (
                  <div
                    key={opp.id}
                    data-opportunity-id={opp.id}
                    className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 hover:border-indigo-500/40 transition-colors space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              OPPORTUNITY_TYPE_BADGE[opp.type] ||
                              OPPORTUNITY_TYPE_BADGE.Hackathon
                            }`}
                          >
                            {opp.type}
                          </span>
                          {opp.isUnstopListing && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
                              Unstop
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400">
                            {opp.deadline
                              ? `Deadline: ${opp.deadline}`
                              : 'Check Official Page'}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-white leading-snug">
                          {opp.title}
                        </h3>
                        <p className="text-xs text-slate-400">
                          {opp.organization}
                        </p>
                      </div>
                    </div>

                    {opp.relevanceReason && (
                      <p className="text-xs text-indigo-200/90 bg-indigo-950/40 border border-indigo-500/25 rounded-lg px-2.5 py-1.5 leading-relaxed">
                        {opp.relevanceReason}
                      </p>
                    )}

                    <div className="flex items-center justify-end pt-0.5">
                      <button
                        type="button"
                        onClick={() => onOpenOpportunity(opp.id)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-slate-600 hover:border-indigo-500 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        View Details →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 5. MY SKILLS OVERVIEW SECTION */}
          <section
            id="dashboard-skills-overview"
            aria-label="My Skills Overview"
            className="p-5 sm:p-6 rounded-2xl bg-slate-800/90 border border-slate-700/80 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-white">My Skills Overview</h2>
                <p className="text-xs text-slate-400">
                  Self-reported profile skills ({skills.totalCount} total)
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateToProfile()}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-700 border border-slate-600 text-indigo-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer shrink-0"
              >
                {skills.totalCount === 0 ? '+ Add Your Skills' : 'Edit My Skills'}
              </button>
            </div>

            {skills.totalCount === 0 ? (
              <div className="p-5 rounded-xl bg-slate-900/70 border border-dashed border-slate-700 text-center space-y-3">
                <p className="text-sm font-semibold text-slate-200">
                  No skills added yet
                </p>
                <p className="text-xs text-slate-400">
                  Select skills you know or are currently learning from the SkillUP catalog to power skill-gap analysis and recommendations.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigateToProfile()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Add Your Skills →
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {/* Known Skills */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-emerald-500/25 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                      Known Skills (Knows)
                    </span>
                    <span className="text-xs font-mono text-emerald-400">
                      {skills.knows.length}
                    </span>
                  </div>
                  {skills.knows.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      No skills marked as Knows yet.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {skills.knows.map((item) => (
                        <span
                          key={item.skill}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs font-medium"
                        >
                          <span aria-hidden="true" className="text-emerald-400 font-bold">
                            ✓
                          </span>
                          <span>{item.skill}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Currently Learning Skills */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-sky-500/25 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-sky-300">
                      Currently Learning (Learning)
                    </span>
                    <span className="text-xs font-mono text-sky-400">
                      {skills.learning.length}
                    </span>
                  </div>
                  {skills.learning.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      No skills marked as Currently Learning yet.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {skills.learning.map((item) => (
                        <span
                          key={item.skill}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-200 text-xs font-medium"
                        >
                          <span aria-hidden="true" className="text-sky-400 font-bold">
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
