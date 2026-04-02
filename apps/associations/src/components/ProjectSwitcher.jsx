import { useState, useEffect } from 'react';

export default function ProjectSwitcher({ activeProjectId, onSelect, onClose }) {
  const [projects, setProjects] = useState([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => { loadProjects(); }, []);

  async function loadProjects() {
    const list = await window.electron.projects.list();
    setProjects(list);
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    const { projectId, documentId } = await window.electron.projects.create({ name: newName.trim() });
    setCreating(false);
    setNewName('');
    await loadProjects();
    onSelect(projectId, documentId);
  }

  async function handleRename(id) {
    if (!renameValue.trim()) return;
    await window.electron.projects.rename({ projectId: id, name: renameValue.trim() });
    setRenaming(null);
    await loadProjects();
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
        width: '440px',
        maxWidth: '90vw',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
            Projects
          </p>
          <button onClick={onClose} style={{ fontFamily: "'Poppins', sans-serif", fontSize: '10px', color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer' }}>
            Close
          </button>
        </div>

        {projects.map(project => (
          <div key={project.id} style={{
            display: 'flex', alignItems: 'center',
            padding: '12px 0', borderBottom: '0.5px solid var(--border)',
            background: project.id === activeProjectId ? 'rgba(42,40,37,0.03)' : 'transparent',
          }}>
            <div style={{ flex: 1 }}>
              {renaming === project.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onBlur={() => handleRename(project.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleRename(project.id);
                    if (e.key === 'Escape') setRenaming(null);
                  }}
                  style={{ fontFamily: "'Lora', serif", fontSize: '16px', color: 'var(--text)', background: 'transparent', border: 'none', borderBottom: '0.5px solid var(--text-muted)', outline: 'none', padding: '0 0 2px', width: '100%' }}
                />
              ) : (
                <p
                  onClick={() => { onSelect(project.id, null); onClose(); }}
                  style={{ fontFamily: "'Lora', serif", fontSize: '16px', color: 'var(--text)', cursor: 'pointer' }}
                >
                  {project.name}
                  {project.id === activeProjectId && (
                    <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: '10px', color: 'var(--text-faint)', marginLeft: '10px', letterSpacing: '0.06em' }}>active</span>
                  )}
                </p>
              )}
            </div>
            <button
              onClick={() => { setRenaming(project.id); setRenameValue(project.name); }}
              style={{ fontFamily: "'Poppins', sans-serif", fontSize: '10px', color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer', marginLeft: '12px' }}
            >
              rename
            </button>
          </div>
        ))}

        {creating ? (
          <div style={{ marginTop: '20px' }}>
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') { setCreating(false); setNewName(''); }
              }}
              placeholder="Project name"
              style={{ fontFamily: "'Lora', serif", fontSize: '16px', color: 'var(--text)', background: 'transparent', border: 'none', borderBottom: '0.5px solid var(--text-muted)', outline: 'none', padding: '0 0 4px', width: '100%', marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={handleCreate} style={{ fontFamily: "'Poppins', sans-serif", fontSize: '11px', color: 'var(--text-muted)', background: 'none', border: '0.5px solid var(--text-faint)', borderRadius: '6px', padding: '8px 20px', cursor: 'pointer' }}>
                Create
              </button>
              <button onClick={() => { setCreating(false); setNewName(''); }} style={{ fontFamily: "'Poppins', sans-serif", fontSize: '11px', color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            style={{ marginTop: '24px', fontFamily: "'Poppins', sans-serif", fontSize: '11px', letterSpacing: '0.08em', color: 'var(--text-muted)', background: 'none', border: '0.5px solid var(--text-faint)', borderRadius: '6px', padding: '10px 20px', cursor: 'pointer', width: '100%' }}
          >
            + New Project
          </button>
        )}
      </div>
    </div>
  );
}
