import { useState, useEffect, useRef } from 'react';

export default function DocumentList({ projectId, activeDocumentId, onSelect, onClose }) {
  const [documents, setDocuments] = useState([]);
  const [dragging, setDragging] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const dragOverRef = useRef(null);

  useEffect(() => { loadDocuments(); }, []);

  async function loadDocuments() {
    const docs = await window.electron.documents.list({ projectId });
    setDocuments(docs);
  }

  async function handleNew() {
    const id = await window.electron.documents.create({ projectId, title: 'Untitled' });
    await loadDocuments();
    onSelect(id);
  }

  async function handleRename(id) {
    if (!renameValue.trim()) return;
    await window.electron.documents.rename({ documentId: id, title: renameValue.trim() });
    setRenaming(null);
    await loadDocuments();
  }

  async function handleDelete(id) {
    if (documents.length <= 1) return; // never delete last document
    await window.electron.documents.delete({ documentId: id });
    await loadDocuments();
    if (id === activeDocumentId && documents.length > 1) {
      const remaining = documents.filter(d => d.id !== id);
      if (remaining.length > 0) onSelect(remaining[0].id);
    }
  }

  function handleDragStart(e, id) {
    setDragging(id);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e, id) {
    e.preventDefault();
    dragOverRef.current = id;
  }

  async function handleDrop(e, targetId) {
    e.preventDefault();
    if (!dragging || dragging === targetId) return;
    const newOrder = [...documents];
    const fromIndex = newOrder.findIndex(d => d.id === dragging);
    const toIndex = newOrder.findIndex(d => d.id === targetId);
    const [moved] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, moved);
    setDocuments(newOrder);
    await window.electron.documents.reorder({ projectId, orderedIds: newOrder.map(d => d.id) });
    setDragging(null);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(42,40,37,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100,
    }}>
      <div style={{
        background: 'var(--bg)',
        borderRadius: '12px',
        padding: '40px',
        width: '480px',
        maxWidth: '90vw',
        maxHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
            Documents
          </p>
          <button onClick={onClose} style={{ fontFamily: "'Poppins', sans-serif", fontSize: '10px', letterSpacing: '0.08em', color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer' }}>
            Close
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {documents.map(doc => (
            <div
              key={doc.id}
              draggable
              onDragStart={(e) => handleDragStart(e, doc.id)}
              onDragOver={(e) => handleDragOver(e, doc.id)}
              onDrop={(e) => handleDrop(e, doc.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: '0.5px solid var(--border)',
                opacity: dragging === doc.id ? 0.4 : 1,
                cursor: 'grab',
                background: doc.id === activeDocumentId ? 'rgba(42,40,37,0.03)' : 'transparent',
              }}
            >
              <div style={{ flex: 1, marginRight: '16px' }}>
                {renaming === doc.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={() => handleRename(doc.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRename(doc.id);
                      if (e.key === 'Escape') setRenaming(null);
                    }}
                    style={{
                      fontFamily: "'Lora', serif",
                      fontSize: '15px',
                      color: 'var(--text)',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '0.5px solid var(--text-muted)',
                      outline: 'none',
                      padding: '0 0 2px',
                      width: '100%',
                    }}
                  />
                ) : (
                  <p
                    onClick={() => { onSelect(doc.id); onClose(); }}
                    style={{ fontFamily: "'Lora', serif", fontSize: '15px', color: 'var(--text)', cursor: 'pointer', marginBottom: '2px' }}
                  >
                    {doc.title}
                  </p>
                )}
                <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: '10px', color: 'var(--text-faint)', letterSpacing: '0.06em' }}>
                  {doc.word_count > 0 ? `${doc.word_count.toLocaleString()} words` : 'empty'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => { setRenaming(doc.id); setRenameValue(doc.title); }}
                  style={{ fontFamily: "'Poppins', sans-serif", fontSize: '10px', color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.06em' }}
                >
                  rename
                </button>
                {documents.length > 1 && (
                  <button
                    onClick={() => handleDelete(doc.id)}
                    style={{ fontFamily: "'Poppins', sans-serif", fontSize: '10px', color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.06em' }}
                  >
                    delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleNew}
          style={{
            marginTop: '24px',
            fontFamily: "'Poppins', sans-serif", fontSize: '11px', letterSpacing: '0.08em',
            color: 'var(--text-muted)', background: 'none',
            border: '0.5px solid var(--text-faint)', borderRadius: '6px',
            padding: '10px 20px', cursor: 'pointer', width: '100%',
          }}
        >
          + New Document
        </button>
      </div>
    </div>
  );
}
