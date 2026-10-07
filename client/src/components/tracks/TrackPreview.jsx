import { useState, useEffect } from 'react';
import * as api from '../../services/api';
import { scrollToTop } from '../../utils/scroll';

const TASK_TYPE_STYLES = {
  Watch: 'bg-[#EEF2FF] text-[#3B5BDB] border-[#C7D2FE]',
  Practice: 'bg-[#DCFCE7] text-[#15803D] border-[#A7F3D0]',
  Revision: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]',
};

export default function TrackPreview({
  preview,
  onBack,
  onTrackSaved,
  onReturnToOpportunity = null,
}) {
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
    opportunityId = null,
    targetSkill = null,
    opportunityTitle = null,
    opportunityOrganization = null,
    opportunitySourceUrl = null,
    contextToken = null,
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
        ...(opportunityId
          ? {
              opportunityId,
              targetSkill: targetSkill || topic,
              contextToken: contextToken || undefined,
            }
          : {}),
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
      {/* Preserved Opportunity Context Banner */}
      {opportunityId && opportunityTitle && (
        <div className="su-hero-mint p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider px-3 py-0.5 rounded-full bg-white text-[#3B5BDB] border border-[#C7D2FE]">
                Bridge My Skill Gap
              </span>
              <span className="text-xs font-bold text-[#15803D]">
                Target Skill: {targetSkill || topic}
              </span>
            </div>
            <p className="text-sm font-extrabold text-[#1E1B3A]">
              Preparing for: <span className="text-[#4F7DF3]">{opportunityTitle}</span>
              {opportunityOrganization ? (
                <span className="text-xs font-medium text-[#6E6A8F]">
                  {' '}
                  ({opportunityOrganization})
                </span>
              ) : null}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onReturnToOpportunity && (
              <button
                type="button"
                onClick={() => onReturnToOpportunity(opportunityId)}
                disabled={saving}
                className="px-4 py-2 rounded-full bg-white hover:bg-[#F7F5FF] border border-[#CDECE1] text-xs font-bold text-[#1E1B3A] transition-colors cursor-pointer"
              >
                ← Return to Opportunity
              </button>
            )}
            {opportunitySourceUrl && (
              <a
                href={opportunitySourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-full bg-white hover:bg-[#EEF2FF] border border-[#CDECE1] text-xs font-bold text-[#4F7DF3] transition-colors"
              >
                Official Page ↗
              </a>
            )}
          </div>
        </div>
      )}

      {/* Top Action & Header Box */}
      <div className="su-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#E8E4F8]">
          <div>
            <button
              type="button"
              onClick={onBack}
              disabled={saving}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4F7DF3] hover:text-[#1E1B3A] mb-2 transition-colors cursor-pointer"
            >
              <span>← Back to Resource Recommendations</span>
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold px-3 py-0.5 rounded-full bg-[#EEF2FF] text-[#3B5BDB] border border-[#C7D2FE] uppercase tracking-wider">
                Track Preview
              </span>
              {aiGenerated ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#DCFCE7] border border-[#A7F3D0] text-[#15803D] text-xs font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                  Personalized by Gemini AI
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#F7F5FF] border border-[#DFD9F7] text-[#4B4869] text-xs font-bold">
                  Structured Study Schedule
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1E1B3A] mt-2">
              {topic} — Study Plan
            </h2>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleSaveTrack}
              disabled={saving}
              className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#1E1B3A] hover:bg-[#2E2A54] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving Track...</span>
                </>
              ) : (
                <span>Save My Track</span>
              )}
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            className="mt-6 p-4 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-sm flex items-center justify-between font-medium"
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

        {/* Selected Verified Resource & Preferences Summary */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Verified YouTube Video Card */}
          <div className="bg-[#F7F5FF] border border-[#E4DFFA] rounded-2xl overflow-hidden flex flex-col">
            <div className="relative aspect-video bg-[#1E1B3A]">
              <img
                src={resource.thumbnail}
                alt={resource.title}
                className="w-full h-full object-cover"
              />
              {resource.duration && (
                <span className="absolute bottom-2 right-2 px-2.5 py-0.5 rounded-full bg-[#1E1B3A]/90 text-white font-mono text-[11px] font-bold">
                  {resource.duration}
                </span>
              )}
            </div>
            <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
              <div>
                <p className="text-xs font-bold text-[#4F7DF3]">
                  {resource.channel}
                </p>
                <h3 className="text-sm font-extrabold text-[#1E1B3A] mt-1 line-clamp-2">
                  {resource.title}
                </h3>
              </div>
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-full bg-white hover:bg-[#EEF2FF] border border-[#DFD9F7] text-xs font-bold text-[#4F7DF3] transition-colors"
              >
                <span>Open Verified Video on YouTube</span>
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>

          {/* Preferences & Plan Metrics */}
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3 content-start">
            <div className="p-4 rounded-2xl bg-[#F7F5FF] border border-[#E4DFFA]">
              <span className="text-[11px] uppercase tracking-wider text-[#6E6A8F] font-bold">
                Target Level
              </span>
              <p className="text-sm sm:text-base font-extrabold text-[#1E1B3A] mt-1">
                {level}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#F7F5FF] border border-[#E4DFFA]">
              <span className="text-[11px] uppercase tracking-wider text-[#6E6A8F] font-bold">
                Daily Available Time
              </span>
              <p className="text-sm sm:text-base font-extrabold text-[#4F7DF3] mt-1">
                {availableTime || `${dailyBudgetMinutes} mins/day`}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#F7F5FF] border border-[#E4DFFA]">
              <span className="text-[11px] uppercase tracking-wider text-[#6E6A8F] font-bold">
                Estimated Duration
              </span>
              <p className="text-sm sm:text-base font-extrabold text-[#15803D] mt-1">
                {estimatedDays} {estimatedDays === 1 ? 'Day' : 'Days'} ({tasks.length} Tasks)
              </p>
            </div>

            <div className="col-span-2 sm:col-span-2 p-4 rounded-2xl bg-[#F7F5FF] border border-[#E4DFFA]">
              <span className="text-[11px] uppercase tracking-wider text-[#6E6A8F] font-bold">
                Learning Goal
              </span>
              <p className="text-sm font-bold text-[#1E1B3A] mt-1">
                {goal || 'General proficiency & skill building'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#F7F5FF] border border-[#E4DFFA]">
              <span className="text-[11px] uppercase tracking-wider text-[#6E6A8F] font-bold">
                Total Study Time
              </span>
              <p className="text-sm sm:text-base font-extrabold text-[#1E1B3A] mt-1">
                {totalMinutes} mins
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Schedule Task List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-[#1E1B3A]">
            Generated Daily Schedule ({estimatedDays} {estimatedDays === 1 ? 'Day' : 'Days'})
          </h3>
          <span className="text-xs font-semibold text-[#6E6A8F]">
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
                className="su-card p-5 space-y-3"
              >
                <div className="flex items-center justify-between border-b border-[#E8E4F8] pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="px-3 py-1 rounded-full bg-[#EEF2FF] border border-[#C7D2FE] text-[#3B5BDB] text-xs font-extrabold">
                      Day {day}
                    </span>
                    <span className="text-xs font-medium text-[#6E6A8F]">
                      {dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-[#4B4869]">
                    {dayTotalMins} / {dailyBudgetMinutes} mins
                  </span>
                </div>

                <div className="space-y-2.5">
                  {dayTasks.map((task, idx) => (
                    <div
                      key={`${day}-${idx}`}
                      className="p-4 rounded-2xl bg-[#F7F5FF] border border-[#E4DFFA] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                              TASK_TYPE_STYLES[task.taskType] || TASK_TYPE_STYLES.Watch
                            }`}
                          >
                            {task.taskType}
                          </span>
                          <h4 className="text-sm font-extrabold text-[#1E1B3A]">
                            {task.title}
                          </h4>
                        </div>
                        <p className="text-xs text-[#4B4869] leading-relaxed">
                          {task.description}
                        </p>
                      </div>

                      <div className="shrink-0 self-start sm:self-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-white border border-[#DFD9F7] text-xs font-bold text-[#4F7DF3]">
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
        <div className="p-5 su-card flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#4B4869]">
            Review your schedule above. Clicking{' '}
            <strong className="text-[#1E1B3A]">Save My Track</strong> will store this track and all{' '}
            {tasks.length} tasks so you can track your daily progress.
          </p>
          <button
            type="button"
            onClick={handleSaveTrack}
            disabled={saving}
            className="w-full sm:w-auto shrink-0 px-6 py-3 rounded-full bg-[#4F7DF3] hover:bg-[#3B6CE6] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-all shadow-sm cursor-pointer"
          >
            {saving ? 'Saving Track...' : 'Save My Track'}
          </button>
        </div>
      </div>
    </div>
  );
}
