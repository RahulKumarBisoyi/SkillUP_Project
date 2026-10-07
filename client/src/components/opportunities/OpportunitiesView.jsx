import { useState, useEffect, useMemo } from 'react';
import {
  getOpportunities,
  getOpportunityById,
  analyzeOpportunitySkills,
} from '../../services/api';
import { scrollToTop } from '../../utils/scroll';

const CATEGORY_OPTIONS = [
  { value: 'All', label: 'All Types' },
  { value: 'Hackathon', label: 'Hackathons' },
  { value: 'Internship', label: 'Internships' },
  { value: 'Competition', label: 'Competitions' },
  { value: 'Workshop', label: 'Workshops' },
];

const STRICT_ALIAS_TO_CANONICAL = new Map([
  ['javascript', 'javascript'],
  ['js', 'javascript'],
  ['ecmascript', 'javascript'],
  ['typescript', 'typescript'],
  ['ts', 'typescript'],
  ['python', 'python'],
  ['py', 'python'],
  ['python3', 'python'],
  ['python 3', 'python'],
  ['c++', 'c++'],
  ['cpp', 'c++'],
  ['c plus plus', 'c++'],
  ['c#', 'c#'],
  ['csharp', 'c#'],
  ['c sharp', 'c#'],
  ['react', 'react'],
  ['reactjs', 'react'],
  ['react.js', 'react'],
  ['node.js', 'node.js'],
  ['nodejs', 'node.js'],
  ['dsa', 'dsa'],
  ['data structures and algorithms', 'dsa'],
  ['data structures & algorithms', 'dsa'],
  ['dsa in c++', 'dsa in c++'],
  ['data structures and algorithms in c++', 'dsa in c++'],
  ['data structures & algorithms in c++', 'dsa in c++'],
  ['dsa in java', 'dsa in java'],
  ['data structures and algorithms in java', 'dsa in java'],
  ['data structures & algorithms in java', 'dsa in java'],
  ['sql', 'sql'],
  ['structured query language', 'sql'],
  ['dbms', 'dbms'],
  ['database management systems', 'dbms'],
  ['database management system', 'dbms'],
  ['sql & dbms', 'sql & dbms'],
  ['sql and dbms', 'sql & dbms'],
  ['dbms & sql', 'sql & dbms'],
  ['dbms and sql', 'sql & dbms'],
  ['machine learning', 'machine learning'],
  ['ml', 'machine learning'],
  ['operating systems', 'operating systems'],
  ['operating system', 'operating systems'],
  ['os', 'operating systems'],
  ['aws', 'aws'],
  ['amazon web services', 'aws'],
  ['cloud', 'cloud'],
  ['cloud computing', 'cloud'],
  ['linux', 'linux'],
  ['gnu/linux', 'linux'],
]);

function getCanonicalSkillKey(rawSkill) {
  const norm = String(rawSkill || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  if (!norm) return '';
  return STRICT_ALIAS_TO_CANONICAL.get(norm) || norm;
}

function getTypeBadgeStyle(type) {
  switch (type) {
    case 'Hackathon':
      return 'bg-[#EEF2FF] text-[#3B5BDB] border-[#C7D2FE]';
    case 'Internship':
      return 'bg-[#DCFCE7] text-[#15803D] border-[#A7F3D0]';
    case 'Competition':
      return 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]';
    case 'Workshop':
      return 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]';
    default:
      return 'bg-[#F7F5FF] text-[#4B4869] border-[#DFD9F7]';
  }
}

function getTypeIcon(type) {
  switch (type) {
    case 'Hackathon':
      return '⚡';
    case 'Internship':
      return '💼';
    case 'Competition':
      return '🏆';
    case 'Workshop':
      return '🛠';
    default:
      return '📌';
  }
}

function getStatusBadgeStyle(status) {
  switch (status) {
    case 'Open':
      return 'bg-[#DCFCE7] text-[#15803D] border-[#A7F3D0]';
    case 'Upcoming':
      return 'bg-[#EEF2FF] text-[#3B5BDB] border-[#C7D2FE]';
    case 'Check Official Page':
      return 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]';
    case 'Expired':
      return 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]';
    default:
      return 'bg-[#F7F5FF] text-[#4B4869] border-[#DFD9F7]';
  }
}

function formatDeadlineInfo(opp) {
  if (!opp.deadline) {
    return {
      text: 'Check official page for cohort dates',
      shortText: 'Cohort / Rolling',
      subtext: 'No static cutoff date listed',
      urgent: false,
    };
  }
  if (opp.isExpired) {
    return {
      text: `${opp.deadline} (Past Edition)`,
      shortText: `${opp.deadline} (Past)`,
      subtext: 'Deadline has passed',
      urgent: false,
    };
  }
  if (typeof opp.daysRemaining === 'number') {
    if (opp.daysRemaining === 0) {
      return {
        text: opp.deadline,
        shortText: opp.deadline,
        subtext: 'Closes today',
        urgent: false,
      };
    }
    return {
      text: opp.deadline,
      shortText: opp.deadline,
      subtext: `${opp.daysRemaining} day${
        opp.daysRemaining === 1 ? '' : 's'
      } remaining`,
      urgent: false,
    };
  }
  return {
    text: opp.deadline,
    shortText: opp.deadline,
    subtext: null,
    urgent: false,
  };
}

function getConciseOpportunitySummary(opp) {
  const raw = String(opp?.description || '').trim();
  if (!raw) return 'Verified engineering opportunity.';
  const firstSentenceMatch = raw.match(/^[^.!?]+[.!?]/);
  const firstSentence = firstSentenceMatch
    ? firstSentenceMatch[0].trim()
    : raw;
  if (firstSentence.length <= 145) {
    return firstSentence;
  }
  const truncated = firstSentence.slice(0, 140).replace(/\s+\S*$/, '');
  return `${truncated}…`;
}

function getOpportunityHighlights(opp) {
  if (!opp) return [];
  const highlights = [];

  if (opp.requiredSkills && opp.requiredSkills.length > 0) {
    highlights.push({
      label: 'Official Focus',
      value: opp.requiredSkills.join(' • '),
    });
  }

  highlights.push({
    label: 'Mode & Schedule',
    value: `${opp.locationMode || 'Online'}${
      opp.startDate ? ` • Starts ${opp.startDate}` : ''
    }${opp.deadline ? ` • Deadline ${opp.deadline}` : ' • Rolling / Cohort schedule'}`,
  });

  highlights.push({
    label: 'Organizer & Source',
    value: `${opp.organization} (Verified on ${opp.lastVerifiedAt})`,
  });

  return highlights;
}

function getCriterionStatusVisual(status) {
  switch (status) {
    case 'matches_profile':
      return {
        icon: '✓',
        label: 'Matches Profile',
        badgeClass: 'bg-[#DCFCE7] text-[#14532D] border-[#86EFAC]',
        rowBorderClass: 'border-[#BBF7D0] bg-[#F0FDF4]',
        iconBadgeClass: 'bg-white text-[#15803D] border-[#86EFAC]',
      };
    case 'does_not_match':
      return {
        icon: '✕',
        label: 'Does Not Match',
        badgeClass: 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]',
        rowBorderClass: 'border-[#FECACA] bg-[#FEF2F2]',
        iconBadgeClass: 'bg-white text-[#DC2626] border-[#FECACA]',
      };
    case 'needs_confirmation':
    default:
      return {
        icon: '?',
        label: 'Needs Confirmation',
        badgeClass: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
        rowBorderClass: 'border-[#E4DFFA] bg-[#F7F5FF]',
        iconBadgeClass: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]',
      };
  }
}

function buildFallbackEligibilityCriteria(opp) {
  if (!opp) return [];
  const rawEligibility = String(opp.officialEligibility || '').trim();
  const hasVerifiedText = rawEligibility.length > 0;
  const criteria = [];

  if (opp.isExpired) {
    criteria.push({
      id: 'application-window',
      title: 'Application Window & Edition Status',
      detail: `This edition's deadline (${
        opp.deadline || 'previous cohort'
      }) has already passed and is closed for new applications.`,
      status: 'does_not_match',
      statusLabel: 'Does Not Match',
    });
  } else if (opp.status === 'Open' || opp.status === 'Upcoming') {
    criteria.push({
      id: 'application-window',
      title: 'Application Window & Edition Status',
      detail: opp.deadline
        ? `${opp.status} for participation — recorded deadline: ${opp.deadline}.`
        : `${opp.status} for participation (${opp.locationMode || 'Online'}).`,
      status: 'matches_profile',
      statusLabel: 'Matches Profile',
    });
  } else {
    criteria.push({
      id: 'application-window',
      title: 'Application Window & Edition Status',
      detail:
        'Application windows open by cohort or term — check the official page for active dates.',
      status: 'needs_confirmation',
      statusLabel: 'Needs Confirmation',
    });
  }

  criteria.push({
    id: 'academic-profile',
    title: 'Participant & Academic Background',
    detail: hasVerifiedText
      ? 'Compare your academic enrollment and participant status with the official rules.'
      : 'Official participant requirements could not be verified from the source listing.',
    status: 'needs_confirmation',
    statusLabel: 'Needs Confirmation',
  });

  criteria.push({
    id: 'mandatory-skills',
    title: 'Mandatory Technical Skill Prerequisites',
    detail: hasVerifiedText
      ? 'No mandatory programming language or technical skill prerequisites are enforced by the organizer to register.'
      : 'Official mandatory skill prerequisites are not specified on the source listing.',
    status: hasVerifiedText ? 'matches_profile' : 'needs_confirmation',
    statusLabel: hasVerifiedText ? 'Matches Profile' : 'Needs Confirmation',
  });

  criteria.push({
    id: 'organizer-rules',
    title: 'Organizer Registration & Program Rules',
    detail:
      'Requires reviewing full terms and completing registration on the official organizer website.',
    status: 'needs_confirmation',
    statusLabel: 'Needs Confirmation',
  });

  return criteria;
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
    return 'Visit Official Page';
  }
  return opp.isExpired ? 'Visit Official Page (Archive)' : 'Visit Official Page / Apply';
}

export default function OpportunitiesView({
  onNavigateToProfile,
  onStartBridgeSkillGap,
  initialOpportunityId = null,
  onClearInitialOpportunity,
}) {
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

  // Details & Skill Analysis state
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [skillAnalysis, setSkillAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [selectedBridgeSkill, setSelectedBridgeSkill] = useState('');
  const [showFullAbout, setShowFullAbout] = useState(false);
  const [showSkillDetails, setShowSkillDetails] = useState(false);
  const [showFullEligibility, setShowFullEligibility] = useState(false);

  const fetchAllOpportunities = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getOpportunities({ includeExpired: 'true' });
      const fetchedList = response.opportunities || [];
      setOpportunities(fetchedList);
      setExplorePlatforms(response.explorePlatforms || []);
      if (response.studentContext) {
        setStudentContext(response.studentContext);
      }
      return fetchedList;
    } catch (err) {
      setError(err.message || 'Failed to load verified opportunities.');
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllOpportunities();
  }, []);

  useEffect(() => {
    if (!loading && !detailLoading) {
      scrollToTop();
    }
  }, [selectedOpportunity?.id, loading, detailLoading]);

  useEffect(() => {
    const missing = skillAnalysis?.missingSkills || [];
    if (missing.length > 0) {
      setSelectedBridgeSkill((prev) =>
        prev && missing.includes(prev) ? prev : missing[0]
      );
    } else {
      setSelectedBridgeSkill('');
    }
  }, [skillAnalysis]);

  const handleRunSkillAnalysis = async (opportunityId) => {
    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const res = await analyzeOpportunitySkills(opportunityId);
      setSkillAnalysis(res);
    } catch (err) {
      setAnalysisError(
        err.message || 'Unable to analyze skills for this opportunity right now.'
      );
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleOpenDetails = async (opp) => {
    if (!opp || !opp.id) return;
    setSelectedOpportunity(opp);
    setSkillAnalysis(null);
    setAnalysisError(null);
    setShowFullAbout(false);
    setShowSkillDetails(false);
    setShowFullEligibility(false);
    setDetailLoading(true);
    setAnalysisLoading(true);

    try {
      const [detailRes, analysisRes] = await Promise.allSettled([
        getOpportunityById(opp.id),
        analyzeOpportunitySkills(opp.id),
      ]);

      if (
        detailRes.status === 'fulfilled' &&
        detailRes.value?.opportunity
      ) {
        setSelectedOpportunity(detailRes.value.opportunity);
      } else if (detailRes.status === 'rejected') {
        setSelectedOpportunity(null);
        setError(
          detailRes.reason?.message ||
            'The selected opportunity is no longer available in the database.'
        );
        return;
      }

      if (analysisRes.status === 'fulfilled' && analysisRes.value) {
        setSkillAnalysis(analysisRes.value);
      } else if (analysisRes.status === 'rejected') {
        setAnalysisError(
          analysisRes.reason?.message ||
            'Unable to analyze skills for this opportunity right now.'
        );
      }
    } finally {
      setDetailLoading(false);
      setAnalysisLoading(false);
    }
  };

  useEffect(() => {
    if (!initialOpportunityId) return;
    const targetId = Number(initialOpportunityId);
    if (!Number.isInteger(targetId) || targetId <= 0) return;

    const existing = opportunities.find((o) => o.id === targetId);
    handleOpenDetails(
      existing || {
        id: targetId,
        title: 'Loading Opportunity...',
        organization: '',
        type: 'Internship',
        status: 'Open',
        locationMode: 'Online',
        requiredSkills: [],
        suggestedSkills: [],
        sourceUrl: '#',
      }
    );
  }, [initialOpportunityId]);

  const handleBridgeSkill = (skillToLearn) => {
    if (!selectedOpportunity || !skillToLearn || !onStartBridgeSkillGap) return;
    const cleanSkill = String(skillToLearn).trim();
    if (!cleanSkill) return;

    onStartBridgeSkillGap({
      opportunityId: selectedOpportunity.id,
      opportunityTitle: selectedOpportunity.title,
      organization: selectedOpportunity.organization,
      opportunityType: selectedOpportunity.type,
      targetSkill: cleanSkill,
      sourceUrl: selectedOpportunity.sourceUrl,
      contextToken: skillAnalysis?.bridgeContextTokens?.[cleanSkill] || null,
    });
  };

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

  const getStudentSkillBadge = (skillName, opp) => {
    const targetKey = getCanonicalSkillKey(skillName);
    if (!targetKey) return null;
    const inKnows = (opp.matchedKnowsSkills || []).some(
      (s) => getCanonicalSkillKey(s) === targetKey
    );
    if (inKnows) return 'knows';
    const inLearning = (opp.matchedLearningSkills || []).some(
      (s) => getCanonicalSkillKey(s) === targetKey
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
    const shortAbout = getConciseOpportunitySummary(opp);
    const highlights = getOpportunityHighlights(opp);
    const eligibilityText =
      skillAnalysis?.officialEligibility?.information ||
      (opp.officialEligibility && opp.officialEligibility.trim()
        ? opp.officialEligibility
        : 'Official eligibility could not be fully determined. Check the original opportunity page.');

    const criteriaList =
      skillAnalysis?.officialEligibility?.criteria &&
      skillAnalysis.officialEligibility.criteria.length > 0
        ? skillAnalysis.officialEligibility.criteria
        : buildFallbackEligibilityCriteria(opp);

    const matchesProfileCount = criteriaList.filter(
      (c) => c.status === 'matches_profile'
    ).length;
    const doesNotMatchCount = criteriaList.filter(
      (c) => c.status === 'does_not_match'
    ).length;
    const needsConfirmationCount = criteriaList.filter(
      (c) => c.status === 'needs_confirmation'
    ).length;

    const knownCount = skillAnalysis?.knownSkills?.length || 0;
    const learningCount = skillAnalysis?.learningSkills?.length || 0;
    const missingCount = skillAnalysis?.missingSkills?.length || 0;

    return (
      <div className="space-y-6">
        {/* Back navigation bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedOpportunity(null);
              setSkillAnalysis(null);
              setAnalysisError(null);
              setShowFullAbout(false);
              setShowSkillDetails(false);
              setShowFullEligibility(false);
              if (typeof onClearInitialOpportunity === 'function') {
                onClearInitialOpportunity();
              }
            }}
            className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-full bg-white hover:bg-[#F7F5FF] text-[#1E1B3A] border border-[#E4DFFA] transition-colors cursor-pointer shadow-2xs"
          >
            <span aria-hidden="true">←</span>
            <span>Back to Opportunities</span>
          </button>
          <span className="text-xs text-[#6E6A8F]">
            Last verified from official source:{' '}
            <strong className="text-[#1E1B3A]">{opp.lastVerifiedAt}</strong>
          </span>
        </div>

        {/* Main Opportunity Detail Card */}
        <div className="su-card p-6 sm:p-8 space-y-6">
          {/* Badges & Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full border ${getTypeBadgeStyle(
                  opp.type
                )}`}
              >
                <span aria-hidden="true">{getTypeIcon(opp.type)}</span>
                <span>{opp.type}</span>
              </span>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full border ${getStatusBadgeStyle(
                  opp.status
                )}`}
              >
                {opp.status}
              </span>
              {hostedOnUnstop && (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]">
                  Hosted on Unstop
                </span>
              )}
              {opp.isRecommended && !opp.isExpired && (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#EEF2FF] text-[#3B5BDB] border border-[#C7D2FE]">
                  ★ Suggested for Your Profile
                </span>
              )}
            </div>
            <span className="text-xs text-[#726E91] font-mono">
              Edition ID: {opp.editionSlug}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E1B3A] tracking-tight">
                {opp.title}
              </h1>
              <p className="text-sm sm:text-base text-[#4F7DF3] font-bold mt-1">
                Organized by {opp.organization}
              </p>
            </div>
            <a
              href={opp.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center justify-center gap-1.5 text-xs font-bold px-5 py-3 rounded-full transition-all shadow-xs shrink-0 self-start sm:self-auto ${
                opp.isExpired
                  ? 'bg-[#F7F5FF] hover:bg-[#ECE8FF] text-[#4B4869] border border-[#DFD9F7]'
                  : 'bg-[#1E1B3A] hover:bg-[#2E2A54] text-white'
              }`}
            >
              <span>{getExternalButtonText(opp, false)}</span>
              <span aria-hidden="true">↗</span>
            </a>
          </div>

          {/* 1. KEY DETAILS SECTION */}
          <section
            aria-labelledby="key-details-heading"
            className="space-y-2.5"
          >
            <h2
              id="key-details-heading"
              className="text-xs font-extrabold uppercase tracking-wider text-[#6E6A8F]"
            >
              Key Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-[#F7F5FF] border border-[#E4DFFA] rounded-2xl p-3.5">
              <div className="p-3 rounded-xl bg-white border border-[#E8E4F8]">
                <span className="text-[11px] uppercase tracking-wider text-[#6E6A8F] font-bold block">
                  Category
                </span>
                <span className="text-sm font-extrabold text-[#1E1B3A] mt-1 flex items-center gap-1.5">
                  <span aria-hidden="true">{getTypeIcon(opp.type)}</span>
                  <span>{opp.type}</span>
                </span>
                <span className="text-[11px] text-[#6E6A8F] mt-0.5 block truncate">
                  {opp.organization}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white border border-[#E8E4F8]">
                <span className="text-[11px] uppercase tracking-wider text-[#6E6A8F] font-bold block">
                  Deadline
                </span>
                <span
                  className={`text-sm font-extrabold mt-1 block ${
                    opp.isExpired ? 'text-[#B91C1C]' : 'text-[#1E1B3A]'
                  }`}
                >
                  {deadlineInfo.text}
                </span>
                {deadlineInfo.subtext && (
                  <span className="text-[11px] text-[#6E6A8F] mt-0.5 block">
                    {deadlineInfo.subtext}
                  </span>
                )}
              </div>

              <div className="p-3 rounded-xl bg-white border border-[#E8E4F8]">
                <span className="text-[11px] uppercase tracking-wider text-[#6E6A8F] font-bold block">
                  Mode / Location
                </span>
                <span className="text-sm font-extrabold text-[#1E1B3A] mt-1 block">
                  {opp.locationMode}
                </span>
                <span className="text-[11px] text-[#6E6A8F] mt-0.5 block">
                  {opp.startDate
                    ? `Starts: ${opp.startDate}`
                    : 'See official schedule'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white border border-[#E8E4F8]">
                <span className="text-[11px] uppercase tracking-wider text-[#6E6A8F] font-bold block">
                  Application Status
                </span>
                <span className="text-sm font-extrabold text-[#1E1B3A] mt-1 block">
                  {opp.status}
                </span>
                <span className="text-[11px] text-[#6E6A8F] mt-0.5 block">
                  Verified: {opp.lastVerifiedAt}
                </span>
              </div>
            </div>
          </section>

          {/* 2. ABOUT THIS OPPORTUNITY SECTION */}
          <section
            aria-labelledby="about-opportunity-heading"
            className="p-5 rounded-2xl bg-[#F7F5FF] border border-[#E4DFFA] space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <h2
                id="about-opportunity-heading"
                className="text-sm sm:text-base font-extrabold text-[#1E1B3A]"
              >
                About This Opportunity
              </h2>
              <span className="text-[11px] font-bold px-3 py-0.5 rounded-full bg-white text-[#4B4869] border border-[#DFD9F7]">
                Quick Overview
              </span>
            </div>

            <p className="text-xs sm:text-sm text-[#1E1B3A] font-medium leading-relaxed">
              {shortAbout}
            </p>

            <ul className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
              {highlights.map((item) => (
                <li
                  key={item.label}
                  className="p-3 rounded-xl bg-white border border-[#E8E4F8] text-xs"
                >
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#4F7DF3] block">
                    {item.label}
                  </span>
                  <span className="text-[#4B4869] font-medium mt-0.5 block leading-snug">
                    {item.value}
                  </span>
                </li>
              ))}
            </ul>

            {opp.description && opp.description.length > shortAbout.length && (
              <div className="pt-1">
                <button
                  type="button"
                  aria-expanded={showFullAbout}
                  aria-controls="about-opportunity-details-panel"
                  onClick={() => setShowFullAbout((prev) => !prev)}
                  className="text-xs font-bold text-[#4F7DF3] hover:text-[#1E1B3A] inline-flex items-center gap-1.5 cursor-pointer rounded px-1 py-0.5"
                >
                  <span>
                    {showFullAbout
                      ? 'Hide full verified description ▲'
                      : 'Read full verified description ▼'}
                  </span>
                </button>
                {showFullAbout && (
                  <div
                    id="about-opportunity-details-panel"
                    role="region"
                    aria-label="Full opportunity description"
                    className="mt-2 p-4 rounded-xl bg-white border border-[#E8E4F8] text-xs sm:text-sm text-[#4B4869] leading-relaxed"
                  >
                    {opp.description}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 3. WHY RECOMMENDED FOR YOU SECTION */}
          <section
            aria-labelledby="why-recommended-heading"
            className="p-5 rounded-2xl bg-[#EEF2FF]/60 border border-[#C7D2FE] space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="why-recommended-heading"
                  className="text-sm sm:text-base font-extrabold text-[#1E1B3A]"
                >
                  Why Recommended for You
                </h2>
                <span className="text-[11px] font-bold px-3 py-0.5 rounded-full bg-white text-[#3B5BDB] border border-[#C7D2FE]">
                  {opp.isRecommended && !opp.isExpired
                    ? '★ Matches Your Profile'
                    : 'Profile Relevance Check'}
                </span>
              </div>
              <span className="text-[11px] text-[#6E6A8F] font-medium">
                Relevance suggestion only — not official eligibility
              </span>
            </div>

            {opp.isRecommended && !opp.isExpired ? (
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  {(opp.matchedKnowsSkills || []).map((skill) => (
                    <span
                      key={`rec-know-${skill}`}
                      className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-[#DCFCE7] text-[#14532D] border border-[#86EFAC] font-bold"
                    >
                      <span aria-hidden="true">✓</span>
                      <span>Knows: {skill}</span>
                    </span>
                  ))}
                  {(opp.matchedLearningSkills || []).map((skill) => (
                    <span
                      key={`rec-learn-${skill}`}
                      className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] font-bold"
                    >
                      <span aria-hidden="true">◐</span>
                      <span>Learning: {skill}</span>
                    </span>
                  ))}
                  {(opp.matchedInterests || []).map((interest) => (
                    <span
                      key={`rec-int-${interest}`}
                      className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-white text-[#3B5BDB] border border-[#C7D2FE] font-bold"
                    >
                      <span aria-hidden="true">✦</span>
                      <span>Interest: {interest}</span>
                    </span>
                  ))}
                </div>
                <p className="text-xs text-[#4B4869]">
                  Suggested because your saved profile aligns with the tags
                  above. Always verify official rules in the Official
                  Eligibility section below.
                </p>
              </div>
            ) : (
              <p className="text-xs text-[#4B4869]">
                {opp.isExpired
                  ? 'This is a past edition whose deadline has passed, so it is not included in active profile recommendations.'
                  : !studentContext.hasSkillsOrInterests
                  ? 'Add skills or career interests in your Profile to see personalized match badges here.'
                  : 'Viewed from Explore All — your current saved profile tags do not directly overlap with this opportunity yet, but you can explore its skills and eligibility below.'}
              </p>
            )}
          </section>

          {/* 4. SKILLS & MY SKILL ANALYSIS SECTION */}
          <section
            aria-labelledby="skill-analysis-heading"
            className="p-5 sm:p-6 rounded-2xl bg-[#F7F5FF] border border-[#DFD9F7] space-y-4"
          >
            {/* Header Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    id="skill-analysis-heading"
                    className="text-base sm:text-lg font-extrabold text-[#1E1B3A] tracking-tight"
                  >
                    Skills &amp; My Skill Analysis
                  </h2>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-0.5 rounded-full bg-white text-[#3B5BDB] border border-[#C7D2FE]">
                    <span aria-hidden="true">✦</span>
                    <span>
                      {skillAnalysis?.analysisType ===
                      'verified_required_skill_alignment'
                        ? 'Verified Required Skills'
                        : skillAnalysis?.analysisType === 'no_skills_specified'
                        ? 'No Technical Skills Listed'
                        : 'Suggested Skill Alignment'}
                    </span>
                  </span>
                </div>
                <p className="text-xs text-[#6E6A8F]">
                  Compared with your saved profile skills — helpful preparation
                  topics, not mandatory eligibility rules.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleRunSkillAnalysis(opp.id)}
                  disabled={analysisLoading}
                  className="text-xs font-bold px-4 py-2 rounded-full bg-[#4F7DF3] hover:bg-[#3B6CE6] disabled:opacity-50 text-white transition-colors cursor-pointer"
                >
                  {analysisLoading ? 'Analyzing...' : 'Refresh Analysis'}
                </button>
                {onNavigateToProfile && (
                  <button
                    type="button"
                    onClick={() =>
                      onNavigateToProfile({
                        opportunityId: opp.id,
                        opportunityTitle: opp.title,
                        targetSkill:
                          selectedBridgeSkill ||
                          skillAnalysis?.missingSkills?.[0] ||
                          null,
                      })
                    }
                    className="text-xs font-bold px-4 py-2 rounded-full bg-white hover:bg-[#EEF2FF] text-[#1E1B3A] border border-[#DFD9F7] transition-colors cursor-pointer"
                  >
                    Update Profile Skills
                  </button>
                )}
              </div>
            </div>

            {analysisLoading ? (
              <div
                role="status"
                aria-live="polite"
                className="py-6 flex items-center justify-center gap-3 text-[#6E6A8F] text-xs font-medium"
              >
                <div className="w-5 h-5 border-2 border-[#4F7DF3] border-t-transparent rounded-full animate-spin" />
                <span>Comparing your saved profile skills...</span>
              </div>
            ) : analysisError ? (
              <div
                role="alert"
                className="p-4 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <p className="text-xs text-[#B91C1C] font-medium">{analysisError}</p>
                <button
                  type="button"
                  onClick={() => handleRunSkillAnalysis(opp.id)}
                  className="text-xs font-bold px-4 py-1.5 rounded-full bg-[#DC2626] hover:bg-[#B91C1C] text-white cursor-pointer"
                >
                  Retry Analysis
                </button>
              </div>
            ) : skillAnalysis ? (
              <div className="space-y-4">
                {/* Compact Visual Overview Strip */}
                {skillAnalysis.analysisType !== 'no_skills_specified' && (
                  <div
                    role="group"
                    aria-label="Skill alignment summary counts"
                    className="grid grid-cols-3 gap-2.5 sm:gap-3"
                  >
                    {/* Tile 1: Known Skills */}
                    <div className="p-3.5 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="w-9 h-9 rounded-xl bg-[#DCFCE7] border border-[#86EFAC] text-[#15803D] font-extrabold text-sm flex items-center justify-center shrink-0"
                      >
                        ✓
                      </span>
                      <div className="min-w-0">
                        <div className="text-lg sm:text-xl font-extrabold text-[#15803D] leading-none">
                          {knownCount}
                        </div>
                        <div className="text-[11px] sm:text-xs font-bold text-[#1E1B3A] truncate mt-1">
                          Known Skills
                        </div>
                        <div className="text-[10px] text-[#6E6A8F] hidden sm:block">
                          Ready in profile
                        </div>
                      </div>
                    </div>

                    {/* Tile 2: Currently Learning */}
                    <div className="p-3.5 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="w-9 h-9 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-[#B45309] font-extrabold text-sm flex items-center justify-center shrink-0"
                      >
                        ◐
                      </span>
                      <div className="min-w-0">
                        <div className="text-lg sm:text-xl font-extrabold text-[#B45309] leading-none">
                          {learningCount}
                        </div>
                        <div className="text-[11px] sm:text-xs font-bold text-[#1E1B3A] truncate mt-1">
                          Currently Learning
                        </div>
                        <div className="text-[10px] text-[#6E6A8F] hidden sm:block">
                          In progress
                        </div>
                      </div>
                    </div>

                    {/* Tile 3: Skills to Develop */}
                    <div className="p-3.5 rounded-2xl bg-white border border-[#C7D2FE] flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="w-9 h-9 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] text-[#3B5BDB] font-extrabold text-sm flex items-center justify-center shrink-0"
                      >
                        +
                      </span>
                      <div className="min-w-0">
                        <div className="text-lg sm:text-xl font-extrabold text-[#3B5BDB] leading-none">
                          {missingCount}
                        </div>
                        <div className="text-[11px] sm:text-xs font-bold text-[#1E1B3A] truncate mt-1">
                          Skills to Develop
                        </div>
                        <div className="text-[10px] text-[#6E6A8F] hidden sm:block">
                          Explore next
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Concise 1-Line Summary Banner */}
                <div className="px-4 py-3 rounded-2xl bg-white border border-[#DFD9F7] flex items-start sm:items-center justify-between gap-3">
                  <p className="text-xs sm:text-sm text-[#1E1B3A] font-semibold leading-snug">
                    {skillAnalysis.conciseSummary || skillAnalysis.summary}
                  </p>
                  {skillAnalysis.studentSkillCount === 0 &&
                    onNavigateToProfile && (
                      <button
                        type="button"
                        onClick={() =>
                          onNavigateToProfile({
                            opportunityId: opp.id,
                            opportunityTitle: opp.title,
                            targetSkill:
                              selectedBridgeSkill ||
                              skillAnalysis?.missingSkills?.[0] ||
                              null,
                          })
                        }
                        className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-[#EEF2FF] hover:bg-[#E0E7FF] text-[#3B5BDB] border border-[#C7D2FE] shrink-0 cursor-pointer"
                      >
                        Add Skills →
                      </button>
                    )}
                </div>

                {/* Three Grouped Skill Chip Cards */}
                {skillAnalysis.analysisType === 'no_skills_specified' ? (
                  <div className="p-4 rounded-2xl bg-white border border-[#E8E4F8] text-xs text-[#4B4869]">
                    No specific technical skills are listed for this
                    opportunity. Check the Official Eligibility checklist below
                    for participation details.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    {/* 1. Known Skills Card */}
                    <div className="p-4 rounded-2xl bg-white border border-[#BBF7D0] flex flex-col justify-between space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span
                              aria-hidden="true"
                              className="text-xs font-extrabold text-[#15803D]"
                            >
                              ✓
                            </span>
                            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#15803D]">
                              Known Skills
                            </h3>
                          </div>
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#14532D] border border-[#86EFAC]">
                            {knownCount}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#6E6A8F]">
                          Marked as{' '}
                          <strong className="text-[#15803D]">Knows</strong> in
                          your profile
                        </p>

                        {knownCount > 0 ? (
                          <div
                            role="list"
                            aria-label="Known skills"
                            className="flex flex-wrap gap-1.5 pt-1"
                          >
                            {skillAnalysis.knownSkills.map((skill) => (
                              <span
                                role="listitem"
                                key={skill}
                                className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-[#DCFCE7] text-[#14532D] border border-[#86EFAC] font-bold"
                              >
                                <span
                                  aria-hidden="true"
                                  className="text-[#15803D] font-extrabold"
                                >
                                  ✓
                                </span>
                                <span>{skill}</span>
                                <span className="sr-only">
                                  (Status: Known in profile)
                                </span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-[#6E6A8F] pt-1">
                            No matching skills marked as Knows yet.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 2. Currently Learning Card */}
                    <div className="p-4 rounded-2xl bg-white border border-[#FDE68A] flex flex-col justify-between space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span
                              aria-hidden="true"
                              className="text-xs font-extrabold text-[#B45309]"
                            >
                              ◐
                            </span>
                            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#B45309]">
                              Currently Learning
                            </h3>
                          </div>
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                            {learningCount}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#6E6A8F]">
                          Marked as{' '}
                          <strong className="text-[#B45309]">Learning</strong>{' '}
                          in your profile
                        </p>

                        {learningCount > 0 ? (
                          <div
                            role="list"
                            aria-label="Currently learning skills"
                            className="flex flex-wrap gap-1.5 pt-1"
                          >
                            {skillAnalysis.learningSkills.map((skill) => (
                              <span
                                role="listitem"
                                key={skill}
                                className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] font-bold"
                              >
                                <span
                                  aria-hidden="true"
                                  className="text-[#B45309] font-extrabold"
                                >
                                  ◐
                                </span>
                                <span>{skill}</span>
                                <span className="sr-only">
                                  (Status: Currently learning)
                                </span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-[#6E6A8F] pt-1">
                            No matching skills marked as Learning right now.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 3. Skills to Develop Card */}
                    <div className="p-4 rounded-2xl bg-white border border-[#C7D2FE] flex flex-col justify-between space-y-3">
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span
                              aria-hidden="true"
                              className="text-xs font-extrabold text-[#3B5BDB]"
                            >
                              +
                            </span>
                            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#3B5BDB]">
                              Skills to Develop
                            </h3>
                          </div>
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#EEF2FF] text-[#3B5BDB] border border-[#C7D2FE]">
                            {missingCount}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#6E6A8F]">
                          {missingCount > 0
                            ? 'Click Learn This Skill on any topic below to bridge your skill gap'
                            : 'Suggested topics to explore or add to your profile'}
                        </p>

                        {missingCount > 0 ? (
                          <div
                            role="list"
                            aria-label="Skills to develop"
                            className="space-y-1.5 pt-1"
                          >
                            {skillAnalysis.missingSkills.map((skill) => {
                              const isSelectedSkill =
                                selectedBridgeSkill === skill;
                              return (
                                <div
                                  role="listitem"
                                  key={skill}
                                  onClick={() => setSelectedBridgeSkill(skill)}
                                  className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border transition-colors ${
                                    isSelectedSkill
                                      ? 'bg-[#EEF2FF] border-[#4F7DF3]'
                                      : 'bg-[#F7F5FF] border-[#E4DFFA] hover:border-[#C7D2FE]'
                                  }`}
                                >
                                  <span className="inline-flex items-center gap-1.5 text-xs text-[#1E1B3A] font-bold min-w-0 truncate">
                                    <span
                                      aria-hidden="true"
                                      className="text-[#4F7DF3] font-extrabold"
                                    >
                                      +
                                    </span>
                                    <span className="truncate">{skill}</span>
                                    <span className="sr-only">
                                      (Status: Suggested skill to develop)
                                    </span>
                                  </span>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleBridgeSkill(skill);
                                    }}
                                    aria-label={`Learn ${skill} for ${opp.title}`}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-full bg-[#4F7DF3] hover:bg-[#3B6CE6] text-white transition-colors shrink-0 cursor-pointer"
                                  >
                                    <span>Learn This Skill</span>
                                    <span aria-hidden="true">→</span>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-[#15803D] font-bold pt-1">
                            ✓ All suggested skills for this opportunity are in
                            your profile — no additional skill gaps identified!
                          </p>
                        )}
                      </div>

                      {missingCount > 0 && (
                        <div className="pt-2.5 border-t border-[#E8E4F8] space-y-2">
                          {missingCount > 1 && (
                            <div className="flex items-center justify-between gap-2">
                              <label
                                htmlFor="bridge-skill-selector"
                                className="text-[11px] text-[#4B4869] font-bold"
                              >
                                Target skill:
                              </label>
                              <select
                                id="bridge-skill-selector"
                                value={
                                  selectedBridgeSkill ||
                                  skillAnalysis.missingSkills[0]
                                }
                                onChange={(e) =>
                                  setSelectedBridgeSkill(e.target.value)
                                }
                                className="px-3 py-1 rounded-full bg-[#F7F5FF] border border-[#DFD9F7] text-xs font-semibold text-[#1E1B3A] cursor-pointer"
                              >
                                {skillAnalysis.missingSkills.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              handleBridgeSkill(
                                selectedBridgeSkill ||
                                  skillAnalysis.missingSkills[0]
                              )
                            }
                            className="w-full py-2.5 px-3 rounded-full bg-[#1E1B3A] hover:bg-[#2E2A54] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span>
                              Bridge My Skill Gap (
                              {selectedBridgeSkill ||
                                skillAnalysis.missingSkills[0]}
                              )
                            </span>
                            <span aria-hidden="true">→</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Expandable Section for Full Skill Comparison Context */}
                <div className="pt-1">
                  <button
                    type="button"
                    aria-expanded={showSkillDetails}
                    aria-controls="skill-analysis-details-panel"
                    onClick={() => setShowSkillDetails((prev) => !prev)}
                    className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-[#EEF2FF]/60 text-xs font-bold text-[#1E1B3A] border border-[#DFD9F7] transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <span aria-hidden="true" className="text-[#4F7DF3]">
                        ℹ
                      </span>
                      <span>
                        Official Focus Areas &amp; Detailed Skill Comparison Notes
                      </span>
                    </span>
                    <span className="text-[#6E6A8F] text-[11px] font-semibold">
                      {showSkillDetails ? 'Hide details ▲' : 'Show details ▼'}
                    </span>
                  </button>

                  {showSkillDetails && (
                    <div
                      id="skill-analysis-details-panel"
                      role="region"
                      aria-label="Detailed skill comparison notes"
                      className="mt-2.5 p-4 rounded-2xl bg-white border border-[#E8E4F8] space-y-3 text-xs text-[#4B4869]"
                    >
                      <div className="space-y-1">
                        <span className="font-bold text-[#1E1B3A] block">
                          Detailed Comparison Summary:
                        </span>
                        <p className="leading-relaxed">
                          {skillAnalysis.summary}
                        </p>
                        <p className="text-[#6E6A8F] leading-relaxed">
                          {skillAnalysis.officialSkillRequirementsNote}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className="p-3 rounded-xl bg-[#F7F5FF] border border-[#E4DFFA] space-y-1.5">
                          <span className="font-bold text-[#1E1B3A] block">
                            Official Focus Areas / Themes (Not Mandatory
                            Prerequisites):
                          </span>
                          {opp.requiredSkills &&
                          opp.requiredSkills.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {opp.requiredSkills.map((focusArea) => (
                                <span
                                  key={focusArea}
                                  className="text-[11px] px-2.5 py-0.5 rounded-full bg-white text-[#1E1B3A] border border-[#DFD9F7] font-semibold"
                                >
                                  {focusArea}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[#6E6A8F]">
                              No specific focus areas listed on the official
                              page.
                            </p>
                          )}
                        </div>

                        <div className="p-3 rounded-xl bg-[#F7F5FF] border border-[#E4DFFA] space-y-1.5">
                          <span className="font-bold text-[#1E1B3A] block">
                            Mandatory Technical Skill Prerequisites:
                          </span>
                          {skillAnalysis.verifiedRequiredSkills &&
                          skillAnalysis.verifiedRequiredSkills.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {skillAnalysis.verifiedRequiredSkills.map(
                                (skill) => (
                                  <span
                                    key={skill}
                                    className="text-[11px] px-2.5 py-0.5 rounded-full bg-white text-[#1E1B3A] border border-[#DFD9F7] font-semibold"
                                  >
                                    {skill}
                                  </span>
                                )
                              )}
                            </div>
                          ) : (
                            <p className="text-[#6E6A8F]">
                              None specified as mandatory on the official source
                              page.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </section>

          {/* 5. OFFICIAL ELIGIBILITY SECTION */}
          <section
            aria-labelledby="official-eligibility-heading"
            className="p-5 sm:p-6 rounded-2xl bg-[#F7F5FF] border border-[#DFD9F7] space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    id="official-eligibility-heading"
                    className="text-base sm:text-lg font-extrabold text-[#1E1B3A] tracking-tight"
                  >
                    Official Eligibility
                  </h2>
                  <span className="inline-flex items-center gap-1 text-[11px] px-3 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] font-bold">
                    <span aria-hidden="true">?</span>
                    <span>Needs Official Confirmation</span>
                  </span>
                </div>
                <p className="text-xs text-[#6E6A8F]">
                  Profile skill alignment does not confirm official eligibility.
                  Check each criterion below and verify on the organizer page.
                </p>
              </div>

              <a
                href={opp.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-full bg-[#15803D] hover:bg-[#166534] text-white transition-all shadow-xs shrink-0"
              >
                <span>Visit Official Opportunity</span>
                <span aria-hidden="true">↗</span>
              </a>
            </div>

            {/* Compact Status Legend & Counts Bar */}
            <div
              role="group"
              aria-label="Eligibility indicator summary"
              className="flex flex-wrap items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-[#E8E4F8] text-xs"
            >
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#6E6A8F] mr-1">
                Checklist Key:
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DCFCE7] text-[#14532D] border border-[#86EFAC] font-bold">
                <span aria-hidden="true" className="font-extrabold">
                  ✓
                </span>
                <span>Matches Profile ({matchesProfileCount})</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA] font-bold">
                <span aria-hidden="true" className="font-extrabold">
                  ✕
                </span>
                <span>Does Not Match ({doesNotMatchCount})</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] font-bold">
                <span aria-hidden="true" className="font-extrabold">
                  ?
                </span>
                <span>Needs Confirmation ({needsConfirmationCount})</span>
              </span>
            </div>

            {/* Individual Eligibility Criteria Rows */}
            <div
              role="list"
              aria-label="Official eligibility criteria"
              className="grid grid-cols-1 md:grid-cols-2 gap-3"
            >
              {criteriaList.map((item) => {
                const visual = getCriterionStatusVisual(item.status);
                return (
                  <div
                    role="listitem"
                    key={item.id}
                    className={`p-4 rounded-2xl border flex flex-col justify-between gap-2.5 ${visual.rowBorderClass}`}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          aria-hidden="true"
                          className={`w-6 h-6 rounded-full border text-xs font-extrabold flex items-center justify-center shrink-0 ${visual.iconBadgeClass}`}
                        >
                          {visual.icon}
                        </span>
                        <h3 className="text-xs sm:text-sm font-extrabold text-[#1E1B3A] leading-snug">
                          {item.title}
                        </h3>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${visual.badgeClass}`}
                      >
                        <span aria-hidden="true">{visual.icon}</span>
                        <span>{item.statusLabel || visual.label}</span>
                      </span>
                    </div>

                    <p className="text-xs text-[#4B4869] leading-relaxed pl-8">
                      {item.detail}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Expandable Full Verified Eligibility Details & Notes */}
            <div className="pt-1">
              <button
                type="button"
                aria-expanded={showFullEligibility}
                aria-controls="official-eligibility-details-panel"
                onClick={() => setShowFullEligibility((prev) => !prev)}
                className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-[#EEF2FF]/60 text-xs font-bold text-[#1E1B3A] border border-[#DFD9F7] transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden="true" className="text-[#15803D]">
                    📋
                  </span>
                  <span>
                    Full Official Eligibility Statement &amp; Verification Notes
                  </span>
                </span>
                <span className="text-[#6E6A8F] text-[11px] font-semibold">
                  {showFullEligibility ? 'Hide full text ▲' : 'Read full text ▼'}
                </span>
              </button>

              {showFullEligibility && (
                <div
                  id="official-eligibility-details-panel"
                  role="region"
                  aria-label="Full official eligibility statement and notes"
                  className="mt-2.5 p-4 rounded-2xl bg-white border border-[#E8E4F8] space-y-3"
                >
                  <div className="space-y-1">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#6E6A8F]">
                      Verified Eligibility Conditions from Official Source:
                    </h3>
                    <p className="text-xs sm:text-sm text-[#1E1B3A] leading-relaxed">
                      {eligibilityText}
                    </p>
                  </div>

                  {skillAnalysis?.officialEligibility?.notes &&
                    skillAnalysis.officialEligibility.notes.length > 0 && (
                      <div className="space-y-1 pt-2 border-t border-[#E8E4F8]">
                        <h4 className="text-xs font-bold text-[#1E1B3A]">
                          Verification Notes:
                        </h4>
                        <ul className="text-xs text-[#6E6A8F] space-y-1 list-disc list-inside">
                          {skillAnalysis.officialEligibility.notes.map(
                            (note, idx) => (
                              <li key={idx}>{note}</li>
                            )
                          )}
                        </ul>
                      </div>
                    )}
                </div>
              )}
            </div>
          </section>

          {/* 6. VISIT OFFICIAL PAGE / APPLY SECTION */}
          <section
            aria-labelledby="apply-section-heading"
            className="p-5 rounded-2xl bg-[#F7F5FF] border border-[#E4DFFA] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="apply-section-heading"
                  className="text-sm sm:text-base font-extrabold text-[#1E1B3A]"
                >
                  Visit Official Page / Apply
                </h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white text-[#4B4869] border border-[#DFD9F7]">
                  {hostedOnUnstop ? 'Official Unstop Listing' : 'Official Organizer Portal'}
                </span>
              </div>
              <p className="text-xs text-[#4B4869]">
                {hostedOnUnstop
                  ? 'Submit your application directly on the official Unstop opportunity page.'
                  : 'Submit your application and confirm final rules directly on the organizer website.'}
              </p>
              <p className="text-xs text-[#726E91] font-mono truncate max-w-lg">
                {opp.sourceUrl}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <a
                href={opp.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-bold px-6 py-3 rounded-full transition-all shadow-xs ${
                  opp.isExpired
                    ? 'bg-white hover:bg-[#ECE8FF] text-[#4B4869] border border-[#DFD9F7]'
                    : 'bg-[#4F7DF3] hover:bg-[#3B6CE6] text-white'
                }`}
              >
                <span>{getExternalButtonText(opp, false)}</span>
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          </section>
        </div>
      </div>
    );
  }

  // ============================================================================
  // MAIN LIST VIEW (Screenshot 5 inspired cards, filter pills, and Unstop links)
  // ============================================================================
  const renderOpportunityCard = (opp, isRecommendedCard = false) => {
    const deadlineInfo = formatDeadlineInfo(opp);
    const hostedOnUnstop = isUnstopOpportunity(opp);
    const shortSummary = getConciseOpportunitySummary(opp);
    const matchedKnows = opp.matchedKnowsSkills || [];
    const matchedLearning = opp.matchedLearningSkills || [];
    const matchedInterests = opp.matchedInterests || [];
    const suggestedList = opp.suggestedSkills || [];
    const focusList = opp.requiredSkills || [];

    return (
      <article
        key={`${isRecommendedCard ? 'rec' : 'all'}-${opp.id}`}
        className={`p-5 sm:p-6 flex flex-col justify-between transition-all ${
          opp.isExpired
            ? 'su-card opacity-75 bg-white/80'
            : 'su-card-interactive'
        }`}
      >
        <div className="space-y-3.5">
          {/* 1. Category, Status & Platform Badges */}
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-bold px-3 py-0.5 rounded-full border ${getTypeBadgeStyle(
                  opp.type
                )}`}
              >
                <span aria-hidden="true">{getTypeIcon(opp.type)}</span>
                <span>{opp.type}</span>
              </span>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadgeStyle(
                  opp.status
                )}`}
              >
                {opp.status}
              </span>
              {hostedOnUnstop && (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]">
                  Unstop
                </span>
              )}
            </div>
            {opp.isRecommended && !opp.isExpired && (
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#EEF2FF] text-[#3B5BDB] border border-[#C7D2FE]">
                ★ Recommended
              </span>
            )}
          </div>

          {/* 2. Title & Organization • Mode */}
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-[#1E1B3A] leading-snug">
              {opp.title}
            </h3>
            <p className="text-xs text-[#6E6A8F] font-semibold mt-1">
              {opp.organization} • {opp.locationMode}
            </p>
          </div>

          {/* 3. Short 1–2 Line Summary */}
          <p className="text-xs text-[#4B4869] line-clamp-2 leading-relaxed">
            {shortSummary}
          </p>

          {/* 4. Compact Recommendation Chips (Distinct from Official Eligibility) */}
          {opp.isRecommended && !opp.isExpired && (
            <div className="px-3 py-2 rounded-2xl bg-[#F7F5FF] border border-[#E4DFFA] flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#3B5BDB] mr-0.5">
                ★ Profile Match:
              </span>
              {matchedKnows.slice(0, 3).map((s) => (
                <span
                  key={`card-know-${s}`}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#14532D] border border-[#86EFAC] font-bold"
                >
                  ✓ {s}
                </span>
              ))}
              {matchedLearning.slice(0, 2).map((s) => (
                <span
                  key={`card-learn-${s}`}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] font-bold"
                >
                  ◐ {s}
                </span>
              ))}
              {matchedKnows.length === 0 &&
                matchedLearning.length === 0 &&
                matchedInterests.slice(0, 2).map((intItem) => (
                  <span
                    key={`card-int-${intItem}`}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-[#EEF2FF] text-[#3B5BDB] border border-[#C7D2FE] font-bold"
                  >
                    ✦ {intItem}
                  </span>
                ))}
            </div>
          )}

          {/* 5. Key Skills as Chips (Screenshot 5 pastel skill pills) */}
          <div className="space-y-2 pt-0.5">
            <div className="flex flex-wrap gap-1.5">
              {suggestedList.slice(0, 4).map((skill) => {
                const matchType = getStudentSkillBadge(skill, opp);
                return (
                  <span
                    key={skill}
                    className={`text-[11px] px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1 font-semibold ${
                      matchType === 'knows'
                        ? 'bg-[#DCFCE7] text-[#14532D] border-[#86EFAC]'
                        : matchType === 'learning'
                        ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]'
                        : 'bg-[#EEF2FF] text-[#3B5BDB] border-[#C7D2FE]'
                    }`}
                  >
                    {matchType === 'knows' && (
                      <span aria-hidden="true" className="text-[#15803D]">
                        ✓
                      </span>
                    )}
                    {matchType === 'learning' && (
                      <span aria-hidden="true" className="text-[#B45309]">
                        ◐
                      </span>
                    )}
                    <span>{skill}</span>
                  </span>
                );
              })}
              {suggestedList.length > 4 && (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#F7F5FF] text-[#6E6A8F] border border-[#E4DFFA] font-semibold">
                  +{suggestedList.length - 4} more
                </span>
              )}
            </div>

            {focusList.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[10px] uppercase tracking-wider text-[#726E91] font-bold">
                  Focus:
                </span>
                {focusList.slice(0, 2).map((focus) => (
                  <span
                    key={focus}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-[#F7F5FF] text-[#4B4869] border border-[#E4DFFA] font-medium"
                  >
                    {focus}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 6. Footer Row: Verified Deadline + View Details + External Link (Screenshot 5 style) */}
        <div className="mt-5 pt-3.5 border-t border-[#E8E4F8] flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs min-w-0">
            <span className="text-[#726E91] block text-[10px] font-bold uppercase tracking-wider">
              Deadline
            </span>
            <span
              className={`font-bold truncate block ${
                opp.isExpired ? 'text-[#B91C1C]' : 'text-[#1E1B3A]'
              }`}
            >
              {deadlineInfo.shortText}
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => handleOpenDetails(opp)}
              className="text-xs font-bold px-3.5 py-2 rounded-full bg-[#F7F5FF] hover:bg-[#EEF2FF] text-[#1E1B3A] border border-[#DFD9F7] transition-colors cursor-pointer"
            >
              View Details
            </button>
            <a
              href={opp.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold px-3.5 py-2 rounded-full bg-[#4F7DF3] hover:bg-[#3B6CE6] text-white transition-colors inline-flex items-center gap-1 shrink-0 shadow-2xs"
            >
              <span>{getExternalButtonText(opp, true)}</span>
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="space-y-8">
      {/* Page Hero & Filter Bar (Screenshot 5 inspired) */}
      <div className="su-card p-6 sm:p-8 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#4F7DF3] block">
              Matched to Your Profile
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-[#1E1B3A] tracking-tight">
              Opportunities
            </h1>
            <p className="text-sm text-[#4B4869]">
              Internships, hackathons, competitions, and workshops curated around your current skills and growth goals.
            </p>
          </div>

          {/* Section Switcher */}
          <div className="flex items-center bg-[#F7F5FF] border border-[#E4DFFA] rounded-full p-1 self-start">
            <button
              type="button"
              onClick={() => setActiveSection('all')}
              className={`text-xs px-4 py-2 rounded-full font-bold transition-all cursor-pointer ${
                activeSection === 'all'
                  ? 'bg-[#4F7DF3] text-white shadow-xs'
                  : 'text-[#5A567A] hover:text-[#1E1B3A]'
              }`}
            >
              Recommended + All
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('recommended')}
              className={`text-xs px-4 py-2 rounded-full font-bold transition-all cursor-pointer ${
                activeSection === 'recommended'
                  ? 'bg-[#4F7DF3] text-white shadow-xs'
                  : 'text-[#5A567A] hover:text-[#1E1B3A]'
              }`}
            >
              Recommended ({recommendedOpportunities.length})
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-4 border-t border-[#E8E4F8]">
          {/* Category Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {CATEGORY_OPTIONS.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setSelectedCategory(cat.value)}
                className={`text-xs px-4 py-2 rounded-full font-bold border transition-all cursor-pointer ${
                  selectedCategory === cat.value
                    ? 'bg-[#4F7DF3] text-white border-[#4F7DF3] shadow-xs'
                    : 'bg-white text-[#4B4869] border-[#E4DFFA] hover:border-[#C7D2FE] hover:text-[#1E1B3A]'
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
                aria-label="Search opportunities by title, organizer, or skill"
                className="w-full text-xs bg-[#F7F5FF] border border-[#DFD9F7] focus:bg-white focus:border-[#4F7DF3] rounded-full px-4 py-2.5 text-[#1E1B3A] placeholder-[#9490B5]"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#6E6A8F] hover:text-[#1E1B3A] cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-[#4B4869] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showExpired}
                onChange={(e) => setShowExpired(e.target.checked)}
                className="rounded border-[#C7D2FE] accent-[#4F7DF3]"
              />
              <span>Show past editions</span>
            </label>
          </div>
        </div>
      </div>

      {/* Loading or Error States */}
      {loading ? (
        <div className="su-card p-12 flex flex-col items-center justify-center text-[#5A567A]">
          <div className="w-9 h-9 border-4 border-[#4F7DF3] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm font-semibold text-[#1E1B3A]">
            Loading verified opportunities...
          </p>
        </div>
      ) : error ? (
        <div className="su-card border-[#FECACA] p-6 text-center space-y-3">
          <p className="text-sm text-[#B91C1C] font-semibold">{error}</p>
          <button
            type="button"
            onClick={fetchAllOpportunities}
            className="text-xs px-5 py-2.5 rounded-full bg-[#4F7DF3] hover:bg-[#3B6CE6] text-white font-bold cursor-pointer"
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
                <h2 className="text-lg font-extrabold text-[#1E1B3A] flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4F7DF3]" />
                  <span>Recommended for You</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#EEF2FF] text-[#3B5BDB] border border-[#C7D2FE]">
                    {recommendedOpportunities.length}
                  </span>
                </h2>
                <p className="text-xs text-[#6E6A8F] mt-0.5">
                  Matched to your saved skills &amp; interests — profile relevance only, not official eligibility.
                </p>
              </div>
              {onNavigateToProfile && (
                <button
                  type="button"
                  onClick={onNavigateToProfile}
                  className="text-xs text-[#4F7DF3] hover:text-[#3B6CE6] font-bold self-start sm:self-auto cursor-pointer"
                >
                  Update Profile Skills →
                </button>
              )}
            </div>

            {!studentContext.hasSkillsOrInterests ? (
              <div className="su-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-extrabold text-[#1E1B3A]">
                    Add skills or interests for personalized recommendations
                  </h3>
                  <p className="text-xs text-[#6E6A8F]">
                    Save skills you know or are learning in your Profile to highlight matching opportunities here.
                  </p>
                </div>
                {onNavigateToProfile && (
                  <button
                    type="button"
                    onClick={onNavigateToProfile}
                    className="text-xs font-bold px-5 py-2.5 rounded-full bg-[#4F7DF3] hover:bg-[#3B6CE6] text-white shrink-0 cursor-pointer"
                  >
                    Go to My Profile
                  </button>
                )}
              </div>
            ) : recommendedOpportunities.length === 0 ? (
              <div className="su-card p-6 text-center space-y-1.5">
                <p className="text-sm text-[#1E1B3A] font-bold">
                  No recommended opportunities match the current filter.
                </p>
                <p className="text-xs text-[#6E6A8F]">
                  Switch to &ldquo;All Types&rdquo; or clear the search box to see more.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {recommendedOpportunities.map((opp) =>
                  renderOpportunityCard(opp, true)
                )}
              </div>
            )}
          </section>

          {/* SECTION 2: EXPLORE ALL VERIFIED OPPORTUNITIES */}
          {activeSection === 'all' && (
            <section className="space-y-4 pt-4 border-t border-[#E4DFFA]">
              <div>
                <h2 className="text-lg font-extrabold text-[#1E1B3A] flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
                  <span>Explore All Opportunities</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-white text-[#4B4869] border border-[#DFD9F7]">
                    {filteredOpportunities.length}
                  </span>
                </h2>
                <p className="text-xs text-[#6E6A8F] mt-0.5">
                  Individually verified event editions and technical programs with official links.
                </p>
              </div>

              {filteredOpportunities.length === 0 ? (
                <div className="su-card p-8 text-center space-y-3">
                  <p className="text-sm text-[#1E1B3A] font-bold">
                    No opportunities match your current search or filter.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('All');
                      setSearchTerm('');
                      setShowExpired(true);
                    }}
                    className="text-xs px-5 py-2 rounded-full bg-[#4F7DF3] hover:bg-[#3B6CE6] text-white font-bold cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredOpportunities.map((opp) =>
                    renderOpportunityCard(opp, false)
                  )}
                </div>
              )}
            </section>
          )}

          {/* SECTION 3: EXPLORE PLATFORMS (General Discovery Portals Kept Separate) */}
          {explorePlatforms.length > 0 && (
            <section className="space-y-4 pt-6 border-t border-[#E4DFFA]">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-extrabold text-[#1E1B3A]">
                    Explore General Discovery Platforms
                  </h2>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white text-[#6E6A8F] border border-[#DFD9F7]">
                    External Directories
                  </span>
                </div>
                <p className="text-xs text-[#6E6A8F] mt-0.5">
                  Browse broader directories for additional hackathons, internships, and competitions.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {explorePlatforms.map((platform) => {
                  const isUnstopPlatform =
                    platform.id === 'platform-unstop' ||
                    platform.name === 'Unstop';
                  const ctaText =
                    platform.buttonLabel ||
                    (isUnstopPlatform ? 'Explore Unstop' : 'Visit Directory');

                  return (
                    <a
                      key={platform.id}
                      href={platform.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`p-5 flex flex-col justify-between transition-all group ${
                        isUnstopPlatform ? 'su-hero-mint' : 'su-card-interactive'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white text-[#3B5BDB] border border-[#C7D2FE] inline-block">
                            {platform.category}
                          </span>
                          <span className="text-[11px] text-[#726E91] font-mono truncate max-w-[160px]">
                            {platform.url}
                          </span>
                        </div>
                        <h3 className="text-sm font-extrabold text-[#1E1B3A] group-hover:text-[#4F7DF3] transition-colors">
                          {platform.name}
                        </h3>
                        <p className="text-xs text-[#4B4869] line-clamp-2 leading-relaxed">
                          {platform.description}
                        </p>
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-[#E8E4F8] flex items-center justify-between text-xs text-[#4F7DF3] font-bold">
                        <span>{ctaText}</span>
                        <span aria-hidden="true">↗</span>
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
