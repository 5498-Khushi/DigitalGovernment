import { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';

export default function NotificationToast() {
  const { lastNotification } = useSocket();
  const [visible, setVisible] = useState(null);

  useEffect(() => {
    if (!lastNotification) return;
    setVisible(lastNotification);
    const timer = setTimeout(() => setVisible(null), 7000);
    return () => clearTimeout(timer);
  }, [lastNotification]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[90vw] max-w-sm animate-[fadeIn_0.2s_ease-out] rounded-lg border-l-4 border-brass-500 bg-white p-4 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-wide text-brass-600">
        {visible.type === 'called' ? 'Your turn' : visible.type === 'expired' ? 'Token expired' : 'Queue update'}
      </p>
      <p className="mt-1 text-sm text-ink">{visible.message}</p>
    </div>
  );
}
