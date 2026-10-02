import { useState, useEffect, useMemo } from 'react';
import { getOpportunities, getOpportunityById } from '../../services/api';
import { scrollToTop } from '../../utils/scroll';

const CATEGORY_OPTIONS = [
  { value: 'All', label: 'All Types' },
  { value: 'Hackathon', label: 'Hackathons' },
  { value: 'Internship', label: 'Internships' },
  { value: 'Competition', label: 'Competitions' },
  { value: 'Workshop', label: 'Workshops' },
];

function getTypeBadgeStyle(type) {
  switch (type) {
    case 'Hackathon':
      return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
    case 'Internship':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    case 'Competition':
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    case 'Workshop':
      return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
    default:
      return 'bg-slate-700/60 text-slate-300 border-slate-600';
  }
}

function getStatusBadgeStyle(status) {
  switch (status) {
    case 'Open':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    case 'Upcoming':
      return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
    case 'Check Official Page':
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    case 'Expired':
      return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
    default:
      return 'bg-slate-700/60 text-slate-300 border-slate-600';
  }
}

function formatDeadlineInfo(opp) {
  if (!opp.deadline) {
    return {
      text: 'Deadline not specified on official page',
      subtext: 'Check official page for cohort dates',
      urgent: false,
    };
  }
  if (opp.isExpired) {
    return {
      text: `${opp.deadline} (Past Edition)`,
      subtext: 'Deadline has passed',
      urgent: false,
    };
  }
  if (typeof opp.daysRemaining === 'number') {
    if (opp.daysRemaining === 0) {
      return {
        text: opp.deadline,
        subtext: 'Closes today!',
        urgent: true,
      };
    }
    if (opp.daysRemaining <= 7) {
      return {
        text: opp.deadline,
        subtext: `${opp.daysRemaining} day${opp.daysRemaining === 1 ? '' : 's'} left`,
        urgent: true,
      };
    }
    return {
      text: opp.deadline,
      subtext: `${opp.daysRemaining} days remaining`,
      urgent: false,
    };
  }
  return {
    text: opp.deadline,
    subtext: null,
    urgent: false,
  };
}

const GENERIC_UNSTOP_PATHS = new Set([
  '',
  '/',
  '/hackathons',
  '/competitions',
  '/internships',
  '/workshops',
  '/scholarships',
  '/quizzes',
  '/jobs',
]);

function isUnstopOpportunity(opp) {
  if (!opp) return false;
  if (opp.isUnstopListing === true || opp.hostingPlatform === 'Unstop') {
    return true;
  }
  try {
    const parsed = new URL(String(opp.sourceUrl || '').trim());
    const host = parsed.hostname.toLowerCase();
    const cleanPath = parsed.pathname.replace(/\/+$/, '').toLowerCase();
    return (
      (host === 'unstop.com' || host.endsWith('.unstop.com')) &&
      !GENERIC_UNSTOP_PATHS.has(cleanPath)
    );
  } catch {
    return false;
  }
}

function getExternalButtonText(opp, isCard = false) {
  if (isUnstopOpportunity(opp)) {
    return opp.isExpired ? 'View on Unstop' : 'Apply on Unstop';
  }
  if (isCard) {
    return 'Official Page';
  }
  return opp.isExpired ? 'View Past Edition Archive' : 'Visit Official Page / Apply';
}

export default function OpportunitiesView({ onNavigateToProfile }) {
  const [opportunities, setOpportunities] = useState([]);
  const [explorePlatforms, setExplorePlatforms] = useState([]);
  const [studentContext, setStudentContext] = useState({
    hasSkillsOrInterests: false,
    skillCount: 0,
    skills: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showExpired, setShowExpired] = useState(true);
  const [activeSection, setActiveSection] = useState('all'); // 'all' | 'recommended'

  // Details view state
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchAllOpportunities = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getOpportunities({ includeExpired: 'true' });
      setOpportunities(response.opportunities || []);
      setExplorePlatforms(response.explorePlatforms || []);
      if (response.studentContext) {
        setStudentContext(response.studentContext);
      }
    } catch (err) {
      setError(err.message || 'Failed to load verified opportunities.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllOpportunities();
  }, []);

  // Reset scroll position after loading or switching between list and details view
  useEffect(() => {
    if (!loading && !detailLoading) {
      scrollToTop();
    }
  }, [selectedOpportunity?.id, loading, detailLoading]);

  const handleOpenDetails = async (opp) => {
    setSelectedOpportunity(opp);
    setDetailLoading(true);
    try {
      const res = await getOpportunityById(opp.id);
      if (res?.opportunity) {
        setSelectedOpportunity(res.opportunity);
      }
    } catch {
      // Keep the already-loaded opportunity object if detail refresh fails
    } finally {
      setDetailLoading(false);
    }
  };

  // Filtered opportunities for Explore All and Recommended
  const filteredOpportunities = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return opportunities.filter((opp) => {
      if (!showExpired && opp.isExpired) {
        return false;
      }
      if (selectedCategory !== 'All' && opp.type !== selectedCategory) {
        return false;
      }
      if (query) {
        const searchable = [
          opp.title,
          opp.organization,
          opp.type,
          opp.description,
          opp.locationMode,
          opp.hostingPlatform || '',
          ...(opp.requiredSkills || []),
          ...(opp.suggestedSkills || []),
        ]
          .join(' ')
          .toLowerCase();
        if (!searchable.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [opportunities, selectedCategory, searchTerm, showExpired]);

  const recommendedOpportunities = useMemo(() => {
    return filteredOpportunities
      .filter((opp) => opp.isRecommended && !opp.isExpired)
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  }, [filteredOpportunities]);

  // Helper to check if a skill is in student's Knows or Learning list
  const getStudentSkillBadge = (skillName, opp) => {
    const norm = String(skillName || '').toLowerCase();
    const inKnows = (opp.matchedKnowsSkills || []).some(
      (s) => s.toLowerCase() === norm || norm.includes(s.toLowerCase()) || s.toLowerCase().includes(norm)
    );
    if (inKnows) return 'knows';
    const inLearning = (opp.matchedLearningSkills || []).some(
      (s) => s.toLowerCase() === norm || norm.includes(s.toLowerCase()) || s.toLowerCase().includes(norm)
    );
    if (inLearning) return 'learning';
    return null;
  };

  // ============================================================================
  // DETAILS VIEW
  // ============================================================================
  if (selectedOpportunity) {
    const opp = selectedOpportunity;
    const deadlineInfo = formatDeadlineInfo(opp);
    const hostedOnUnstop = isUnstopOpportunity(opp);

    return (
      <div className="space-y-6">
        {/* Back navigation bar */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setSelectedOpportunity(null)}
            className="inline-flex items-center gap-2 text-xs font-medium px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
          >
            <span>←</span>
            <span>Back to Opportunities</span>
          </button>
          <span className="text-xs text-slate-400">
            Last verified from official source: <strong className="text-slate-200">{opp.lastVerifiedAt}</strong>
          </span>
        </div>

        {/* Main Opportunity Detail Card */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          {/* Badges & Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full border ${getTypeBadgeStyle(
                  opp.type
                )}`}
              >
                {opp.type}
              </span>
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full border ${getStatusBadgeStyle(
                  opp.status
                )}`}
              >
                {opp.status}
              </span>
              {hostedOnUnstop && (
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  Hosted on Unstop
                </span>
              )}
              {opp.isRecommended && !opp.isExpired && (
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  ★ Suggested for Your Profile
                </span>
              )}
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Edition ID: {opp.editionSlug}
            </span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {opp.title}
            </h1>
            <p className="text-sm sm:text-base text-indigo-300 font-medium mt-1.5">
              Organized by {opp.organization}
            </p>
          </div>

          {/* Key Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-900/70 border border-slate-700/70 rounded-xl p-4">
            <div>
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block">
                Application / Event Deadline
              </span>
              <span
                className={`text-sm font-semibold mt-1 block ${
                  opp.isExpired
                    ? 'text-rose-400'
                    : deadlineInfo.urgent
                    ? 'text-amber-300'
                    : 'text-slate-100'
                }`}
              >
                {deadlineInfo.text}
              </span>
              {deadlineInfo.subtext && (
                <span className="text-xs text-slate-400 mt-0.5 block">
                  {deadlineInfo.subtext}
                </span>
              )}
            </div>

            <div>
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block">
                Location / Mode
              </span>
              <span className="text-sm font-semibold text-slate-100 mt-1 block">
                {opp.locationMode}
              </span>
              {opp.startDate && (
                <span className="text-xs text-slate-400 mt-0.5 block">
                  Starts: {opp.startDate}
                </span>
              )}
            </div>

            <div>
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block">
                Application Status
              </span>
              <span className="text-sm font-semibold text-slate-100 mt-1 block">
                {opp.status}
              </span>
              <span className="text-xs text-slate-400 mt-0.5 block">
                Verified on {opp.lastVerifiedAt}
              </span>
            </div>
          </div>

          {/* Relevance Suggestion Banner (if applicable) */}
          {opp.isRecommended && opp.relevanceReason && (
            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-300">
                <span>Why This Opportunity Is Suggested For You</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {opp.relevanceReason}
              </p>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              About This Opportunity
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              {opp.description}
            </p>
          </div>

          {/* Section 1: Official Eligibility & Official Required Skills (Strictly from Official Source) */}
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-700/80 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400">
                1. Official Eligibility & Stated Requirements
              </h2>
              <span className="text-[11px] px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                Verified from Official Source
              </span>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold text-slate-400">
                Official Eligibility Criteria:
              </h3>
              <p className="text-sm text-slate-200 leading-relaxed">
                {opp.officialEligibility}
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-400">
                Skills / Domains Explicitly Mentioned on Official Page:
              </h3>
              {opp.requiredSkills && opp.requiredSkills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {opp.requiredSkills.map((skill) => (
                    <span
                      key={skill}
                      className="text-xs px-3 py-1 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  No specific programming language lock-in stated on the official page.
                </p>
              )}
            </div>
          </div>

          {/* Section 2: Suggested / Inferred Technical Skills (Kept Separate for SkillUP & Milestone 6) */}
          <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-700/60 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-300">
                2. Suggested Technical Skills (SkillUP Relevance)
              </h2>
              <span className="text-[11px] px-2.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                Suggested / Inferred — Separate from Official Rules
              </span>
            </div>
            <p className="text-xs text-slate-400">
              These technical skills are suggested by SkillUP to help you prepare or match your learning tracks. They are separate from the organizer&apos;s official eligibility rules above.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {(opp.suggestedSkills || []).map((skill) => {
                const matchType = getStudentSkillBadge(skill, opp);
                return (
                  <span
                    key={skill}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 border ${
                      matchType === 'knows'
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                        : matchType === 'learning'
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                        : 'bg-slate-800/80 text-slate-300 border-slate-700'
                    }`}
                  >
                    <span>{skill}</span>
                    {matchType === 'knows' && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-200">
                        You Know
                      </span>
                    )}
                    {matchType === 'learning' && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-200">
                        Learning
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>

          {/* External Application Call to Action */}
          <div className="pt-2 border-t border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs text-slate-400 space-y-0.5">
              <p className="text-slate-300 font-medium">
                {hostedOnUnstop
                  ? 'Applications for this opportunity are submitted directly on its official Unstop listing page.'
                  : 'Applications are submitted directly on the official organizer website.'}
              </p>
              <p className="truncate max-w-md text-slate-400">
                Official URL: {opp.sourceUrl}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <a
                href={opp.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center justify-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-md ${
                  opp.isExpired
                    ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                <span>{getExternalButtonText(opp, false)}</span>
                <span>↗</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // MAIN LIST VIEW (RECOMMENDED + EXPLORE ALL + EXPLORE PLATFORMS)
  // ============================================================================
  const renderOpportunityCard = (opp, isRecommendedCard = false) => {
    const deadlineInfo = formatDeadlineInfo(opp);
    const hostedOnUnstop = isUnstopOpportunity(opp);

    return (
      <div
        key={`${isRecommendedCard ? 'rec' : 'all'}-${opp.id}`}
        className={`rounded-2xl border p-5 flex flex-col justify-between transition-all ${
          opp.isExpired
            ? 'bg-slate-800/40 border-slate-800 opacity-80'
            : isRecommendedCard
            ? 'bg-slate-800/90 border-indigo-500/40 hover:border-indigo-400/70 shadow-lg'
            : 'bg-slate-800/80 border-slate-700/80 hover:border-slate-600 shadow-md'
        }`}
      >
        <div className="space-y-3.5">
          {/* Top badges */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${getTypeBadgeStyle(
                  opp.type
                )}`}
              >
                {opp.type}
              </span>
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${getStatusBadgeStyle(
                  opp.status
                )}`}
              >
                {opp.status}
              </span>
              {hostedOnUnstop && (
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  Unstop
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-400">
              {opp.locationMode}
            </span>
          </div>

          {/* Title & Organizer */}
          <div>
            <h3 className="text-base font-bold text-white leading-snug">
              {opp.title}
            </h3>
            <p className="text-xs text-indigo-300 font-medium mt-1">
              {opp.organization}
            </p>
          </div>

          {/* Short Description */}
          <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
            {opp.description}
          </p>

          {/* Relevance Reason Callout */}
          {opp.isRecommended && opp.relevanceReason && (
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-[11px] text-indigo-200 leading-relaxed">
              <strong className="text-indigo-300">Suggested for you: </strong>
              {opp.relevanceReason}
            </div>
          )}

          {/* Skills Preview (Official vs Suggested clearly labeled) */}
          <div className="space-y-2 pt-1">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">
                Official Focus Areas:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(opp.requiredSkills || []).slice(0, 3).map((skill) => (
                  <span
                    key={skill}
                    className="text-[11px] px-2 py-0.5 rounded bg-slate-900/90 text-slate-300 border border-slate-700"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">
                Suggested Technical Skills:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(opp.suggestedSkills || []).slice(0, 5).map((skill) => {
                  const matchType = getStudentSkillBadge(skill, opp);
                  return (
                    <span
                      key={skill}
                      className={`text-[11px] px-2 py-0.5 rounded border ${
                        matchType === 'knows'
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 font-medium'
                          : matchType === 'learning'
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 font-medium'
                          : 'bg-slate-900/50 text-slate-400 border-slate-700/70'
                      }`}
                    >
                      {skill}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer: Deadline & Actions */}
        <div className="mt-5 pt-3.5 border-t border-slate-700/70 flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Deadline:</span>
            <span
              className={`font-medium ${
                opp.isExpired
                  ? 'text-rose-400'
                  : deadlineInfo.urgent
                  ? 'text-amber-300'
                  : 'text-slate-200'
              }`}
            >
              {deadlineInfo.text}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenDetails(opp)}
              className="flex-1 text-xs font-semibold px-3 py-2 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-white border border-slate-600 transition-colors cursor-pointer"
            >
              View Details & Eligibility
            </button>
            <a
              href={opp.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors inline-flex items-center gap-1"
            >
              <span>{getExternalButtonText(opp, true)}</span>
              <span>↗</span>
            </a>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Page Hero & Filter Bar */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-lg space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                Milestone 5
              </span>
              <span className="text-xs text-slate-400">
                Individually Verified Engineering Opportunities
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
              Discover Hackathons, Internships, Competitions & Workshops
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Explore verified technical opportunities with transparent eligibility rules, required vs. suggested skills, and direct links to official organizer pages.
            </p>
          </div>

          {/* Section Switcher */}
          <div className="flex items-center bg-slate-900/90 border border-slate-700 rounded-xl p-1 self-start">
            <button
              type="button"
              onClick={() => setActiveSection('all')}
              className={`text-xs px-3.5 py-2 rounded-lg font-semibold transition-all cursor-pointer ${
                activeSection === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Recommended + Explore All
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('recommended')}
              className={`text-xs px-3.5 py-2 rounded-lg font-semibold transition-all cursor-pointer ${
                activeSection === 'recommended'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Recommended Only ({recommendedOpportunities.length})
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 pt-2 border-t border-slate-700/70">
          {/* Category Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {CATEGORY_OPTIONS.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setSelectedCategory(cat.value)}
                className={`text-xs px-3.5 py-1.5 rounded-xl font-medium border transition-all cursor-pointer ${
                  selectedCategory === cat.value
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                    : 'bg-slate-900/70 text-slate-300 border-slate-700 hover:border-slate-500'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search input & Past editions toggle */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search title, organizer, skill..."
                className="w-full text-xs bg-slate-900/90 border border-slate-700 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-slate-100 placeholder-slate-500 focus:outline-none"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showExpired}
                onChange={(e) => setShowExpired(e.target.checked)}
                className="rounded border-slate-600 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Show past editions</span>
            </label>
          </div>
        </div>
      </div>

      {/* Loading or Error States */}
      {loading ? (
        <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-12 flex flex-col items-center justify-center text-slate-400">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm">Loading verified opportunities...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-6 text-center space-y-3">
          <p className="text-sm text-rose-300 font-medium">{error}</p>
          <button
            type="button"
            onClick={fetchAllOpportunities}
            className="text-xs px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* SECTION 1: RECOMMENDED FOR YOU */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                  <span>Recommended for Your Profile & Skills</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {recommendedOpportunities.length}
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Relevance suggestions based on your saved skills and interests — not official eligibility confirmations.
                </p>
              </div>
              {onNavigateToProfile && (
                <button
                  type="button"
                  onClick={onNavigateToProfile}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium self-start sm:self-auto cursor-pointer"
                >
                  Update My Profile & Skills →
                </button>
              )}
            </div>

            {!studentContext.hasSkillsOrInterests ? (
              <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white">
                    Add skills or interests to unlock personalized opportunity suggestions
                  </h3>
                  <p className="text-xs text-slate-400">
                    Your profile currently has no saved skills or interests. Add skills you know or are learning in your Profile to see relevant hackathons, internships, and workshops here.
                  </p>
                </div>
                {onNavigateToProfile && (
                  <button
                    type="button"
                    onClick={onNavigateToProfile}
                    className="text-xs font-semibold px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shrink-0 cursor-pointer"
                  >
                    Go to My Profile & Skills
                  </button>
                )}
              </div>
            ) : recommendedOpportunities.length === 0 ? (
              <div className="bg-slate-800/50 border border-slate-700/70 rounded-2xl p-6 text-center space-y-2">
                <p className="text-sm text-slate-300 font-medium">
                  No recommended opportunities match the current filter criteria.
                </p>
                <p className="text-xs text-slate-400">
                  Try switching the category filter to &ldquo;All Types&rdquo; or clearing the search box below.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {recommendedOpportunities.map((opp) => renderOpportunityCard(opp, true))}
              </div>
            )}
          </section>

          {/* SECTION 2: EXPLORE ALL VERIFIED OPPORTUNITIES */}
          {activeSection === 'all' && (
            <section className="space-y-4 pt-4 border-t border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>Explore All Verified Opportunities</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {filteredOpportunities.length}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Includes individual event editions and year-round technical programs verified against official organizer pages.
                  </p>
                </div>
              </div>

              {filteredOpportunities.length === 0 ? (
                <div className="bg-slate-800/50 border border-slate-700/70 rounded-2xl p-8 text-center space-y-3">
                  <p className="text-sm text-slate-300 font-medium">
                    No opportunities match your current search or filter.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('All');
                      setSearchTerm('');
                      setShowExpired(true);
                    }}
                    className="text-xs px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredOpportunities.map((opp) => renderOpportunityCard(opp, false))}
                </div>
              )}
            </section>
          )}

          {/* SECTION 3: EXPLORE PLATFORMS (General Discovery Portals Kept Separate) */}
          {explorePlatforms.length > 0 && (
            <section className="space-y-4 pt-6 border-t border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-200">
                    Explore General Discovery Platforms
                  </h2>
                  <span className="text-[11px] px-2.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    External Directories
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  General portals and directories where you can browse additional hackathons, internships, and competitions. Kept separate from individual verified opportunities above.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {explorePlatforms.map((platform) => {
                  const isUnstopPlatform =
                    platform.id === 'platform-unstop' || platform.name === 'Unstop';
                  const ctaText =
                    platform.buttonLabel ||
                    (isUnstopPlatform ? 'Explore Unstop' : 'Visit Directory');

                  return (
                    <a
                      key={platform.id}
                      href={platform.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`rounded-xl p-4 flex flex-col justify-between transition-all group border ${
                        isUnstopPlatform
                          ? 'bg-slate-800/80 hover:bg-slate-800 border-indigo-500/40 hover:border-indigo-400/70 shadow-md'
                          : 'bg-slate-800/50 hover:bg-slate-800 border-slate-700/70 hover:border-slate-600'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700 inline-block">
                            {platform.category}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono truncate max-w-[160px]">
                            {platform.url}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                          {platform.name}
                        </h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {platform.description}
                        </p>
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-slate-700/50 flex items-center justify-between text-xs text-indigo-400 group-hover:text-indigo-300 font-semibold">
                        <span>{ctaText}</span>
                        <span>↗</span>
                      </div>
                    </a>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
