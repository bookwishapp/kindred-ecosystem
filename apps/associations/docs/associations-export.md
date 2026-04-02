# Associations — Export

## Context

Read `docs/ARCHITECTURE.md`, `docs/CLAUDE.md`, and `apps/associations/docs/ASSOCIATIONS_ARCHITECTURE.md` before starting.

This prompt adds export functionality. Read every file before touching it. No scope creep. No other files modified outside this list.

---

## What Export Does

From the File menu, the writer can export the current document as:
- **Plain text (.txt)** — raw content, universal
- **Rich Text (.rtf)** — formatted, imports cleanly into Scrivener, Pages, Word, Google Docs

Export uses the native macOS save dialog. The writer chooses the location and filename. The file is written and confirmed. No in-app download UI needed.

---

## Task A — Add export IPC handler

Read `apps/associations/electron/main.js`.

Add after existing IPC handlers:

```js
const { dialog: exportDialog } = require('electron'); // already imported as dialog

ipcMain.handle('export-document', async (event, { content, defaultName, format }) => {
  const extensions = format === 'rtf' ? ['rtf'] : ['txt'];
  const filters = format === 'rtf'
    ? [{ name: 'Rich Text', extensions: ['rtf'] }, { name: 'All Files', extensions: ['*'] }]
    : [{ name: 'Plain Text', extensions: ['txt'] }, { name: 'All Files', extensions: ['*'] }];

  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: `${defaultName || 'Untitled'}.${extensions[0]}`,
    filters,
    title: 'Export Document',
  });

  if (result.canceled || !result.filePath) return { success: false };

  try {
    let output;
    if (format === 'rtf') {
      output = generateRTF(content);
    } else {
      output = content;
    }

    fs.writeFileSync(result.filePath, output, format === 'rtf' ? 'binary' : 'utf8');
    return { success: true, filePath: result.filePath };
  } catch (err) {
    console.error('Export error:', err.message);
    return { success: false, error: err.message };
  }
});

function generateRTF(text) {
  // RTF header
  const header = '{\\rtf1\\ansi\\ansicpg1252\\cocoartf2639\n' +
    '{\\fonttbl\\f0\\froman\\fcharset0 TimesNewRomanPSMT;}\n' +
    '{\\colortbl;\\red0\\green0\\blue0;}\n' +
    '\\paperw12240\\paperh15840\\margl1800\\margr1800\\margt1440\\margb1440\n' +
    '\\f0\\fs24\\cf1\n';

  // Split into paragraphs — each div becomes a paragraph
  const paragraphs = text
    .split(/\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  let body = '';
  let isFirst = true;

  for (const para of paragraphs) {
    // First paragraph: no indent. Subsequent: 0.5 inch indent (720 twips)
    const indent = isFirst ? '' : '\\fi720 ';
    const escaped = para
      .replace(/\\/g, '\\\\')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      // Smart quotes already in text — RTF unicode escape
      .replace(/\u201C/g, '\\u8220?')
      .replace(/\u201D/g, '\\u8221?')
      .replace(/\u2018/g, '\\u8216?')
      .replace(/\u2019/g, '\\u8217?')
      .replace(/\u2014/g, '\\u8212?')
      .replace(/\u2013/g, '\\u8211?');

    body += `\\pard\\sl480\\slmult1 ${indent}${escaped}\\par\n`;
    isFirst = false;
  }

  return header + body + '}';
}
```

---

## Task B — Expose export IPC in preload

Read `apps/associations/electron/preload.js`.

Add to contextBridge:

```js
export: {
  document: (data) => ipcRenderer.invoke('export-document', data),
},
```

---

## Task C — Wire export into menu

Read `apps/associations/electron/main.js`.

The File menu already has `Export…` with `accelerator: 'CmdOrCtrl+E'` that sends `menu-export` to the renderer. The renderer needs to handle this event and show an export format picker.

In `preload.js`, the menu already exposes `onExport`. The App.jsx needs to handle it.

---

## Task D — Export format picker component

Create `apps/associations/src/components/ExportPicker.jsx`:

```jsx
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
```

---

## Task E — Wire ExportPicker into App.jsx

Read `apps/associations/src/App.jsx`.

Add import and state:

```jsx
import ExportPicker from './components/ExportPicker';

const [showExport, setShowExport] = useState(false);
const [exportContent, setExportContent] = useState('');
```

In the `useEffect` that wires menu events, add:

```js
window.electron.menu.onExport(async () => {
  const saved = await window.electron.document.load({ documentId });
  setExportContent(saved || '');
  setShowExport(true);
});
```

Add the overlay:

```jsx
{showExport && (
  <ExportPicker
    documentTitle={documentTitle}
    content={exportContent}
    onClose={() => setShowExport(false)}
  />
)}
```

---

## Verification Checklist

- [ ] File > Export… opens the format picker
- [ ] Cmd+E opens the format picker
- [ ] RTF export opens native save dialog with .rtf default
- [ ] Saved .rtf opens correctly in Scrivener
- [ ] Saved .rtf opens correctly in Pages
- [ ] Plain text export saves raw content
- [ ] Smart quotes preserved in RTF export
- [ ] "Exported." confirmation shows after successful save
- [ ] Cancel closes without exporting
- [ ] No other files modified outside this list
