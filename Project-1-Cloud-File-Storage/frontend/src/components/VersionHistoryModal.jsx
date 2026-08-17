import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { formatBytes, formatDate } from './format.js';

export default function VersionHistoryModal({ file, onClose, onRestored }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listVersions(file.id).then((v) => {
      setVersions(v);
      setLoading(false);
    });
  }, [file.id]);

  const download = async (versionId) => {
    const { downloadUrl } = await api.getVersionDownloadUrl(file.id, versionId);
    window.open(downloadUrl, '_blank');
  };

  const restore = async (versionId) => {
    await api.restoreVersion(file.id, versionId);
    const refreshed = await api.listVersions(file.id);
    setVersions(refreshed);
    onRestored?.();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Version history — {file.originalName}</h3>
        {loading && <p className="meta">Loading versions...</p>}
        {!loading && versions.length === 0 && <p className="meta">No prior versions yet.</p>}
        {versions.map((v, idx) => (
          <div className="version-item" key={v.id}>
            <div>
              <div>
                {idx === 0 ? <span className="badge current">Current</span> : `Version`}{' '}
                {formatBytes(v.sizeBytes)}
              </div>
              <div className="meta">{formatDate(v.createdAt)}</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="secondary" onClick={() => download(v.id)}>
                Download
              </button>
              {idx !== 0 && <button onClick={() => restore(v.id)}>Restore</button>}
            </div>
          </div>
        ))}
        <div className="actions-row">
          <button className="secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
