export const metadata = {
  title: 'Associations — Documentation',
  description: 'A notebook that isn\'t linear. Documentation and getting started guide.',
};

const DOWNLOAD_URL = 'https://associations-releases.s3.amazonaws.com/Associations-1.0.0-universal.dmg';

export default function DocsPage() {
  return (
    <main style={{ background: 'var(--bg)', color: 'var(--text)' }}>

      {/* Nav */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '28px 8vw',
        position: 'sticky',
        top: 0,
        background: 'var(--bg)',
        zIndex: 100,
        borderBottom: '0.5px solid var(--border)',
      }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <svg width="28" height="22" viewBox="0 0 28 22" fill="none">
            <polygon points="14,0 28,14 24,14 14,4 4,14 0,14" fill="#C8A96E" opacity="0.4"/>
            <polygon points="14,3 26,15 22,15 14,7 6,15 2,15" fill="#C8A96E" opacity="0.55"/>
            <polygon points="14,6 24,16 20,16 14,10 8,16 4,16" fill="#C8A96E" opacity="0.75"/>
            <polygon points="14,9 22,17 18,17 14,13 10,17 6,17" fill="#C8A96E"/>
          </svg>
          <span style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: '15px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--text)',
          }}>Associations</span>
        </a>
        <a href={DOWNLOAD_URL} style={{
          fontFamily: "'Poppins', sans-serif",
          fontSize: '14px',
          color: 'var(--bg)',
          background: 'var(--text)',
          padding: '11px 22px',
          borderRadius: '6px',
          textDecoration: 'none',
        }}>Download for Mac</a>
      </nav>

      {/* Content */}
      <article style={{ maxWidth: '680px', margin: '0 auto', padding: '80px 8vw 120px' }}>

        <h1 style={{ fontFamily: "'Lora', serif", fontSize: '48px', fontWeight: '400', lineHeight: '1.2', marginBottom: '16px' }}>Associations</h1>
        <h3 style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '22px', fontWeight: '400', color: 'var(--text-muted)', marginBottom: '64px' }}>A notebook that isn't linear.</h3>

        <hr style={{ border: 'none', borderTop: '0.5px solid var(--border)', margin: '64px 0' }}/>

        <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '14px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: '24px' }}>What it is</h2>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '24px' }}>Associations isn't a writing tool. It's a different kind of notebook.</p>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '24px' }}>A notebook that doesn't stay separate.</p>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '24px' }}>You write. And as you write — something else you've written can appear. Not because you went looking for it. Because it connects.</p>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '24px' }}>The connections are already there, in your writing. Associations makes them visible.</p>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '24px' }}>It doesn't organize your writing. It doesn't sort it or manage it or ask you to tag anything. It connects the dots. That's the whole thing.</p>

        <hr style={{ border: 'none', borderTop: '0.5px solid var(--border)', margin: '64px 0' }}/>

        <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '14px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: '24px' }}>How it works — honestly</h2>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '24px' }}>On day one, it listens.</p>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '24px' }}>You write. Everything goes into the pool — your drafts, your notes, anything in your watched folders. The pool accumulates.</p>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '24px' }}>The more you write, the more it finds. A new pool has few connections to surface. A pool with months of writing starts to surprise you.</p>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '24px' }}>This is how a real commonplace book works. You don't open a blank notebook and find connections. You fill it first. The connections emerge over time, when the material is there.</p>
        <p style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '18px', lineHeight: '1.9', color: 'var(--text-muted)', marginBottom: '24px' }}>Day one, it listens. Month three, it starts to surprise you.</p>

        <hr style={{ border: 'none', borderTop: '0.5px solid var(--border)', margin: '64px 0' }}/>

        <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '14px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: '24px' }}>The ghost</h2>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '24px' }}>When the pool has enough in it and something connects — a passage you wrote before that means something similar to what you're writing now — it appears at the top of the page.</p>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '24px' }}>Not announced. Not pushed at you. It grows slowly into visibility, the way something comes to mind when you're not quite looking for it.</p>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '24px' }}>This is a ghost.</p>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '24px' }}>A ghost is something you wrote before that shows up when it connects to what you're writing now — even if the words are completely different. Not because the words match. Because the meaning does.</p>
        <p style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '18px', lineHeight: '1.9', color: 'var(--text-muted)', marginBottom: '32px' }}>It is always your own words. Associations never generates text.</p>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '16px' }}>You have three responses:</p>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '8px' }}><strong>Let it go</strong> — it recedes. It may or may not return.</p>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '8px' }}><strong>Watch</strong> — it solidifies. You're open to what else might come. Other ghosts may arrive. You control how far the past comes in.</p>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '24px' }}><strong>Keep</strong> — it attaches to this moment in your writing. It appears in Outline mode alongside the passage it was connected to.</p>

        <hr style={{ border: 'none', borderTop: '0.5px solid var(--border)', margin: '64px 0' }}/>

        <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '14px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: '24px' }}>The question</h2>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '24px' }}>Sometimes, instead of a passage, a question appears.</p>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '24px' }}>Not a prompt. Not a suggestion about what to write next. A question about something already in your writing that hasn't been resolved.</p>
        <p style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '18px', lineHeight: '1.9', color: 'var(--text-muted)', marginBottom: '24px' }}>You've said this in two different ways — do you mean the same thing?</p>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '24px' }}>The question comes from your writing. The answer is yours too.</p>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '24px' }}>You answer or you don't. If you answer, the answer goes into the pool. It may come back as a ghost later.</p>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '24px' }}>If nothing is unresolved, nothing is asked. Silence isn't a failure — it means the writing is clear.</p>

        <hr style={{ border: 'none', borderTop: '0.5px solid var(--border)', margin: '64px 0' }}/>

        <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '14px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: '24px' }}>Getting started</h2>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '16px' }}><strong>1. Download and install</strong><br/>Open the .dmg and drag Associations to your Applications folder.</p>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '16px' }}><strong>2. Sign in</strong><br/>Enter your email. A sign-in link arrives. Click it. No password. You'll stay signed in.</p>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '16px' }}><strong>3. Create a project</strong><br/>Project → New Project. Name it. Each project has its own pool — its own memory. The novel doesn't know about the newsletter.</p>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '16px' }}><strong>4. Add existing writing</strong><br/>Project → Folders. Add a folder with writing related to your project. Drafts, notes, a story bible, research. Associations reads these files and adds them to the pool.</p>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '16px', lineHeight: '1.9', color: 'var(--text-muted)', marginBottom: '16px' }}>Supported formats: plain text (.txt) and Markdown (.md).</p>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '16px' }}><strong>5. Write</strong><br/>The compose surface is the whole screen. Start writing. After about 300 words, Associations begins looking for connections.</p>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '24px' }}><strong>6. Wait</strong><br/>The first ghost is earned, not immediate. Give it time and material. The pool builds as you write.</p>

        <hr style={{ border: 'none', borderTop: '0.5px solid var(--border)', margin: '64px 0' }}/>

        <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '14px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: '24px' }}>Tagging</h2>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '24px' }}>Press <code style={{ fontFamily: "'Poppins', sans-serif", fontSize: '15px', background: 'var(--surface)', padding: '2px 6px', borderRadius: '3px', border: '0.5px solid var(--border)' }}>*</code> while writing to tag the current paragraph. A small mark appears at the margin. The passage is saved for later review in Outline mode.</p>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '24px' }}>Tags don't interrupt your writing. You mark something as you pass through it. You come back to it later.</p>

        <hr style={{ border: 'none', borderTop: '0.5px solid var(--border)', margin: '64px 0' }}/>

        <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '14px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: '24px' }}>Outline mode</h2>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '24px' }}>Press <code style={{ fontFamily: "'Poppins', sans-serif", fontSize: '15px', background: 'var(--surface)', padding: '2px 6px', borderRadius: '3px', border: '0.5px solid var(--border)' }}>Cmd+2</code> to switch to Outline mode.</p>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '24px' }}>All your documents in order. Word counts. Kept ghosts attached to each document. Tagged passages listed beneath them. Drag documents to reorder — that sequence is your outline.</p>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '24px' }}>Press <code style={{ fontFamily: "'Poppins', sans-serif", fontSize: '15px', background: 'var(--surface)', padding: '2px 6px', borderRadius: '3px', border: '0.5px solid var(--border)' }}>Cmd+1</code> to return to Compose.</p>

        <hr style={{ border: 'none', borderTop: '0.5px solid var(--border)', margin: '64px 0' }}/>

        <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '14px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: '24px' }}>Export</h2>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '16px' }}>File → Export.</p>
        <ul style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '24px', paddingLeft: '28px' }}>
          <li style={{ marginBottom: '8px' }}><strong>Rich Text (.rtf)</strong> — opens in Scrivener, Pages, Word, and Google Docs</li>
          <li><strong>Plain Text (.txt)</strong> — universal, paste anywhere</li>
        </ul>

        <hr style={{ border: 'none', borderTop: '0.5px solid var(--border)', margin: '64px 0' }}/>

        <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '14px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: '24px' }}>Projects and documents</h2>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '24px' }}>Each project has its own pool, its own folders, its own documents. Switching projects is a full context switch — different pool, different memory, different ghosts.</p>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '24px' }}>Manage documents from Project → Documents or File → Open Document. Rename them. Reorder them by dragging.</p>

        <hr style={{ border: 'none', borderTop: '0.5px solid var(--border)', margin: '64px 0' }}/>

        <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '14px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: '24px' }}>Privacy</h2>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '24px' }}>Your writing never leaves your machine.</p>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '24px' }}>Associations uses local embeddings — mathematical representations of meaning — to find connections. These are generated on your device. Your text is never sent anywhere.</p>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '24px' }}>The one exception: when Associations generates a question, a small excerpt is sent to Claude to form it. This excerpt is minimal and is not stored.</p>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '24px' }}>Your documents save automatically to your application data folder. There is no cloud backup in V1. Export your writing regularly.</p>

        <hr style={{ border: 'none', borderTop: '0.5px solid var(--border)', margin: '64px 0' }}/>

        <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '14px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: '24px' }}>Trial and subscription</h2>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '24px' }}>Associations includes a 15,000 word trial in Compose mode — enough to write past the empty-pool phase and into the first genuine connections.</p>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '24px' }}>When the trial ends:</p>
        <p style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '18px', lineHeight: '1.9', color: 'var(--text-muted)', marginBottom: '24px' }}>Your ghosts know you a little now. Subscribe to keep writing.</p>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '24px' }}><strong>$9/month</strong> or <strong>$79/year</strong>.</p>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '24px' }}>One subscription. All projects. All documents. Unlimited writing.</p>

        <hr style={{ border: 'none', borderTop: '0.5px solid var(--border)', margin: '64px 0' }}/>

        <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '14px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: '24px' }}>Keyboard shortcuts</h2>
        <table style={{ fontFamily: "'Lora', serif", fontSize: '16px', width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
          <thead>
            <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '12px 0', fontWeight: '400' }}>Action</th>
              <th style={{ textAlign: 'left', padding: '12px 0', fontWeight: '400' }}>Shortcut</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
              <td style={{ padding: '12px 0' }}>New document</td>
              <td style={{ padding: '12px 0' }}><code style={{ fontFamily: "'Poppins', sans-serif", fontSize: '14px', background: 'var(--surface)', padding: '2px 6px', borderRadius: '3px', border: '0.5px solid var(--border)' }}>Cmd+N</code></td>
            </tr>
            <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
              <td style={{ padding: '12px 0' }}>Export</td>
              <td style={{ padding: '12px 0' }}><code style={{ fontFamily: "'Poppins', sans-serif", fontSize: '14px', background: 'var(--surface)', padding: '2px 6px', borderRadius: '3px', border: '0.5px solid var(--border)' }}>Cmd+E</code></td>
            </tr>
            <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
              <td style={{ padding: '12px 0' }}>Compose mode</td>
              <td style={{ padding: '12px 0' }}><code style={{ fontFamily: "'Poppins', sans-serif", fontSize: '14px', background: 'var(--surface)', padding: '2px 6px', borderRadius: '3px', border: '0.5px solid var(--border)' }}>Cmd+1</code></td>
            </tr>
            <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
              <td style={{ padding: '12px 0' }}>Outline mode</td>
              <td style={{ padding: '12px 0' }}><code style={{ fontFamily: "'Poppins', sans-serif", fontSize: '14px', background: 'var(--surface)', padding: '2px 6px', borderRadius: '3px', border: '0.5px solid var(--border)' }}>Cmd+2</code></td>
            </tr>
            <tr>
              <td style={{ padding: '12px 0' }}>Tag current paragraph</td>
              <td style={{ padding: '12px 0' }}><code style={{ fontFamily: "'Poppins', sans-serif", fontSize: '14px', background: 'var(--surface)', padding: '2px 6px', borderRadius: '3px', border: '0.5px solid var(--border)' }}>*</code></td>
            </tr>
          </tbody>
        </table>

        <hr style={{ border: 'none', borderTop: '0.5px solid var(--border)', margin: '64px 0' }}/>

        <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '14px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: '24px' }}>Questions and feedback</h2>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text)', marginBottom: '24px' }}><a href="mailto:terry@terryheath.com" style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>terry@terryheath.com</a></p>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '1.9', color: 'var(--text-muted)', marginBottom: '24px' }}>Associations is part of <a href="https://dampconcrete.com" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Damp Concrete</a>. Built by <a href="https://terryheath.com" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Terry Heath</a>.</p>

      </article>

    </main>
  );
}
