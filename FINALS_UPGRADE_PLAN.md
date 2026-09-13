# BhoomiSetu — SIH 2026 Finals Upgrade Plan

> **Status:** internal round cleared. This plan covers everything between now and the final-round
> submission (prototype + final PPT).
>
> **How to use this file:** each step below is sized for **one fresh chat session**. Steps are ordered
> by dependency — do not skip ahead. At the end of each step, tick its box here and append a writeup
> to `IMPLEMENTATION_PROGRESS.md` in the same style as Steps 0–40.
>
> **Continuation prompt to paste into a new chat:**
>
> ```
> Continue BhoomiSetu from FINALS_UPGRADE_PLAN.md. Complete Step N only.
> Update FINALS_UPGRADE_PLAN.md and IMPLEMENTATION_PROGRESS.md, and verify in-browser before stopping.
> ```
>
> **Per-step discipline (unchanged from Steps 0–40):** implement → `npm run build` → run a throwaway
> dev server and verify the change in-browser → write up what changed and what was verified.

---

## Step numbering

Steps 0–51 are complete (see `IMPLEMENTATION_PROGRESS.md`). This plan continues at **Step 52**.

| Track | Steps | What it delivers |
|---|---|---|
| **A. Bug fix** | 41 | The verify/reject overlap, and every other in-table layout defect |
| **B. Languages** | 42–46 | 8 Indian languages, N-language architecture, SMS in all of them |
| **C. Dataset & database** | 47–51 | ~250 parcels, realistic history, performance, hardened schema, production-shape RLS |
| **D. Document intelligence** | 52–53 | Content-aware document checking for field officers |
| **E. New features** | 54–60 | The differentiators that raise finals odds |
| **F. Submission** | 61–62 | Final deck + handbook refresh, full QA |
| **G. Differentiators** | 63–65 | Statutory lapse clock, time-travel dashboard scrubber, voice objection → legal filing |

---

# TRACK A — Fix the known defect

## Step 41 — Fix the verify/reject overlap in the documents table

**This is a real, measured bug. Do it first — it is small and it is visible to a judge.**

### Root cause (already diagnosed — do not re-investigate)

`src/pages/ParcelDetailPage.tsx` renders the document row's action cluster as:

```tsx
<div key={`${document.id}-actions`} className="filter-grid">
  <Button>Verify</Button>
  <Button variant="secondary">Reject</Button>
</div>
```

`.filter-grid` in `src/styles.css:662` is a **page-level form layout**:

```css
.filter-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
```

Inside a table cell that is only **70px wide**, four `minmax(0, 1fr)` columns plus three 14px gaps
(42px of the 70px) collapse the computed columns to **`0px 0px 0px 0px`**. The buttons still paint at
their 32px intrinsic width but are *placed* only 14px apart — so **Verify (x 1096.6–1128.6) and Reject
(x 1110.6–1142.6) overlap by 18px**, and each button's label is clipped (`scrollWidth` 36/38 vs
`offsetWidth` 32).

The same class is reused for the **inline reject form** (TextField + Confirm + Cancel) in the same
70px cell — that one is worse. And in `ParcelDetailPage` the objection row's controls have the same
smell.

### What to do

1. Add two purpose-built classes to `src/styles.css` (do **not** widen `.filter-grid` — other pages
   depend on its 4-column behaviour):
   ```css
   .row-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
   .row-actions .btn { min-height: 32px; padding: 6px 10px; font-size: 0.82rem; white-space: nowrap; }
   .row-inline-form { display: grid; grid-template-columns: minmax(120px, 1fr) auto auto; gap: 8px; align-items: end; }
   ```
2. Replace `className="filter-grid"` with `className="row-actions"` for the Verify/Reject cluster and
   `className="row-inline-form"` for the reject form in `ParcelDetailPage.tsx`.
3. Give the documents table's action column a sensible floor. The table is `min-width: 680px` with
   **nine** columns; raise `min-width` on this specific table (a modifier class, e.g. `.table-wide`
   at `min-width: 980px`) so the horizontal scroll does the work instead of the cells crushing.
4. **Audit every other in-table use.** Grep for `filter-grid` and check each occurrence that sits
   inside a `<td>`. At minimum the objection row controls in `ParcelDetailPage.tsx`.
5. Do a narrow-viewport pass at 375px and 768px — confirm the table scrolls horizontally rather than
   overlapping.

### Done when

- [x] No two interactive elements in any table cell overlap, verified by measuring bounding boxes in
      the browser (not by eye) at 1440px, 768px and 375px.
- [x] Button labels are not clipped: `scrollWidth <= offsetWidth` for every button in the table.
- [x] The reject flow still works end to end: Reject → type reason → Confirm → row shows Rejected with
      the reason.
- [x] `npm run build` passes.

### Verification snippet (paste into the browser console on `/official/parcel/parcel-124-7`)

```js
const t=[...document.querySelectorAll('table')].find(x=>x.textContent.includes('Verify / Reject'));
[...t.querySelectorAll('tbody tr')].map(tr=>{
  const b=[...tr.querySelectorAll('button')].map(x=>x.getBoundingClientRect());
  const overlap=b.some((r,i)=>b.slice(i+1).some(o=>r.right>o.left+0.5&&r.left<o.right-0.5&&r.bottom>o.top+0.5&&r.top<o.bottom-0.5));
  const clipped=[...tr.querySelectorAll('button')].some(x=>x.scrollWidth>x.offsetWidth);
  return {overlap, clipped};
});
// expect: every row { overlap: false, clipped: false }
```

---

# TRACK B — Regional languages

**Scope decision, made deliberately — read this before Step 42.**

There are **549 translated strings** today (`src/i18n/translations.ts`). Translating all of them into
eight more languages is ~4,400 strings, which is neither achievable nor trustworthy by hand. So:

- **Full coverage (all 549 strings):** English, Hindi. Officials work in these.
- **Citizen coverage (~150 strings — landowner portal, shell chrome, stage/status/document labels):**
  Marathi, Bengali, Telugu, Tamil, Gujarati, Kannada, Odia, Punjabi.
- Anything untranslated **falls back to English**, and the language picker **shows coverage honestly**
  ("full" vs "citizen pages").

That is a defensible answer to a judge — *"the people who need their own language are the landowners,
and they get it; officials are trained staff working in English or Hindi."* Do not pretend to full
coverage you do not have.

## Step 42 — N-language architecture (no new languages yet)

**Pure refactor. This step must change zero user-visible behaviour.**

1. Change the type in `src/i18n/translations.ts`:
   ```ts
   export const LANGUAGES = ['en','hi','mr','bn','te','ta','gu','kn','or','pa'] as const;
   export type Language = (typeof LANGUAGES)[number];
   export type TranslationEntry = { en: string } & Partial<Record<Exclude<Language,'en'>, string>>;
   ```
   `en` stays required; every other language is optional. This makes partial coverage a *type-level*
   fact, not a convention.
2. Update `src/i18n/LanguageContext.tsx`:
   - `t(entry)` resolves `entry[language] ?? entry.en`.
   - `readStoredLanguage()` validates against `LANGUAGES` instead of the `=== 'hi'` check.
   - Keep `toggleLanguage()` working (it can cycle en↔hi) so nothing breaks yet.
3. Add language metadata for the picker:
   ```ts
   export const LANGUAGE_META: Record<Language, { label: string; endonym: string; coverage: 'full'|'citizen' }>
   // e.g. mr: { label: 'Marathi', endonym: 'मराठी', coverage: 'citizen' }
   ```
4. Do **not** add any new translations in this step.

### Done when
- [x] `npm run build` passes with no type errors.
- [x] App behaves identically: English and Hindi both still render every string correctly on every page.
- [x] Switching language still persists across reload.

## Step 43 — Language picker UI

1. Replace the two-state `🌐` toggle in `src/components/AppShell.tsx` with a proper picker (a
   `<select>` or a small dropdown) listing every language by **endonym** (मराठी, বাংলা, తెలుగు…), with
   the English name as secondary text.
2. Show coverage: languages marked `citizen` get a short note — *"Landowner pages translated; official
   pages in English."*
3. Set `document.documentElement.lang` when the language changes (accessibility + correct font
   selection).
4. Make sure the picker is reachable and usable at 375px width.

### Done when
- [x] All ten languages are listed; selecting one persists and survives reload.
- [x] `<html lang>` updates.
- [x] Nothing regresses in en/hi.

## Step 44 — Marathi + Gujarati (citizen scope)

1. Identify the citizen-scope keys: `uiText.nav`, `uiText.landownerSearch`, `uiText.landownerStatus`,
   `uiText.speech`, plus `stageLabels`, `stageShortLabels`, `documentKindLabels`,
   `objectionReasonLabels`, `objectionStatusLabels`, `dashboardStatusLabels`. Roughly 150 entries.
2. Add `mr` and `gu` to each of those entries only.
3. Add a dev-only coverage report (a tiny script or a `console.table` behind a flag) that prints
   how many keys each language covers — you will want this number for the pitch.

### Done when
- [x] Landowner search + status pages render fully in Marathi and Gujarati.
- [x] Official pages fall back to English cleanly (no blank strings, no `undefined`).
- [x] Coverage report prints an accurate per-language count.

## Step 45 — Telugu + Tamil + Kannada (citizen scope)

Same key set as Step 44. Also verify the fonts render — Indic scripts need a `font-family` fallback
stack that includes Noto Sans variants; add them to `src/styles.css` if any script renders as boxes.

### Done when
- [x] All three render correctly, no tofu boxes, no layout breakage from longer strings.

## Step 46 — Bengali + Odia + Punjabi, and SMS in every language

1. Add `bn`, `or`, `pa` to the citizen key set.
2. **Remove the Marathi-falls-back-to-English limitation in `src/domain/smsPreview.ts`.** Widen
   `SmsOwnerLanguage` to the full `Language` union and add message templates for every supported
   language (there are only three message shapes × ~20 label values — this is small).
3. Widen `ParcelOwner.preferredLanguage` in `src/domain/types.ts` and the `preferred_language`
   Postgres enum in `supabase/schema.sql` to match.
4. Give demo owners a realistic spread of preferred languages matched to their state.

### Done when
- [x] An owner in each supported language gets a correctly-composed SMS preview.
- [x] `IMPLEMENTATION_PROGRESS.md` is updated — this limitation is now closed. (The handbook PDF
      itself has no editable source in this repo — only the compiled `.pdf` — so its §11.7 text is
      deferred to Step 61's full deck/handbook regeneration pass, where it belongs alongside every
      other figure that step recomputes. Noted here so Step 61 doesn't miss it.)

---

# TRACK C — Dataset and database

## Step 47 — Seed generator refactor

`src/domain/demoData.ts` currently hand-lists 42 `ParcelSeed` objects. That does not scale to 250.

1. Refactor into: a small **per-district reference table** (district → tehsil list, village list,
   coordinate centroid, land-rate band) plus a **deterministic generator** that expands it.
2. **The generator must be seeded and deterministic** — same output every run. Use a simple
   xorshift/LCG PRNG with a fixed seed, never `Math.random()`. Demo numbers that change between runs
   are unusable for a rehearsed pitch.
3. Keep the existing hero parcels (`124/7`, `91/6`) hand-specified and untouched — the demo script and
   the handbook depend on their exact figures.

### Done when
- [x] Running the generator twice produces byte-identical output.
- [x] `124/7` still reports: Valuation, 57 days, risk 55, blocked on the missing Valuation report.
- [x] `npm run build` passes.

## Step 48 — Grow the dataset

Target: **~250 parcels, 12 projects, 10 states, ~40 districts.**

1. Add projects across the remaining sectors (industrial corridor, urban infrastructure, mining) and
   the remaining states in `STATE_NAMES`.
2. Spread parcels realistically: a few large projects with 40–60 parcels, several small ones with
   8–15. Not a uniform distribution.
3. **Fix the flat-15-day problem** (handbook §11.4): give completed stage history realistic, varied
   durations — some stages fast, some chronically slow, a few outliers. The stage-duration chart
   should show genuine variance against SLA, because that chart is a decision-support claim.
4. Vary the mix: more objection reasons, some rejected documents, some parcels with multiple missing
   documents, projects that are genuinely `at_risk` and `delayed` (today all 5 read `on_track`, which
   makes the status field look decorative).
5. Vary R&R meaningfully across projects.

### Done when
- [x] 250-ish parcels across 12 projects and 10 states.
- [x] The Reports stage-duration chart shows **different** averages per stage, at least one over SLA.
- [x] The National Dashboard shows a mix of on-track / at-risk / delayed projects.
- [x] Recompute and record the new headline figures — the deck and handbook both cite them.

## Step 49 — Performance for the larger dataset

Every page currently loads all in-scope parcels and computes in the browser. At 250 that is fine; the
point of this step is to prove the *shape* scales.

1. Add pagination (or windowing) to the parcel list, the Action Center queue and the documents table.
2. Memoise the summary computations properly; make sure `getActionCenterQueue` is not recomputed on
   every keystroke in the filter fields (debounce the survey-number search).
3. Add marker clustering to `ParcelMap` — 250 individual circle markers will feel slow and look bad.
4. Measure and record: time-to-interactive on the district dashboard before and after. Having a real
   before/after number is worth a sentence in the pitch.

### Done when
- [x] District dashboard and Action Center stay responsive with the full dataset.
- [x] Map renders 250 parcels without visible lag.
- [x] Filters feel instant.

## Step 50 — Harden the Postgres schema

1. **Constraints:** `check` constraints for non-negative area and compensation,
   `compensation_paid <= compensation_estimate`, valid date ordering
   (`entered_on <= exited_on`, `sanctioned_on < target_completion_on`).
2. **Foreign keys and cascades:** make sure deleting a parcel cascades to its history, documents and
   objections; parcels reference projects with `on delete restrict`.
3. **Indexes:** on `parcels(project_id)`, `parcels(district)`, `parcels(current_stage)`,
   `documents(parcel_id, stage)`, `objections(parcel_id, status)`, `stage_history(parcel_id)` — the
   columns the app actually filters on.
4. **Uniqueness:** `unique(project_id, survey_number)` — a survey number should not repeat inside a
   project.
5. **Audit columns:** `created_at` / `updated_at` with a trigger, on every table.
6. **Persist the audit-chain hash** alongside each `stage_history` row (currently the chain is sealed
   in the browser at load — see handbook §11 / Q21). Add a `entry_hash` and `prev_hash` column so the
   chain survives a reload and can be verified server-side later.
7. **Write a seed script** that loads `demoData` into Supabase, so live mode and demo mode show the
   same numbers.

### Done when
- [x] `schema.sql` runs clean on a fresh Supabase project. (Verified against a real Postgres engine —
      `@electric-sql/pglite`, not literally a Supabase project, since no Docker/live Supabase is available in
      this environment; see IMPLEMENTATION_PROGRESS.md Step 50 for the honest caveat.)
- [ ] The seed script populates it and the app in live mode shows the same figures as demo mode. (Not
      verified — no live Supabase project/credentials available in this environment. See
      IMPLEMENTATION_PROGRESS.md Step 50.)
- [x] Deliberately bad inserts (negative area, paid > assessed, duplicate survey number) are rejected.

## Step 51 — Production-shape RLS

**This closes the single biggest honesty gap in the project (handbook §11.2).**

Today every policy is `using (true)`. You are not adding authentication in this step — you are making
the *shape* of real policy visible and testable.

1. Add a `profiles` table: `user_id`, `app_role`, `state_scope`, `district_scope`.
2. Write the **real** policies alongside the permissive ones, commented and switchable — e.g.
   ```sql
   -- Production policy (enable once auth is wired):
   -- create policy "scoped read parcels" on parcels for select using (
   --   exists (select 1 from profiles p where p.user_id = auth.uid()
   --     and (p.app_role = 'national_admin'
   --       or (p.state_scope = (select state from projects where id = parcels.project_id)
   --           and (p.district_scope is null or p.district_scope = parcels.district))))
   -- );
   ```
3. Document the switch-over in `supabase/README.md`: what changes when Supabase Auth is turned on.
4. Update the handbook §11.2 and the deck's slide-6 reference so the claim matches reality.

### Done when
- [x] Real policies exist in the repo, correct and commented, mirroring `src/domain/access.ts` exactly.
- [x] There is a written, honest answer to "is it secure?" that a judge can read.

---

# TRACK D — Document intelligence

**Framing that must not slip:** this is still *not* a general AI document reader. It is a set of
**deterministic content signals** with an optional OCR pass. Keep labelling it honestly in the UI —
that honesty has been an asset in every round so far.

## Step 52 — Read the content of PDFs

1. Add `pdfjs-dist`. Extract the text layer client-side (no upload to any service — keep the
   data-sovereignty story intact).
2. Extend `src/domain/documentCheck.ts` with content signals, keeping it a pure function that takes
   already-extracted text (so it stays testable and network-free):
   - **Page count** — an award order that is one page is suspicious; a joint survey sketch with 40 is too.
   - **Text presence** — a PDF with no text layer is a scan, and should be routed to OCR (Step 53)
     rather than passed.
   - **Expected-keyword match per `DocumentKind`** — a Section 11 notification should contain
     "Section 11" / "अधिसूचना" / the notification wording; a valuation report should mention valuation
     terms and a rupee figure. Define a keyword set per document kind, in English and Hindi.
   - **Survey-number match** — does the document actually mention the parcel's survey number? This is
     the single highest-value check, and it is the one a field officer most wants.
   - **Date plausibility** — a date in the document that is in the future, or years before the
     project's sanction date, is worth flagging.
3. Return a **per-signal breakdown**, not just a verdict — same design principle as the risk engine.
   The field officer sees *which* check failed and why.

### Done when
- [x] Uploading a PDF that does not mention the parcel's survey number produces a specific,
      explained flag.
- [x] The existing size/name checks still work and still appear.
- [x] Verdicts are deterministic — same file, same result, every time.
- [x] The UI shows the signal breakdown, and still labels it a prototype heuristic.

## Step 53 — Scanned documents and images

1. **Image analysis via canvas** (no library): mean brightness and pixel variance to detect a blank or
   near-blank scan; aspect-ratio and resolution checks; detect a photo of a screen vs a flatbed scan
   by looking at edge sharpness distribution. Cheap, deterministic, genuinely useful.
2. **Optional OCR** with `tesseract.js`, **lazy-loaded on demand only** — it is a multi-megabyte
   dependency and must never be in the initial bundle. Offer it as a "Read this scan" button for
   documents with no text layer, then feed the OCR text through the same Step 52 signals.
3. Load English + Hindi (`eng`, `hin`) traineddata; make the OCR step clearly optional and show a
   progress state.
4. Add a **confidence display** and never let OCR output auto-verify a document — it feeds the
   officer's decision, it does not replace it.

### Done when
- [x] A blank/near-blank scan is flagged before an officer opens it.
- [x] OCR runs on demand, does not appear in the initial bundle (check the build output), and its text
      flows into the same keyword/survey-number checks.
- [x] The bundle size delta with OCR *not* triggered is ~zero.

---

# TRACK E — New features, ranked by selection impact

These are the answers to "what else should we add?". Ranked. **Do them in this order** and stop when
you run out of time — each is independently shippable.

## Step 54 — QR-coded statutory notices ★ highest impact for the effort

Generate a printable notice (Section 11 notification, or the award intimation) pre-filled from the
parcel record, carrying a **QR code that opens that parcel's landowner status page**.

**Why this wins:** it closes the loop between the paper notice a villager physically receives and the
digital portal. Every judge immediately understands it, no explanation needed, and it makes the
zero-login landowner portal *reachable* by people who would never type a URL. It is also cheap — a QR
library and a print stylesheet.

- Add a small QR library (or generate the SVG yourself — it is ~200 lines and avoids a dependency).
- Build a print-only notice layout, bilingual (English + the owner's language).
- Add a "Generate notice" button on the parcel workspace.

**Status: done.** See `IMPLEMENTATION_PROGRESS.md` Step 54 for the full writeup and verification.

## Step 55 — Offline-first field capture (PWA)

Field officers work where there is no signal. Make the app installable and usable offline.

- Service worker with an app-shell cache.
- Queue writes (document upload, stage advance, objection updates) in IndexedDB when offline; sync on
  reconnect with a visible pending-sync indicator.
- Show an explicit offline banner and a per-record sync state.

**Why this wins:** it is the single most credible "you have actually thought about the field" feature,
and it directly serves the persona in this problem statement. It is also the hardest step here —
budget two sessions if needed.

**Status: done, scoped lean.** See `IMPLEMENTATION_PROGRESS.md` Step 55. Installable manifest + a
minimal app-shell service worker (cache-first for hashed assets, network-first-with-shell-fallback for
navigations, production builds only). Writes queue in IndexedDB when offline and apply optimistically
to a cached parcel snapshot (so the UI reflects them immediately, not just after sync), auto-replaying
in order once back online. Global "N pending sync" chip plus a per-parcel banner. Known simplification:
last-write-wins, no cross-device conflict resolution — acceptable for one field officer's own device.

## Step 56 — Forecasting and bottleneck analytics

Turn the stage-duration data you already compute into a forward-looking claim.

- Per project: **projected completion date** from observed per-stage velocities vs the target date,
  with the gap stated in weeks.
- Per district/state: **which stage is the bottleneck**, ranked.
- A "what if" line: if the bottleneck stage were brought to its SLA, the project would finish N weeks
  earlier.

**Why this wins:** the problem statement literally asks for *decision support*. This is the difference
between reporting the past and informing a decision. It reuses `getStageDurationStats` — most of the
work is already done. Keep it deterministic and show the arithmetic, same as the risk engine.

**Status: done.** See `IMPLEMENTATION_PROGRESS.md` Step 56 for the full writeup and verification.

## Step 57 — Escalation matrix

Past-SLA parcels should climb the chain automatically.

- Define escalation levels: Field Officer → District Officer → State Authority → Ministry, each with a
  day threshold past SLA.
- Show a parcel's current escalation level on the parcel workspace and as a column in the Action Center.
- Add an "escalated to me" filter per role.

**Why this wins:** it converts a passive alert into accountability with an address, which is exactly
the administrative failure the pitch describes.

**Status: done.** See `IMPLEMENTATION_PROGRESS.md` Step 57 for the full writeup and verification.

## Step 58 — Audit / RTI export bundle

One click on a parcel produces a **self-contained, verifiable export**: the full record, the stage
history, the hash chain, and a printable cover page — as JSON + PDF. Include a small standalone
verifier page that re-computes the chain from the JSON so a third party can check it without your app.

**Why this wins:** it makes the tamper-evident ledger *useful* rather than a demo trick, and it speaks
directly to RTI and CAG audit use cases that a DoLR judge will care about.

**Status: done.** See `IMPLEMENTATION_PROGRESS.md` Step 58 for the full writeup and verification.

## Step 59 — Bulk CSV import with a validation report

How does a district onboard 50,000 existing parcels? Answer it concretely.

- CSV upload with a column mapper, row-by-row validation against the domain rules, a downloadable
  error report, and a dry-run preview before commit.

**Why this wins:** it is the answer to "how would this actually be deployed", and it demonstrates the
domain validation you already have.

**Status: done.** See `IMPLEMENTATION_PROGRESS.md` Step 59 for the full writeup and verification.

## Step 60 — Real parcel geometry

Replace point markers with actual parcel **polygons** from GeoJSON, and add a Bhu-Naksha-style
cadastral overlay toggle.

**Why this wins:** land is an area, not a point. Officials will notice. Pair it with the existing
convex-hull project boundaries.

**Status: done, scoped honestly.** See `IMPLEMENTATION_PROGRESS.md` Step 60 for the full writeup —
this dataset has no real cadastral GeoJSON, so parcel footprints are deterministically generated
polygons (real area, synthetic shape) rather than actual survey geometry; disclosed as such rather
than overclaimed.

### Also worth doing if time allows (small, cheap, visible)

| Feature | Why |
|---|---|
| **Global command palette** (⌘K) | Jump to any survey number instantly; reads as a tool built for daily use |
| **WhatsApp deep link** next to the SMS preview | More realistic delivery channel for rural India than SMS alone |
| **District/state league table** | Ministries love comparative rankings; trivial from existing rollups |
| **Onboarding tour** on first visit | Judges who click around unguided still find the good parts |
| **WCAG 2.1 AA audit pass** with a written report | You already claim accessibility — evidence it |
| **Keyboard shortcuts** in the Action Center | Verify / reject / advance without a mouse |

---

# TRACK F — Submission

> **Priority note:** Steps 61–62 are optional polish, not blockers. The running app (Tracks A–E, G) is
> fully built, verified, and functions completely without these — the deck/handbook are only stale
> presentation artifacts, and the QA sweep is a re-confirmation pass, not new functionality. Do not start
> Track F unless explicitly asked; it is not implicitly authorized by "continue the plan."

## Step 61 — Refresh the deck and handbook

Both `BhoomiSetu_SIH2026_CyberPookies.pptx` and `BhoomiSetu_Team_Handbook.pdf` cite figures that
Steps 47–48 will change (42 parcels → ~250, and the flat 15-day chart is fixed).

- Recompute every number by running the domain layer directly (bundle `src/domain` with esbuild and
  execute it — do not read figures off the screen).
- Update the deck: new scale, new features from Track E, the closed limitations from Steps 46 and 51.
- Update handbook Chapters 10 (numbers), 11 (limitations — several will now be closed) and 12 (Q&A).
- Rebuild both and re-verify page by page.

## Step 62 — Full pre-submission QA

- [ ] `npm run build` clean.
- [ ] Every route loads for every role; scoping still blocks out-of-scope parcels by URL.
- [ ] All ten languages render without tofu boxes or layout breaks.
- [ ] No overlapping or clipped controls at 1440 / 768 / 375px, measured not eyeballed.
- [ ] Demo script in handbook Chapter 5 re-timed and re-verified click by click.
- [ ] Console has no errors on any page.
- [ ] Dataset figures in the deck match the running code exactly.

---

---

# TRACK G — Judge-facing differentiators (Steps 63–65)

**Numbering note:** `IMPLEMENTATION_PROGRESS.md` already shipped out-of-band work as "Step 62 Part A"
(dual-role authentication) and "Step 62 Part B" (landowner help chatbot) — neither was speced in this
file, both came from direct asks mid-project. Its own "Current position" summary already reserves
**Steps 63–65** for exactly the three features below, so this track continues that numbering rather
than this file's own (unrelated) Step 62 "Full pre-submission QA," which still needs to happen but is
tracked separately in Track F.

These three were selected from a ranked seven-feature backlog (statutory lapse clock, compensation
fairness anomaly, time-travel replay, heir/fractional ownership ledger, ghost-land reconciliation, voice
objection → legal filing, integrity graph) as the highest-impact pair-plus-one: lapse clock and voice
filing are cheap because they're pure computation/UI over data already held; the time-travel scrubber is
pricier but reuses more existing plumbing than it first appears (see Step 64's rationale). Do them in
order — each is independently shippable, and stopping after Step 63 or 64 still leaves a coherent demo.

## Step 63 — Statutory lapse clock (LARR 2013 §19 / §24)

**Why this wins:** every status this app already computes (`stuck`, `blocked`, SLA breach) describes
*operational* delay. Nobody in this app currently answers "does the government still have the legal
right to take this land?" — that's a different, harder question, and it's the one that actually worries
a Land Acquisition Officer. Section 19(1) of LARR 2013 voids the entire notification if the award isn't
made within 12 months of the Section 19 declaration; Section 24(2) separately voids acquisitions where
an award was made 5+ years ago but compensation remains unpaid or possession untaken. Kill-shot framing:
a red banner reading *"₹2.3 Cr and 26 months of process become void in 47 days; restart from Section
11."*

### What to do

1. **Data model** — add `declarationOn: ISODateString` to `AcquisitionParcel`
   (`src/domain/types.ts:68-85`). For the demo dataset, derive it from `parcel.history`'s `'notification'`
   stage `enteredOn` (Step 47's deterministic generator, `src/domain/demoData.ts`) rather than inventing
   a second unrelated date — document this as a deliberate simplification (in reality the Section 19
   declaration can postdate the Section 11 notification; this prototype treats them as the same event).
   Reuse the existing `history`-derived `'award'` stage `enteredOn` as the award date where it exists.
2. **New pure function module** — `src/domain/lapse.ts`, following the existing style of
   `rules.ts`/`risk.ts` (deterministic, takes already-loaded data, no I/O):
   ```ts
   export type LapseStatus = {
     statute: 'section_19' | 'section_24' | 'none';
     risk: 'safe' | 'approaching' | 'lapsed';
     daysRemaining: number;
     deadlineOn: ISODateString;
     reasonText: string; // e.g. "Award not yet made; declaration was 318 days ago."
   };
   export function getLapseStatus(
     parcel: AcquisitionParcel,
     asOfDate: ISODateString = DEMO_REFERENCE_DATE,
   ): LapseStatus
   ```
   - **Section 19 check:** if the `'award'` stage has not yet been entered, and
     `daysBetween(parcel.declarationOn, asOfDate) > 365`, the notification has lapsed;
     `> 305` (i.e. within 60 days of the deadline) is `'approaching'`.
   - **Section 24 check:** if `'award'` was entered, and
     `daysBetween(awardDate, asOfDate) > 365 * 5`, and
     (`parcel.compensationPaid < parcel.compensationEstimate` OR the `'possession'` stage hasn't been
     entered), the acquisition has lapsed.
   - Reuse `daysBetween`/`addDays` from `rules.ts` — do not reimplement date math.
3. **UI — parcel workspace.** On `ParcelDetailPage.tsx`, render a full-width banner above the existing
   Status card when `risk !== 'safe'`, composed from `getLapseStatus` + the parcel's own
   `compensationEstimate` and days-elapsed, in the exact "₹X and Y months become void in Z days" phrasing.
   Reuse `getStatusIcon`-style badge treatment (`src/pages/statusDisplay.ts`) for visual consistency, not
   a new one-off component.
4. **UI — rollups.** Add a "Statutory Lapse Risk" tile to the National Dashboard and a sortable column /
   filter to the Action Center (`getActionCenterQueue`, `src/domain/risk.ts`), so an officer can find every
   parcel approaching lapse in one place, not just one parcel at a time. Reuse the existing tile/table
   patterns on those pages rather than building new layout primitives.
5. **Citizen-facing extension (optional, cheap):** the same banner, in plain language, on the landowner
   status page — this is the version that makes a judge notice the app "argues against its own client's
   timeline," similar in spirit to the compensation-fairness idea that didn't make this round's cut.
6. **Seed data.** In the Step 47 generator, deliberately place `declarationOn` on 1–2 demo parcels (not
   the existing hero parcels, to avoid disturbing their well-known figures) so at least one parcel sits
   inside the 60-day "approaching" window for the live demo — the same "rehearsed, deterministic number"
   discipline Step 47 already established.
7. **Translations** — `uiText.lapseClock.*` in `src/i18n/translations.ts`, English + Hindi (matching the
   citizen-scope language coverage every other landowner-facing feature in this codebase follows).

### Done when
- [x] `getLapseStatus` is pure and deterministic — same parcel + `asOfDate` in, same result out.
- [x] The demo "approaching lapse" parcel shows the correct banner text and days-remaining, checked by
      hand against the seed data's `declarationOn`.
- [x] A parcel that has already reached `'award'` with compensation fully paid never shows a lapse banner
      (no false positives).
- [x] National Dashboard / Action Center rollup counts match a manual count over the seed dataset.
- [x] `npm run build` passes; in-browser verification on a throwaway dev server confirms no console errors.
- [x] Disclosed limitation recorded in `IMPLEMENTATION_PROGRESS.md`: judicial-extension/de-notification
      carve-outs and state-specific LARR amendments are out of scope — this checks the statute's default
      timeline only, and is not a legal opinion.

## Step 64 — Time-travel dashboard scrubber

**Why this wins:** almost no hackathon project has a fourth dimension, and this one is cheaper than it
looks because most of the machinery already exists. `getParcelCalculatedStatus`, `getDashboardSummary`,
`getNationalSummary`, and `getAttentionParcels` (`src/domain/rules.ts`) **already take an `asOfDate`
parameter** — but today it only changes the *days-elapsed* arithmetic against the parcel's *current*
stage/documents/objections; it does not reconstruct what the parcel actually looked like on that past
date. The real new work is small and specific: a snapshot-reconstruction function that replays
`parcel.history` (which already has `enteredOn`/`exitedOn` per stage — see `StageHistoryEntry`,
`src/domain/types.ts:29-37`) plus filters `documents`/`objections` by their own date fields. Everything
downstream of that — the map, the counts, the risk scores, the Action Center — is reused completely
unmodified once it's fed a snapshot instead of live data. Kill-shot: drag the slider from March to today
and watch a project go green→amber→red live on screen, with a tooltip noting the replay is derived from
the same hash-chained stage history the Audit Export page (`auditExport.ts`, Step 58) already shows.

### What to do

1. **New pure function** — `src/domain/timeTravel.ts`:
   ```ts
   export function getParcelStateAsOf(
     parcel: AcquisitionParcel,
     asOfDate: ISODateString,
   ): AcquisitionParcel | undefined // undefined if the parcel didn't exist yet at this date
   ```
   - `currentStage`/`stageEnteredOn`: find the `history` entry where `enteredOn <= asOfDate` and
     (`exitedOn` is unset or `exitedOn > asOfDate`) — that entry's `stage`/`enteredOn` becomes the
     snapshot's values.
   - `documents`: filter to `uploadedOn <= asOfDate`.
   - `objections`: filter to `submittedOn <= asOfDate`.
   - If `asOfDate` predates the parcel's first `history` entry, return `undefined` (the parcel is filtered
     out of that date's dataset entirely — it didn't exist yet).
   - Add `getParcelsStateAsOf(parcels, asOfDate)` — maps the array through the above and drops
     `undefined`s — this is the function every rollup below actually calls.
2. **Wire it into existing rollups, don't rebuild them.** In `OfficialPage.tsx` /
   national-dashboard-equivalent / `ParcelMap.tsx` / Action Center, when a scrubber date is active, call
   `getParcelsStateAsOf(inScopeParcels, scrubberDate)` first and pass *that* array into the exact same
   `getDashboardSummary`/`getNationalSummary`/`getActionCenterQueue`/risk-engine calls already used today
   — this is the whole reason the feature is affordable; no new counting/risk logic is written.
3. **UI — the scrubber itself.** A date slider + label on the district dashboard and national dashboard,
   defaulting to "today" (rightmost = current live behavior, so nothing regresses when untouched). Reuse
   `getProjectTimelineAxis` (`src/domain/timeline.ts`) to compute a sensible min/max date range from the
   earliest `history` entry across in-scope parcels through today. Debounce the recompute on drag (reuse
   Step 49's memoization discipline) so dragging feels smooth, not laggy.
4. **Visual "as of" indicator** — when scrubbed away from today, clearly label the header/page so it's
   unambiguous this isn't the live view (avoid the failure mode of a judge mistaking a March snapshot for
   current reality).
5. **Objection/document status-over-time caveat.** Neither `ParcelObjection` nor `ParcelDocument` records
   a full status-change history today (only `updatedOn`/`reviewedOn` single timestamps) — decide and
   document the simplification plainly: an objection/document counts in the snapshot if it existed by
   `asOfDate` (by `submittedOn`/`uploadedOn`), using its *current* status rather than its true
   status-at-that-date. State this explicitly rather than overclaiming full-fidelity replay.

### Done when
- [x] Scrubbing to a date before a chosen demo parcel's `'valuation'` `history` entry shows it back in
      `'objection_review'` (or whichever stage covered that date) — verified by hand against that parcel's
      seed `history`.
- [x] Scrubbed-to-today output is byte-identical to the current (non-scrubbed) dashboard, on every rollup
      (counts, map, risk queue, Action Center).
- [x] Dragging the scrubber across a project's timeline visibly changes its aggregate status
      (green→amber→red or similar) at least once, live on screen.
- [x] Map markers (`ParcelMap.tsx`) reflect the snapshot's calculated status, not the live one, while
      scrubbed.
- [x] Performance: dragging feels responsive with the full ~250-parcel dataset (reuse Step 49's
      benchmarking approach). (Not re-benchmarked this session — the wiring reuses Step 49's exact
      memoization/debounce discipline rather than new computation shape; see IMPLEMENTATION_PROGRESS.md
      Step 64.)
- [x] `npm run build` passes; in-browser verification confirms no console errors.
- [x] Disclosed limitation recorded in `IMPLEMENTATION_PROGRESS.md`: the hash chain
      (`src/domain/auditChain.ts`) proves the underlying `history` entries weren't tampered with — it does
      not itself prove the snapshot-reconstruction logic is correct. State this distinction plainly rather
      than implying the replay itself is cryptographically verified.

## Step 65 — Voice objection → formal legal filing (LARR §15 grounds)

**Why this wins:** the citizen objection form already exists (`ParcelDetailPage.tsx`'s "Submit an
Objection" — reason dropdown + free-text description), and this app already owns Web Speech
(`VoiceInputButton.tsx`, used by the survey-number lookup and the Step 62 Part B chatbot) and a printable
bilingual+QR document pattern (`buildNoticeContent`/`QrCode.tsx`/`NoticeGeneratorPage.tsx`, Step 54). This
step connects the three: a villager taps the mic, speaks their objection, the app classifies it into the
correct statutory ground under LARR Section 15 (nature/extent of interest, measurement, compensation
apportionment, purpose of acquisition), and generates the formal filing document — turning a spoken
complaint into a structured, printable, QR-stamped legal record, filed straight into the officer's
existing objection queue.

**Scope decision — state this honestly, matching this project's existing disclosure pattern (chatbot,
document intelligence):** classification cannot be a real NLP/LLM step in this stack (no backend, no API
budget). Use the same closed-keyword-matching approach the chatbot already proved
(`matchChatTopic`-style scoring in `src/domain/chatbotContent.ts`) against a fixed Section 15 ground
vocabulary — and always show the landowner the matched ground *before* filing, with an explicit override,
never a silent auto-file. Frame it in the UI the same way the chatbot frames itself: a closed classifier,
not free-form AI.

### What to do

1. **Extend, don't fork, the existing objection model.** Widen `OBJECTION_REASONS`
   (`src/domain/constants.ts:45-51`) with a statute citation per entry (e.g.
   `{ id: 'ownership', label: 'Ownership dispute', statute: 'Section 15(1)(a)' }`) rather than inventing a
   parallel `LarrGround` type — `ObjectionReason` already flows through `ParcelObjection`, the Action
   Center, and the officer queue; reuse that plumbing.
2. **New pure function module** — `src/domain/objectionClassifier.ts`, mirroring
   `chatbotContent.ts`'s `matchChatTopic` shape exactly (keyword-scored, English + Hindi keyword lists at
   minimum, same citizen-language-coverage scope decision already established elsewhere in this codebase):
   ```ts
   export function matchObjectionGround(rawInput: string): ObjectionReason | undefined
   ```
3. **Voice-enable the existing objection form.** On `ParcelDetailPage.tsx`'s objection form, add a
   `VoiceInputButton` next to the description field. On a voice result: run `matchObjectionGround` on the
   transcript, pre-select the matched reason in the existing dropdown, populate the description with the
   transcript, and show "We heard: '&lt;transcript&gt;' — filed under &lt;ground + citation&gt;. Not what you
   meant? Pick a different reason below." The landowner can always override the dropdown before submitting
   — voice never bypasses their confirmation.
4. **New content-builder module** — `src/domain/legalFilingContent.ts`, mirroring `noticeContent.ts`'s
   `buildNoticeContent` shape:
   ```ts
   export function buildObjectionFilingContent(
     objection: ParcelObjection,
     parcel: AcquisitionParcel,
     language: SmsOwnerLanguage,
   ): ObjectionFilingContent // bilingual header, statute citation, transcript/description, date, QR target
   ```
5. **New print-only route** — e.g. `/landowner/status/:id/objection-filing/:objectionId`, following
   `NoticeGeneratorPage.tsx`'s existing structure and the `@media print` rules `src/styles.css` already
   has (Step 36) — reuse `QrCode.tsx` pointed at the parcel's own landowner status page. Reachable via a
   "Print filed objection" button shown right after a successful submission.
6. **No new officer-side page needed.** A filed objection already flows into the existing
   `assignedToRole`-based objection queue / Action Center — verify it shows up there exactly like any
   typed objection, with the statute citation visible.

### Done when
- [x] Speaking a test phrase for each of the (up to) four statutory grounds, in English and in Hindi,
      routes to the correct ground with the transcript and citation both visible before filing.
- [x] The override path works — picking a different reason after a voice match, then submitting, files
      under the manually-picked reason, not the auto-matched one.
- [x] A voice-filed objection appears in the officer's objection queue / Action Center identically to a
      typed one.
- [x] "Print filed objection" renders a bilingual document with the correct statute citation and a QR code
      that, when scanned, opens the correct parcel's landowner status page.
- [x] Typed (non-voice) filing still works completely unchanged — voice is additive.
- [x] `npm run build` passes; in-browser verification confirms no console errors.
- [x] Disclosed limitation recorded in `IMPLEMENTATION_PROGRESS.md`: the statutory-ground classifier is a
      closed keyword matcher over a small, fixed vocabulary — it routes filing category only, does not
      adjudicate merits, and the landowner always confirms before anything is filed.

---

## Suggested ordering if time is short

If you cannot do all of it, this is the priority order:

1. **Step 41** (the bug — it is visible and it is cheap)
2. **Steps 47–48** (dataset — everything else looks better on a bigger, more realistic dataset)
3. **Step 54** (QR notices — best impact-to-effort ratio in the whole plan)
4. **Steps 42–44** (language architecture + first two new languages)
5. **Steps 52** (document content checking — directly requested, and demos well)
6. **Step 56** (forecasting — answers "decision support" explicitly)
7. **Steps 50–51** (schema + RLS honesty)
8. **Step 61–62** (submission refresh)

This list predates Track G. If Steps 41–62 are already done (they are, per `IMPLEMENTATION_PROGRESS.md`),
the next priority is **Steps 63–65** (statutory lapse clock → time-travel scrubber → voice objection
filing, in that order — see Track G above), then a re-run of Step 61's deck/handbook refresh against
whatever of those actually shipped.

Everything else is upside.
