import { useState, useEffect } from 'react';
import * as api from '../../services/api';
import { scrollToTop } from '../../utils/scroll';

const TASK_TYPE_STYLES = {
  Watch: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  Practice: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Revision: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
};

export default function TrackPreview({ preview, onBack, onTrackSaved }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (preview) {
      scrollToTop();
    }
  }, [preview]);

  if (!preview) return null;

  const {
    topic,
    level,
    goal,
    availableTime,
    dailyBudgetMinutes,
    estimatedDays,
    totalMinutes,
    aiGenerated,
    resource,
    tasks = [],
  } = preview;

  // Group tasks by dayNumber for clean daily review
  const tasksByDay = tasks.reduce((acc, task) => {
    const day = task.dayNumber || 1;
    if (!acc[day]) acc[day] = [];
    acc[day].push(task);
    return acc;
  }, {});

  const dayNumbers = Object.keys(tasksByDay)
    .map(Number)
    .sort((a, b) => a - b);

  const handleSaveTrack = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);

    try {
      const response = await api.createTrack({
        videoId: resource.videoId,
        topic,
        level,
        goal,
        availableTime,
        aiGenerated,
        tasks,
      });

      if (onTrackSaved && response?.trackId) {
        onTrackSaved(response.trackId);
      }
    } catch (err) {
      setError(err.message || 'Failed to save learning track. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Top Action & Header Box */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-700/80">
          <div>
            <button
              type="button"
              onClick={onBack}
              disabled={saving}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white mb-2 transition-colors cursor-pointer"
            >
              <span>← Back to Resource Recommendations</span>
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
                Track Preview
              </span>
              {aiGenerated ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Personalized by Gemini AI
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-700/70 border border-slate-600 text-slate-300 text-xs font-medium">
                  Standard Study Schedule (Duration-Based Fallback)
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
              {topic} — Study Plan
            </h2>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleSaveTrack}
              disabled={saving}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Saving Track to MySQL...</span>
                </>
              ) : (
                <span>Save My Track</span>
              )}
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-rose-300 hover:text-rose-100 font-bold ml-2 text-xs cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Selected Verified Resource & Preferences Summary */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Verified YouTube Video Card */}
          <div className="bg-slate-900/80 border border-slate-700/70 rounded-xl overflow-hidden flex flex-col">
            <div className="relative aspect-video bg-slate-950">
              <img
                src={resource.thumbnail}
                alt={resource.title}
                className="w-full h-full object-cover"
              />
              {resource.duration && (
                <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/85 text-white font-mono text-[11px] font-semibold">
                  {resource.duration}
                </span>
              )}
            </div>
            <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
              <div>
                <p className="text-xs font-semibold text-indigo-400">
                  {resource.channel}
                </p>
                <h3 className="text-sm font-bold text-white mt-1 line-clamp-2">
                  {resource.title}
                </h3>
              </div>
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-indigo-300 transition-colors"
              >
                <span>Open Verified Video on YouTube</span>
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>

          {/* Preferences & Plan Metrics */}
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3 content-start">
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-700/60">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Target Level
              </span>
              <p className="text-sm sm:text-base font-bold text-white mt-1">
                {level}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-700/60">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Daily Available Time
              </span>
              <p className="text-sm sm:text-base font-bold text-indigo-400 mt-1">
                {availableTime || `${dailyBudgetMinutes} mins/day`}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-700/60">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Estimated Duration
              </span>
              <p className="text-sm sm:text-base font-bold text-emerald-400 mt-1">
                {estimatedDays} {estimatedDays === 1 ? 'Day' : 'Days'} ({tasks.length} Tasks)
              </p>
            </div>

            <div className="col-span-2 sm:col-span-2 p-4 rounded-xl bg-slate-900/70 border border-slate-700/60">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Learning Goal
              </span>
              <p className="text-sm font-medium text-slate-200 mt-1">
                {goal || 'General proficiency & skill building'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-700/60">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Total Study Time
              </span>
              <p className="text-sm sm:text-base font-bold text-white mt-1">
                {totalMinutes} mins
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Schedule Task List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">
            Generated Daily Schedule ({estimatedDays} {estimatedDays === 1 ? 'Day' : 'Days'})
          </h3>
          <span className="text-xs text-slate-400">
            Daily limit: max {dailyBudgetMinutes} mins/day
          </span>
        </div>

        <div className="space-y-4">
          {dayNumbers.map((day) => {
            const dayTasks = tasksByDay[day] || [];
            const dayTotalMins = dayTasks.reduce((s, t) => s + t.estimatedMinutes, 0);

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
                      {dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-slate-300">
                    {dayTotalMins} / {dailyBudgetMinutes} mins
                  </span>
                </div>

                <div className="space-y-2.5">
                  {dayTasks.map((task, idx) => (
                    <div
                      key={`${day}-${idx}`}
                      className="p-3.5 rounded-xl bg-slate-900/75 border border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${
                              TASK_TYPE_STYLES[task.taskType] || TASK_TYPE_STYLES.Watch
                            }`}
                          >
                            {task.taskType}
                          </span>
                          <h4 className="text-sm font-bold text-white">
                            {task.title}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {task.description}
                        </p>
                      </div>

                      <div className="shrink-0 self-start sm:self-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono text-indigo-300">
                          {task.estimatedMinutes} mins
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Confirmation Bar */}
        <div className="p-5 rounded-2xl bg-slate-800/90 border border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400">
            Review your schedule above. Clicking <strong className="text-white">Save My Track</strong> will store this track and all {tasks.length} tasks in MySQL so you can track your daily progress.
          </p>
          <button
            type="button"
            onClick={handleSaveTrack}
            disabled={saving}
            className="w-full sm:w-auto shrink-0 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-600/30 cursor-pointer"
          >
            {saving ? 'Saving Track...' : 'Save My Track'}
          </button>
        </div>
      </div>
    </div>
  );
}
