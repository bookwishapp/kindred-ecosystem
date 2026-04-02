import { useState } from 'react';

export default function ExportPicker({ documentTitle, content, onClose }) {
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState(null);

  async function handleExport(format) {
    setExporting(true);
    try {
      const res = await window.electron.export.document({
        content,
        defaultName: documentTitle || 'Untitled',
        format,
      });
      setResult(res);
    } catch (err) {
      setResult({ success: false, error: err.message });
    }
    setExporting(false);
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
        width: '380px',
        maxWidth: '90vw',
      }}>
        {result ? (
          <>
            <p style={{
              fontFamily: "'Lora', serif", fontStyle: 'italic',
              fontSize: '17px', color: result.success ? 'var(--text-muted)' : 'var(--text)',
              lineHeight: '1.7', marginBottom: '28px',
            }}>
              {result.success ? 'Exported.' : `Export failed: ${result.error}`}
            </p>
            <button
              onClick={onClose}
              style={{ fontFamily: "'Poppins', sans-serif", fontSize: '11px', letterSpacing: '0.08em', color: 'var(--text-muted)', background: 'none', border: '0.5px solid var(--text-faint)', borderRadius: '6px', padding: '10px 24px', cursor: 'pointer' }}
            >
              Done
            </button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
                Export
              </p>
              <button onClick={onClose} style={{ fontFamily: "'Poppins', sans-serif", fontSize: '10px', color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>

            <p style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '15px', color: 'var(--text-muted)', marginBottom: '28px' }}>
              {documentTitle || 'Untitled'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={() => handleExport('rtf')}
                disabled={exporting}
                style={{
                  fontFamily: "'Poppins', sans-serif", fontSize: '13px',
                  color: 'var(--text)', background: 'white',
                  border: '0.5px solid var(--border)', borderRadius: '8px',
                  padding: '16px 24px', cursor: 'pointer',
                  textAlign: 'left', letterSpacing: '0.02em',
                }}
              >
                <span style={{ display: 'block', marginBottom: '3px' }}>Rich Text (.rtf)</span>
                <span style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '12px', color: 'var(--text-faint)' }}>
                  Opens in Scrivener, Pages, Word, Google Docs
                </span>
              </button>

              <button
                onClick={() => handleExport('txt')}
                disabled={exporting}
                style={{
                  fontFamily: "'Poppins', sans-serif", fontSize: '13px',
                  color: 'var(--text)', background: 'white',
                  border: '0.5px solid var(--border)', borderRadius: '8px',
                  padding: '16px 24px', cursor: 'pointer',
                  textAlign: 'left', letterSpacing: '0.02em',
                }}
              >
                <span style={{ display: 'block', marginBottom: '3px' }}>Plain Text (.txt)</span>
                <span style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '12px', color: 'var(--text-faint)' }}>
                  Universal — paste anywhere
                </span>
              </button>
            </div>

            {exporting && (
              <p style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '13px', color: 'var(--text-faint)', marginTop: '20px' }}>
                Exporting…
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
