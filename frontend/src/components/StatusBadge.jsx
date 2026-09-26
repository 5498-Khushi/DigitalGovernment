const STYLES = {
  Waiting: { bg: 'bg-civic-100', text: 'text-civic-700', dot: 'bg-status-waiting' },
  Approaching: { bg: 'bg-brass-100', text: 'text-brass-600', dot: 'bg-status-approaching' },
  Called: { bg: 'bg-civic-100', text: 'text-civic-700', dot: 'bg-status-called' },
  Serving: { bg: 'bg-green-100', text: 'text-status-serving', dot: 'bg-status-serving' },
  Completed: { bg: 'bg-green-100', text: 'text-status-completed', dot: 'bg-status-completed' },
  Missed: { bg: 'bg-red-100', text: 'text-status-missed', dot: 'bg-status-missed' },
  Expired: { bg: 'bg-red-100', text: 'text-status-missed', dot: 'bg-status-missed' }
};

export default function StatusBadge({ status }) {
  const style = STYLES[status] || STYLES.Waiting;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${style.bg} ${style.text}`}
    >
      <span className={`status-dot ${style.dot}`} />
      {status}
    </span>
  );
}
