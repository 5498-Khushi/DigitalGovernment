export default function StatCard({ label, value, accent = false }) {
  return (
    <div className="rounded-lg border border-civic-100 bg-white p-4 shadow-card">
      <p className="text-xs font-medium uppercase tracking-wide text-ink/50">{label}</p>
      <p className={`mt-1 font-display text-2xl font-semibold ${accent ? 'text-brass-500' : 'text-civic-700'}`}>
        {value}
      </p>
    </div>
  );
}
