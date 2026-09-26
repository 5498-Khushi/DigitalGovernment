import { useEffect, useState } from 'react';
import client from '../../api/client';

const TYPE_LABEL = {
  approaching: 'Turn approaching',
  called: 'Your turn',
  expired: 'Token expired',
  completed: 'Service completed',
  info: 'Update'
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client
      .get('/notifications')
      .then(({ data }) => setNotifications(data.notifications))
      .finally(() => setLoading(false));
  }, []);

  const markAllRead = async () => {
    await client.post('/notifications/read-all');
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-civic-700">Notifications</h1>
        {notifications.some((n) => !n.is_read) && (
          <button onClick={markAllRead} className="text-sm font-medium text-civic-600 hover:underline">
            Mark all as read
          </button>
        )}
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-ink/50">Loading...</p>
      ) : notifications.length === 0 ? (
        <p className="mt-6 text-sm text-ink/50">No notifications yet.</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`rounded-lg border p-4 ${
                n.is_read ? 'border-civic-100 bg-white' : 'border-brass-400 bg-brass-50'
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-brass-600">
                {TYPE_LABEL[n.type] || 'Update'}
              </p>
              <p className="mt-1 text-sm text-ink">{n.message}</p>
              <p className="mt-1 text-xs text-ink/40">{new Date(n.created_at).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
