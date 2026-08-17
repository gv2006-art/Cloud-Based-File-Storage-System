import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`;
}

export default function Profile() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <div className="main" style={{ maxWidth: 480, margin: '0 auto' }}>
        <Link to="/" className="secondary" style={{ display: 'inline-block', marginBottom: 20 }}>
          ← Back to Drive
        </Link>
        <div className="card">
          {user?.avatarUrl && (
            <img src={user.avatarUrl} alt="" style={{ width: 64, height: 64, borderRadius: '50%' }} />
          )}
          <div className="name">{user?.displayName}</div>
          <div className="meta">{user?.email}</div>
          <div className="meta">Storage used: {formatBytes(user?.storageUsedBytes)}</div>
          <button className="danger" onClick={logout} style={{ marginTop: 12 }}>
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
