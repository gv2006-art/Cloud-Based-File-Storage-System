import { useState } from 'react';

export default function NewFolderModal({ onClose, onCreate }) {
  const [name, setName] = useState('');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>New folder</h3>
        <div className="row">
          <input
            autoFocus
            placeholder="Folder name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && name.trim() && onCreate(name.trim())}
          />
        </div>
        <div className="actions-row">
          <button className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button disabled={!name.trim()} onClick={() => onCreate(name.trim())}>
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
