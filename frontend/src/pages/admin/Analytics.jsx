import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import client from '../../api/client';
import StatCard from '../../components/StatCard';

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/admin/analytics').then(({ data }) => setAnalytics(data)).finally(() => setLoading(false));
  }, []);

  if (loading || !analytics) {
    return <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-ink/50">Loading analytics...</div>;
  }

  const { totals, serviceWise, peakHours } = analytics;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-2xl font-semibold text-civic-700">Queue Analytics</h1>
      <p className="mt-1 text-sm text-ink/60">Live overview of today's citizen service activity.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total Citizens Today" value={totals.totalToday} />
        <StatCard label="Active Queue" value={totals.activeQueue} accent />
        <StatCard label="Avg. Waiting Time" value={`${totals.avgWaitMinutes || 0} min`} />
        <StatCard label="Completed Services" value={totals.completedToday} />
        <StatCard label="Missed Tokens" value={totals.missedToday} />
        <StatCard label="Active Counters" value={totals.activeCounters} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-civic-100 bg-white p-5 shadow-card">
          <h2 className="mb-4 font-display text-base font-semibold text-civic-700">Service-wise tokens today</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={serviceWise}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E6E1D3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="totalTokens" name="Total" fill="#0F3D5C" radius={[3, 3, 0, 0]} />
              <Bar dataKey="completed" name="Completed" fill="#2F7A4D" radius={[3, 3, 0, 0]} />
              <Bar dataKey="missed" name="Missed" fill="#A33A3A" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border border-civic-100 bg-white p-5 shadow-card">
          <h2 className="mb-4 font-display text-base font-semibold text-civic-700">Peak hours today</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={peakHours}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E6E1D3" />
              <XAxis dataKey="hour" tick={{ fontSize: 11 }} tickFormatter={(h) => `${h}:00`} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip labelFormatter={(h) => `${h}:00`} />
              <Line type="monotone" dataKey="count" stroke="#B4863A" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
