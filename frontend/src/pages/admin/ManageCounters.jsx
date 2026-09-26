import { useEffect, useState } from 'react';
import client from '../../api/client';

export default function ManageCounters() {
  const [counters, setCounters] = useState([]);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [newCounter, setNewCounter] = useState({ counterNumber: '', serviceIds: [], assignedStaffId: '' });
  const [error, setError] = useState('');

  const load = async () => {
    const [{ data: counterData }, { data: serviceData }, { data: userData }] = await Promise.all([
      client.get('/admin/counters'),
      client.get('/admin/services'),
      client.get('/admin/users')
    ]);
    setCounters(counterData.counters);
    setServices(serviceData.services.filter((s) => s.active));
    setStaff(userData.users.filter((u) => u.role === 'staff'));
  };

  useEffect(() => {
    load();
  }, []);

  const toggleServiceInNew = (serviceId) => {
    setNewCounter((prev) => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(serviceId)
        ? prev.serviceIds.filter((id) => id !== serviceId)
        : [...prev.serviceIds, serviceId]
    }));
  };

  const addCounter = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await client.post('/admin/counters', {
        ...newCounter,
        assignedStaffId: newCounter.assignedStaffId || null
      });
      setNewCounter({ counterNumber: '', serviceIds: [], assignedStaffId: '' });
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not add counter.');
    }
  };

  const toggleActive = async (counter) => {
    await client.put(`/admin/counters/${counter.id}`, { active: counter.active ? 0 : 1 });
    await load();
  };

  const assignStaff = async (counter, staffId) => {
    await client.put(`/admin/counters/${counter.id}`, { assignedStaffId: staffId || null });
    await load();
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-2xl font-semibold text-civic-700">Manage Counters</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-civic-100 bg-white p-5 shadow-card">
          <h2 className="font-display text-base font-semibold text-civic-700">Add a counter</h2>
          {error && <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-status-missed">{error}</p>}
          <form onSubmit={addCounter} className="mt-3 space-y-3">
            <input
              required
              placeholder="Counter number, e.g. C-5"
              value={newCounter.counterNumber}
              onChange={(e) => setNewCounter({ ...newCounter, counterNumber: e.target.value })}
              className="w-full rounded-md border border-civic-100 px-3 py-2 text-sm"
            />
            <div>
              <p className="mb-1 text-sm text-ink/70">Services handled</p>
              <div className="flex flex-wrap gap-2">
                {services.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => toggleServiceInNew(s.id)}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      newCounter.serviceIds.includes(s.id)
                        ? 'border-civic-600 bg-civic-600 text-white'
                        : 'border-civic-100 text-ink/70'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
            <label className="block text-sm text-ink/70">
              Assign staff (optional)
              <select
                value={newCounter.assignedStaffId}
                onChange={(e) => setNewCounter({ ...newCounter, assignedStaffId: e.target.value })}
                className="mt-1 w-full rounded-md border border-civic-100 px-3 py-2 text-sm"
              >
                <option value="">Unassigned</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <button className="rounded-md bg-civic-600 px-4 py-2 text-sm font-semibold text-white hover:bg-civic-700">
              Add counter
            </button>
          </form>
        </div>

        <div className="rounded-lg border border-civic-100 bg-white p-5 shadow-card">
          <h2 className="font-display text-base font-semibold text-civic-700">All counters</h2>
          <ul className="mt-3 space-y-3">
            {counters.map((c) => (
              <li key={c.id} className="rounded-md border border-civic-100 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-semibold text-civic-700">{c.counter_number}</span>
                  <span className="text-xs font-medium text-ink/50">{c.status}</span>
                </div>
                <p className="mt-1 text-xs text-ink/50">Staff: {c.staff_name || 'Unassigned'}</p>
                <div className="mt-2 flex items-center gap-3">
                  <select
                    value={c.assigned_staff_id || ''}
                    onChange={(e) => assignStaff(c, e.target.value)}
                    className="rounded-md border border-civic-100 px-2 py-1 text-xs"
                  >
                    <option value="">Unassigned</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <button onClick={() => toggleActive(c)} className="text-xs font-medium text-civic-600 hover:underline">
                    {c.active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
