import { useEffect, useState } from 'react';
import client from '../../api/client';

export default function ManageServices() {
  const [services, setServices] = useState([]);
  const [selected, setSelected] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [newService, setNewService] = useState({ name: '', description: '', estimatedDuration: 10 });
  const [newDoc, setNewDoc] = useState({ documentName: '', required: true });
  const [error, setError] = useState('');

  const loadServices = async () => {
    const { data } = await client.get('/admin/services');
    setServices(data.services);
  };

  useEffect(() => {
    loadServices();
  }, []);

  const openService = async (service) => {
    setSelected(service);
    const { data } = await client.get(`/admin/services/${service.id}/documents`);
    setDocuments(data.documents);
  };

  const addService = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await client.post('/admin/services', newService);
      setNewService({ name: '', description: '', estimatedDuration: 10 });
      await loadServices();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not add service.');
    }
  };

  const toggleActive = async (service) => {
    await client.put(`/admin/services/${service.id}`, { active: service.active ? 0 : 1 });
    await loadServices();
  };

  const addDocument = async (e) => {
    e.preventDefault();
    if (!selected) return;
    await client.post(`/admin/services/${selected.id}/documents`, newDoc);
    setNewDoc({ documentName: '', required: true });
    const { data } = await client.get(`/admin/services/${selected.id}/documents`);
    setDocuments(data.documents);
  };

  const removeDocument = async (docId) => {
    await client.delete(`/admin/documents/${docId}`);
    const { data } = await client.get(`/admin/services/${selected.id}/documents`);
    setDocuments(data.documents);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-2xl font-semibold text-civic-700">Manage Services</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <div className="rounded-lg border border-civic-100 bg-white p-5 shadow-card">
            <h2 className="font-display text-base font-semibold text-civic-700">Add a service</h2>
            {error && <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-status-missed">{error}</p>}
            <form onSubmit={addService} className="mt-3 space-y-3">
              <input
                required
                placeholder="Service name"
                value={newService.name}
                onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                className="w-full rounded-md border border-civic-100 px-3 py-2 text-sm"
              />
              <textarea
                placeholder="Description"
                value={newService.description}
                onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                className="w-full rounded-md border border-civic-100 px-3 py-2 text-sm"
                rows={2}
              />
              <label className="block text-sm text-ink/70">
                Estimated counter duration (minutes)
                <input
                  type="number"
                  min={1}
                  value={newService.estimatedDuration}
                  onChange={(e) => setNewService({ ...newService, estimatedDuration: Number(e.target.value) })}
                  className="mt-1 w-full rounded-md border border-civic-100 px-3 py-2 text-sm"
                />
              </label>
              <button className="rounded-md bg-civic-600 px-4 py-2 text-sm font-semibold text-white hover:bg-civic-700">
                Add service
              </button>
            </form>
          </div>

          <div className="mt-4 rounded-lg border border-civic-100 bg-white p-5 shadow-card">
            <h2 className="font-display text-base font-semibold text-civic-700">All services</h2>
            <ul className="mt-3 divide-y divide-civic-100">
              {services.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2.5">
                  <button
                    onClick={() => openService(s)}
                    className={`text-left text-sm font-medium hover:underline ${
                      selected?.id === s.id ? 'text-brass-600' : 'text-ink'
                    }`}
                  >
                    {s.name}
                    {!s.active && <span className="ml-2 text-xs font-normal text-ink/40">(inactive)</span>}
                  </button>
                  <button
                    onClick={() => toggleActive(s)}
                    className="text-xs font-medium text-civic-600 hover:underline"
                  >
                    {s.active ? 'Deactivate' : 'Activate'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-lg border border-civic-100 bg-white p-5 shadow-card">
          <h2 className="font-display text-base font-semibold text-civic-700">
            {selected ? `Documents for ${selected.name}` : 'Select a service to manage its documents'}
          </h2>

          {selected && (
            <>
              <ul className="mt-3 divide-y divide-civic-100">
                {documents.map((d) => (
                  <li key={d.id} className="flex items-center justify-between py-2.5 text-sm">
                    <span>
                      {d.document_name} {d.required ? <span className="text-status-missed">*</span> : <span className="text-xs text-ink/40">(optional)</span>}
                    </span>
                    <button onClick={() => removeDocument(d.id)} className="text-xs font-medium text-status-missed hover:underline">
                      Remove
                    </button>
                  </li>
                ))}
                {documents.length === 0 && <p className="py-2 text-sm text-ink/50">No documents yet.</p>}
              </ul>

              <form onSubmit={addDocument} className="mt-4 space-y-2 border-t border-civic-100 pt-4">
                <input
                  required
                  placeholder="Document name"
                  value={newDoc.documentName}
                  onChange={(e) => setNewDoc({ ...newDoc, documentName: e.target.value })}
                  className="w-full rounded-md border border-civic-100 px-3 py-2 text-sm"
                />
                <label className="flex items-center gap-2 text-sm text-ink/70">
                  <input
                    type="checkbox"
                    checked={newDoc.required}
                    onChange={(e) => setNewDoc({ ...newDoc, required: e.target.checked })}
                  />
                  Mandatory document
                </label>
                <button className="rounded-md bg-civic-600 px-4 py-2 text-sm font-semibold text-white hover:bg-civic-700">
                  Add document
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
