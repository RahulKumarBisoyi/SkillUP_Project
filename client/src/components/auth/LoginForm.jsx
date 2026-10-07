import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function LoginForm({ onSwitchToRegister }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-7 sm:p-8 su-card">
      <div className="text-center mb-6">
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#4F7DF3] block mb-1">
          Welcome Back
        </span>
        <h2 className="text-2xl font-extrabold text-[#1E1B3A]">Student Login</h2>
        <p className="text-sm text-[#6E6A8F] mt-1">
          Access your SkillUP profile, learning tracks, and matched opportunities
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-5 p-3.5 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-sm font-medium"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="login-email"
            className="block text-xs font-bold uppercase tracking-wider text-[#4B4869] mb-1.5"
          >
            Email Address
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="student@college.edu"
            className="w-full px-4 py-3 bg-[#F7F5FF] border border-[#DFD9F7] rounded-2xl text-[#1E1B3A] placeholder-[#9490B5] focus:bg-white focus:border-[#4F7DF3] text-sm transition-colors"
          />
        </div>

        <div>
          <label
            htmlFor="login-password"
            className="block text-xs font-bold uppercase tracking-wider text-[#4B4869] mb-1.5"
          >
            Password
          </label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            className="w-full px-4 py-3 bg-[#F7F5FF] border border-[#DFD9F7] rounded-2xl text-[#1E1B3A] placeholder-[#9490B5] focus:bg-white focus:border-[#4F7DF3] text-sm transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-5 rounded-full bg-[#1E1B3A] hover:bg-[#2E2A54] disabled:opacity-50 text-white font-bold text-sm transition-all cursor-pointer shadow-sm mt-2"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-[#6E6A8F]">
        Don&apos;t have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-[#4F7DF3] hover:text-[#3B6CE6] font-bold underline underline-offset-2 cursor-pointer"
        >
          Sign Up
        </button>
      </div>
    </div>
  );
}
