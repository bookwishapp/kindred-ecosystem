import { useState, useRef, useEffect, useCallback } from 'react';
import Ghost from './Ghost';
import { findGhost } from '../db/ghosts';
import { addToPool } from '../db/pool';
import { reportWords } from '../api/client';

const GHOST_CHECK_INTERVAL = 4000; // check for ghost every 4s after pause
const PASSAGE_SAVE_INTERVAL = 30000; // save passage to pool every 30s
const MIN_WORDS_FOR_GHOST = 50; // don't look for ghosts until some writing exists

export default function Compose({ projectId = 'default', documentId = 'default', documentTitle = 'Untitled' }) {
  const [content, setContent] = useState('');
  const [ghost, setGhost] = useState(null);
  const [watching, setWatching] = useState(false);
  const [shownGhostIds, setShownGhostIds] = useState([]);

  const editorRef = useRef(null);
  const ghostCheckTimer = useRef(null);
  const passageSaveTimer = useRef(null);
  const lastContentRef = useRef('');

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  // Check for a ghost after the writer pauses
  const checkForGhost = useCallback(async () => {
    if (!content || wordCount < MIN_WORDS_FOR_GHOST) return;
    if (ghost) return; // already showing one

    const found = await findGhost({
      projectId,
      currentText: content,
      excludeIds: shownGhostIds,
    });

    if (found) {
      setGhost(found);
      setWatching(false);
    }
  }, [content, wordCount, ghost, projectId, shownGhostIds]);

  // Restart ghost check timer on every keystroke
  useEffect(() => {
    clearTimeout(ghostCheckTimer.current);
    ghostCheckTimer.current = setTimeout(checkForGhost, GHOST_CHECK_INTERVAL);
    return () => clearTimeout(ghostCheckTimer.current);
  }, [content, checkForGhost]);

  // Periodically save recent passage to pool
  useEffect(() => {
    clearTimeout(passageSaveTimer.current);
    passageSaveTimer.current = setTimeout(async () => {
      const current = content.trim();
      if (current && current !== lastContentRef.current && wordCount > 10) {
        // Save last ~200 words as a pool entry
        const words = current.split(/\s+/);
        const passage = words.slice(-200).join(' ');
        await addToPool({ projectId, content: passage, source: 'compose' });

        // Report word count for trial tracking
        const newWords = current.split(/\s+/).length
          - (lastContentRef.current?.split(/\s+/).length || 0);
        if (newWords > 0) await reportWords(newWords);

        lastContentRef.current = current;
      }
    }, PASSAGE_SAVE_INTERVAL);
    return () => clearTimeout(passageSaveTimer.current);
  }, [content, wordCount, projectId]);

  function handleLetItGo() {
    if (ghost) setShownGhostIds(prev => [...prev, ghost.id]);
    setGhost(null);
    setWatching(false);
  }

  function handleWatch() {
    setWatching(true);
  }

  function handleKeep() {
    if (!ghost) return;
    const id = window.crypto.randomUUID();
    window.electron.db.addKeptGhost({ id, documentId, poolEntryId: ghost.id });
    setShownGhostIds(prev => [...prev, ghost.id]);
    setGhost(null);
    setWatching(false);
  }

  return (
    <div style={{ height: '100vh', position: 'relative', overflow: 'hidden' }}>

      {/* Corner labels */}
      <span style={{
        position: 'absolute', top: 16, left: 20,
        fontFamily: "'Poppins', sans-serif", fontSize: '10px',
        letterSpacing: '0.12em', textTransform: 'uppercase',
        color: 'var(--text-faint)', zIndex: 10, userSelect: 'none'
      }}>
        Associations
      </span>

      <span style={{
        position: 'absolute', top: 16, right: 20,
        fontFamily: "'Poppins', sans-serif", fontSize: '10px',
        color: 'var(--text-faint)', letterSpacing: '0.06em',
        zIndex: 10, userSelect: 'none'
      }}>
        {documentTitle}
      </span>

      <span style={{
        position: 'absolute', bottom: 14, right: 20,
        fontFamily: "'Poppins', sans-serif", fontSize: '10px',
        color: 'var(--text-faint)', letterSpacing: '0.06em',
        zIndex: 10, userSelect: 'none'
      }}>
        {wordCount.toLocaleString()} words
      </span>

      {/* Fade at bottom */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '40px', zIndex: 5, pointerEvents: 'none',
        background: 'linear-gradient(to top, var(--bg) 0%, transparent 100%)'
      }} />

      {/* Ghost overlay */}
      <Ghost
        ghost={ghost}
        watching={watching}
        onLetItGo={handleLetItGo}
        onWatch={handleWatch}
        onKeep={handleKeep}
      />

      {/* Writing surface */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => setContent(e.currentTarget.innerText)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return;
          e.preventDefault();

          const sel = window.getSelection();
          if (!sel.rangeCount) return;
          const range = sel.getRangeAt(0);
          range.deleteContents();

          // Create new paragraph div with indent
          const newDiv = document.createElement('div');
          newDiv.style.textIndent = '2em';
          newDiv.appendChild(document.createElement('br'));

          range.insertNode(newDiv);
          range.setStart(newDiv, 0);
          range.setEnd(newDiv, 0);
          sel.removeAllRanges();
          sel.addRange(range);

          e.currentTarget.dispatchEvent(new Event('input', { bubbles: true }));
        }}
        style={{
          position: 'absolute',
          inset: 0,
          padding: '64px 10vw 64px',
          fontFamily: "'Lora', serif",
          fontSize: '20px',
          lineHeight: '2',
          color: 'var(--text)',
          outline: 'none',
          overflowY: 'auto',
          caretColor: 'var(--text-muted)',
          zIndex: 1,
        }}
      />
    </div>
  );
}