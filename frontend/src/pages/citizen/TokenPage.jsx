import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import client from '../../api/client';
import { useSocket } from '../../context/SocketContext';
import StatusBadge from '../../components/StatusBadge';

export default function TokenPage() {
  const { id } = useParams();
  const { socket } = useSocket();
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadToken = async () => {
    const { data } = await client.get(`/tokens/${id}`);
    setToken(data.token);
    setLoading(false);
  };

  useEffect(() => {
    loadToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!socket) return;
    const handler = (payload) => {
      if (String(payload.tokenId) !== String(id)) return;
      loadToken();
    };
    socket.on('token:update', handler);
    return () => socket.off('token:update', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, id]);

  useEffect(() => {
    if (!socket || !token) return;
    // fetch the service id lazily isn't available here, so subscribe by polling instead
    const interval = setInterval(loadToken, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, token?.status]);

  if (loading || !token) {
    return <div className="mx-auto max-w-xl px-4 py-8 text-sm text-ink/50">Loading your token...</div>;
  }

  const isTerminal = ['Completed', 'Missed', 'Expired'].includes(token.status);

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <h1 className="mb-4 font-display text-xl font-semibold text-civic-700">Your Queue Token</h1>

      <div className="ticket-stub border border-civic-100 p-6 shadow-card">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink/40">Token Number</p>
            <p className="mt-1 font-mono text-3xl font-bold text-civic-700">{token.tokenNumber}</p>
          </div>
          <StatusBadge status={token.status} />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <Field label="Service" value={token.serviceName} />
          <Field label="Counter" value={token.counterNumber || 'To be assigned'} />
          <Field label="Current Position" value={isTerminal ? '—' : token.queuePosition} />
          <Field label="People Ahead" value={isTerminal ? '—' : token.peopleAhead} />
          <Field label="Estimated Waiting Time" value={isTerminal ? '—' : `${token.predictedWaitTime} minutes`} />
          <Field label="Now Serving" value={token.nowServing || '—'} />
        </div>

        {token.status === 'Called' && (
          <div className="mt-6 rounded-md bg-civic-600 p-3 text-center text-sm font-semibold text-white">
            It's your turn — please proceed to Counter {token.counterNumber || '(assigning...)'}
          </div>
        )}
        {token.status === 'Approaching' && (
          <div className="mt-6 rounded-md bg-brass-50 p-3 text-center text-sm font-medium text-brass-600">
            Your turn is approaching. Only {token.peopleAhead} citizen(s) remain before your turn.
          </div>
        )}
        {token.status === 'Missed' && (
          <div className="mt-6 rounded-md bg-red-50 p-3 text-center text-sm font-medium text-status-missed">
            Your token expired because you did not report within the allowed time.
          </div>
        )}
        {token.status === 'Completed' && (
          <div className="mt-6 rounded-md bg-green-50 p-3 text-center text-sm font-medium text-status-completed">
            Your service has been completed. Thank you.
          </div>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-ink/40">
        This page updates automatically as the queue moves.
      </p>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs text-ink/40">{label}</p>
      <p className="mt-0.5 font-medium text-ink">{value}</p>
    </div>
  );
}
