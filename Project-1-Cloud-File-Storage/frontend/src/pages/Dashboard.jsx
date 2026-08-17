import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client';
import UploadDropzone from '../components/UploadDropzone.jsx';
import FileCard from '../components/FileCard.jsx';
import FolderCard from '../components/FolderCard.jsx';
import VersionHistoryModal from '../components/VersionHistoryModal.jsx';
import ShareModal from '../components/ShareModal.jsx';
import NewFolderModal from '../components/NewFolderModal.jsx';

export default function Dashboard() {
  const { folderId } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [search, setSearch] = useState('');
  const [versionModalFile, setVersionModalFile] = useState(null);
  const [shareModalFile, setShareModalFile] = useState(null);
  const [showNewFolder, setShowNewFolder] = useState(false);

  const load = useCallback(async () => {
    const [fileList, folderList] = await Promise.all([
      api.listFiles({ folderId: folderId || undefined }),
      api.listFolders(folderId || undefined),
    ]);
    setFiles(fileList);
    setFolders(folderId ? [] : folderList); // folder nav simplified to one level of drill-down
    if (folderId) {
      const nested = await api.listFolders(folderId);
      setFolders(nested);
    }
  }, [folderId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!search) {
      load();
      return;
    }
    const timeout = setTimeout(() => {
      api.listFiles({ search }).then(setFiles);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, load]);

  const handleUpload = (file, onProgress) =>
    api.uploadFile(file, folderId || null, onProgress).then(() => load());

  const handleOpen = async (file) => {
    const { downloadUrl } = await api.getFile(file.id);
    window.open(downloadUrl, '_blank');
  };

  const handleRename = async (file, newName) => {
    await api.renameFile(file.id, newName);
    load();
  };

  const handleDelete = async (file) => {
    if (!window.confirm(`Delete "${file.originalName}"?`)) return;
    await api.deleteFile(file.id);
    load();
  };

  const handleCreateFolder = async (name) => {
    await api.createFolder(name, folderId || null);
    setShowNewFolder(false);
    load();
  };

  const handleDeleteFolder = async (folder) => {
    if (!window.confirm(`Delete folder "${folder.name}"? It must be empty.`)) return;
    try {
      await api.deleteFolder(folder.id);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Could not delete folder');
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="logo">🗂️</span> NimbusDrive
        </div>
        <button onClick={() => navigate('/')}>My Files</button>
        <button className="secondary" onClick={() => setShowNewFolder(true)}>
          + New folder
        </button>
        <div style={{ marginTop: 'auto' }}>
          <Link to="/profile" className="meta">
            {user?.displayName}
          </Link>
          <br />
          <button className="secondary" style={{ marginTop: 8, width: '100%' }} onClick={logout}>
            Log out
          </button>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <h2 style={{ margin: 0 }}>{folderId ? 'Folder' : 'My Files'}</h2>
          <div className="searchbox">
            <input
              placeholder="Search files by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <UploadDropzone onUpload={handleUpload} />

        {folders.length > 0 && (
          <>
            <h4>Folders</h4>
            <div className="folder-grid">
              {folders.map((f) => (
                <FolderCard
                  key={f.id}
                  folder={f}
                  onOpen={(folder) => navigate(`/folders/${folder.id}`)}
                  onDelete={handleDeleteFolder}
                />
              ))}
            </div>
          </>
        )}

        <h4>Files</h4>
        {files.length === 0 ? (
          <div className="empty-state">No files here yet — drag one in above to get started.</div>
        ) : (
          <div className="file-grid">
            {files.map((f) => (
              <FileCard
                key={f.id}
                file={f}
                onOpen={handleOpen}
                onRename={handleRename}
                onDelete={handleDelete}
                onShare={setShareModalFile}
                onVersions={setVersionModalFile}
              />
            ))}
          </div>
        )}
      </main>

      {versionModalFile && (
        <VersionHistoryModal
          file={versionModalFile}
          onClose={() => setVersionModalFile(null)}
          onRestored={load}
        />
      )}
      {shareModalFile && <ShareModal file={shareModalFile} onClose={() => setShareModalFile(null)} />}
      {showNewFolder && (
        <NewFolderModal onClose={() => setShowNewFolder(false)} onCreate={handleCreateFolder} />
      )}
    </div>
  );
}
