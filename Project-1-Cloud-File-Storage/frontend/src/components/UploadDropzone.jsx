import { useCallback, useRef, useState } from 'react';

export default function UploadDropzone({ onUpload }) {
  const [active, setActive] = useState(false);
  const [progressMap, setProgressMap] = useState({});
  const inputRef = useRef(null);

  const handleFiles = useCallback(
    (fileList) => {
      Array.from(fileList).forEach((file) => {
        const key = `${file.name}-${Date.now()}`;
        setProgressMap((p) => ({ ...p, [key]: 0 }));
        onUpload(file, (pct) => setProgressMap((p) => ({ ...p, [key]: pct }))).finally(() => {
          setProgressMap((p) => {
            const next = { ...p };
            delete next[key];
            return next;
          });
        });
      });
    },
    [onUpload]
  );

  return (
    <div
      className={`dropzone ${active ? 'active' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setActive(true);
      }}
      onDragLeave={() => setActive(false)}
      onDrop={(e) => {
        e.preventDefault();
        setActive(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <div>Drag & drop files here, or click to browse</div>
      {Object.entries(progressMap).map(([key, pct]) => (
        <div key={key} style={{ marginTop: 8 }}>
          <div className="meta">{key.split('-')[0]}</div>
          <div className="progress-bar">
            <div className="fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
