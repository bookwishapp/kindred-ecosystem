import { useState, useEffect } from 'react';
import { ingestFolder } from '../db/ingest';

export default function FolderWatch({ projectId, onClose }) {
  const [folders, setFolders] = useState([]);
  const [ingesting, setIngesting] = useState(false);
  const [folderStatus, setFolderStatus] = useState({});
  const [folderProgress, setFolderProgress] = useState({});

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
    setFolderStatus(s => ({ ...s, [folderId]: 'syncing' }));
    setFolderProgress(s => ({ ...s, [folderId]: { ingested: 0, total: 0, currentFile: null } }));

    try {
      const result = await ingestFolder({
        projectId,
        folderId,
        folderPath,
        onProgress: (p) => setFolderProgress(s => ({ ...s, [folderId]: { ...s[folderId], ...p } })),
        onFile: (filePath) => setFolderProgress(s => ({ ...s, [folderId]: { ...s[folderId], currentFile: filePath.split('/').pop() } })),
      });

      setFolderStatus(s => ({ ...s, [folderId]: 'complete' }));
      setFolderProgress(s => ({ ...s, [folderId]: { passagesIngested: result.passagesIngested } }));

      // Return to idle after 3 seconds
      setTimeout(() => {
        setFolderStatus(s => ({ ...s, [folderId]: 'idle' }));
      }, 3000);

    } catch (err) {
      console.error('Ingestion error:', err);
      setFolderStatus(s => ({ ...s, [folderId]: 'idle' }));
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
            {folders.map(folder => {
              const status = folderStatus[folder.id] || 'idle';
              const prog = folderProgress[folder.id];

              return (
                <div key={folder.id} style={{
                  padding: '16px 0',
                  borderBottom: '0.5px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: '13px', color: 'var(--text)', marginBottom: '2px' }}>
                        {folder.folder_path.split('/').pop()}
                      </p>
                      <p style={{ fontFamily: "'Lora', serif", fontSize: '11px', color: 'var(--text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {status === 'syncing' && prog?.currentFile
                          ? `reading ${prog.currentFile}…`
                          : folder.folder_path}
                      </p>
                      {status === 'syncing' && prog?.total > 0 && (
                        <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: '10px', color: 'var(--text-faint)', marginTop: '4px', letterSpacing: '0.06em' }}>
                          {prog.ingested} of {prog.total} passages
                        </p>
                      )}
                      {status === 'complete' && (
                        <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', letterSpacing: '0.06em' }}>
                          ✓ {prog?.passagesIngested || 0} passages in pool
                        </p>
                      )}
                      {status === 'syncing' && prog?.total > 0 && (
                        <div style={{
                          height: '1px',
                          background: 'var(--border)',
                          borderRadius: '1px',
                          marginTop: '8px',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.round((prog.ingested / prog.total) * 100)}%`,
                            background: 'var(--text-faint)',
                            borderRadius: '1px',
                            transition: 'width 0.3s ease',
                          }} />
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '16px', marginLeft: '16px', flexShrink: 0 }}>
                      {status === 'syncing' ? (
                        <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: '10px', letterSpacing: '0.08em', color: 'var(--text-faint)', animation: 'pulse 1.5s ease-in-out infinite' }}>
                          syncing…
                        </span>
                      ) : (
                        <button
                          onClick={() => handleIngest(folder.id, folder.folder_path)}
                          disabled={ingesting}
                          style={{ fontFamily: "'Poppins', sans-serif", fontSize: '10px', letterSpacing: '0.08em', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          sync
                        </button>
                      )}
                      <button
                        onClick={() => handleRemove(folder.id)}
                        disabled={ingesting}
                        style={{ fontFamily: "'Poppins', sans-serif", fontSize: '10px', letterSpacing: '0.08em', color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
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