import { useState } from 'react';
import { formatBytes, formatDate, iconFor } from './format.js';

export default function FileCard({ file, onOpen, onRename, onDelete, onShare, onVersions }) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(file.originalName);

  const submitRename = () => {
    setRenaming(false);
    if (name.trim() && name.trim() !== file.originalName) {
      onRename(file, name.trim());
    } else {
      setName(file.originalName);
    }
  };

  return (
    <div className="card">
      <div className="icon">{iconFor(file.mimeType)}</div>
      {renaming ? (
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={submitRename}
          onKeyDown={(e) => e.key === 'Enter' && submitRename()}
        />
      ) : (
        <div className="name" title={file.originalName}>
          {file.originalName}
        </div>
      )}
      <div className="meta">
        {formatBytes(file.sizeBytes)} • {formatDate(file.updatedAt)}
      </div>
      <div className="actions">
        <button onClick={() => onOpen(file)}>Download</button>
        <button className="secondary" onClick={() => setRenaming(true)}>
          Rename
        </button>
        <button className="secondary" onClick={() => onVersions(file)}>
          Versions
        </button>
        <button className="secondary" onClick={() => onShare(file)}>
          Share
        </button>
        <button className="danger" onClick={() => onDelete(file)}>
          Delete
        </button>
      </div>
    </div>
  );
}
