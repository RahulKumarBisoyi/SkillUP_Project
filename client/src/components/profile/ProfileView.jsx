import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import * as api from '../../services/api';

export default function ProfileView({ onSaveSuccess }) {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Profile fields
  const [branch, setBranch] = useState('');
  const [collegeYear, setCollegeYear] = useState('');
  const [interests, setInterests] = useState('');
  const [careerGoals, setCareerGoals] = useState('');
  const [learningHoursPerDay, setLearningHoursPerDay] = useState(2);

  // Skills state
  const [skills, setSkills] = useState([]);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillStatus, setNewSkillStatus] = useState('Learning');

  // Load profile from backend
  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getProfile();
      if (res && res.profile) {
        setBranch(res.profile.branch || '');
        setCollegeYear(res.profile.college_year ? String(res.profile.college_year) : '');
        setInterests(res.profile.interests || '');
        setCareerGoals(res.profile.career_goals || '');
        setLearningHoursPerDay(res.profile.learning_hours_per_day ?? 2);
      }
      if (res && Array.isArray(res.skills)) {
        setSkills(res.skills);
      }
    } catch (err) {
      setError(err.message || 'Failed to load profile data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  // Skill management
  const handleAddSkill = (e) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;

    const trimmedName = newSkillName.trim();
    // Check if skill already exists in the list
    if (skills.some((s) => s.skill.toLowerCase() === trimmedName.toLowerCase())) {
      setError(`Skill "${trimmedName}" is already in your skills list.`);
      return;
    }

    setSkills([...skills, { skill: trimmedName, status: newSkillStatus }]);
    setNewSkillName('');
    setNewSkillStatus('Learning');
    setError(null);
  };

  const handleRemoveSkill = (skillNameToRemove) => {
    setSkills(skills.filter((s) => s.skill !== skillNameToRemove));
  };

  const handleToggleStatus = (skillName) => {
    setSkills(
      skills.map((s) => {
        if (s.skill === skillName) {
          return {
            ...s,
            status: s.status === 'Knows' ? 'Learning' : 'Knows',
          };
        }
        return s;
      })
    );
  };

  // Submit profile changes
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const payload = {
        branch: branch.trim(),
        college_year: collegeYear ? parseInt(collegeYear, 10) : null,
        interests: interests.trim(),
        career_goals: careerGoals.trim(),
        learning_hours_per_day: parseFloat(learningHoursPerDay) || 0,
        skills,
      };

      const res = await api.updateProfile(payload);
      setSuccessMessage('Profile and skills saved to MySQL successfully!');
      if (res && res.skills) {
        setSkills(res.skills);
      }
      if (typeof onSaveSuccess === 'function') {
        onSaveSuccess();
      }
    } catch (err) {
      setError(err.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm">Loading student profile from database...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-6 sm:p-8 bg-slate-800/90 rounded-2xl border border-slate-700/80 shadow-2xl backdrop-blur-sm">
      {/* Student Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-slate-700/80 gap-4">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
            Verified Student
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mt-2">
            {user?.name}&apos;s Profile
          </h2>
          <p className="text-sm text-slate-400">{user?.email}</p>
        </div>
        <button
          type="button"
          onClick={loadProfile}
          className="text-xs px-3 py-1.5 rounded-lg border border-slate-600 hover:bg-slate-700 text-slate-300 transition-colors self-start sm:self-center cursor-pointer"
        >
          Reload from DB
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center justify-between">
          <span>{successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-300 hover:text-emerald-100 font-bold ml-2 text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Academic Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Branch / Major
            </label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="e.g. Computer Science, Mechanical, ECE"
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              College Year
            </label>
            <select
              value={collegeYear}
              onChange={(e) => setCollegeYear(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            >
              <option value="">Select Year</option>
              <option value="1">Year 1 (Freshman)</option>
              <option value="2">Year 2 (Sophomore)</option>
              <option value="3">Year 3 (Junior)</option>
              <option value="4">Year 4 (Senior)</option>
              <option value="5">Year 5+ / Graduate</option>
            </select>
          </div>
        </div>

        {/* Learning Commitment */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
            Available Learning Hours Per Day ({learningHoursPerDay} hrs)
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="12"
              step="0.5"
              value={learningHoursPerDay}
              onChange={(e) => setLearningHoursPerDay(parseFloat(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <span className="text-sm font-semibold text-indigo-400 w-16 text-right">
              {learningHoursPerDay} hrs
            </span>
          </div>
        </div>

        {/* Interests */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
            Technical & Learning Interests
          </label>
          <textarea
            rows="2"
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            placeholder="e.g. Distributed Systems, Machine Learning, Web3, Mobile Apps..."
            className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
          ></textarea>
        </div>

        {/* Career Goals */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
            Career Goals
          </label>
          <textarea
            rows="2"
            value={careerGoals}
            onChange={(e) => setCareerGoals(e.target.value)}
            placeholder="e.g. Secure a Summer Software Engineering Internship, Crack Google Hackathon..."
            className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
          ></textarea>
        </div>

        {/* Skills Section */}
        <div className="pt-4 border-t border-slate-700/80">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-semibold text-white">Skills Matrix</h3>
              <p className="text-xs text-slate-400">
                Track skills you already know vs. skills you are actively learning
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {skills.length} skills listed
            </span>
          </div>

          {/* Add skill input row */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <input
              type="text"
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              placeholder="e.g. Python, Docker, SQL, React"
              className="flex-1 px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
            <select
              value={newSkillStatus}
              onChange={(e) => setNewSkillStatus(e.target.value)}
              className="px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            >
              <option value="Learning">Learning</option>
              <option value="Knows">Knows</option>
            </select>
            <button
              type="button"
              onClick={handleAddSkill}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer shrink-0"
            >
              + Add Skill
            </button>
          </div>

          {/* Skills display list */}
          {skills.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-slate-700 text-center text-xs text-slate-500">
              No skills added yet. Add a skill above to start tracking.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 p-3 bg-slate-900/50 rounded-xl border border-slate-700/60 max-h-48 overflow-y-auto">
              {skills.map((s) => {
                const isKnows = s.status === 'Knows';
                return (
                  <div
                    key={s.skill}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      isKnows
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-sky-500/10 border-sky-500/30 text-sky-300'
                    }`}
                  >
                    <span>{s.skill}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(s.skill)}
                      title="Click to toggle status"
                      className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 cursor-pointer"
                    >
                      {s.status} ⇄
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(s.skill)}
                      title="Remove skill"
                      className="text-slate-400 hover:text-rose-400 font-bold ml-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-slate-700/80 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
          >
            {saving ? 'Saving Profile to MySQL...' : 'Save Profile & Skills'}
          </button>
        </div>
      </form>
    </div>
  );
}
