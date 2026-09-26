import { useEffect, useState } from 'react';
import client from '../../api/client';
import { useSocket } from '../../context/SocketContext';
import StatusBadge from '../../components/StatusBadge';

export default function StaffDashboard() {
  const { socket } = useSocket();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const { data: res } = await client.get('/counters/my-counter');
      setData(res);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load your counter.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = () => load();
    socket.on('staff:update', handler);
    return () => socket.off('staff:update', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  const runAction = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Action failed.');
    } finally {
      setBusy(false);
    }
  };

  const callNext = () => runAction(() => client.post('/counters/call-next'));
  const startService = (tokenId) => runAction(() => client.post('/counters/start-service', { tokenId }));
  const completeService = (tokenId) => runAction(() => client.post('/counters/complete-service', { tokenId }));
  const markMissed = (tokenId) => runAction(() => client.post('/counters/mark-missed', { tokenId }));

  if (loading) return <div className="mx-auto max-w-3xl px-4 py-8 text-sm text-ink/50">Loading...</div>;

  if (error && !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-status-missed">{error}</p>
      </div>
    );
  }

  const { counter, services, current, nextInLine } = data;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-civic-700">Counter {counter.counter_number}</h1>
          <p className="mt-1 text-sm text-ink/60">
            Handling: {services.map((s) => s.name).join(', ') || 'No services assigned'}
          </p>
        </div>
        <StatusBadge status={counter.status === 'Serving' ? 'Serving' : 'Waiting'} />
      </div>

      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-status-missed">{error}</p>}

      <div className="mt-6 rounded-lg border border-civic-100 bg-white p-6 shadow-card">
        <h2 className="font-display text-base font-semibold text-civic-700">Current token</h2>

        {!current ? (
          <div className="mt-4 text-center">
            <p className="text-sm text-ink/50">No citizen is currently being called at your counter.</p>
            <button
              onClick={callNext}
              disabled={busy}
              className="mt-3 rounded-md bg-civic-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-civic-700 disabled:opacity-60"
            >
              Call Next Token
            </button>
          </div>
        ) : (
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-2xl font-bold text-civic-700">{current.token_number}</p>
                <p className="mt-1 text-sm text-ink/70">{current.citizen_name} · {current.service_name}</p>
              </div>
              <StatusBadge status={current.status} />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {current.status === 'Called' && (
                <button
                  onClick={() => startService(current.id)}
                  disabled={busy}
                  className="rounded-md bg-civic-600 px-4 py-2 text-sm font-semibold text-white hover:bg-civic-700 disabled:opacity-60"
                >
                  Start Service
                </button>
              )}
              {current.status === 'Serving' && (
                <button
                  onClick={() => completeService(current.id)}
                  disabled={busy}
                  className="rounded-md bg-status-completed px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                >
                  Complete Service
                </button>
              )}
              <button
                onClick={() => markMissed(current.id)}
                disabled={busy}
                className="rounded-md border border-status-missed px-4 py-2 text-sm font-semibold text-status-missed hover:bg-red-50 disabled:opacity-60"
              >
                Mark Missed
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-lg border border-civic-100 bg-white p-6 shadow-card">
        <h2 className="font-display text-base font-semibold text-civic-700">Next in line</h2>
        {nextInLine.length === 0 ? (
          <p className="mt-2 text-sm text-ink/50">No one is currently waiting for your services.</p>
        ) : (
          <ul className="mt-3 divide-y divide-civic-100">
            {nextInLine.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2 text-sm">
                <span className="font-mono font-semibold text-civic-700">{t.token_number}</span>
                <span className="text-ink/70">{t.citizen_name}</span>
                <span className="text-ink/50">{t.service_name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
