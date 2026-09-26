import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../../api/client';

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client
      .get('/services')
      .then(({ data }) => setServices(data.services))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-2xl font-semibold text-civic-700">Select a government service</h1>
      <p className="mt-1 text-sm text-ink/60">
        Choose the service you need. You'll be shown the required documents next.
      </p>

      {loading ? (
        <p className="mt-6 text-sm text-ink/50">Loading services...</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <Link
              key={s.id}
              to={`/citizen/services/${s.id}`}
              className="group rounded-lg border border-civic-100 bg-white p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <h2 className="font-display text-base font-semibold text-civic-700 group-hover:text-brass-600">
                {s.name}
              </h2>
              <p className="mt-2 text-sm text-ink/60">{s.description}</p>
              <p className="mt-3 text-xs font-medium text-ink/40">
                Avg. counter time: ~{s.estimated_duration} min
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
