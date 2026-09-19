# BhoomiSetu — Step 66 Regression Baseline

**Recorded:** 19 September 2026  
**Branch:** `finals-ui-upgrade`  
**Reference data:** deterministic demo dataset at `DEMO_REFERENCE_DATE`  
**Hero story:** Pune–Nagpur Expressway Land Corridor → Survey `124/7` (Kavita Patil) → missing Valuation Report blocks Valuation-stage advancement.

## Baseline acceptance checks

| Area | Expected baseline outcome |
| --- | --- |
| Official access | National, state, district, and field officials are restricted to their authorized routes and project/parcel scope. Direct access to an out-of-scope parcel shows not found. |
| Landowner access | A landowner signs in with the demo OTP flow, can search only their own parcel, view its status, submit an objection, and print its filing. |
| Hero parcel gate | Survey `124/7` is in Valuation, is stuck, and cannot advance because `valuation_report` is missing or unverified. |
| Document workflow | Upload creates a pending-review document; Verify makes it count toward the gate; Reject requires a reason and remains visible to the landowner. OCR/quality signals are advisory only. |
| Stage workflow | Every required document must be verified and all objections resolved before the existing seven-stage engine permits advancement. |
| Risk and action | Action Center ordering, risk contributors, recommended action, escalation, statutory-lapse status, and dashboard counts derive from the same scoped parcel data. |
| GIS | Table and map reflect the same filters. Map supports marker/project status, boundaries, parcel footprints, cadastral overlay, and data-saver fallback. |
| Reports and audit | Reports print; stage-duration, forecast, and audit export work. Audit ledger verifies untouched history and shows tampering when simulated. |
| Citizen communication | Status, printable notices, SMS preview, read-aloud, voice survey input, and voice objection filing retain language-aware fallback behavior. |
| Offline | The installable shell, connectivity banner, queued writes, and later sync indication remain available without changing ordinary online behavior. |

## Demo route

1. Sign in as an authorized official and open the Action Center.
2. Identify Survey `124/7` as a blocked Valuation case and open its parcel workspace.
3. Review/verify the required Valuation Report, then confirm the gate changes before advancing the stage.
4. Re-open the relevant dashboard/Action Center to show calculated risk and queue changes.
5. Sign in as Kavita Patil to show the updated parcel timeline and citizen-facing notification/communication state.

## Baseline evidence

- Production build must complete with `npm run build` before any upgrade step begins.
- Browser checks must use demo mode; never mutate an unconfigured live/Supabase environment.
- Visual reference screens: landing page, district dashboard, Action Center, Survey `124/7`, landowner status page, reports, and audit export.
