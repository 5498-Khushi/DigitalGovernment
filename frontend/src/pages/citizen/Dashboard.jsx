import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';

export default function CitizenDashboard() {
  const { user } = useAuth();
  const [activeTokens, setActiveTokens] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client
      .get('/tokens/my-active')
      .then(({ data }) => setActiveTokens(data.tokens))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-2xl font-semibold text-civic-700">Welcome, {user.name}</h1>
      <p className="mt-1 text-sm text-ink/60">
        Generate a queue token from home, track your position live, and get notified when your turn is near.
      </p>

      <div className="mt-8">
        <h2 className="mb-3 font-display text-lg font-semibold text-civic-700">Your active tokens</h2>
        {loading ? (
          <p className="text-sm text-ink/50">Loading...</p>
        ) : activeTokens.length === 0 ? (
          <div className="rounded-lg border border-dashed border-civic-100 bg-white p-6 text-center">
            <p className="text-sm text-ink/60">You don't have an active token right now.</p>
            <Link
              to="/citizen/services"
              className="mt-3 inline-block rounded-md bg-civic-600 px-4 py-2 text-sm font-semibold text-white hover:bg-civic-700"
            >
              Select a service
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {activeTokens.map((t) => (
              <Link
                key={t.id}
                to={`/citizen/token/${t.id}`}
                className="rounded-lg border border-civic-100 bg-white p-4 shadow-card transition-shadow hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-lg font-semibold text-civic-700">{t.token_number}</span>
                  <StatusBadge status={t.status} />
                </div>
                <p className="mt-1 text-sm text-ink/70">{t.service_name}</p>
                <p className="mt-2 text-xs text-ink/50">
                  Position {t.queue_position} · ~{t.predicted_wait_time} min wait
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 rounded-lg border border-civic-100 bg-civic-600 p-6 text-white">
        <h3 className="font-display text-lg font-semibold">Need a new service?</h3>
        <p className="mt-1 text-sm text-white/80">
          Upload your documents, see your predicted wait time, then confirm to join the queue — all before you leave home.
        </p>
        <Link
          to="/citizen/services"
          className="mt-3 inline-block rounded-md bg-white px-4 py-2 text-sm font-semibold text-civic-700 hover:bg-civic-25"
        >
          Browse services
        </Link>
      </div>
    </div>
  );
}
