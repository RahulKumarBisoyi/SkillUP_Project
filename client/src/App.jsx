import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { checkHealth } from './services/api';
import { scrollToTop } from './utils/scroll';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import DashboardView from './components/dashboard/DashboardView';
import ProfileView from './components/profile/ProfileView';
import LearnView from './components/learn/LearnView';
import TracksView from './components/tracks/TracksView';
import OpportunitiesView from './components/opportunities/OpportunitiesView';

function NavIcon({ name, active }) {
  const strokeColor = active ? '#1E1B3A' : '#6E6A8F';
  switch (name) {
    case 'dashboard':
      return (
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case 'learn':
      return (
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      );
    case 'tracks':
      return (
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      );
    case 'opportunities':
      return (
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      );
    case 'profile':
      return (
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    default:
      return null;
  }
}

function AppContent() {
  const { user, loading: authLoading, logout } = useAuth();
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'learn' | 'tracks' | 'opportunities' | 'profile'
  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState(null);
  const [bridgeContext, setBridgeContext] = useState(null);
  const [profileReturnContext, setProfileReturnContext] = useState(null);
  const [profileNotification, setProfileNotification] = useState(null);

  const showTimedNotification = (message) => {
    setProfileNotification(message);
    setTimeout(() => {
      setProfileNotification(null);
    }, 5000);
  };

  const handleProfileSaveSuccess = () => {
    if (profileReturnContext?.opportunityId) {
      const returnOppId = profileReturnContext.opportunityId;
      setProfileReturnContext(null);
      setSelectedOpportunityId(returnOppId);
      setActiveTab('opportunities');
      showTimedNotification(
        'Profile and skills saved! Returning to opportunity and refreshing your skill gap analysis.'
      );
      return;
    }

    setActiveTab('learn');
    showTimedNotification(
      'Profile and skills saved successfully! Ready to discover learning resources.'
    );
  };

  const handleTrackCreated = (newTrackId) => {
    setSelectedTrackId(newTrackId);
    setActiveTab('tracks');
    showTimedNotification(
      'Learning track saved! You can now track your daily tasks.'
    );
  };

  const handleOpenTrack = (trackId) => {
    setSelectedTrackId(trackId || null);
    setActiveTab('tracks');
  };

  const handleStartBridgeSkillGap = (context) => {
    setBridgeContext(context || null);
    setActiveTab('learn');
  };

  const handleReturnToOpportunity = (opportunityId) => {
    if (opportunityId) {
      setSelectedOpportunityId(opportunityId);
    }
    setActiveTab('opportunities');
  };

  const handleNavigateToProfile = (context = null) => {
    if (context && (context.opportunityId || context.targetSkill)) {
      setProfileReturnContext({
        opportunityId: context.opportunityId || null,
        opportunityTitle: context.opportunityTitle || null,
        targetSkill: context.targetSkill || null,
      });
    } else {
      setProfileReturnContext(null);
    }
    setActiveTab('profile');
  };

  const handleNavigateTab = (tab) => {
    if (tab === 'tracks') {
      setSelectedTrackId(null);
    } else if (tab === 'opportunities') {
      setSelectedOpportunityId(null);
    } else if (tab === 'profile') {
      setProfileReturnContext(null);
    }
    setActiveTab(tab);
  };

  // Backend Health check status
  const [healthStatus, setHealthStatus] = useState({
    loading: true,
    data: null,
    error: null,
  });

  const testBackendConnection = async () => {
    setHealthStatus({ loading: true, data: null, error: null });
    try {
      const result = await checkHealth();
      setHealthStatus({ loading: false, data: result, error: null });
    } catch (err) {
      setHealthStatus({
        loading: false,
        data: null,
        error: err.message || 'Failed to connect to backend',
      });
    }
  };

  useEffect(() => {
    testBackendConnection();
  }, []);

  // Ensure Dashboard opens as the primary landing page when a user logs in
  useEffect(() => {
    if (!user) {
      setActiveTab('dashboard');
      setSelectedTrackId(null);
      setSelectedOpportunityId(null);
      setBridgeContext(null);
      setProfileReturnContext(null);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      scrollToTop();
    }
  }, [activeTab, authMode, authLoading]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', srExtra: '' },
    { id: 'learn', label: 'Learn', srExtra: ' Discover Resources' },
    { id: 'tracks', label: 'My Tracks', srExtra: '' },
    { id: 'opportunities', label: 'Opportunities', srExtra: '' },
    { id: 'profile', label: 'Profile', srExtra: ' My Profile & Skills' },
  ];

  // Contextual sidebar callout using real state (never fabricated stats)
  const sidebarCallout = bridgeContext?.targetSkill
    ? {
        eyebrow: 'SKILL GAP FOCUS',
        title: `Bridge ${bridgeContext.targetSkill}`,
        body: bridgeContext.opportunityTitle
          ? `Preparing for ${bridgeContext.opportunityTitle} with a focused learning track.`
          : `Find a curated YouTube course and generate your daily practice plan.`,
        ctaLabel: 'Continue in Learn',
        onClick: () => handleNavigateTab('learn'),
      }
    : activeTab === 'opportunities'
    ? {
        eyebrow: 'SKILL GAP BRIDGE',
        title: 'Spot a missing skill?',
        body: 'Analyze any opportunity against your profile and launch a tailored learning track.',
        ctaLabel: 'Update my skills',
        onClick: () => handleNavigateTab('profile'),
      }
    : {
        eyebrow: 'CAREER READINESS',
        title: 'Match skills to real opportunities',
        body: 'Compare your current stack with verified hackathons, internships, and workshops.',
        ctaLabel: 'Explore opportunities',
        onClick: () => handleNavigateTab('opportunities'),
      };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F3F0FF] flex flex-col items-center justify-center p-8 text-[#4B4869]">
        <div className="w-10 h-10 border-4 border-[#4F7DF3] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-[#1E1B3A]">Initializing your SkillUP workspace...</p>
      </div>
    );
  }

  // Logged-out view
  if (!user) {
    return (
      <div className="min-h-screen bg-[#F3F0FF] text-[#1E1B3A] flex flex-col justify-between overflow-x-hidden">
        <header className="border-b border-[#E4DFFA] bg-white/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#BCEAD5] text-[#14532D] font-extrabold text-xs flex items-center justify-center shadow-xs">
                SU
              </div>
              <div>
                <span className="text-lg font-extrabold tracking-tight text-[#1E1B3A] block leading-none">
                  SkillUP
                </span>
                <span className="text-[11px] text-[#726E91] font-medium">
                  Grow your stack
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={testBackendConnection}
                title="Click to re-test backend health"
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F7F5FF] border border-[#E4DFFA] text-xs cursor-pointer hover:border-[#C7D2FE] transition-colors"
              >
                <span className="relative flex h-2 w-2">
                  {healthStatus.loading ? (
                    <span className="animate-pulse inline-flex rounded-full h-2 w-2 bg-amber-500" />
                  ) : healthStatus.data ? (
                    <span className="inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  ) : (
                    <span className="inline-flex rounded-full h-2 w-2 bg-rose-500" />
                  )}
                </span>
                <span className="text-[#4B4869] font-medium">
                  {healthStatus.loading
                    ? 'Checking API...'
                    : healthStatus.data
                    ? 'API Online'
                    : 'API Offline'}
                </span>
              </button>

              <div className="flex items-center bg-[#F3F0FF] border border-[#E4DFFA] p-1 rounded-full gap-1">
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className={`text-xs px-4 py-1.5 rounded-full font-semibold transition-all cursor-pointer ${
                    authMode === 'login'
                      ? 'bg-[#4F7DF3] text-white shadow-xs'
                      : 'text-[#4B4869] hover:text-[#1E1B3A]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className={`text-xs px-4 py-1.5 rounded-full font-semibold transition-all cursor-pointer ${
                    authMode === 'register'
                      ? 'bg-[#4F7DF3] text-white shadow-xs'
                      : 'text-[#4B4869] hover:text-[#1E1B3A]'
                  }`}
                >
                  Sign Up
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-10 flex flex-col justify-center">
          <div className="space-y-6 max-w-md mx-auto w-full">
            <div className="text-center space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E5E9FF] text-[#3B5BDB] text-[11px] font-bold tracking-wider">
                SkillUp Student Portal
              </span>
              <h1 className="text-3xl font-extrabold text-[#1E1B3A] tracking-tight">
                Build skills that unlock real opportunities
              </h1>
              <p className="text-sm text-[#4B4869] leading-relaxed">
                Discover curated YouTube courses, follow structured daily learning tracks, and match your engineering profile with verified hackathons and internships.
              </p>
            </div>

            {authMode === 'login' ? (
              <LoginForm onSwitchToRegister={() => setAuthMode('register')} />
            ) : (
              <RegisterForm onSwitchToLogin={() => setAuthMode('login')} />
            )}
          </div>
        </main>

        <footer className="border-t border-[#E4DFFA] bg-white/60 py-5 px-4">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#726E91]">
            <div>
              <span className="font-bold text-[#1E1B3A]">SkillUP</span> — Personalized Learning &amp; Opportunity Discovery
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="bg-[#EEF2FF] text-[#4338CA] px-2.5 py-0.5 rounded-full font-semibold">Learn</span>
              <span className="text-[#A5A1C2]">→</span>
              <span className="bg-[#EEF2FF] text-[#4338CA] px-2.5 py-0.5 rounded-full font-semibold">Track</span>
              <span className="text-[#A5A1C2]">→</span>
              <span className="bg-[#EEF2FF] text-[#4338CA] px-2.5 py-0.5 rounded-full font-semibold">Discover</span>
              <span className="text-[#A5A1C2]">→</span>
              <span className="bg-[#DCFCE7] text-[#15803D] px-2.5 py-0.5 rounded-full font-semibold">Bridge</span>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Authenticated App Shell (Desktop Left Sidebar + Mobile Bottom Navigation)
  return (
    <div className="min-h-screen bg-[#F3F0FF] text-[#1E1B3A] flex flex-col lg:flex-row overflow-x-hidden">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:justify-between border-r border-[#E4DFFA] bg-[#F7F5FF]/90 backdrop-blur-md p-5 sticky top-0 h-screen">
        <div className="space-y-7">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 px-2 pt-1">
            <div className="w-10 h-10 rounded-full bg-[#BCEAD5] text-[#14532D] font-extrabold text-xs flex items-center justify-center shadow-xs shrink-0">
              SU
            </div>
            <div className="min-w-0">
              <span className="text-lg font-extrabold tracking-tight text-[#1E1B3A] block leading-tight">
                SkillUP
              </span>
              <span className="text-xs text-[#726E91] font-medium block truncate">
                Grow your stack
              </span>
            </div>
          </div>

          {/* Primary Sidebar Navigation */}
          <nav aria-label="Main navigation" className="space-y-1.5">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigateTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm transition-all cursor-pointer text-left ${
                    isActive
                      ? 'bg-[#E2E8FF] text-[#1E1B3A] font-bold shadow-2xs'
                      : 'text-[#5A567A] hover:bg-[#ECE8FF]/70 hover:text-[#1E1B3A] font-medium'
                  }`}
                >
                  <NavIcon name={item.id} active={isActive} />
                  <span>{item.label}</span>
                  {item.srExtra && <span className="sr-only">{item.srExtra}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Contextual Callout Card */}
        <div className="bg-[#1E1B3A] text-white rounded-3xl p-5 shadow-md space-y-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#93C5FD] block">
            {sidebarCallout.eyebrow}
          </span>
          <h3 className="text-sm font-bold text-white leading-snug">
            {sidebarCallout.title}
          </h3>
          <p className="text-xs text-[#CBD5E1] leading-relaxed">
            {sidebarCallout.body}
          </p>
          <button
            type="button"
            onClick={sidebarCallout.onClick}
            className="w-full py-2.5 px-4 rounded-full bg-[#4F7DF3] hover:bg-[#3B6CE6] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            {sidebarCallout.ctaLabel}
          </button>
        </div>
      </aside>

      {/* Main Content Column */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        {/* Top Utility Header */}
        <header className="sticky top-0 z-40 bg-[#F3F0FF]/85 backdrop-blur-md border-b border-[#E4DFFA]/80 px-4 sm:px-8 py-3.5">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
            {/* Mobile Brand Header */}
            <div className="flex lg:hidden items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#BCEAD5] text-[#14532D] font-extrabold text-xs flex items-center justify-center">
                SU
              </div>
              <div>
                <span className="text-base font-extrabold tracking-tight text-[#1E1B3A] block leading-none">
                  SkillUP
                </span>
                <span className="text-[10px] text-[#726E91] font-medium block">
                  Grow your stack
                </span>
              </div>
            </div>

            {/* Desktop subtle breadcrumb / student greeting */}
            <div className="hidden lg:flex items-center gap-2 text-xs text-[#5A567A]">
              <span className="inline-block w-2 h-2 rounded-full bg-[#10B981]" />
              <span>Signed in as</span>
              <strong className="text-[#1E1B3A] font-semibold">{user.name}</strong>
              <span className="text-[#9490B5]">({user.email})</span>
            </div>

            {/* Right Utility Controls */}
            <div className="flex items-center gap-2.5 sm:gap-3 ml-auto">
              <button
                type="button"
                onClick={testBackendConnection}
                title="Click to re-test backend health"
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#E4DFFA] text-xs cursor-pointer hover:border-[#C7D2FE] transition-colors shadow-2xs"
              >
                <span className="relative flex h-2 w-2">
                  {healthStatus.loading ? (
                    <span className="animate-pulse inline-flex rounded-full h-2 w-2 bg-amber-500" />
                  ) : healthStatus.data ? (
                    <span className="inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  ) : (
                    <span className="inline-flex rounded-full h-2 w-2 bg-rose-500" />
                  )}
                </span>
                <span className="text-[#4B4869] font-medium">
                  {healthStatus.loading
                    ? 'Checking API...'
                    : healthStatus.data
                    ? 'API Online'
                    : 'API Offline'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleNavigateTab('learn')}
                className="px-4 py-2 rounded-full bg-[#4F7DF3] hover:bg-[#3B6CE6] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>Start learning</span>
                <span aria-hidden="true">→</span>
              </button>

              <button
                type="button"
                onClick={logout}
                className="px-3.5 py-2 rounded-full bg-white hover:bg-[#F7F5FF] border border-[#E4DFFA] text-[#1E1B3A] text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        {/* Main View Area (pb-24 on mobile so fixed bottom nav never covers content) */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 pt-6 pb-24 lg:pb-12">
          <div className="space-y-6 w-full">
            {profileNotification && (
              <div
                role="status"
                className="p-4 rounded-2xl bg-[#E6F7F0] border border-[#A7F3D0] text-[#14532D] text-sm flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] shrink-0" />
                  <span className="font-medium">{profileNotification}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setProfileNotification(null)}
                  aria-label="Dismiss notification"
                  className="text-[#15803D] hover:text-[#14532D] font-bold ml-3 text-xs cursor-pointer px-2 py-1 rounded-lg"
                >
                  ✕
                </button>
              </div>
            )}

            {activeTab === 'dashboard' ? (
              <DashboardView
                onNavigateTab={handleNavigateTab}
                onOpenTrack={handleOpenTrack}
                onOpenOpportunity={handleReturnToOpportunity}
                onNavigateToProfile={handleNavigateToProfile}
              />
            ) : activeTab === 'learn' ? (
              <LearnView
                onTrackCreated={handleTrackCreated}
                bridgeContext={bridgeContext}
                onReturnToOpportunity={handleReturnToOpportunity}
                onClearBridgeContext={() => setBridgeContext(null)}
              />
            ) : activeTab === 'tracks' ? (
              <TracksView
                initialTrackId={selectedTrackId}
                onClearInitialTrack={() => setSelectedTrackId(null)}
                onNavigateToLearn={() => setActiveTab('learn')}
                onViewOpportunity={handleReturnToOpportunity}
                onUpdateProfileSkills={handleNavigateToProfile}
              />
            ) : activeTab === 'opportunities' ? (
              <OpportunitiesView
                onNavigateToProfile={handleNavigateToProfile}
                onStartBridgeSkillGap={handleStartBridgeSkillGap}
                initialOpportunityId={selectedOpportunityId}
                onClearInitialOpportunity={() => setSelectedOpportunityId(null)}
              />
            ) : (
              <ProfileView
                onSaveSuccess={handleProfileSaveSuccess}
                bridgeProfileContext={profileReturnContext}
                onReturnToOpportunity={handleReturnToOpportunity}
              />
            )}
          </div>
        </main>

        {/* Desktop Footer */}
        <footer className="hidden lg:block border-t border-[#E4DFFA] bg-white/50 py-4 px-8">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 text-xs text-[#726E91]">
            <div>
              <span className="font-bold text-[#1E1B3A]">SkillUP</span> — Personalized Learning &amp; Opportunity Discovery
            </div>
            <div className="flex items-center gap-1.5">
              <span className="bg-[#EEF2FF] text-[#4338CA] px-2.5 py-0.5 rounded-full font-semibold">Learn</span>
              <span className="text-[#A5A1C2]">→</span>
              <span className="bg-[#EEF2FF] text-[#4338CA] px-2.5 py-0.5 rounded-full font-semibold">Track</span>
              <span className="text-[#A5A1C2]">→</span>
              <span className="bg-[#EEF2FF] text-[#4338CA] px-2.5 py-0.5 rounded-full font-semibold">Discover</span>
              <span className="text-[#A5A1C2]">→</span>
              <span className="bg-[#DCFCE7] text-[#15803D] px-2.5 py-0.5 rounded-full font-semibold">Bridge</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Mobile & Tablet Fixed Bottom Navigation Bar (< lg) */}
      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-[#E4DFFA] px-2 py-1.5 shadow-[0_-4px_20px_rgba(30,27,58,0.06)]"
      >
        <div className="max-w-md mx-auto grid grid-cols-5 gap-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigateTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-[11px] transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#EEF2FF] text-[#1E1B3A] font-bold'
                    : 'text-[#6E6A8F] hover:text-[#1E1B3A] font-medium'
                }`}
              >
                <NavIcon name={item.id} active={isActive} />
                <span className="truncate max-w-full">
                  {item.label}
                  {item.srExtra ? <span className="sr-only">{item.srExtra}</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
