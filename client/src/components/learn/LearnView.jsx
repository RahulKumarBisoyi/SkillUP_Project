import { useState } from 'react';
import * as api from '../../services/api';
import ResourceCard from './ResourceCard';
import {
  LEARNING_TOPICS,
  LEARNING_GOALS,
  LEARNING_TIMES,
} from '../../constants/learningTopics';

export default function LearnView() {
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('Beginner');
  const [goal, setGoal] = useState('');
  const [availableTime, setAvailableTime] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resultsData, setResultsData] = useState(null); // { topic, level, aiPersonalized, resources }

  const handleSearch = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!topic.trim()) {
      setError('Please select a learning topic from the available options.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.getRecommendations({
        topic: topic.trim(),
        level,
        goal: goal.trim(),
        availableTime: availableTime.trim(),
      });

      setResultsData(response);
    } catch (err) {
      setError(err.message || 'Failed to retrieve recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTopic = (selectedTitle) => {
    setTopic(selectedTitle);
    setError(null);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      {/* Search Header & Form Box */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/30 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-3">
            Milestone 3 — Learning Resource Discovery
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Discover Real Learning Resources
          </h2>
          <p className="text-slate-400 text-sm mt-2">
            Real YouTube courses and tutorials ranked and personalized by Gemini AI for your pace, level, and goals.
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="space-y-6">
          {/* Step 1: Predefined Learning Topic Cards and Dropdown */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label htmlFor="topic-select" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Select Learning Topic <span className="text-rose-400">*</span>
              </label>
              <div className="w-full sm:w-64">
                <select
                  id="topic-select"
                  value={topic}
                  onChange={(e) => handleSelectTopic(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs cursor-pointer"
                >
                  <option value="">-- Choose from available topics --</option>
                  {LEARNING_TOPICS.map((t) => (
                    <option key={t.id} value={t.title}>
                      {t.title} ({t.category})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selectable Topic Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {LEARNING_TOPICS.map((item) => {
                const isSelected = topic === item.title;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTopic(item.title)}
                    className={`p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 ring-2 ring-indigo-500/50 shadow-md shadow-indigo-500/10'
                        : 'bg-slate-900/60 border-slate-700/70 hover:border-slate-600 hover:bg-slate-900/90'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-base">{item.icon}</span>
                        <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                          {item.category}
                        </span>
                      </div>
                      <h4 className={`text-sm font-bold ${isSelected ? 'text-indigo-300' : 'text-white'}`}>
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                      <span className={isSelected ? 'text-indigo-400 font-medium' : 'text-slate-500'}>
                        {isSelected ? '✓ Selected' : 'Click to select'}
                      </span>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Level, Time, and Goal Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-700/60">
            {/* Current Level */}
            <div>
              <label htmlFor="level-select" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Current Level
              </label>
              <select
                id="level-select"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm cursor-pointer"
              >
                <option value="Beginner">Beginner (Starting from scratch)</option>
                <option value="Intermediate">Intermediate (Have basic understanding)</option>
                <option value="Advanced">Advanced (Deep dive / Interview prep)</option>
              </select>
            </div>

            {/* Available Learning Time (Predefined Options) */}
            <div>
              <label htmlFor="time-select" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Available Learning Time
              </label>
              <select
                id="time-select"
                value={availableTime}
                onChange={(e) => setAvailableTime(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm cursor-pointer"
              >
                <option value="">Select available time</option>
                {LEARNING_TIMES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              {/* Quick Selectable Pills */}
              <div className="flex flex-wrap gap-1 mt-2">
                {LEARNING_TIMES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setAvailableTime(t.value)}
                    className={`text-[10px] px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                      availableTime === t.value
                        ? 'bg-indigo-600 text-white font-medium'
                        : 'bg-slate-700/40 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Learning Goal (Predefined Options) */}
            <div>
              <label htmlFor="goal-select" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Learning Goal
              </label>
              <select
                id="goal-select"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm cursor-pointer"
              >
                <option value="">Select learning goal</option>
                {LEARNING_GOALS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
              {/* Quick Selectable Pills */}
              <div className="flex flex-wrap gap-1 mt-2">
                {LEARNING_GOALS.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGoal(g.value)}
                    className={`text-[10px] px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                      goal === g.value
                        ? 'bg-indigo-600 text-white font-medium'
                        : 'bg-slate-700/40 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center pt-2">
            <button
              type="submit"
              disabled={loading || !topic}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Searching YouTube & Ranking with AI...</span>
                </>
              ) : (
                <span>Find Learning Resources</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center justify-between">
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

      {/* Results Section */}
      {resultsData && (
        <div className="space-y-6">
          {/* Results Summary Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <div>
              <h3 className="text-base font-bold text-white">
                Results for &ldquo;{resultsData.topic}&rdquo;
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Target Level: <span className="text-slate-300 font-medium">{resultsData.level}</span>
                {goal && <span> • Goal: <span className="text-slate-300 font-medium">{goal}</span></span>}
                {availableTime && <span> • Time: <span className="text-slate-300 font-medium">{availableTime}</span></span>}
                {' '}• Found <span className="text-indigo-400 font-semibold">{resultsData.resources?.length || 0}</span> educational videos
              </p>
            </div>

            {/* AI Personalization Indicator */}
            <div>
              {resultsData.aiPersonalized ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-medium">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                  Personalized & Ranked by Gemini AI
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-700/50 border border-slate-600 text-slate-300 text-xs font-medium">
                  Real YouTube Search Results
                </span>
              )}
            </div>
          </div>

          {/* Cards Grid or Empty Notice */}
          {resultsData.resources && resultsData.resources.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resultsData.resources.map((resource) => (
                <ResourceCard key={resource.videoId} resource={resource} />
              ))}
            </div>
          ) : (
            <div className="p-12 text-center bg-slate-800/40 rounded-2xl border border-dashed border-slate-700 text-slate-400">
              <p className="text-base font-semibold text-white mb-1">No videos found</p>
              <p className="text-xs">Try selecting another topic.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
