import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      if (user.role === 'citizen') navigate('/citizen/dashboard');
      else if (user.role === 'staff') navigate('/staff/dashboard');
      else navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-civic-25 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-civic-600 font-display text-lg font-semibold text-white">
            CS
          </div>
          <h1 className="font-display text-xl font-semibold text-civic-700">
            AI-based Smart Citizen Service Management System
          </h1>
          <p className="mt-1 text-sm text-ink/60">Sign in to join a queue, serve a counter, or manage services.</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-lg border border-civic-100 bg-white p-6 shadow-card">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-status-missed">{error}</div>
          )}
          <label className="mb-3 block">
            <span className="mb-1 block text-sm font-medium text-ink">Email</span>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-md border border-civic-100 px-3 py-2 text-sm focus:border-civic-600 focus:outline-none"
              placeholder="you@example.com"
            />
          </label>
          <label className="mb-4 block">
            <span className="mb-1 block text-sm font-medium text-ink">Password</span>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-md border border-civic-100 px-3 py-2 text-sm focus:border-civic-600 focus:outline-none"
              placeholder="••••••••"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-civic-600 py-2.5 text-sm font-semibold text-white hover:bg-civic-700 disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-ink/60">
          New citizen?{' '}
          <Link to="/register" className="font-medium text-civic-600 hover:underline">
            Create an account
          </Link>
        </p>

        <div className="mt-6 rounded-md border border-dashed border-civic-100 bg-civic-25 p-3 text-xs text-ink/60">
          <p className="mb-1 font-semibold text-ink/70">Demo accounts (password: Password123)</p>
          <p>Citizen: asha@example.com</p>
          <p>Counter Staff: staff1@citizenservice.gov</p>
          <p>Administrator: admin@citizenservice.gov</p>
        </div>
      </div>
    </div>
  );
}
