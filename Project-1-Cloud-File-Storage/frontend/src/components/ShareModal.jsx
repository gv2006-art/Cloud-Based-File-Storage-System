import { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function ShareModal({ file, onClose }) {
  const [shares, setShares] = useState([]);
  const [permission, setPermission] = useState('view');
  const [expiresInHours, setExpiresInHours] = useState('');
  const [sharedWithEmail, setSharedWithEmail] = useState('');
  const [latestLink, setLatestLink] = useState(null);
  const [error, setError] = useState(null);

  const load = () => api.listShares(file.id).then(setShares);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.id]);

  const createLink = async () => {
    setError(null);
    try {
      const { shareUrl } = await api.createShare(file.id, {
        permission,
        expiresInHours: expiresInHours ? Number(expiresInHours) : undefined,
        sharedWithEmail: sharedWithEmail || undefined,
      });
      setLatestLink(shareUrl);
      setSharedWithEmail('');
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create share link');
    }
  };

  const revoke = async (shareId) => {
    await api.revokeShare(file.id, shareId);
    load();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Share — {file.originalName}</h3>

        <div className="row">
          <label className="meta">Permission</label>
          <select value={permission} onChange={(e) => setPermission(e.target.value)}>
            <option value="view">View only</option>
            <option value="download">View & download</option>
          </select>
        </div>

        <div className="row">
          <label className="meta">Link expiry (hours, blank = permanent)</label>
          <input
            type="number"
            min="1"
            value={expiresInHours}
            onChange={(e) => setExpiresInHours(e.target.value)}
            placeholder="Permanent"
          />
        </div>

        <div className="row">
          <label className="meta">Share directly with a registered user (optional email)</label>
          <input
            type="email"
            value={sharedWithEmail}
            onChange={(e) => setSharedWithEmail(e.target.value)}
            placeholder="teammate@example.com"
          />
        </div>

        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

        <button onClick={createLink}>Generate share link</button>

        {latestLink && (
          <div className="row" style={{ marginTop: 12 }}>
            <label className="meta">Share this link:</label>
            <input readOnly value={latestLink} onFocus={(e) => e.target.select()} />
          </div>
        )}

        <h4 style={{ marginTop: 20 }}>Active shares</h4>
        {shares.length === 0 && <p className="meta">No one has access yet.</p>}
        {shares.map((s) => (
          <div className="share-item" key={s.id}>
            <div>
              <div>{s.sharedWith ? s.sharedWith.email : 'Anyone with the link'}</div>
              <div className="meta">
                {s.permission} {s.expiresAt ? `• expires ${new Date(s.expiresAt).toLocaleString()}` : '• permanent'}
              </div>
            </div>
            <button className="danger" onClick={() => revoke(s.id)}>
              Revoke
            </button>
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
