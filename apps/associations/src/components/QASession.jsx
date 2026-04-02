import { useState, useEffect } from 'react';
import { generateQuestion } from '../db/questions';

export default function QASession({ projectId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState(null);
  const [answer, setAnswer] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [noQuestions, setNoQuestions] = useState(false);

  useEffect(() => {
    loadQuestion();
  }, []);

  async function loadQuestion() {
    setLoading(true);
    try {
      // Check for existing unanswered questions first
      const unanswered = await window.electron.qa.getUnanswered({ projectId });
      if (unanswered.length > 0) {
        setQuestion(unanswered[0]);
        setLoading(false);
        return;
      }

      // Generate a new question
      const entries = await window.electron.db.getPoolEntries({ projectId });
      if (entries.length < 5) {
        setNoQuestions(true);
        setLoading(false);
        return;
      }

      // Get recent compose text from saved document
      const saved = await window.electron.document.load({ documentId: 'default' });
      if (!saved || saved.trim().split(/\s+/).length < 200) {
        setNoQuestions(true);
        setLoading(false);
        return;
      }

      const generated = await generateQuestion({
        projectId,
        recentText: saved,
        poolEntries: entries,
      });

      if (!generated) {
        setNoQuestions(true);
        setLoading(false);
        return;
      }

      // Save the question
      const id = window.crypto.randomUUID();
      await window.electron.qa.save({
        id,
        projectId,
        question: generated,
        sourceExcerpt: saved.slice(-400),
        askedAsGhost: false,
      });

      setQuestion({ id, question: generated });
    } catch (err) {
      console.error('Q&A load error:', err);
      setNoQuestions(true);
    }
    setLoading(false);
  }

  async function handleAnswer() {
    if (!answer.trim() || !question) return;
    setSaving(true);
    await window.electron.qa.answer({ id: question.id, answer: answer.trim() });

    // Add answer to pool
    const { addToPool } = await import('../db/pool');
    await addToPool({
      projectId,
      content: answer.trim(),
      source: 'qa',
    });

    setDone(true);
    setSaving(false);
  }

  async function handleDismiss() {
    if (question) {
      await window.electron.qa.dismiss({ id: question.id });
    }
    onClose();
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
        padding: '48px',
        width: '520px',
        maxWidth: '90vw',
      }}>
        {loading ? (
          <p style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '16px', color: 'var(--text-muted)' }}>
            Reading…
          </p>
        ) : noQuestions ? (
          <>
            <p style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '17px', color: 'var(--text-muted)', lineHeight: '1.7', marginBottom: '32px' }}>
              Nothing to ask right now.
            </p>
            <button
              onClick={onClose}
              style={{ fontFamily: "'Poppins', sans-serif", fontSize: '11px', letterSpacing: '0.08em', color: 'var(--text-muted)', background: 'none', border: '0.5px solid var(--text-faint)', borderRadius: '6px', padding: '10px 24px', cursor: 'pointer' }}
            >
              Close
            </button>
          </>
        ) : done ? (
          <>
            <p style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '17px', color: 'var(--text-muted)', lineHeight: '1.7', marginBottom: '32px' }}>
              Your answer is in the pool now.
            </p>
            <button
              onClick={onClose}
              style={{ fontFamily: "'Poppins', sans-serif", fontSize: '11px', letterSpacing: '0.08em', color: 'var(--text-muted)', background: 'none', border: '0.5px solid var(--text-faint)', borderRadius: '6px', padding: '10px 24px', cursor: 'pointer' }}
            >
              Close
            </button>
          </>
        ) : (
          <>
            <p style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '20px', color: 'var(--text)', lineHeight: '1.6', marginBottom: '36px' }}>
              {question?.question}
            </p>
            <textarea
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              placeholder="Answer however you want. Or don't."
              rows={5}
              style={{
                width: '100%',
                fontFamily: "'Lora', serif",
                fontSize: '16px',
                lineHeight: '1.8',
                color: 'var(--text)',
                background: 'transparent',
                border: 'none',
                borderTop: '0.5px solid var(--border)',
                borderBottom: '0.5px solid var(--border)',
                outline: 'none',
                padding: '20px 0',
                resize: 'none',
                marginBottom: '28px',
              }}
            />
            <div style={{ display: 'flex', gap: '16px' }}>
              <button
                onClick={handleAnswer}
                disabled={!answer.trim() || saving}
                style={{ fontFamily: "'Poppins', sans-serif", fontSize: '11px', letterSpacing: '0.08em', color: 'var(--text-muted)', background: 'none', border: '0.5px solid var(--text-faint)', borderRadius: '6px', padding: '10px 24px', cursor: 'pointer' }}
              >
                {saving ? 'Saving…' : 'Add to pool'}
              </button>
              <button
                onClick={handleDismiss}
                style={{ fontFamily: "'Poppins', sans-serif", fontSize: '11px', letterSpacing: '0.08em', color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Not now
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
