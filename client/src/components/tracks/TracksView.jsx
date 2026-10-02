import { useState, useEffect, useCallback } from 'react';
import * as api from '../../services/api';
import { scrollToTop } from '../../utils/scroll';

const TASK_TYPE_STYLES = {
  Watch: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  Practice: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Revision: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
};

export default function TracksView({
  initialTrackId = null,
  onClearInitialTrack,
  onNavigateToLearn,
}) {
  const [tracks, setTracks] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState(null);

  const [selectedTrackId, setSelectedTrackId] = useState(initialTrackId);
  const [activeTrack, setActiveTrack] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);

  const loadTracksList = useCallback(async () => {
    setLoadingList(true);
    setListError(null);
    try {
      const res = await api.getTracks();
      setTracks(res.tracks || []);
    } catch (err) {
      setListError(err.message || 'Failed to load your learning tracks.');
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadTrackDetail = useCallback(async (trackId) => {
    if (!trackId) return;
    setLoadingDetail(true);
    setDetailError(null);
    try {
      const res = await api.getTrackById(trackId);
      setActiveTrack(res.track || null);
    } catch (err) {
      setDetailError(err.message || 'Failed to load learning track details.');
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (initialTrackId) {
      setSelectedTrackId(initialTrackId);
    }
  }, [initialTrackId]);

  useEffect(() => {
    if (selectedTrackId) {
      loadTrackDetail(selectedTrackId);
    } else {
      setActiveTrack(null);
      loadTracksList();
    }
  }, [selectedTrackId, loadTrackDetail, loadTracksList]);

  // Reset scroll to top after navigation & data loading completes (not during loading)
  useEffect(() => {
    if (selectedTrackId && !loadingDetail) {
      scrollToTop();
    } else if (!selectedTrackId && !loadingList) {
      scrollToTop();
    }
  }, [selectedTrackId, loadingDetail, loadingList]);

  const handleBackToList = () => {
    setSelectedTrackId(null);
    setActiveTrack(null);
    if (typeof onClearInitialTrack === 'function') {
      onClearInitialTrack();
    }
  };

  const handleToggleTask = async (task) => {
    if (!activeTrack || updatingTaskId) return;

    const nextCompleted = !task.completed;
    setUpdatingTaskId(task.id);
    setDetailError(null);

    try {
      const res = await api.updateTrackTask(activeTrack.id, task.id, nextCompleted);
      const updatedTasks = activeTrack.tasks.map((t) =>
        t.id === task.id ? { ...t, completed: nextCompleted } : t
      );

      const completedTasks =
        res.progress?.completedTasks ?? updatedTasks.filter((t) => t.completed).length;
      const totalTasks = res.progress?.totalTasks ?? updatedTasks.length;
      const progressPercentage =
        res.progress?.progressPercentage ??
        (totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0);
      const status =
        res.progress?.status ??
        (totalTasks > 0 && completedTasks === totalTasks ? 'Completed' : 'Active');

      setActiveTrack({
        ...activeTrack,
        tasks: updatedTasks,
        completedTasks,
        totalTasks,
        progressPercentage,
        status,
      });
    } catch (err) {
      setDetailError(err.message || 'Failed to update task status.');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // =========================================================================
  // VIEW 1: Single Learning Track Detail & Study Schedule
  // =========================================================================
  if (selectedTrackId) {
    if (loadingDetail) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-slate-400">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-sm">Loading learning track schedule...</p>
        </div>
      );
    }

    if (detailError && !activeTrack) {
      return (
        <div className="w-full max-w-4xl mx-auto p-6 bg-slate-800/90 border border-slate-700 rounded-2xl space-y-4">
          <p className="text-sm text-rose-400">{detailError}</p>
          <button
            type="button"
            onClick={handleBackToList}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-medium text-white cursor-pointer"
          >
            ← Back to My Tracks
          </button>
        </div>
      );
    }

    if (!activeTrack) return null;

    const tasks = activeTrack.tasks || [];
    const tasksByDay = tasks.reduce((acc, t) => {
      const day = t.dayNumber || 1;
      if (!acc[day]) acc[day] = [];
      acc[day].push(t);
      return acc;
    }, {});

    const dayNumbers = Object.keys(tasksByDay)
      .map(Number)
      .sort((a, b) => a - b);

    const isCompleted = activeTrack.status === 'Completed';

    return (
      <div className="w-full max-w-5xl mx-auto space-y-6">
        {/* Track Header Card */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-700/80">
            <div>
              <button
                type="button"
                onClick={handleBackToList}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white mb-2 transition-colors cursor-pointer"
              >
                <span>← Back to All My Tracks</span>
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                    isCompleted
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                  }`}
                >
                  {activeTrack.status}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-700/70 text-slate-300 border border-slate-600">
                  {activeTrack.level}
                </span>
                {activeTrack.availableTime && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-700/70 text-slate-300 border border-slate-600">
                    {activeTrack.availableTime}
                  </span>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
                {activeTrack.topic}
              </h2>
              {activeTrack.learningGoal && (
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Goal: <span className="text-slate-200">{activeTrack.learningGoal}</span>
                </p>
              )}
            </div>

            <a
              href={activeTrack.resourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-lg shadow-indigo-600/30 inline-flex items-center gap-2"
            >
              <span>Watch Video on YouTube</span>
              <span aria-hidden="true">↗</span>
            </a>
          </div>

          {detailError && (
            <div className="mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between">
              <span>{detailError}</span>
              <button
                type="button"
                onClick={() => setDetailError(null)}
                className="text-rose-300 hover:text-white font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Resource Info + Progress Bar */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            <div className="flex items-center gap-3.5 bg-slate-900/75 p-3 rounded-xl border border-slate-700/70">
              {activeTrack.resourceThumbnail && (
                <div className="relative w-28 aspect-video rounded-lg overflow-hidden bg-slate-950 shrink-0">
                  <img
                    src={activeTrack.resourceThumbnail}
                    alt={activeTrack.resourceTitle}
                    className="w-full h-full object-cover"
                  />
                  {activeTrack.resourceDuration && (
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded bg-black/85 text-white font-mono text-[10px]">
                      {activeTrack.resourceDuration}
                    </span>
                  )}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-indigo-400 truncate">
                  {activeTrack.resourceChannel || 'YouTube Resource'}
                </p>
                <h3
                  className="text-xs sm:text-sm font-bold text-white line-clamp-2 mt-0.5"
                  title={activeTrack.resourceTitle}
                >
                  {activeTrack.resourceTitle}
                </h3>
              </div>
            </div>

            {/* Overall Progress Bar */}
            <div className="lg:col-span-2 bg-slate-900/75 p-4 rounded-xl border border-slate-700/70 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 uppercase tracking-wider">
                  Overall Track Progress
                </span>
                <span className="font-mono font-bold text-white">
                  {activeTrack.completedTasks} / {activeTrack.totalTasks} tasks completed (
                  <span className={isCompleted ? 'text-emerald-400' : 'text-indigo-400'}>
                    {activeTrack.progressPercentage}%
                  </span>
                  )
                </span>
              </div>
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'
                  }`}
                  style={{ width: `${activeTrack.progressPercentage}%` }}
                ></div>
              </div>
              <p className="text-[11px] text-slate-400">
                {isCompleted
                  ? 'All tasks in this learning track are completed! You can still review or uncheck tasks below.'
                  : 'Check off tasks below as you watch the course, practice concepts, and revise.'}
              </p>
            </div>
          </div>
        </div>

        {/* Daily Study Schedule with Interactive Checkboxes */}
        <div className="space-y-4">
          {dayNumbers.map((day) => {
            const dayTasks = tasksByDay[day] || [];
            const dayMins = dayTasks.reduce((s, t) => s + t.estimatedMinutes, 0);
            const dayCompletedCount = dayTasks.filter((t) => t.completed).length;

            return (
              <div
                key={day}
                className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-5 space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold">
                      Day {day}
                    </span>
                    <span className="text-xs text-slate-400">
                      {dayCompletedCount}/{dayTasks.length} completed
                    </span>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    {dayMins} mins total
                  </span>
                </div>

                <div className="space-y-2.5">
                  {dayTasks.map((task) => {
                    const isUpdating = updatingTaskId === task.id;
                    return (
                      <label
                        key={task.id}
                        className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 cursor-pointer ${
                          task.completed
                            ? 'bg-emerald-950/20 border-emerald-500/30'
                            : 'bg-slate-900/75 border-slate-700/60 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={task.completed}
                            disabled={isUpdating}
                            onChange={() => handleToggleTask(task)}
                            className="mt-1 h-4 w-4 rounded border-slate-600 accent-emerald-500 cursor-pointer"
                          />
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${
                                  TASK_TYPE_STYLES[task.taskType] || TASK_TYPE_STYLES.Watch
                                }`}
                              >
                                {task.taskType}
                              </span>
                              <span
                                className={`text-sm font-bold ${
                                  task.completed
                                    ? 'line-through text-slate-400'
                                    : 'text-white'
                                }`}
                              >
                                {task.title}
                              </span>
                            </div>
                            <p
                              className={`text-xs leading-relaxed ${
                                task.completed ? 'text-slate-500' : 'text-slate-300'
                              }`}
                            >
                              {task.description}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300">
                            {task.estimatedMinutes}m
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: My Tracks List View
  // =========================================================================
  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/30 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
              Milestone 4 — Personalized Learning Tracks
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              My Learning Tracks
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Track your daily video sessions, practice exercises, and concept revisions.
            </p>
          </div>

          {onNavigateToLearn && (
            <button
              type="button"
              onClick={onNavigateToLearn}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm transition-colors cursor-pointer self-start sm:self-center"
            >
              + Create New Track
            </button>
          )}
        </div>
      </div>

      {listError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
          {listError}
        </div>
      )}

      {loadingList ? (
        <div className="flex flex-col items-center justify-center p-12 text-slate-400">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-sm">Loading your saved learning tracks...</p>
        </div>
      ) : tracks.length === 0 ? (
        <div className="p-12 text-center bg-slate-800/50 rounded-2xl border border-dashed border-slate-700 space-y-4">
          <h3 className="text-lg font-bold text-white">No Learning Tracks Saved Yet</h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Discover YouTube learning resources on the Learn page and click{' '}
            <strong className="text-slate-200">Create My Track</strong> on any video to generate your personalized study plan.
          </p>
          {onNavigateToLearn && (
            <button
              type="button"
              onClick={onNavigateToLearn}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
            >
              Discover Learning Resources
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tracks.map((track) => {
            const isCompleted = track.status === 'Completed';
            return (
              <div
                key={track.id}
                className="bg-slate-800/90 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between hover:border-slate-600 transition-all"
              >
                <div>
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-slate-950 overflow-hidden">
                    {track.resourceThumbnail && (
                      <img
                        src={track.resourceThumbnail}
                        alt={track.resourceTitle}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border backdrop-blur-xs ${
                          isCompleted
                            ? 'bg-emerald-500/90 text-white border-emerald-400'
                            : 'bg-indigo-600/90 text-white border-indigo-400'
                        }`}
                      >
                        {track.status}
                      </span>
                    </div>
                    {track.resourceDuration && (
                      <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/85 text-white font-mono text-[11px] font-semibold">
                        {track.resourceDuration}
                      </span>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                        {track.topic}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
                        {track.level}
                      </span>
                    </div>

                    <h3
                      className="text-base font-bold text-white line-clamp-2 leading-snug"
                      title={track.resourceTitle}
                    >
                      {track.resourceTitle}
                    </h3>

                    {/* Progress Section */}
                    <div className="pt-2 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">
                          {track.completedTasks} / {track.totalTasks} tasks
                        </span>
                        <span
                          className={`font-mono font-bold ${
                            isCompleted ? 'text-emerald-400' : 'text-indigo-400'
                          }`}
                        >
                          {track.progressPercentage}%
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700/80">
                        <div
                          className={`h-full transition-all duration-300 rounded-full ${
                            isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'
                          }`}
                          style={{ width: `${track.progressPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Continue Learning Action */}
                <div className="p-5 pt-0">
                  <button
                    type="button"
                    onClick={() => setSelectedTrackId(track.id)}
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-md shadow-indigo-600/25 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>{isCompleted ? 'Review Completed Track' : 'Continue Learning'}</span>
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
