import { useState, useRef } from 'react';

export default function Compose() {
  const [content, setContent] = useState('');
  const editorRef = useRef(null);

  const wordCount = content.trim()
    ? content.trim().split(/\s+/).length
    : 0;

  return (
    <div style={{ height: '100vh', position: 'relative', overflow: 'hidden' }}>

      {/* Corner labels */}
      <span style={{
        position: 'absolute', top: 16, left: 20,
        fontFamily: "'Poppins', sans-serif", fontSize: '10px',
        letterSpacing: '0.12em', textTransform: 'uppercase',
        color: 'var(--text-faint)', zIndex: 10
      }}>
        Associations
      </span>

      <span style={{
        position: 'absolute', top: 16, right: 20,
        fontFamily: "'Poppins', sans-serif", fontSize: '10px',
        color: 'var(--text-faint)', letterSpacing: '0.06em', zIndex: 10
      }}>
        Untitled
      </span>

      <span style={{
        position: 'absolute', bottom: 14, right: 20,
        fontFamily: "'Poppins', sans-serif", fontSize: '10px',
        color: 'var(--text-faint)', letterSpacing: '0.06em', zIndex: 10
      }}>
        {wordCount} words
      </span>

      {/* Writing surface */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => setContent(e.currentTarget.innerText)}
        style={{
          position: 'absolute',
          inset: 0,
          padding: '64px 10vw',
          fontFamily: "'Lora', serif",
          fontSize: '20px',
          lineHeight: '2',
          color: 'var(--text)',
          outline: 'none',
          overflowY: 'auto',
          caretColor: 'var(--text-muted)',
        }}
      />
    </div>
  );
}