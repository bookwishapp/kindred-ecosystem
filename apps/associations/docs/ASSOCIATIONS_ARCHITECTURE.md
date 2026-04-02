# Associations — Architecture Document

## The Product in One Sentence

A writing environment that listens to what you write and surfaces connections from your own past work — quietly, without interrupting, never generating anything you didn't already say.

---

## The Philosophy

Associations does not write for you.
It does not suggest.
It does not complete your sentences.
It does not generate ideas.

It holds everything you've written and notices when two things have the same shape. Then it brings them close. What you do with that is yours.

The feeling it must produce: the catch in the throat when something you already knew becomes suddenly, undeniably visible.

The ancient Greeks had a word for this moment: **anagnorisis** — the recognition, in tragedy, of a truth that was always present but unseen. It is what happens to Damien at the climax of *Light Arriving*. It is what Associations is designed to produce.

---

## Core Concepts

### The Pool
Everything you've written lives in the pool. Compose documents, captured fragments, Q&A answers, imported writing. The pool is invisible infrastructure. You don't organize it. You don't edit it. You don't interact with it directly.

You don't edit water.

Pools are scoped to projects. Each project has its own pool. Ghosts only come from within the current project. Q&A questions only reference the current project's material. You don't get asked about Max when you're writing a newsletter post.

There is also a **global pool** — opt-in per project. If you want cross-project associations, you open that channel deliberately. A novel informing an essay. The newsletter informing the fiction. By default it's closed. While ghost watching, you can toggle between project-only and global associations.

### Documents and the Pool
Associations never owns your files. It reads them and keeps an indexed snapshot in the pool. The original file lives wherever it lives — in Scrivener, in Dropbox, on your desktop — fully accessible to any other application at any time.

When a file changes, the next read updates the snapshot. The original is always the source of truth. You are never asked to move, copy, or give Associations your files. You let it read them. The difference matters.

### The Ghost
A ghost is a piece of your own writing — from the pool — that the system has found a connection to what you're currently writing. It grows slowly into visibility over the writing surface. You notice it becoming present rather than seeing it arrive.

A ghost is always your own words. The system never generates text.

### Ghost Watching
When a ghost has grown to near-full strength, you have three responses:
- **Let it go** — it recedes immediately, no record
- **Watch** — it solidifies to full strength, the door opens for more ghosts to arrive above it, stacking down over your writing as far as you allow
- **Keep** — it attaches to the passage you were writing when it appeared, available in Outline mode

Ghost watching is the state of being open to what the system finds. You never know what will come. Sometimes nothing else arrives. Sometimes one ghost pulls another and you're deep in something unexpected. The system doesn't promise anything.

### The Tag
A single keystroke while writing marks a passage for future attention. Visible only as a small dot at the margin. You don't name it or categorize it. You just mark it and keep writing. Tagged passages are available in Outline mode.

### Q&A Mode
The AI reads the pool and asks a single question at a time. Questions come from specific ambiguities, tensions, or unresolved threads already present in the writing. They are never prompts. They never invite new content.

The distinction is absolute:

**A prompt disguised as a question** points to something absent — it invites the writer to imagine or create. *What does Damien smell when he thinks of her?* opens a door to new content. This is never allowed.

**A real question from the material** points to something already present that is unresolved or unclear. *Does Damien know he's been here before?* asks the writer to clarify something the writing has already implied. The answer already exists — the question just makes the writer conscious of it.

The best questions are ones where the answer is already in the writing but hasn't been made conscious yet:

*The bus appears twice. Is that intentional?*

The writer knows the answer. The question just surfaces it.

### Q&A as Ghost
Questions can arrive as ghosts while composing — fading in the same way a passage ghost does, with the same three responses: let it go, watch, keep. A kept question attaches to the passage that prompted it. The writer answers when ready — or never. If answered, the answer goes into the pool and becomes eligible to surface as a ghost.

Question ghosts appear less frequently than passage ghosts — approximately one question for every three or four passage ghosts. Only when the system has found something genuinely unresolved.

### Q&A Session
A dedicated session where the writer invites questions from the material. The system may have one question, three, or none. **None is a valid and honest response.** The session is an invitation, not an obligation. Forcing questions when there are none would poison the mechanic.

The writer opens a Q&A session. Questions arrive one at a time. The writer answers in whatever way they want — a sentence, a paragraph, stream of consciousness, or nothing. Answers feed the pool. Unanswered questions may return in a future session or as a ghost.

Rules:
- One question at a time, always
- The AI waits — it never pushes
- No questions is an acceptable session outcome
- Questions must point to something already in the writing — never to something absent
- Questions are never writing prompts
- Questions are never observations about the writing's quality or themes
- If you don't answer, the system moves on — the question may return later or never

---

## Modes

### Capture
Quick fragment entry. One field. No decisions. Speak or type. The fragment goes into the pool dated and unseen. This is the phone's primary function — catch what arrives while you're walking, driving, standing at the bookstore counter.

### Compose
Full-screen writing environment. The writing surface occupies the entire screen. Ghosts overlay the top portion as they arrive and grow. Past writing scrolls off the top as you continue forward — you don't scroll back manually. The only way past writing returns is as a ghost.

No formatting tools in V1. Plain text. The writing is the whole thing.

### Q&A
Conversation with the material. The AI asks. You answer. Simple two-column interface — question on one side, your answer on the other. Answers feed the pool automatically.

### Outline
Spatial view. All compose documents and their kept ghosts, arranged for structural work. Tagged passages visible. This is where you build the architecture of a longer work from what already exists in the pool.

V1 is simple — a list of documents with their kept associations attached. Spatial drag-and-drop in V2.

---

## The Writing Surface (Compose)

The writing fills the entire screen. No chrome over the writing area.

Four corner elements only — barely visible:
- Top left: product name (Associations)
- Top right: document name
- Bottom right: word count
- Bottom left: nothing (reserved for status if needed)

Mode is not displayed. You know what mode you're in.

The ghost appears as an overlay over the top portion of the writing surface. It begins at near-zero opacity and grows slowly — over several seconds — to near-full strength. You notice it becoming present. You never see it arrive.

The writing beneath the ghost is always there. The ghost sits on top of it. When the ghost is dismissed or kept, it recedes. The writing never moves.

When watching, additional ghosts can arrive above the current one, stacking downward. The more you allow in, the more of your writing disappears beneath them. You control how far the past comes in.

---

## The AI Layer

### Embeddings
Every piece of writing in the pool is converted to a vector embedding — a mathematical representation of its meaning. This happens locally on the device. The text itself never leaves the machine for this step.

Embeddings capture semantic meaning, not keywords. Two passages that use completely different words but have the same emotional shape will be found as related.

### Association Finding
When you're writing, the current passage is continuously embedded and compared against the pool. When similarity crosses a threshold, a ghost candidate is identified. The system waits for a natural pause before beginning the slow fade-in.

The threshold is tuned over time as the system learns your specific patterns — the way certain concepts always cluster together in your particular mind.

### The Restatement (Q&A only)
When the system forms a question for Q&A mode, a small, specific excerpt goes to a language model (Claude) to generate the question. This is the only moment text leaves the device. The excerpt is minimal — enough to ground the question, not enough to reconstruct the work.

The question is generated as a single interrogative sentence. Never advice. Never observation. Always a question about a specific gap or tension the system found.

### Local Model
All embedding generation runs locally using a small on-device model (Phi or similar). No internet connection required for Compose, Capture, or Outline modes. Q&A mode requires a connection for question generation only.

---

## Privacy Model

**Your words never leave your machine** — except for the minimal excerpt used for Q&A question generation.

This is a meaningful and marketable distinction. Serious writers are protective of unpublished work. Associations earns that trust by design, not by policy.

---

## Folder Watch

During setup, the user designates a watch folder. Associations monitors it continuously. Any supported file dropped into the folder is automatically read, embedded, and added to the pool.

Supported formats: .txt, .md, .docx, .pdf, .rtf

The ingested content is not visible inside Associations. It lives in the pool and surfaces only as ghosts or Q&A source material.

This handles Scrivener integration elegantly — Scrivener compiles to a folder, that folder is the watch folder, every compile updates the pool automatically.

---

## Platform

### Desktop App (Primary)
Electron — installable, feels native, runs on Mac and Windows. Built with web technology. This is where writing happens.

Mac first. Windows when there is demand.

### Phone Companion (Capture Only)
Mobile app — iOS first. One field. Speak or type. Syncs to desktop pool immediately over iCloud or local network. No writing modes on mobile. No ghosts on mobile. Just capture.

### Sync
Pool data lives locally on the desktop. Phone syncs fragments to the desktop via iCloud Drive or a simple local network sync. No cloud server required. No subscription infrastructure for sync.

---

## Visual Language

**Colors**
- Background: `#F5F3EF` — warm off-white
- Surface: `#FAFAF8` — slightly lighter
- Text (present writing): `#2A2825` — warm near-black
- Ghost text: `#6A6660` at near-full strength, growing from near-zero
- Past writing: same as present — no color distinction
- Shadows: `rgba(0,0,0,0.06)` — almost nothing
- Accent: none

**Typography**
- Poppins — UI elements, corner labels, ghost actions
- Lora — all writing, ghost text, Q&A

**Texture**
Subtle paper grain on the writing surface. Barely visible. The kind you notice when you look for it.

**Sound**
None. Ever.

**Transitions**
Ghost growth is the only significant animation. Everything else is instantaneous or a very short crossfade (150ms max).

---

## Trial and Subscription

**No free tier. Usage-based trial.**

The trial runs for 15,000 words written in Compose mode. Imported words seed the pool but don't count toward the trial — the trial is about the writing experience, not the import.

15,000 words is enough to write past the empty-pool phase, past early obvious connections, into the first genuine anagnorisis. Enough to get hooked.

The word counter lives in the bottom corner — quiet, always visible, never alarming. When the limit is reached, the current session completes. Then:

*Your ghosts know you a little now.*

*Subscribe to keep writing.*

No features list. No urgency language. Just the invitation.

**Pricing:** $9/month or $79/year. One tier. No Q&A meter — Claude API cost is absorbed into the subscription as cost of goods.

**Stripe.** Same account as the ecosystem. New product.

**Auth:** Central auth at auth.terryheath.com. Magic link. JWT stored in OS keychain. Deep link callback: `associations://auth/verify`. Every user has a `user.sub` UUID — permanent, same identity as the rest of the ecosystem.

---

## What Associations Is Not

- Not a notes app
- Not an outliner
- Not a word processor
- Not an AI writing assistant
- Not a prompt generator
- Not a productivity tool

It is a place where things associate. What happens after that is yours.

---

## V1 Scope

- Electron desktop app (Mac)
- Projects — each with its own scoped pool
- Global pool — opt-in per project
- Capture mode
- Compose mode with ghost mechanic
- Q&A mode
- Basic Outline mode (list view)
- Folder watch — reads originals, never owns them
- Local embedding (on-device)
- Q&A question generation via Claude API
- iOS companion app (capture only)
- Export from Compose (plain text, .docx)

## V2 Scope

- Windows support
- Spatial Outline mode (drag-and-drop)
- Word / Google Docs layer (plugin)
- Ghost watching — multiple simultaneous ghosts
- Refined association threshold learning per user
- Android companion

---

## Product Name

**Associations**

The word itself does what the product does. Psychological associations, organizational associations, the association of ideas. It's the oldest word for the thing the mind does naturally that this tool does deliberately.

The governing image: *The Book of Commonplace Things* — the tradition of writers keeping a place where observations accumulate until they're ready to become something.

---

## The Novel This Was Designed Around

*Light Arriving* by Terry Heath

Damien doesn't know he's already just the memory in his dying grandfather's mind. She is the star. He is the light still arriving.

The compass: *What remains when the source is gone?*
