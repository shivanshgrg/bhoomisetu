# BhoomiSetu — Judge-Ready Command Center Upgrade

**Goal:** make the working prototype read as a national, citizen-aware decision-support system within 30 seconds:

`National oversight → project bottleneck → GIS parcel → document action → stage update → landowner notification`

**Delivery rule:** one numbered step per fresh chat. Implement, run `npm run build`, verify in-browser, update `IMPLEMENTATION_PROGRESS.md`, then stop. Do not change the seven-stage engine, access scoping, document gates, risk engine, audit chain, offline behavior, multilingual/voice support, or landowner portal unless a step explicitly says so.

## Phase A — Baseline

- [x] **66. Regression checklist and demo baseline.** Lock the hero project and blocked parcel; record the official, citizen, document, stage, risk, GIS, offline, language, voice, audit, and report checks.

## Phase B — Visual foundation

- [x] **67. Global design tokens.** Retain the warm civic identity; improve typography, spacing, surfaces, radii, shadows, page widths, and status colours only.
- [ ] **68. Controls and statuses.** Add success/destructive button variants and normalize Critical, Delayed, On Track, Pending, Verified, and Blocked badges.
- [ ] **69. Card variants.** Add additive metric, alert, interactive, and dark-highlight variants.
- [ ] **70. Tables.** Improve hierarchy, hover, empty states, and suitable sticky headers without changing `DataTable` behavior.

## Phase C — Official shell

- [ ] **71. Sidebar.** Group routes under Command, Acquisition, Operations, Intelligence, and Administration with icons and active states.
- [ ] **72. Context header.** Add organization, role, jurisdiction, language/theme, and notification context.
- [ ] **73. Responsive navigation.** Add a compact mobile/tablet official navigation state.

## Phase D — National Command Center

- [x] **74. National header.** Present the National Land Acquisition Command Center without changing calculations.
- [x] **75. KPI strip.** Promote existing project, land, compensation, possession, critical-parcel, and lapse-risk figures.
- [x] **76. Portfolio pipeline.** Show progress and existing seven-stage counts.
- [x] **77. Interactive pipeline.** Link a selected stage to the existing scoped parcel dashboard through optional URL filter state.
- [x] **78. Immediate Intervention panel.** Reuse Action Center, risk, escalation, and lapse results with direct queue navigation.
- [x] **79. Prominent GIS.** Strengthen the existing map panel, legend, project boundaries, and parcel drill-down.

## Phase E — Project Command Center

- [x] **80. Project links.** Make existing project references actionable without bypassing scope checks.
- [x] **81. Project overview route.** Add `/official/project/:id` using existing identity, land, compensation, possession, and R&R data.
- [x] **82. Project KPIs and pipeline.** Add project-only metrics and stage counts.
- [x] **83. Project GIS.** Reuse `ParcelMap` filtered by `projectId`.
- [x] **84. Project bottleneck intelligence.** Derive leading delay/cause/action from current risk, forecast, escalation, and duration logic.
- [x] **85. Project tabs.** The single Overview screen deliberately combines the requested operational views; separate shallow tabs are deferred in favor of the working project story.

## Phase F — Parcel and document workflow

- [x] **86. Parcel command header.** Make parcel identity, stage, risk, owner, location, and project instantly scannable.
- [x] **87. Current Action Required.** Promote existing gate and risk recommendations with direct action targets.
- [x] **88. Document checklist.** Show verified, pending, rejected, and missing current-stage requirements using the same advance-gate logic.
- [x] **89. Document-review queue.** Add a scoped official queue that opens the existing parcel workflow.
- [x] **90. Verification workspace.** The existing workspace now has a direct queue hand-off plus the established quality/OCR, verify, and reject controls; OCR remains advisory.
- [x] **91. Clear outcomes.** The command card and checklist recalculate from the real parcel after document actions, so gate/risk consequences are immediately visible.

## Phase G — Visible module gaps

- [x] **92. Compensation overview.** Added `/official/compensation` with existing totals and parcel drill-down.
- [x] **93. R&R overview.** Added `/official/r-and-r` using only current project R&R data.
- [ ] **94. Integration Showcase.** Add `/official/integrations` with truthful Demo simulation / Ready for integration / Not connected labels only.
- [ ] **95. MIS report categories.** Reframe existing reports as Portfolio, Stage Performance, Compensation, Risk & Delays, R&R, and Audit/RTI.

## Phase H — Cross-portal story

- [x] **96. Workflow-event model.** Add presentation-only events for completed workflow actions; do not replace history or audit semantics.
- [x] **97. Citizen updates.** Surface safe, translated events on the landowner status page only.
- [x] **98. Demo Mode.** Guide the hero project/parcel resolution story and reset safely in demo mode only.

## Phase I — Final readiness

- [ ] **99. Motion.** Add restrained, reduced-motion-safe transitions.
- [ ] **100. Accessibility and responsive pass.** Test keyboard access, contrast, status semantics, tables, and 375px/768px/1440px layouts.
- [ ] **101. Final regression and rehearsal.** Run every advertised workflow and refresh pitch assets from deterministic data.

## Compatibility guardrails

- UI primitive changes are additive. New routes must retain existing guards and session scoping.
- Existing repository contracts, stage history, audit-chain semantics, and acquisition rules stay unchanged.
- Never claim a live government, payment, identity, SMS, or GIS integration without an approved, configured connection.
