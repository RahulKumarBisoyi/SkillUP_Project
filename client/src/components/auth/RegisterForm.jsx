import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function RegisterForm({ onSwitchToLogin }) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-7 sm:p-8 su-card">
      <div className="text-center mb-6">
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#4F7DF3] block mb-1">
          Get Started
        </span>
        <h2 className="text-2xl font-extrabold text-[#1E1B3A]">Create Student Account</h2>
        <p className="text-sm text-[#6E6A8F] mt-1">
          Join SkillUP to track skills and discover verified opportunities
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
            htmlFor="register-name"
            className="block text-xs font-bold uppercase tracking-wider text-[#4B4869] mb-1.5"
          >
            Full Name
          </label>
          <input
            id="register-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Aarav Sharma"
            className="w-full px-4 py-3 bg-[#F7F5FF] border border-[#DFD9F7] rounded-2xl text-[#1E1B3A] placeholder-[#9490B5] focus:bg-white focus:border-[#4F7DF3] text-sm transition-colors"
          />
        </div>

        <div>
          <label
            htmlFor="register-email"
            className="block text-xs font-bold uppercase tracking-wider text-[#4B4869] mb-1.5"
          >
            Email Address
          </label>
          <input
            id="register-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="aarav@college.edu"
            className="w-full px-4 py-3 bg-[#F7F5FF] border border-[#DFD9F7] rounded-2xl text-[#1E1B3A] placeholder-[#9490B5] focus:bg-white focus:border-[#4F7DF3] text-sm transition-colors"
          />
        </div>

        <div>
          <label
            htmlFor="register-password"
            className="block text-xs font-bold uppercase tracking-wider text-[#4B4869] mb-1.5"
          >
            Password (min 6 chars)
          </label>
          <input
            id="register-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            placeholder="••••••••"
            className="w-full px-4 py-3 bg-[#F7F5FF] border border-[#DFD9F7] rounded-2xl text-[#1E1B3A] placeholder-[#9490B5] focus:bg-white focus:border-[#4F7DF3] text-sm transition-colors"
          />
        </div>

        <div>
          <label
            htmlFor="register-confirm-password"
            className="block text-xs font-bold uppercase tracking-wider text-[#4B4869] mb-1.5"
          >
            Confirm Password
          </label>
          <input
            id="register-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            placeholder="••••••••"
            className="w-full px-4 py-3 bg-[#F7F5FF] border border-[#DFD9F7] rounded-2xl text-[#1E1B3A] placeholder-[#9490B5] focus:bg-white focus:border-[#4F7DF3] text-sm transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-5 rounded-full bg-[#4F7DF3] hover:bg-[#3B6CE6] disabled:opacity-50 text-white font-bold text-sm transition-all cursor-pointer shadow-sm mt-2"
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-[#6E6A8F]">
        Already have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-[#4F7DF3] hover:text-[#3B6CE6] font-bold underline underline-offset-2 cursor-pointer"
        >
          Sign In
        </button>
      </div>
    </div>
  );
}
