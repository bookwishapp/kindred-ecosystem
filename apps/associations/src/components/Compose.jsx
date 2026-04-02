import { useState, useRef, useEffect, useCallback } from 'react';
import Ghost from './Ghost';
import { findGhost } from '../db/ghosts';
import { addToPool, SESSION_ID } from '../db/pool';
import { reportWords } from '../api/client';

const GHOST_CHECK_INTERVAL = 4000;
const PASSAGE_SAVE_INTERVAL = 30000;
const MIN_WORDS_FOR_GHOST = 300;
const CARET_BOTTOM_MARGIN = 120; // pixels from bottom to keep caret

export default function Compose({ projectId = 'default', documentId = 'default', documentTitle = 'Untitled', onWordCountChange }) {
  const [wordCount, setWordCount] = useState(0);
  const [ghost, setGhost] = useState(null);
  const [watching, setWatching] = useState(false);
  const [shownGhostIds, setShownGhostIds] = useState([]);
  const [keptConfirm, setKeptConfirm] = useState(false);

  const editorRef = useRef(null);
  const contentRef = useRef(''); // source of truth — never stored in state
  const ghostCheckTimer = useRef(null);
  const passageSaveTimer = useRef(null);
  const lastSavedContentRef = useRef('');
  const ghostRef = useRef(null); // mirror ghost state for callbacks
  const autoSaveTimer = useRef(null);
  const isDirtyRef = useRef(false); // true when content has changed since last save

  // Keep ghostRef in sync
  useEffect(() => { ghostRef.current = ghost; }, [ghost]);

  useEffect(() => {
    async function loadDocument() {
      const saved = await window.electron.document.load({ documentId });
      if (saved && editorRef.current) {
        editorRef.current.innerText = saved;
        contentRef.current = saved;
        setWordCount(getWordCount(saved));
      }
    }
    loadDocument();

    // Save immediately on app quit
    window.electron.document.onWillQuit(() => {
      saveDocument();
    });

    // Save on component unmount
    return () => {
      saveDocument();
      clearTimeout(autoSaveTimer.current);
      clearTimeout(ghostCheckTimer.current);
      clearTimeout(passageSaveTimer.current);
    };
  }, []); // runs once on mount only

  function getWordCount(text) {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  }

  function scrollCaretIntoView() {
    const editor = editorRef.current;
    if (!editor) return;
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0).cloneRange();
    range.collapse(true);
    const rect = range.getBoundingClientRect();
    if (!rect) return;
    const editorRect = editor.getBoundingClientRect();
    const caretBottom = rect.bottom - editorRect.top + editor.scrollTop;
    const targetScroll = caretBottom - editorRect.height + CARET_BOTTOM_MARGIN;
    if (targetScroll > editor.scrollTop) {
      editor.scrollTop = targetScroll;
    }
  }

  async function saveDocument() {
    if (!isDirtyRef.current) return;
    const content = contentRef.current;
    if (!content.trim()) return;
    await window.electron.document.save({ documentId, content });
    isDirtyRef.current = false;
  }

  const checkForGhost = useCallback(async () => {
    const content = contentRef.current;
    const wc = getWordCount(content);
    if (!content || wc < MIN_WORDS_FOR_GHOST) return;
    if (ghostRef.current) return;

    const found = await findGhost({
      projectId,
      currentText: content,
      excludeIds: shownGhostIds,
    });

    if (found) {
      setGhost(found);
      setWatching(false);
      return;
    }

    // No passage ghost — check if there's a genuine question worth asking
    if (wc >= 200) {
      const entries = await window.electron.db.getPoolEntries({
        projectId,
        excludeSessionId: SESSION_ID,
      });
      if (entries.length >= 5) {
        const { generateQuestion } = await import('../db/questions');
        const q = await generateQuestion({
          projectId,
          recentText: contentRef.current,
          poolEntries: entries,
        });
        if (q) {
          const id = window.crypto.randomUUID();
          await window.electron.qa.save({
            id, projectId, question: q,
            sourceExcerpt: contentRef.current.slice(-400),
            askedAsGhost: true,
          });
          setGhost({ id, content: q, isQuestion: true });
          setWatching(false);
        }
      }
    }
  }, [projectId, shownGhostIds]);

  function handleInput(e) {
    const text = e.currentTarget.innerText;
    contentRef.current = text;
    const wc = getWordCount(text);
    setWordCount(wc);
    if (onWordCountChange) onWordCountChange(wc);

    isDirtyRef.current = true;

    // Auto-save 10 seconds after last change
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(saveDocument, 10000);

    // Ghost check timer
    clearTimeout(ghostCheckTimer.current);
    ghostCheckTimer.current = setTimeout(checkForGhost, GHOST_CHECK_INTERVAL);

    // Passage save timer
    clearTimeout(passageSaveTimer.current);
    passageSaveTimer.current = setTimeout(async () => {
      const current = contentRef.current.trim();
      if (current && current !== lastSavedContentRef.current && getWordCount(current) > 10) {
        const words = current.split(/\s+/);
        const passage = words.slice(-100).join(' '); // last ~100 words
        await addToPool({ projectId, content: passage, source: 'compose' });
        const newWords = getWordCount(current) - getWordCount(lastSavedContentRef.current);
        if (newWords > 0) await reportWords(newWords);
        lastSavedContentRef.current = current;
      }
    }, PASSAGE_SAVE_INTERVAL);

    scrollCaretIntoView();
  }

  async function handleKeyDown(e) {
    if (e.key === '"') {
      e.preventDefault();
      const sel = window.getSelection();
      const range = sel.getRangeAt(0);
      const before = range.startContainer.textContent?.slice(0, range.startOffset) || '';
      const isOpening = before.length === 0 || /\s/.test(before[before.length - 1]);
      const quote = isOpening ? '\u201C' : '\u201D';
      document.execCommand('insertText', false, quote);
      return;
    }

    if (e.key === "'") {
      e.preventDefault();
      const sel = window.getSelection();
      const range = sel.getRangeAt(0);
      const before = range.startContainer.textContent?.slice(0, range.startOffset) || '';
      const isOpening = before.length === 0 || /\s/.test(before[before.length - 1]);
      const quote = isOpening ? '\u2018' : '\u2019';
      document.execCommand('insertText', false, quote);
      return;
    }

    if (e.key === '*') {
      e.preventDefault();
      const sel = window.getSelection();
      if (!sel.rangeCount) return;

      // Get the current paragraph text
      const range = sel.getRangeAt(0);
      const container = range.startContainer;
      const paraEl = container.nodeType === 3 ? container.parentElement : container;
      const paraText = paraEl.innerText || paraEl.textContent || '';

      if (paraText.trim().length < 5) return; // too short to tag

      // Add visual dot marker
      paraEl.style.borderLeft = '2px solid var(--text-faint)';
      paraEl.style.paddingLeft = '12px';
      paraEl.style.marginLeft = '-14px';

      // Save tag to database
      const id = window.crypto.randomUUID();
      await window.electron.tags.add({
        id,
        documentId,
        projectId,
        content: paraText.trim(),
        characterOffset: range.startOffset,
      });

      return;
    }

    if (e.key !== 'Enter') return;
    e.preventDefault();

    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();

    const newDiv = document.createElement('div');
    newDiv.style.textIndent = '2em';
    newDiv.appendChild(document.createElement('br'));

    range.insertNode(newDiv);
    range.setStart(newDiv, 0);
    range.setEnd(newDiv, 0);
    sel.removeAllRanges();
    sel.addRange(range);

    e.currentTarget.dispatchEvent(new Event('input', { bubbles: true }));
    requestAnimationFrame(scrollCaretIntoView);
  }

  function handleLetItGo() {
    if (ghostRef.current) setShownGhostIds(prev => [...prev, ghostRef.current.id]);
    setGhost(null);
    setWatching(false);
  }

  function handleWatch() {
    setWatching(true);
  }

  function handleKeep() {
    const g = ghostRef.current;
    if (!g) return;
    const id = window.crypto.randomUUID();
    window.electron.db.addKeptGhost({ id, documentId, poolEntryId: g.id });
    setShownGhostIds(prev => [...prev, g.id]);
    setGhost(null);
    setWatching(false);
    setKeptConfirm(true);
    setTimeout(() => setKeptConfirm(false), 2000);
  }

  return (
    <div style={{ height: '100vh', position: 'relative', overflow: 'hidden' }}>

      <span style={{
        position: 'absolute', top: 16, left: 80,
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

      {keptConfirm && (
        <span style={{
          position: 'absolute', top: 20, left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: "'Poppins', sans-serif", fontSize: '10px',
          letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--text-muted)', zIndex: 10, userSelect: 'none',
          animation: 'fadeOut 2s ease-in forwards',
        }}>
          kept
        </span>
      )}

      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '120px', zIndex: 5, pointerEvents: 'none',
        background: 'linear-gradient(to top, var(--bg) 0%, transparent 100%)'
      }} />

      <Ghost
        ghost={ghost}
        watching={watching}
        onLetItGo={handleLetItGo}
        onWatch={handleWatch}
        onKeep={handleKeep}
      />

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        style={{
          position: 'absolute',
          inset: 0,
          padding: '56px 10vw 160px',
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
