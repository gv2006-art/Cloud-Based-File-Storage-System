export default function FolderCard({ folder, onOpen, onDelete }) {
  return (
    <div className="card">
      <div className="icon">📂</div>
      <div className="name" onClick={() => onOpen(folder)} style={{ cursor: 'pointer' }}>
        {folder.name}
      </div>
      <div className="actions">
        <button className="secondary" onClick={() => onOpen(folder)}>
          Open
        </button>
        <button className="danger" onClick={() => onDelete(folder)}>
          Delete
        </button>
      </div>
    </div>
  );
}
