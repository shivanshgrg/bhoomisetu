# BhoomiSetu — Current Feature Inventory

**What this is:** BhoomiSetu is a prototype workflow tracker for Indian government land acquisition (built for SIH 2026, problem statement 26016). It follows a parcel of land through a fixed 7-stage legal acquisition process — Notification → Joint Survey → Objection Review → Valuation → Compensation Approval → Award → Possession Handover — giving officials a dashboard/action-center view and giving landowners a zero-login way to check their own case status, file objections, and receive notices.

This document is a factual snapshot of what is **actually built and working** right now, organized by area, so it can be handed to another AI (or a person) to brainstorm what to add next. A separate section at the bottom lists what has been **deliberately scoped out or not yet built**, so suggestions don't re-propose things already ruled out or already on the roadmap.

**Tech stack:** React 19 + TypeScript + Vite, React Router, Leaflet/React-Leaflet for maps, Supabase (Postgres) as the optional real backend (an in-memory demo backend is used when Supabase isn't configured — both implement the same repository interface), `pdfjs-dist` for client-side PDF text extraction, `tesseract.js` for on-demand OCR, `qrcode-generator` for QR codes, Web Speech API for voice input/read-aloud, and hand-rolled logic (no extra libraries) for hashing, clustering, and convex-hull map polygons.

---

## 1. Core workflow & data model

- **Seven-stage acquisition engine.** Each stage has a required-document list and an SLA ("threshold days"). Whether a parcel is on-track, stuck, blocked, ready-to-advance, or complete is computed live from its data — nothing is manually flagged.
- **Stage-advance gating.** A parcel can only move to the next stage once every required document for its current stage is *verified* (not just uploaded), and — specifically at Objection Review — no objections are still open.
- **Document verification lifecycle.** Documents are `pending_verification → verified` or `→ rejected` (rejection requires a typed reason, shown to the landowner).
- **Objections workflow.** A landowner files an objection (reason + description) from their own status page with no login; officials move it through `pending → under_review → resolved`.
- **Immutable-in-spirit stage-history ledger** feeding average-duration-vs-SLA stats per stage (see Audit & Compliance for the tamper-evidence layer on top of this).
- **Compensation tracking** — estimate vs. paid, at parcel and project level.
- **Multi-project, multi-state data model** — projects have a sector, state, implementing agency, sanctioned/target dates, sanctioned compensation, and Rehabilitation & Resettlement (R&R) stats (affected/displaced/resettled families, checklist-complete flag).
- **Illustrative compensation calculator** on the landowner page — a simple area × rate × multiplier, explicitly labeled "illustrative only," not a real legal formula.

## 2. Roles & access control

- **Five roles:** National Admin, State Authority, District Officer, Field Officer, Landowner. Chosen at sign-in via a landing page with cascading state → district selectors; persisted in `localStorage`.
- **Route guards** — no session redirects to the landing page; wrong role for a page shows an "Access Restricted" page. The National Dashboard is further restricted to National Admin / State Authority only.
- **Real data scoping, not just page-gating** — State Authority sees only their state's projects; District/Field Officer further narrows to their district's parcels. This scoping is applied consistently across the dashboard, map, filters, Action Center, national rollups, and the alert bell. An out-of-scope parcel hit by direct URL shows "not found," not "access denied" (no existence leakage).
- **Zero-login landowner portal** — a villager looks up their own parcel by survey number with no account needed, by deliberate design.

## 3. Languages & accessibility

- **10 languages:** English, Hindi (**full coverage** — every official and citizen page, ~550 translated strings) plus Marathi, Bengali, Telugu, Tamil, Gujarati, Kannada, Odia, Punjabi (**citizen-scope coverage** — landowner search/status pages and shared chrome, ~125 strings each). Anything untranslated falls back cleanly to English — this split is disclosed honestly in the UI, not hidden.
- **Language picker** — dropdown by native endonym (मराठी, বাংলা, etc.) with an English label and a coverage note; sets the page's `lang` attribute; persists across reload.
- **SMS notification previews** fully written in all 10 languages (not just the officials' 2) — composed in the landowner's own preferred language regardless of what language the official's UI is in.
- **Bilingual printable notices** (see Notices section) — always English + the landowner's own language, whichever of the 10 that is.
- **Text-to-speech ("Listen")** button on landowner-facing pages using the browser's built-in speech synthesis, voice matched to the current language.
- **Voice search** for survey numbers using the browser's speech recognition, with a visible (not silent) fallback message when unsupported.
- **Status shown with icons, not color alone** (⚠️ stuck, ⛔ blocked, ✅ complete, etc.) so it still reads correctly in black-and-white or for colorblind users.
- **Data Saver mode** — a toggle that swaps the live map for a placeholder to avoid tile downloads on constrained connections.

## 4. Document intelligence

Framed honestly throughout the UI as "prototype heuristic" checks, not real AI/authenticity verification — deterministic, no network calls (except optional OCR, disclosed below), same file always gives the same result.

- **File-shape checks** — size bands, filename-vs-detected-type mismatch, suspicious filenames (screenshot/whatsapp/temp/test).
- **Content-aware PDF checks** — extracts the actual text layer client-side and checks: page count vs. expected range for that document type, presence of a text layer at all, expected keywords per document kind (in English *and* Hindi — e.g. "Section 11" / "धारा 11"), a rupee-amount check for valuation/compensation/award documents, **a survey-number-mention check** (does the document actually reference this parcel's own survey number — the single most useful check for a field officer), and date plausibility (future dates fail; dates years before project sanction warn).
- **Per-signal breakdown shown to the officer** — not just a pass/fail verdict, but which specific check failed and why, in plain language.
- **Canvas-based image analysis** (no library) for scanned/photographed documents — detects blank/near-blank scans, checks resolution and aspect ratio, and scores capture sharpness to flag a photo-of-a-screen vs. a real scan.
- **On-demand OCR** (English + Hindi) — only downloaded when the officer clicks "Read this scan" (never in the app's normal bundle), with a disclosed one-time internet requirement to fetch the OCR engine. Recovered text runs through the exact same keyword/survey-number/date checks as native PDF text. **OCR never auto-verifies a document** — a human still has to click Verify.

## 5. Risk & decision support

- **Per-parcel risk score (0–100)** from four factors: how overdue the current stage is, how many required documents are still unverified, how many objections are open, and how close the project's deadline is — mapped to Low/Medium/High/Critical, with a plain-language recommended action and the specific official role responsible.
- **Action Center** — every parcel an official can see, ranked by risk score, with the reason and recommended action spelled out, one click from each row to the full parcel.
- **Automated alerts / notification bell** — a running, severity-sorted feed of stuck parcels, missing documents, and open objections, scoped to what that official can see.
- **Stage-duration chart** — average real duration vs. SLA per stage, so a chronically slow stage is visible at a glance.
- **Project timeline (Gantt-style view)** on the National Dashboard — every project's planned span, a "today" marker, and a progress fill colored by computed status (on-track/at-risk/delayed/complete).

## 6. Dataset & database

- **Realistic scale:** ~246 parcels across 12 projects, 10 states, ~40 districts — generated deterministically (seeded, not random, so the same run always produces the same numbers, important for a rehearsed demo) from a small per-district reference table. Two "hero" parcels are hand-specified and kept exact because the demo script and pitch materials cite their exact numbers.
- **Genuine variance, not flat placeholders** — stage durations vary realistically (some stages over SLA), project status is a real mix (on-track/at-risk/delayed), document/objection outcomes vary, R&R numbers vary per project.
- **Performance work for the larger dataset** — debounced search, pagination on the parcel list/Action Center/documents table, and hand-rolled marker clustering on the map (no external clustering library).
- **Hardened Postgres schema** (for the optional real Supabase backend) — check constraints (no negative area/compensation, paid ≤ assessed, valid date ordering), foreign-key cascades, indexes on the columns actually filtered on, a global unique survey number, and audit timestamp columns with triggers. The tamper-evident hash chain (see below) can persist to the database, not just live in the browser.
- **Seed script** to load the same demo dataset into a real Supabase project so live mode and demo mode would show identical numbers.
- **Schema verified against a real embedded Postgres engine** (no live Supabase project was available in this environment) — bad inserts (negative area, over-paid compensation, duplicate survey number) are confirmed rejected.
- **Production-shape row-level security, honestly framed as not yet switched on** — real per-role/per-scope database policies are written and verified against a low-privilege role, but commented out and inactive by default because there's no real login system wired up yet. This is disclosed explicitly rather than glossed over, along with a written switch-over checklist for turning it on.

## 7. Landowner-facing portal

- Zero-login search by survey number, with optional voice input.
- A status page showing owner, location, area, current stage, a visual stepper of all 7 stages, their documents (citizen-relevant columns only — no internal official fields), the compensation calculator, and a place to file and track their own objections.
- Fully translated in all 10 languages, with read-aloud support.

## 8. Official-facing tools

- **District/state dashboard** — summary cards, per-stage counts, an "needs attention" queue, a filterable parcel table, and a live map, all driven from one shared filtered dataset so the table and map never disagree.
- **Parcel detail workspace** — overview, workflow status, risk assessment, stage stepper, the tamper-evident history ledger, document upload with the full intelligence-check breakdown, verify/reject controls, the objections table, and (new) a "Generate notice" action.
- **National Dashboard** (restricted to top two roles) — cross-project rollups, R&R summary, project-progress table, and the Gantt timeline.
- **Reports page** — a printable, scope-aware summary (status counts, stage-duration chart, top-10 risk queue, project progress) with a working "Print / Save as PDF" button.
- **GIS map** — OpenStreetMap + Leaflet, project-boundary polygons (hand-rolled convex hull), a toggle between coloring markers by project or by status, and marker clustering.
- **SMS notification preview** — a "Notify Landowner" button on key actions that composes a realistic message in the owner's own language and shows a simulated "sent" log; makes no real network calls (it's a preview, not a live SMS integration).

## 9. Audit & compliance

- **Tamper-evident stage-history ledger** — a real cryptographic hash chain over each parcel's stage-history entries (browser's native `crypto.subtle`, SHA-256). Editing any past entry visibly breaks the chain from that point forward. The UI shows each link's status (sealed/broken) and a live "N of N links intact" count, plus a "simulate tampering" button to demonstrate this in a demo. Falls back to a plain table if the crypto API isn't available. The database schema can persist this chain so it survives a reload, not just live in browser memory.

## 10. Notices & communication (most recently added)

- **QR-coded, bilingual statutory notice generator** — from a parcel's workspace, an official can generate a printable Section 11 Notification or Award Intimation notice (the type defaults sensibly based on how far the parcel has progressed, and is switchable). It's pre-filled from the live record (survey number, owner, location, project, area, compensation, date) and prints **two copies side by side: one in English, one in the landowner's own preferred language** (whichever of the 10 supported languages that is).
- **QR code linking straight to the landowner's live status page** — printed on the notice, so scanning the paper notice with a phone camera takes the villager straight into the zero-login portal for that exact parcel. The QR code is rendered as dependency-light inline SVG, always black-on-white regardless of app theme (it's meant to be printed and scanned, not just viewed on screen).
- **Print-ready layout** with a working "Print / Save as PDF" button, and the same access scoping as every other parcel page (an official outside their state/district can't generate a notice for a parcel they can't otherwise see).

---

## What's explicitly NOT built yet (don't re-suggest these as "new" ideas — they're already identified)

The project has a ranked backlog of planned-but-unbuilt features, in priority order:

1. **Offline-first field capture (PWA)** — installable app, offline read/write with a local queue that syncs when back online, an offline banner and per-record "pending sync" indicator. *(Work was briefly started this session and then abandoned — nothing usable exists on disk yet.)*
2. **Forecasting / bottleneck analytics** — a projected completion date per project based on observed stage velocities, ranked "which stage is the real bottleneck," and a "what if this stage hit its SLA" projection.
3. **Escalation matrix** — automatic escalation levels (Field Officer → District → State → Ministry) for parcels that blow past their SLA, with an "escalated to me" filter.
4. **Audit / RTI export bundle** — one-click export of a parcel's full record + hash chain + a standalone page that lets anyone re-verify the chain without needing the app itself.
5. **Bulk CSV import** with column mapping, row-by-row validation, and a dry-run preview — for onboarding an existing district's parcels at scale.
6. **Real parcel geometry** — actual GeoJSON polygons per parcel instead of point markers, plus a cadastral-map overlay toggle.
7. Smaller ideas noted but not built: a command palette (⌘K) for jumping to any survey number, a WhatsApp deep link next to the SMS preview, a district/state league table, a first-visit onboarding tour, a formal WCAG accessibility audit, and keyboard shortcuts in the Action Center.

Also not done: the pitch deck and team handbook still reflect older, smaller dataset figures and haven't been regenerated against the current numbers; and the database/security work has only been verified against a local test database, never a real live Supabase project.

---

*This file is a snapshot — regenerate or re-verify it against the actual code before relying on it for anything beyond ideation, since the app continues to change.*
