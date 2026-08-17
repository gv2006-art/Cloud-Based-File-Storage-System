import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`;
}

export default function SharedFile() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .resolveShare(token)
      .then(setData)
      .catch((err) => setError(err.response?.data?.error || 'This link could not be opened.'));
  }, [token]);

  if (error) return <div className="centered">{error}</div>;
  if (!data) return <div className="centered">Loading shared file...</div>;

  return (
    <div className="centered">
      <div className="card" style={{ width: 380 }}>
        <div className="icon">📄</div>
        <div className="name">{data.file.originalName}</div>
        <div className="meta">{formatBytes(data.file.sizeBytes)}</div>
        <div className="meta">Access level: {data.permission}</div>
        {data.downloadUrl ? (
          <a href={data.downloadUrl} target="_blank" rel="noreferrer">
            <button style={{ marginTop: 10, width: '100%' }}>Download</button>
          </a>
        ) : (
          <p className="meta">The owner has only granted view access for this link.</p>
        )}
      </div>
    </div>
  );
}
