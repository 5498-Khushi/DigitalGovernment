import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../../api/client';
import StatCard from '../../components/StatCard';

export default function AdminDashboard() {
  const [totals, setTotals] = useState(null);

  useEffect(() => {
    client.get('/admin/analytics').then(({ data }) => setTotals(data.totals));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-2xl font-semibold text-civic-700">Administrator Overview</h1>
      <p className="mt-1 text-sm text-ink/60">AI-based Smart Citizen Service Management System</p>

      {totals && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Total Citizens Today" value={totals.totalToday} />
          <StatCard label="Active Queue" value={totals.activeQueue} accent />
          <StatCard label="Avg. Waiting Time" value={`${totals.avgWaitMinutes || 0} min`} />
          <StatCard label="Completed Services" value={totals.completedToday} />
          <StatCard label="Missed Tokens" value={totals.missedToday} />
          <StatCard label="Active Counters" value={totals.activeCounters} />
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Link to="/admin/services" className="rounded-lg border border-civic-100 bg-white p-5 shadow-card hover:-translate-y-0.5 hover:shadow-lg">
          <h2 className="font-display text-base font-semibold text-civic-700">Manage Services</h2>
          <p className="mt-1 text-sm text-ink/60">Add, edit, or deactivate services and their required documents.</p>
        </Link>
        <Link to="/admin/counters" className="rounded-lg border border-civic-100 bg-white p-5 shadow-card hover:-translate-y-0.5 hover:shadow-lg">
          <h2 className="font-display text-base font-semibold text-civic-700">Manage Counters</h2>
          <p className="mt-1 text-sm text-ink/60">Add counters, assign staff, and set which services they serve.</p>
        </Link>
        <Link to="/admin/analytics" className="rounded-lg border border-civic-100 bg-white p-5 shadow-card hover:-translate-y-0.5 hover:shadow-lg">
          <h2 className="font-display text-base font-semibold text-civic-700">View Analytics</h2>
          <p className="mt-1 text-sm text-ink/60">Service-wise breakdowns and peak-hour charts.</p>
        </Link>
      </div>
    </div>
  );
}
