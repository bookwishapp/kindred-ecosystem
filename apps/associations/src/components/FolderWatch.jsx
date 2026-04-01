import { useState, useEffect } from 'react';
import { ingestFolder } from '../db/ingest';

export default function FolderWatch({ projectId, onClose }) {
  const [folders, setFolders] = useState([]);
  const [ingesting, setIngesting] = useState(false);
  const [progress, setProgress] = useState(null);
  const [currentFile, setCurrentFile] = useState(null);

  useEffect(() => {
    loadFolders();
  }, []);

  async function loadFolders() {
    const result = await window.electron.folders.list({ projectId });
    setFolders(result);
  }

  async function handleAddFolder() {
    const folderPath = await window.electron.folders.pick();
    if (!folderPath) return;

    const folderId = await window.electron.folders.add({ projectId, folderPath });
    await loadFolders();
    await handleIngest(folderId, folderPath);
  }

  async function handleIngest(folderId, folderPath) {
    setIngesting(true);
    setProgress({ ingested: 0, total: 0 });

    try {
      const result = await ingestFolder({
        projectId,
        folderId,
        folderPath,
        onProgress: (p) => setProgress(p),
        onFile: (filePath) => setCurrentFile(filePath.split('/').pop()),
      });

      setProgress(null);
      setCurrentFile(null);
    } catch (err) {
      console.error('Ingestion error:', err);
    }

    setIngesting(false);
  }

  async function handleRemove(folderId) {
    await window.electron.folders.remove({ folderId });
    await loadFolders();
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(42,40,37,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
    }}>
      <div style={{
        background: 'var(--bg)',
        borderRadius: '12px',
        padding: '40px',
        width: '480px',
        maxWidth: '90vw',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
            Watched Folders
          </p>
          <button
            onClick={onClose}
            style={{ fontFamily: "'Poppins', sans-serif", fontSize: '10px', letterSpacing: '0.08em', color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Close
          </button>
        </div>

        {folders.length === 0 ? (
          <p style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '15px', color: 'var(--text-muted)', marginBottom: '28px', lineHeight: '1.7' }}>
            No folders watched yet. Add a folder and Associations will read your writing into the pool.
          </p>
        ) : (
          <div style={{ marginBottom: '24px' }}>
            {folders.map(folder => (
              <div key={folder.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: '0.5px solid var(--border)',
              }}>
                <div>
                  <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: '12px', color: 'var(--text)', marginBottom: '2px' }}>
                    {folder.folder_path.split('/').pop()}
                  </p>
                  <p style={{ fontFamily: "'Lora', serif", fontSize: '11px', color: 'var(--text-faint)' }}>
                    {folder.folder_path}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <button
                    onClick={() => handleIngest(folder.id, folder.folder_path)}
                    disabled={ingesting}
                    style={{ fontFamily: "'Poppins', sans-serif", fontSize: '10px', letterSpacing: '0.08em', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    sync
                  </button>
                  <button
                    onClick={() => handleRemove(folder.id)}
                    disabled={ingesting}
                    style={{ fontFamily: "'Poppins', sans-serif", fontSize: '10px', letterSpacing: '0.08em', color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {ingesting && (
          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              {currentFile ? `Reading ${currentFile}…` : 'Preparing…'}
            </p>
            {progress && progress.total > 0 && (
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: '11px', color: 'var(--text-faint)' }}>
                {progress.ingested} of {progress.total} passages
              </p>
            )}
          </div>
        )}

        <button
          onClick={handleAddFolder}
          disabled={ingesting}
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: '11px',
            letterSpacing: '0.08em',
            color: 'var(--text-muted)',
            background: 'none',
            border: '0.5px solid var(--text-faint)',
            borderRadius: '6px',
            padding: '10px 20px',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          + Add folder
        </button>
      </div>
    </div>
  );
}