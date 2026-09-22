import { useState, useEffect } from 'react';
import { checkHealth } from './services/api';

export default function App() {
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

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center px-4 py-12">
      <main className="max-w-2xl w-full bg-slate-800/80 border border-slate-700/80 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/30 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-4">
            Milestone 1 — Project Foundation
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
            SkillUp
          </h1>
          <p className="text-slate-400 text-sm sm:text-base">
            AI-powered learning & opportunity platform for engineering students
          </p>
        </div>

        {/* Status Indicators */}
        <div className="space-y-4 mb-8">
          {/* Frontend status */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-slate-700/60">
            <div className="flex items-center space-x-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <div>
                <p className="text-sm font-medium text-white">Frontend Service</p>
                <p className="text-xs text-slate-400">React + Vite + Tailwind CSS</p>
              </div>
            </div>
            <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Running
            </span>
          </div>

          {/* Backend status */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-slate-700/60">
            <div className="flex items-center space-x-3">
              <span className="relative flex h-3 w-3">
                {healthStatus.loading ? (
                  <span className="animate-pulse relative inline-flex rounded-full h-3 w-3 bg-amber-400"></span>
                ) : healthStatus.data ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                )}
              </span>
              <div>
                <p className="text-sm font-medium text-white">Backend Health Check</p>
                <p className="text-xs text-slate-400">
                  {healthStatus.loading
                    ? 'Connecting to GET /api/health...'
                    : healthStatus.data
                    ? `Status: ${healthStatus.data.status} — ${healthStatus.data.message}`
                    : `Error: ${healthStatus.error}`}
                </p>
              </div>
            </div>
            <button
              onClick={testBackendConnection}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white transition-all duration-150 cursor-pointer"
            >
              Retest
            </button>
          </div>
        </div>

        {/* Product Loop preview */}
        <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-900/50">
          <p className="text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-2">
            Core Product Loop
          </p>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-300">
            <span className="bg-slate-800 px-2 py-1 rounded">Learn</span>
            <span className="text-indigo-400">→</span>
            <span className="bg-slate-800 px-2 py-1 rounded">Track</span>
            <span className="text-indigo-400">→</span>
            <span className="bg-slate-800 px-2 py-1 rounded">Discover</span>
            <span className="text-indigo-400">→</span>
            <span className="bg-slate-800 px-2 py-1 rounded">Match</span>
            <span className="text-indigo-400">→</span>
            <span className="bg-slate-800 px-2 py-1 rounded">Find Skill Gaps</span>
            <span className="text-indigo-400">→</span>
            <span className="bg-slate-800 px-2 py-1 rounded">Learn Again</span>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-slate-500 mt-6">
          Milestone 1 ready. Ready for Milestone 2.
        </p>
      </main>
    </div>
  );
}
