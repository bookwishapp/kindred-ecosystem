import { useState, useEffect } from 'react';
import './styles/globals.css';
import Compose from './components/Compose';
import FolderWatch from './components/FolderWatch';
import QASession from './components/QASession';
import DocumentList from './components/DocumentList';
import ProjectSwitcher from './components/ProjectSwitcher';
import ExportPicker from './components/ExportPicker';
import Outline from './components/Outline';
import Checkout from './components/Checkout';

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  const [projectId, setProjectId] = useState('default');
  const [documentId, setDocumentId] = useState('default');
  const [projectName, setProjectName] = useState('Default');
  const [documentTitle, setDocumentTitle] = useState('Untitled');
  const [questionsWaiting, setQuestionsWaiting] = useState(0);

  const [mode, setMode] = useState('compose'); // 'compose' | 'outline'

  const [demoReady, setDemoReady] = useState(false);
  const [processingDemo, setProcessingDemo] = useState(false);

  const [updateReady, setUpdateReady] = useState(false);

  const [showFolderWatch, setShowFolderWatch] = useState(false);
  const [showQA, setShowQA] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [exportContent, setExportContent] = useState('');

  useEffect(() => {
    async function init() {
      const token = await window.electron.getToken();
      setAuthed(!!token);
      setChecking(false);

      if (token) {
        await loadActiveContext();
      }

      window.electron.onDeepLink((url) => {
        const parsed = new URL(url);

        if (parsed.protocol === 'associations:' && parsed.host === 'auth') {
          const token = parsed.searchParams.get('access_token');
          if (token) {
            window.electron.saveToken(token).then(() => {
              setAuthed(true);
              loadActiveContext();
            });
          }
        }

        if (parsed.protocol === 'associations:' && parsed.host === 'billing') {
          const status = parsed.searchParams.get('status');
          if (status === 'success') {
            // Re-fetch user profile to pick up new subscription status
            setTimeout(() => {
              fetchUserProfile().then(setUserProfile);
            }, 2000); // Give webhook time to process
          }
        }
      });
    }
    init();
  }, []);

  // Wire menu events
  useEffect(() => {
    if (!authed) return;
    window.electron.menu.onNewDocument(() => handleNewDocument());
    window.electron.menu.onOpenDocument(() => setShowDocuments(true));
    window.electron.menu.onFolders(() => setShowFolderWatch(true));
    window.electron.menu.onQuestions(() => setShowQA(true));
    window.electron.menu.onDocuments(() => setShowDocuments(true));
    window.electron.menu.onNewProject(() => setShowProjects(true));
    window.electron.menu.onSwitchProject(() => setShowProjects(true));
    window.electron.menu.onCompose(() => setMode('compose'));
    window.electron.menu.onOutline(() => setMode('outline'));
    window.electron.menu.onBilling(async () => {
      const token = await window.electron.getToken();
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/stripe/portal`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const { url } = await res.json();
        window.electron.openExternal(url);
      }
    });
    window.electron.menu.onExport(async () => {
      const saved = await window.electron.document.load({ documentId });
      setExportContent(saved || '');
      setShowExport(true);
    });
  }, [authed, documentId]);

  // Check questions waiting periodically
  useEffect(() => {
    if (!authed) return;
    checkQuestionsWaiting();
    const interval = setInterval(checkQuestionsWaiting, 60000);
    return () => clearInterval(interval);
  }, [authed, projectId]);

  // Listen for update notifications
  useEffect(() => {
    window.electron.onUpdateDownloaded(() => {
      setUpdateReady(true);
    });
  }, []);

  async function checkQuestionsWaiting() {
    const unanswered = await window.electron.qa.getUnanswered({ projectId });
    setQuestionsWaiting(unanswered.length);
  }

  async function fetchUserProfile() {
    const token = await window.electron.getToken();
    if (!token) return null;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/profile`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.error('Failed to fetch user profile:', e);
    }
    return null;
  }

  async function loadActiveContext() {
    const activeProjectId = await window.electron.projects.getActive();
    setProjectId(activeProjectId);

    const projects = await window.electron.projects.list();
    const project = projects.find(p => p.id === activeProjectId);
    if (project) setProjectName(project.name);

    const activeDocId = await window.electron.documents.getActive({ projectId: activeProjectId });
    if (activeDocId) {
      setDocumentId(activeDocId);
      const docs = await window.electron.documents.list({ projectId: activeProjectId });
      const doc = docs.find(d => d.id === activeDocId);
      if (doc) setDocumentTitle(doc.title);
    }

    // Fetch user profile to check subscription status
    const profile = await fetchUserProfile();
    setUserProfile(profile);

    // Process demo embeddings if needed (first launch)
    setProcessingDemo(true);
    const result = await window.electron.processDemoEmbeddings();
    setProcessingDemo(false);
    setDemoReady(true);

    if (result.count > 0) {
      console.log(`First launch: seeded ${result.count} demo passages`);
    }
  }

  async function handleProjectSelect(newProjectId, newDocumentId) {
    await window.electron.projects.setActive({ projectId: newProjectId });
    setProjectId(newProjectId);

    const projects = await window.electron.projects.list();
    const project = projects.find(p => p.id === newProjectId);
    if (project) setProjectName(project.name);

    let docId = newDocumentId;
    if (!docId) {
      docId = await window.electron.documents.getActive({ projectId: newProjectId });
      if (!docId) {
        const docs = await window.electron.documents.list({ projectId: newProjectId });
        docId = docs[0]?.id;
      }
    }

    if (docId) {
      setDocumentId(docId);
      await window.electron.documents.setActive({ projectId: newProjectId, documentId: docId });
      const docs = await window.electron.documents.list({ projectId: newProjectId });
      const doc = docs.find(d => d.id === docId);
      if (doc) setDocumentTitle(doc.title);
    }
  }

  async function handleDocumentSelect(newDocumentId) {
    setDocumentId(newDocumentId);
    await window.electron.documents.setActive({ projectId, documentId: newDocumentId });
    const docs = await window.electron.documents.list({ projectId });
    const doc = docs.find(d => d.id === newDocumentId);
    if (doc) setDocumentTitle(doc.title);
  }

  async function handleNewDocument() {
    const id = await window.electron.documents.create({ projectId, title: 'Untitled' });
    await handleDocumentSelect(id);
  }

  if (checking) return null;

  if (authed && userProfile && !userProfile.can_write) {
    return <Checkout onClose={() => {
      // Re-check subscription after returning from Stripe
      fetchUserProfile().then(setUserProfile);
    }} />;
  }

  if (!authed) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '24px', padding: '48px' }}>
        <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
          Associations
        </p>
        {sent ? (
          <p style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '16px', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '320px', lineHeight: '1.7' }}>
            Check your email for a sign-in link.
          </p>
        ) : (
          <form onSubmit={async (e) => {
            e.preventDefault();
            setSending(true);
            try {
              await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, redirect_uri: 'associations://auth/verify' }),
              });
              setSent(true);
            } catch {}
            setSending(false);
          }} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '280px' }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              style={{ fontFamily: "'Lora', serif", fontSize: '15px', padding: '10px 14px', border: '0.5px solid var(--text-faint)', borderRadius: '6px', background: 'transparent', color: 'var(--text)', outline: 'none', textAlign: 'center' }}
            />
            <button type="submit" disabled={sending} style={{ fontFamily: "'Poppins', sans-serif", fontSize: '12px', letterSpacing: '0.08em', background: 'none', border: '0.5px solid var(--text-faint)', color: 'var(--text-muted)', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer' }}>
              {sending ? 'Sending…' : 'Send sign-in link'}
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', position: 'relative' }}>
      {processingDemo && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '16px',
          zIndex: 200,
        }}>
          <p style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: '11px',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--text-faint)',
          }}>
            Associations
          </p>
          <p style={{
            fontFamily: "'Lora', serif",
            fontStyle: 'italic',
            fontSize: '15px',
            color: 'var(--text-faint)',
            animation: 'pulse 2s ease-in-out infinite',
          }}>
            getting ready…
          </p>
        </div>
      )}

      {mode === 'compose' ? (
        <Compose
          key={documentId}
          projectId={projectId}
          documentId={documentId}
          documentTitle={documentTitle}
          onWordCountChange={(wc) => {
            window.electron.documents.updateWordCount({ documentId, wordCount: wc });
          }}
        />
      ) : (
        <Outline
          projectId={projectId}
          activeDocumentId={documentId}
          onSwitchDocument={handleDocumentSelect}
          onClose={() => setMode('compose')}
        />
      )}

      {/* Bottom-left: questions waiting */}
      {questionsWaiting > 0 && (
        <span
          onClick={() => setShowQA(true)}
          style={{
            position: 'fixed', bottom: 14, left: 20,
            fontFamily: "'Poppins', sans-serif", fontSize: '10px',
            color: 'var(--text-faint)', letterSpacing: '0.08em',
            zIndex: 10, cursor: 'pointer', userSelect: 'none',
          }}
        >
          {questionsWaiting} {questionsWaiting === 1 ? 'question' : 'questions'} waiting
        </span>
      )}

      {/* Bottom-center: update notification */}
      {updateReady && (
        <span
          style={{
            position: 'fixed',
            bottom: 14,
            left: '50%',
            transform: 'translateX(-50%)',
            fontFamily: "'Poppins', sans-serif",
            fontSize: '10px',
            color: 'var(--text-faint)',
            letterSpacing: '0.08em',
            zIndex: 10,
            userSelect: 'none',
            cursor: 'default',
          }}
        >
          update ready — restarts on quit
        </span>
      )}

      {showFolderWatch && <FolderWatch projectId={projectId} onClose={() => setShowFolderWatch(false)} />}
      {showQA && <QASession projectId={projectId} onClose={() => { setShowQA(false); checkQuestionsWaiting(); }} />}
      {showDocuments && <DocumentList projectId={projectId} activeDocumentId={documentId} onSelect={handleDocumentSelect} onClose={() => setShowDocuments(false)} />}
      {showProjects && <ProjectSwitcher activeProjectId={projectId} onSelect={handleProjectSelect} onClose={() => setShowProjects(false)} />}
      {showExport && <ExportPicker documentTitle={documentTitle} content={exportContent} onClose={() => setShowExport(false)} />}
    </div>
  );
}
