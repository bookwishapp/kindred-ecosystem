import { useEffect, useState } from 'react';

const GROW_DURATION = 7000; // ms to reach near-full strength
const NEAR_FULL_OPACITY = 0.88;
const FULL_OPACITY = 1.0;

export default function Ghost({ ghost, onLetItGo, onWatch, onKeep, watching }) {
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (!ghost) {
      setOpacity(0);
      return;
    }

    // Grow from 0 to near-full over GROW_DURATION
    const start = performance.now();
    let frame;

    function grow(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / GROW_DURATION, 1);
      // Ease-in curve — slow at first, accelerates
      const eased = progress * progress * progress;
      setOpacity(eased * NEAR_FULL_OPACITY);

      if (progress < 1) {
        frame = requestAnimationFrame(grow);
      }
    }

    frame = requestAnimationFrame(grow);
    return () => cancelAnimationFrame(frame);
  }, [ghost]);

  // When watching, jump to full opacity
  useEffect(() => {
    if (watching) setOpacity(FULL_OPACITY);
  }, [watching]);

  if (!ghost) return null;

  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0, right: 0,
      padding: '40px 10vw 28px',
      background: `linear-gradient(to bottom,
        rgba(245,243,239,${opacity}) 0%,
        rgba(245,243,239,${opacity}) 65%,
        rgba(245,243,239,0) 100%
      )`,
      zIndex: 8,
      pointerEvents: opacity > 0.1 ? 'auto' : 'none',
      transition: watching ? 'none' : undefined,
    }}>
      <p style={{
        fontFamily: "'Lora', serif",
        fontStyle: 'italic',
        fontSize: '15px',
        lineHeight: '1.75',
        color: `rgba(42, 40, 37, ${opacity})`,
        marginBottom: '12px',
        maxWidth: '600px',
      }}>
        {ghost.content}
      </p>

      <div style={{ display: 'flex', gap: '24px', opacity }}>
        <button
          onClick={onLetItGo}
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: '10px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--text-faint)',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
          }}
        >
          let it go
        </button>

        <button
          onClick={onWatch}
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: '10px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: watching ? 'var(--text-muted)' : 'var(--text-faint)',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
          }}
        >
          {watching ? 'watching' : 'watch'}
        </button>

        <button
          onClick={onKeep}
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: '10px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--text-faint)',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
          }}
        >
          keep
        </button>
      </div>
    </div>
  );
}