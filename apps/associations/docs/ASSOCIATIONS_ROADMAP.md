# Associations — Roadmap

Things deferred from V1, captured so they aren't forgotten.

---

## V2

- **Windows support** — Mac first, Windows when demand warrants
- **Spatial Outline mode** — drag-and-drop arrangement of documents and kept ghosts; V1 is list view only
- **Multiple simultaneous ghosts during watching** — when you tap Watch, additional ghosts stack from above; V1 shows one at a time
- **Refined association threshold per user** — the system learns your specific patterns over time and tunes its own sensitivity; V1 uses a fixed threshold
- **Android companion** — capture only, same as iOS; iOS first
- **Word / Google Docs plugin** — Associations as a layer inside other writing tools; standalone first, plugins after traction

---

## Later / Unscheduled

### Privacy and Portability
- **Encrypted pool backup and restore** — export your entire pool to an encrypted file you control; restore on a new machine or after reinstall; critical for users who lose their machine
- **Pool portability across devices** — currently the pool lives on one Mac; multi-device sync without sending writing to a server is a hard problem; encrypted iCloud sync is the likely path
- **Pool export** — export raw pool entries as readable text for archiving or migration

### Writing Surface
- **Formatting in Compose** — V1 is plain text only; basic markdown rendering (bold, italic, headings) is a natural V2 addition but intentionally excluded from V1 to keep the surface pure
- **Manual scroll-back option** — V1 scrolls forward only; some writers may want the option to scroll back without triggering a ghost; this needs careful design so it doesn't break the forward-motion philosophy
- **Tag management** — V1 tags are just dots with no names; a way to review and act on tagged passages outside of Outline mode

### Folder Management
- **Folder labels within a project** — tag a folder as "manuscript", "bible", "research", "notes" so ghosts can surface their source context: "From your bible — Max's house." Small addition, meaningful for writers who maintain a story bible or research archive alongside their draft.
- **PDF support in folder watch** — extract text from PDFs for pool ingestion; essential for researchers and writers with reference material in PDF format
- **.docx support in folder watch** — read Word documents directly without requiring export to .txt first

### Pool and Associations
- **Global pool toggle during ghost watching** — switch between project-only and all-writing associations in the moment; V1 is set at project level only
- **Ghost history** — a way to review ghosts you let go, in case something slipped past you; read-only, not interactive
- **Association strength feedback** — let the writer signal when an association was meaningful vs. noise; trains the threshold over time
- **Scrivener plugin** — if Scrivener ever opens their API; for now the folder watch handles this elegantly

### Ghost Zone and Question Ghosts (V1.5 — before V2)
### Ghost Zone — Writing Your Own Ghost
The ghost zone at the top of the compose surface is bidirectional. Ghosts arrive there from the past. But you can also write into it — a thought that arrives mid-sentence, an aside, something that belongs somewhere else. You write it in the ghost zone, send it to the pool, and it recedes. The cursor returns to the present writing. The aside becomes eligible to surface as a ghost in a future session. Tagged to the moment it was written. No mode switch. No interruption.

### Question Ghosts
Occasionally a ghost is not a passage from the pool but a question generated from what you're currently writing. It grows and fades the same way as a passage ghost. The same three responses: let it go, watch, keep. When kept, your answer goes into the pool — not the question. The question is a catalyst. This bridges Q&A mode and Compose mode without requiring the writer to switch contexts.

### Q&A
- **Q&A question history** — review questions you were asked and how you answered; V1 has no history view
- **Unanswered question queue** — questions the system generated that you haven't answered yet; they currently just wait silently
- **Q&A from a specific passage** — ask the system to question you about a particular section rather than waiting for it to find gaps on its own

### Platform
- **iOS Compose mode** — V1 iOS is capture only; some writers may want to compose on the phone; significant design challenge given the keyboard and screen size
- **iA Writer / Ulysses integration** — these are the other tools serious writers use; not plugins, but folder watch compatibility is already there; may need specific export format support

### Business
- **Team / shared pool** — writing partners, editors, co-authors sharing a pool; complex privacy implications; far future
- **Gift subscriptions** — writers give this to other writers
- **Educational pricing** — MFA programs, writing workshops

---

## Decisions Still Open

- **Formatting in V1** — currently plain text only; if early users push hard for basic markdown, reconsider before V2
- **Pool size limits** — no limit currently; very prolific writers with years of material may hit performance issues with local embedding search; needs monitoring
- **Q&A frequency** — how often should the system generate a new question? Currently undefined; needs tuning based on real usage
- **Ghost watching depth** — how many simultaneous ghosts should be allowed before the writing is completely buried? Needs a soft ceiling

---

## Things That Will Never Be in Associations

- Text generation of any kind
- "Improve my writing" features
- Grammar or style checking
- Suggestions, completions, or continuations
- A social or sharing layer
- Push notifications
- Sound of any kind

---

## Damp Concrete Ecosystem

### Admin (admin.dampconcrete.com)
Move cross-service administration from terryheath.com/admin to a dedicated Damp Concrete admin service. One place to see and manage everything across all products — Passportr subscribers, Kindred suppressions, Associations users, billing, etc. Model: same cross-service API pattern already established.

### Shared Email Service (mail.dampconcrete.com)
A single email microservice that all other services call instead of each managing their own SES configuration. Benefits: one template system, one unsubscribe list across all products, consistent email design language, one SES configuration. Model: same pattern as the shared auth service.
