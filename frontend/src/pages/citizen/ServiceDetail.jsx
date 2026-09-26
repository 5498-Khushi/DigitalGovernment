import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import client from '../../api/client';

export default function ServiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [service, setService] = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [allMandatoryUploaded, setAllMandatoryUploaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState(null);
  const [error, setError] = useState('');

  const [prediction, setPrediction] = useState(null); // { predictedWaitTime, currentQueueLength }
  const [predicting, setPredicting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const loadChecklist = async () => {
    const [{ data: serviceData }, { data: checklistData }] = await Promise.all([
      client.get(`/services/${id}`),
      client.get(`/documents/checklist/${id}`)
    ]);
    setService(serviceData.service);
    setChecklist(checklistData.checklist);
    setAllMandatoryUploaded(checklistData.allMandatoryUploaded);
    setLoading(false);
  };

  useEffect(() => {
    loadChecklist();
    setPrediction(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleUpload = async (documentId, file) => {
    if (!file) return;
    setUploadingId(documentId);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('serviceId', id);
      formData.append('documentId', documentId);
      await client.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await loadChecklist();
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploadingId(null);
    }
  };

  const handlePredict = async () => {
    setError('');
    setPredicting(true);
    try {
      const { data } = await client.post('/tokens/predict', { serviceId: Number(id) });
      setPrediction(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not calculate waiting time.');
    } finally {
      setPredicting(false);
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    setError('');
    try {
      const { data } = await client.post('/tokens/generate', { serviceId: Number(id) });
      navigate(`/citizen/token/${data.token.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not generate token.');
      setConfirming(false);
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-3xl px-4 py-8 text-sm text-ink/50">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <button onClick={() => navigate('/citizen/services')} className="mb-4 text-sm text-civic-600 hover:underline">
        ← Back to services
      </button>

      <h1 className="font-display text-2xl font-semibold text-civic-700">{service.name}</h1>
      <p className="mt-1 text-sm text-ink/60">{service.description}</p>

      {error && <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-status-missed">{error}</div>}

      <div className="mt-6 rounded-lg border border-civic-100 bg-white p-5 shadow-card">
        <h2 className="font-display text-base font-semibold text-civic-700">Required documents</h2>
        <p className="mt-1 text-xs text-ink/50">
          You must upload every mandatory document before you can generate a token. We only check that a file has
          been uploaded — no officer review happens at this stage.
        </p>

        <ul className="mt-4 divide-y divide-civic-100">
          {checklist.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium text-ink">
                  {doc.documentName}{' '}
                  {doc.required ? (
                    <span className="text-status-missed">*</span>
                  ) : (
                    <span className="text-xs font-normal text-ink/40">(optional)</span>
                  )}
                </p>
                {doc.uploaded && doc.originalFilename && (
                  <p className="mt-0.5 text-xs text-status-completed">Uploaded: {doc.originalFilename}</p>
                )}
              </div>

              <label className="cursor-pointer rounded-md border border-civic-100 px-3 py-1.5 text-xs font-semibold text-civic-700 hover:bg-civic-50">
                {uploadingId === doc.id ? 'Uploading...' : doc.uploaded ? 'Replace' : 'Upload'}
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={(e) => handleUpload(doc.id, e.target.files[0])}
                />
              </label>
            </li>
          ))}
        </ul>
      </div>

      {!allMandatoryUploaded && (
        <p className="mt-4 rounded-md bg-brass-50 px-3 py-2 text-sm text-brass-600">
          Please upload all mandatory documents before generating a token.
        </p>
      )}

      {allMandatoryUploaded && !prediction && (
        <button
          onClick={handlePredict}
          disabled={predicting}
          className="mt-6 w-full rounded-md bg-civic-600 py-3 text-sm font-semibold text-white hover:bg-civic-700 disabled:opacity-60"
        >
          {predicting ? 'Calculating estimated waiting time...' : 'Check estimated waiting time'}
        </button>
      )}

      {prediction && (
        <div className="mt-6 rounded-lg border border-brass-400 bg-brass-50 p-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-brass-600">Estimated Waiting Time</p>
          <p className="mt-2 font-display text-4xl font-bold text-civic-700">{prediction.predictedWaitTime} minutes</p>
          <p className="mt-1 text-xs text-ink/50">
            {prediction.currentQueueLength} citizen(s) currently in queue for this service.
          </p>
          <p className="mt-4 text-sm font-medium text-ink">Would you like to generate this token?</p>
          <div className="mt-3 flex justify-center gap-3">
            <button
              onClick={() => setPrediction(null)}
              className="rounded-md border border-civic-200 px-5 py-2 text-sm font-semibold text-ink hover:bg-white"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="rounded-md bg-civic-600 px-5 py-2 text-sm font-semibold text-white hover:bg-civic-700 disabled:opacity-60"
            >
              {confirming ? 'Generating...' : 'Generate Token'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
