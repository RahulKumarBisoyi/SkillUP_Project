import { useState, useEffect, useCallback } from 'react';
import * as api from '../../services/api';
import { scrollToTop } from '../../utils/scroll';

const TASK_TYPE_STYLES = {
  Watch: 'bg-[#EEF2FF] text-[#3B5BDB] border-[#C7D2FE]',
  Practice: 'bg-[#DCFCE7] text-[#15803D] border-[#A7F3D0]',
  Revision: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]',
};

export default function TracksView({
  initialTrackId = null,
  onClearInitialTrack,
  onNavigateToLearn,
  onViewOpportunity = null,
  onUpdateProfileSkills = null,
}) {
  const [tracks, setTracks] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState(null);

  const [selectedTrackId, setSelectedTrackId] = useState(initialTrackId);
  const [activeTrack, setActiveTrack] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);

  // Explicit skill status update state for the track completion card (Correction 2)
  const [savingSkillStatus, setSavingSkillStatus] = useState(false);
  const [skillStatusFeedback, setSkillStatusFeedback] = useState(null);

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
    setSkillStatusFeedback(null);
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
    setSkillStatusFeedback(null);
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

  // Correction 2: Student explicitly chooses "Mark as Known" or "Keep as Learning"
  // Persisted via existing authenticated Profile API (never triggered automatically)
  const handleExplicitSkillChoice = async (chosenStatus) => {
    if (!activeTrack || savingSkillStatus) return;
    const skillName = String(activeTrack.targetSkill || activeTrack.topic || '').trim();
    if (!skillName) return;

    setSavingSkillStatus(true);
    setSkillStatusFeedback(null);
    setDetailError(null);

    try {
      const currentProfileData = await api.getProfile();
      const existingSkills = Array.isArray(currentProfileData?.skills)
        ? currentProfileData.skills.map((s) => ({
            skill: s.skill,
            status: s.status,
          }))
        : [];

      const lowerTarget = skillName.toLowerCase();
      let found = false;
      const nextSkills = existingSkills.map((item) => {
        if (String(item.skill).trim().toLowerCase() === lowerTarget) {
          found = true;
          return { skill: item.skill, status: chosenStatus };
        }
        return item;
      });

      if (!found) {
        nextSkills.push({ skill: skillName, status: chosenStatus });
      }

      await api.updateProfile({ skills: nextSkills });
      setSkillStatusFeedback(
        `Saved! "${skillName}" is now marked as ${chosenStatus} in your profile.`
      );
    } catch (err) {
      setDetailError(
        err.message || 'Could not update skill status directly. Please use Update My Skills.'
      );
    } finally {
      setSavingSkillStatus(false);
    }
  };

  // =========================================================================
  // VIEW 1: Single Learning Track Detail & Study Schedule (Screenshot 4)
  // =========================================================================
  if (selectedTrackId) {
    if (loadingDetail) {
      return (
        <div className="flex flex-col items-center justify-center p-12 su-card text-[#5A567A]">
          <div className="w-9 h-9 border-4 border-[#4F7DF3] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-semibold text-[#1E1B3A]">
            Loading learning track schedule...
          </p>
        </div>
      );
    }

    if (detailError && !activeTrack) {
      return (
        <div className="w-full max-w-4xl mx-auto p-6 su-card space-y-4">
          <p className="text-sm text-[#B91C1C] font-medium">{detailError}</p>
          <button
            type="button"
            onClick={handleBackToList}
            className="px-5 py-2.5 rounded-full bg-[#1E1B3A] hover:bg-[#2E2A54] text-xs font-bold text-white cursor-pointer"
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
    const hasOpportunityLink = Boolean(activeTrack.opportunityId || activeTrack.targetSkill);

    return (
      <div className="w-full max-w-5xl mx-auto space-y-6">
        {/* Track Header & Overview Card (Screenshot 4 style) */}
        <div className="su-card p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-[#E8E4F8]">
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleBackToList}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4F7DF3] hover:text-[#1E1B3A] mb-1 transition-colors cursor-pointer"
              >
                <span>← Back to All My Tracks</span>
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-xs font-extrabold px-3 py-0.5 rounded-full border uppercase tracking-wider ${
                    isCompleted
                      ? 'bg-[#DCFCE7] text-[#15803D] border-[#A7F3D0]'
                      : 'bg-[#EEF2FF] text-[#3B5BDB] border-[#C7D2FE]'
                  }`}
                >
                  {activeTrack.status}
                </span>
                <span className="text-xs font-bold px-3 py-0.5 rounded-full bg-[#F7F5FF] text-[#4B4869] border border-[#DFD9F7]">
                  {activeTrack.level}
                </span>
                {activeTrack.availableTime && (
                  <span className="text-xs font-bold px-3 py-0.5 rounded-full bg-[#F7F5FF] text-[#4B4869] border border-[#DFD9F7]">
                    {activeTrack.availableTime}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E1B3A] tracking-tight">
                {activeTrack.topic}
              </h1>
              {activeTrack.learningGoal && (
                <p className="text-xs sm:text-sm text-[#6E6A8F]">
                  Goal: <span className="text-[#1E1B3A] font-semibold">{activeTrack.learningGoal}</span>
                </p>
              )}
            </div>

            <div className="flex flex-col items-end gap-3">
              <div className="text-right">
                <span className="text-3xl sm:text-4xl font-extrabold text-[#4F7DF3]">
                  {activeTrack.progressPercentage}%
                </span>
                <p className="text-xs text-[#6E6A8F] font-semibold">
                  {activeTrack.completedTasks} of {activeTrack.totalTasks} tasks done
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {activeTrack.opportunityId && activeTrack.opportunityAvailable && onViewOpportunity && (
                  <button
                    type="button"
                    onClick={() => onViewOpportunity(activeTrack.opportunityId)}
                    className="px-4 py-2 rounded-full bg-[#F7F5FF] hover:bg-[#EEF2FF] border border-[#DFD9F7] text-[#3B5BDB] font-bold text-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span>View Opportunity</span>
                    <span aria-hidden="true">→</span>
                  </button>
                )}
                <a
                  href={activeTrack.resourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-full bg-[#4F7DF3] hover:bg-[#3B6CE6] text-white font-bold text-xs transition-all shadow-xs inline-flex items-center gap-1.5"
                >
                  <span>Watch Video on YouTube</span>
                  <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>
          </div>

          {/* Full-width Progress Bar */}
          <div className="mt-5 space-y-2">
            <div className="w-full h-3 bg-[#E8E4F8] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  isCompleted ? 'bg-[#16A34A]' : 'bg-[#4F7DF3]'
                }`}
                style={{ width: `${activeTrack.progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Compact Day Summary Cards (Screenshot 4 inspired, built from real dayNumbers) */}
          {dayNumbers.length > 0 && (
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {dayNumbers.map((day) => {
                const dTasks = tasksByDay[day] || [];
                const dDone = dTasks.filter((t) => t.completed).length;
                const dAllDone = dTasks.length > 0 && dDone === dTasks.length;
                const dInProgress = dDone > 0 && !dAllDone;
                return (
                  <div
                    key={`summary-day-${day}`}
                    className={`p-3.5 rounded-2xl border ${
                      dAllDone
                        ? 'bg-[#F0FDF4] border-[#BBF7D0]'
                        : dInProgress
                        ? 'bg-[#EEF2FF] border-[#C7D2FE]'
                        : 'bg-[#F7F5FF] border-[#E4DFFA]'
                    }`}
                  >
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wider block ${
                        dAllDone
                          ? 'text-[#15803D]'
                          : dInProgress
                          ? 'text-[#3B5BDB]'
                          : 'text-[#726E91]'
                      }`}
                    >
                      {dAllDone ? 'Completed' : dInProgress ? 'In progress' : 'Upcoming'}
                    </span>
                    <p className="text-sm font-extrabold text-[#1E1B3A] mt-0.5">
                      Day {day}
                    </p>
                    <p className="text-[11px] text-[#6E6A8F] font-medium">
                      {dDone}/{dTasks.length} tasks
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Resource Info Strip */}
          <div className="mt-5 flex items-center gap-3.5 bg-[#F7F5FF] p-3.5 rounded-2xl border border-[#E4DFFA]">
            {activeTrack.resourceThumbnail && (
              <div className="relative w-24 aspect-video rounded-xl overflow-hidden bg-[#1E1B3A] shrink-0">
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
              <p className="text-[11px] font-bold text-[#4F7DF3] truncate">
                {activeTrack.resourceChannel || 'YouTube Resource'}
              </p>
              <h3
                className="text-xs sm:text-sm font-extrabold text-[#1E1B3A] line-clamp-2 mt-0.5"
                title={activeTrack.resourceTitle}
              >
                {activeTrack.resourceTitle}
              </h3>
            </div>
          </div>

          {/* Opportunity Context Strip (only when linked to an opportunity) */}
          {hasOpportunityLink && (
            <div className="mt-4 p-4 rounded-2xl bg-[#F7F5FF] border border-[#DFD9F7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#EEF2FF] text-[#3B5BDB] border border-[#C7D2FE]">
                    Opportunity-Linked Track
                  </span>
                  <span className="text-xs font-bold text-[#15803D]">
                    Target Skill: {activeTrack.targetSkill || activeTrack.topic}
                  </span>
                </div>
                {activeTrack.opportunityAvailable && activeTrack.opportunityTitle ? (
                  <p className="text-xs sm:text-sm font-bold text-[#1E1B3A]">
                    Preparing for:{' '}
                    <span className="text-[#4F7DF3]">{activeTrack.opportunityTitle}</span>
                    {activeTrack.opportunityOrganization ? (
                      <span className="text-[#6E6A8F] font-medium">
                        {' '}
                        ({activeTrack.opportunityOrganization})
                      </span>
                    ) : null}
                  </p>
                ) : (
                  <p className="text-xs text-[#6E6A8F]">
                    Originally created for an opportunity that is no longer available in the catalog.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {onUpdateProfileSkills && (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateProfileSkills({
                        opportunityId: activeTrack.opportunityId,
                        opportunityTitle: activeTrack.opportunityTitle,
                        targetSkill: activeTrack.targetSkill || activeTrack.topic,
                      })
                    }
                    className="px-3.5 py-1.5 rounded-full bg-white hover:bg-[#EEF2FF] border border-[#DFD9F7] text-xs font-bold text-[#1E1B3A] transition-colors cursor-pointer"
                  >
                    Update My Skills
                  </button>
                )}
                {activeTrack.opportunityId && activeTrack.opportunityAvailable && onViewOpportunity && (
                  <button
                    type="button"
                    onClick={() => onViewOpportunity(activeTrack.opportunityId)}
                    className="px-3.5 py-1.5 rounded-full bg-[#EEF2FF] hover:bg-[#E0E7FF] border border-[#C7D2FE] text-xs font-bold text-[#3B5BDB] transition-colors cursor-pointer"
                  >
                    View Opportunity →
                  </button>
                )}
              </div>
            </div>
          )}

          {detailError && (
            <div
              role="alert"
              className="mt-4 p-3.5 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-xs font-medium flex items-center justify-between"
            >
              <span>{detailError}</span>
              <button
                type="button"
                onClick={() => setDetailError(null)}
                className="text-[#991B1B] hover:text-[#7F1D1D] font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Track Completion Next-Step Guidance (Correction 2: Explicit student choice, persisted via Profile API) */}
          {isCompleted && (
            <div className="mt-6 p-5 sm:p-6 su-hero-mint space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider px-3 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC]">
                      All Tasks Completed (100%)
                    </span>
                    <span className="text-xs font-bold text-[#1E1B3A]">
                      Next Step: Choose Your Skill Status
                    </span>
                  </div>
                  <p className="text-xs text-[#4B4869] leading-relaxed max-w-2xl">
                    Great job completing your study schedule for{' '}
                    <strong className="text-[#1E1B3A]">
                      {activeTrack.targetSkill || activeTrack.topic}
                    </strong>
                    ! Completing a learning track does not automatically mark a skill as Known or
                    guarantee official eligibility. Choose how you want to record this skill in your
                    profile below, or reanalyze your target opportunity.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={savingSkillStatus}
                    onClick={() => handleExplicitSkillChoice('Knows')}
                    className="px-4 py-2.5 rounded-full bg-[#15803D] hover:bg-[#166534] disabled:opacity-50 text-white font-bold text-xs transition-all cursor-pointer shadow-xs"
                  >
                    ✓ Mark as Known
                  </button>
                  <button
                    type="button"
                    disabled={savingSkillStatus}
                    onClick={() => handleExplicitSkillChoice('Learning')}
                    className="px-4 py-2.5 rounded-full bg-white hover:bg-[#F7F5FF] disabled:opacity-50 border border-[#CDECE1] text-[#1E1B3A] font-bold text-xs transition-all cursor-pointer"
                  >
                    ◎ Keep as Learning
                  </button>
                  {onUpdateProfileSkills && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateProfileSkills({
                          opportunityId: activeTrack.opportunityId,
                          opportunityTitle: activeTrack.opportunityTitle,
                          targetSkill: activeTrack.targetSkill || activeTrack.topic,
                        })
                      }
                      className="px-4 py-2.5 rounded-full bg-[#1E1B3A] hover:bg-[#2E2A54] text-white font-bold text-xs transition-all cursor-pointer shadow-xs"
                    >
                      Update My Skills
                    </button>
                  )}
                  {activeTrack.opportunityId && activeTrack.opportunityAvailable && onViewOpportunity && (
                    <button
                      type="button"
                      onClick={() => onViewOpportunity(activeTrack.opportunityId)}
                      className="px-4 py-2.5 rounded-full bg-[#4F7DF3] hover:bg-[#3B6CE6] text-white font-bold text-xs transition-all cursor-pointer shadow-xs"
                    >
                      Reanalyze Opportunity →
                    </button>
                  )}
                </div>
              </div>

              {skillStatusFeedback && (
                <div
                  role="status"
                  className="px-4 py-2.5 rounded-2xl bg-white border border-[#86EFAC] text-[#14532D] text-xs font-bold flex items-center justify-between"
                >
                  <span>{skillStatusFeedback}</span>
                  <button
                    type="button"
                    onClick={() => setSkillStatusFeedback(null)}
                    className="text-[#15803D] font-bold ml-2 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Daily Study Schedule with Interactive Checkboxes (Screenshot 4 task checklist) */}
        <div className="space-y-4">
          {dayNumbers.map((day) => {
            const dayTasks = tasksByDay[day] || [];
            const dayMins = dayTasks.reduce((s, t) => s + t.estimatedMinutes, 0);
            const dayCompletedCount = dayTasks.filter((t) => t.completed).length;

            return (
              <div
                key={day}
                className="su-card p-6 space-y-3.5"
              >
                <div className="flex items-center justify-between border-b border-[#E8E4F8] pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="px-3 py-1 rounded-full bg-[#EEF2FF] border border-[#C7D2FE] text-[#3B5BDB] text-xs font-extrabold">
                      Day {day}
                    </span>
                    <span className="text-xs font-semibold text-[#6E6A8F]">
                      {dayCompletedCount}/{dayTasks.length} completed
                    </span>
                  </div>
                  <span className="text-xs font-bold text-[#6E6A8F]">
                    {dayMins} mins total
                  </span>
                </div>

                <div className="space-y-2.5">
                  {dayTasks.map((task) => {
                    const isUpdating = updatingTaskId === task.id;
                    return (
                      <label
                        key={task.id}
                        className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 cursor-pointer ${
                          task.completed
                            ? 'bg-[#F0FDF4] border-[#BBF7D0]'
                            : 'bg-[#F7F5FF] border-[#E4DFFA] hover:border-[#C7D2FE]'
                        }`}
                      >
                        <div className="flex items-start gap-3.5">
                          <div className="relative flex items-center justify-center mt-0.5">
                            <input
                              type="checkbox"
                              checked={task.completed}
                              disabled={isUpdating}
                              onChange={() => handleToggleTask(task)}
                              className="h-5 w-5 rounded-full border-[#C7D2FE] accent-[#16A34A] cursor-pointer"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                                  TASK_TYPE_STYLES[task.taskType] || TASK_TYPE_STYLES.Watch
                                }`}
                              >
                                {task.taskType}
                              </span>
                              <span
                                className={`text-sm font-extrabold ${
                                  task.completed
                                    ? 'line-through text-[#726E91]'
                                    : 'text-[#1E1B3A]'
                                }`}
                              >
                                {task.title}
                              </span>
                            </div>
                            <p
                              className={`text-xs leading-relaxed ${
                                task.completed ? 'text-[#726E91]' : 'text-[#4B4869]'
                              }`}
                            >
                              {task.description}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <span className="px-3 py-1 rounded-full bg-white border border-[#DFD9F7] text-xs font-bold text-[#6E6A8F]">
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
      <div className="su-card p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#4F7DF3] block">
              Your Learning Plan
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-[#1E1B3A] tracking-tight">
              My Learning Tracks
            </h1>
            <p className="text-sm text-[#4B4869]">
              Structured paths with clear milestones, manageable tasks, and visible momentum.
            </p>
          </div>

          {onNavigateToLearn && (
            <button
              type="button"
              onClick={onNavigateToLearn}
              className="px-5 py-3 rounded-full bg-[#4F7DF3] hover:bg-[#3B6CE6] text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer self-start sm:self-center shadow-xs"
            >
              + Create New Track
            </button>
          )}
        </div>
      </div>

      {listError && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-sm font-medium"
        >
          {listError}
        </div>
      )}

      {loadingList ? (
        <div className="flex flex-col items-center justify-center p-12 su-card text-[#5A567A]">
          <div className="w-9 h-9 border-4 border-[#4F7DF3] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-semibold text-[#1E1B3A]">
            Loading your saved learning tracks...
          </p>
        </div>
      ) : tracks.length === 0 ? (
        <div className="p-12 text-center su-card space-y-4">
          <h3 className="text-lg font-extrabold text-[#1E1B3A]">
            No Learning Tracks Saved Yet
          </h3>
          <p className="text-xs sm:text-sm text-[#6E6A8F] max-w-md mx-auto leading-relaxed">
            Discover YouTube learning resources on the Learn page and click{' '}
            <strong className="text-[#1E1B3A]">Create My Track</strong> on any video to generate your personalized study plan.
          </p>
          {onNavigateToLearn && (
            <button
              type="button"
              onClick={onNavigateToLearn}
              className="px-6 py-3 rounded-full bg-[#4F7DF3] hover:bg-[#3B6CE6] text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer shadow-xs"
            >
              Discover Learning Resources
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tracks.map((track) => {
            const isCompleted = track.status === 'Completed';
            const hasOpportunityLink = Boolean(track.opportunityId || track.targetSkill);
            return (
              <div
                key={track.id}
                className="su-card-interactive overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-[#1E1B3A] overflow-hidden">
                    {track.resourceThumbnail && (
                      <img
                        src={track.resourceThumbnail}
                        alt={track.resourceTitle}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span
                        className={`px-3 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider border shadow-xs ${
                          isCompleted
                            ? 'bg-[#DCFCE7] text-[#15803D] border-[#86EFAC]'
                            : 'bg-white/95 text-[#3B5BDB] border-[#C7D2FE]'
                        }`}
                      >
                        {track.status}
                      </span>
                    </div>
                    {track.resourceDuration && (
                      <span className="absolute bottom-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-[#1E1B3A]/90 text-white font-mono text-[11px] font-bold">
                        {track.resourceDuration}
                      </span>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-[#4F7DF3]">
                        {track.topic}
                      </span>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#F7F5FF] text-[#4B4869] border border-[#DFD9F7]">
                        {track.level}
                      </span>
                    </div>

                    <h3
                      className="text-base font-extrabold text-[#1E1B3A] line-clamp-2 leading-snug"
                      title={track.resourceTitle}
                    >
                      {track.resourceTitle}
                    </h3>

                    {/* Opportunity Context Box (only for opportunity-linked tracks) */}
                    {hasOpportunityLink && (
                      <div className="p-3.5 rounded-2xl bg-[#F7F5FF] border border-[#DFD9F7] space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#3B5BDB]">
                            Bridge My Skill Gap
                          </span>
                          <span className="text-[11px] font-bold text-[#15803D]">
                            Target Skill: {track.targetSkill || track.topic}
                          </span>
                        </div>
                        {track.opportunityAvailable && track.opportunityTitle ? (
                          <p
                            className="text-xs text-[#1E1B3A] font-bold line-clamp-1"
                            title={track.opportunityTitle}
                          >
                            Preparing for:{' '}
                            <span className="text-[#4F7DF3]">
                              {track.opportunityTitle}
                            </span>
                          </p>
                        ) : (
                          <p className="text-[11px] text-[#726E91]">
                            Linked opportunity is no longer available
                          </p>
                        )}
                      </div>
                    )}

                    {/* Progress Section */}
                    <div className="pt-2 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#6E6A8F] font-semibold">
                          {track.completedTasks} / {track.totalTasks} tasks
                        </span>
                        <span
                          className={`font-extrabold ${
                            isCompleted ? 'text-[#15803D]' : 'text-[#4F7DF3]'
                          }`}
                        >
                          {track.progressPercentage}%
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-[#E8E4F8] rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 rounded-full ${
                            isCompleted ? 'bg-[#16A34A]' : 'bg-[#4F7DF3]'
                          }`}
                          style={{ width: `${track.progressPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Continue Learning & View Opportunity Actions */}
                <div className="p-5 pt-0 space-y-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTrackId(track.id)}
                    className="w-full py-2.5 px-4 rounded-full bg-[#4F7DF3] hover:bg-[#3B6CE6] text-white font-bold text-xs sm:text-sm transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>{isCompleted ? 'Review Completed Track' : 'Continue Learning'}</span>
                    <span aria-hidden="true">→</span>
                  </button>
                  {track.opportunityId && track.opportunityAvailable && onViewOpportunity && (
                    <button
                      type="button"
                      onClick={() => onViewOpportunity(track.opportunityId)}
                      className="w-full py-2 px-3 rounded-full bg-[#F7F5FF] hover:bg-[#EEF2FF] border border-[#DFD9F7] text-[#3B5BDB] font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>View Opportunity</span>
                      <span aria-hidden="true">↗</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
