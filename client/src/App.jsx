import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { checkHealth } from './services/api';
import { scrollToTop } from './utils/scroll';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import ProfileView from './components/profile/ProfileView';
import LearnView from './components/learn/LearnView';
import TracksView from './components/tracks/TracksView';
import OpportunitiesView from './components/opportunities/OpportunitiesView';

function AppContent() {
  const { user, loading: authLoading, logout } = useAuth();
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [activeTab, setActiveTab] = useState('learn'); // 'learn' | 'tracks' | 'opportunities' | 'profile'
  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [profileNotification, setProfileNotification] = useState(null);

  const handleProfileSaveSuccess = () => {
    setActiveTab('learn');
    setProfileNotification('Profile and skills saved successfully! Ready to discover learning resources.');
    setTimeout(() => {
      setProfileNotification(null);
    }, 5000);
  };

  const handleTrackCreated = (newTrackId) => {
    setSelectedTrackId(newTrackId);
    setActiveTab('tracks');
    setProfileNotification('Learning track saved to MySQL! You can now track your daily tasks.');
    setTimeout(() => {
      setProfileNotification(null);
    }, 5000);
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

  useEffect(() => {
    if (!authLoading) {
      scrollToTop();
    }
  }, [activeTab, authMode, authLoading]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <span className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
              SkillUp
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
              Milestone 5
            </span>
          </div>

          {/* Center Tabs for Authenticated Student */}
          {user && (
            <nav className="flex flex-wrap items-center bg-slate-800/80 border border-slate-700/80 rounded-xl p-1 gap-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('learn')}
                className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  activeTab === 'learn'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Discover Resources
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedTrackId(null);
                  setActiveTab('tracks');
                }}
                className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  activeTab === 'tracks'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                My Tracks
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('opportunities')}
                className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  activeTab === 'opportunities'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Opportunities
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  activeTab === 'profile'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                My Profile & Skills
              </button>
            </nav>
          )}

          {/* Health indicator and User actions */}
          <div className="flex items-center gap-4">
            {/* Backend health status badge */}
            <div
              onClick={testBackendConnection}
              title="Click to re-test backend health"
              className="hidden sm:flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs cursor-pointer hover:border-slate-600 transition-colors"
            >
              <span className="relative flex h-2 w-2">
                {healthStatus.loading ? (
                  <span className="animate-pulse inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
                ) : healthStatus.data ? (
                  <span className="inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                ) : (
                  <span className="inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                )}
              </span>
              <span className="text-slate-400">
                {healthStatus.loading
                  ? 'Checking API...'
                  : healthStatus.data
                  ? 'API Online'
                  : 'API Offline'}
              </span>
            </div>

            {/* Auth status controls */}
            {authLoading ? (
              <span className="text-xs text-slate-400">Verifying session...</span>
            ) : user ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-300 hidden md:inline">
                  {user.name} ({user.email})
                </span>
                <button
                  type="button"
                  onClick={logout}
                  className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    authMode === 'login'
                      ? 'bg-indigo-600 text-white font-medium'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    authMode === 'register'
                      ? 'bg-indigo-600 text-white font-medium'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 flex flex-col justify-center">
        {authLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm">Initializing session...</p>
          </div>
        ) : user ? (
          <div className="space-y-6 w-full">
            {profileNotification && (
              <div className="max-w-6xl mx-auto p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>{profileNotification}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setProfileNotification(null)}
                  className="text-emerald-300 hover:text-emerald-100 font-bold ml-2 text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}
            {activeTab === 'learn' ? (
              <LearnView onTrackCreated={handleTrackCreated} />
            ) : activeTab === 'tracks' ? (
              <TracksView
                initialTrackId={selectedTrackId}
                onClearInitialTrack={() => setSelectedTrackId(null)}
                onNavigateToLearn={() => setActiveTab('learn')}
              />
            ) : activeTab === 'opportunities' ? (
              <OpportunitiesView
                onNavigateToProfile={() => setActiveTab('profile')}
              />
            ) : (
              <ProfileView onSaveSuccess={handleProfileSaveSuccess} />
            )}
          </div>
        ) : (
          <div className="space-y-8 max-w-xl mx-auto w-full">
            {/* Introductory Hero info */}
            <div className="text-center">
              <h1 className="text-3xl font-extrabold text-white tracking-tight">
                SkillUp Student Portal
              </h1>
              <p className="text-sm text-slate-400 mt-2">
                Sign in or create an account to discover AI-personalized YouTube learning resources, create learning tracks, explore verified opportunities, and manage your profile.
              </p>
            </div>

            {/* Auth Form Switcher */}
            {authMode === 'login' ? (
              <LoginForm onSwitchToRegister={() => setAuthMode('register')} />
            ) : (
              <RegisterForm onSwitchToLogin={() => setAuthMode('login')} />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/60 py-6 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <span className="font-semibold text-slate-400">SkillUp</span> — Milestone 5: Opportunity Discovery
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded font-medium">Learn</span>
            <span className="text-slate-600">→</span>
            <span className="bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded font-medium">Track</span>
            <span className="text-slate-600">→</span>
            <span className="bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded font-medium">Discover</span>
            <span className="text-slate-600">→</span>
            <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-400">Match</span>
          </div>
        </div>
      </footer>
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
