import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', mobile: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/citizen/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-civic-25 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="font-display text-xl font-semibold text-civic-700">Create your citizen account</h1>
          <p className="mt-1 text-sm text-ink/60">Register once to generate queue tokens for any government service.</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-lg border border-civic-100 bg-white p-6 shadow-card">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-status-missed">{error}</div>
          )}
          <label className="mb-3 block">
            <span className="mb-1 block text-sm font-medium text-ink">Full name</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-md border border-civic-100 px-3 py-2 text-sm focus:border-civic-600 focus:outline-none"
            />
          </label>
          <label className="mb-3 block">
            <span className="mb-1 block text-sm font-medium text-ink">Email</span>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-md border border-civic-100 px-3 py-2 text-sm focus:border-civic-600 focus:outline-none"
            />
          </label>
          <label className="mb-3 block">
            <span className="mb-1 block text-sm font-medium text-ink">Mobile number</span>
            <input
              required
              pattern="\d{7,15}"
              title="Digits only, 7-15 characters"
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              className="w-full rounded-md border border-civic-100 px-3 py-2 text-sm focus:border-civic-600 focus:outline-none"
            />
          </label>
          <label className="mb-4 block">
            <span className="mb-1 block text-sm font-medium text-ink">Password</span>
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-md border border-civic-100 px-3 py-2 text-sm focus:border-civic-600 focus:outline-none"
            />
            <span className="mt-1 block text-xs text-ink/50">At least 8 characters.</span>
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-civic-600 py-2.5 text-sm font-semibold text-white hover:bg-civic-700 disabled:opacity-60"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-ink/60">
          Already registered?{' '}
          <Link to="/login" className="font-medium text-civic-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
