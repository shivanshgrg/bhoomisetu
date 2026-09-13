// Step 50 — one-off seed script for a real Supabase project.
//
// src/domain/demoData.ts is the single source of truth for the ~250
// fictional parcels (including hero parcel 124/7) and the projects they
// belong to. This script inserts that same data into Supabase's Postgres so
// "live mode" (VITE_SUPABASE_URL configured) shows the identical figures
// "demo mode" (no Supabase configured, data held in memory) already shows.
//
// Usage:
//   SUPABASE_URL=https://<project>.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
//   npm run db:seed
//
// Never the anon key — this bypasses Row Level Security by design (a seed
// script is trusted, one-off, run-by-hand tooling, not the app's own runtime
// path) — and never commit or bundle the service-role key anywhere.
//
// Safe to re-run: every insert is an upsert keyed on the table's primary
// key, so running this twice against the same project re-seeds in place
// rather than duplicating rows.
//
// The stage_history hash chain below duplicates src/domain/auditChain.ts's
// `computeNextHash`/`GENESIS_HASH` rather than importing them. That module
// is written against the global WebCrypto `crypto.subtle` API (see its own
// comments) which both Node and the browser expose, so the import would
// work — but this script also needs to import demoData's *type* surface
// only, and pulling in the domain layer's audit-chain module here would
// make a one-off Node script a second real consumer of that module's
// runtime behaviour, which is more coupling than a seed script needs.
// Keeping the ~10-line hash routine local matches this codebase's existing
// precedent (src/domain/smsPreview.ts deliberately duplicates a handful of
// translated strings from src/i18n rather than importing across that same
// kind of layer boundary — see IMPLEMENTATION_PROGRESS.md Step 20).

import { createClient } from '@supabase/supabase-js';
import { demoParcels, demoProjects } from '../src/domain/demoData';
import type { AcquisitionParcel, StageHistoryEntry } from '../src/domain/types';

const GENESIS_HASH = '0'.repeat(64);

function canonicalize(entry: StageHistoryEntry): string {
  return [entry.id, entry.parcelId, entry.stage, entry.enteredOn, entry.exitedOn ?? '', entry.handledByRole, entry.note].join(
    '|',
  );
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

type HashedHistoryRow = {
  id: string;
  parcel_id: string;
  stage: string;
  entered_on: string;
  exited_on: string | null;
  handled_by_role: string;
  note: string;
  prev_hash: string;
  entry_hash: string;
};

async function buildHashedHistoryRows(parcel: AcquisitionParcel): Promise<HashedHistoryRow[]> {
  // Mirrors AuditChainLedger.tsx's own sort — the chain must be built in the
  // same chronological order the app builds and verifies it in, or a
  // correctly-seeded chain would show as broken the first time someone
  // opens the parcel's audit tab.
  const sorted = [...parcel.history].sort((a, b) => a.enteredOn.localeCompare(b.enteredOn));
  const rows: HashedHistoryRow[] = [];
  let previousHash = GENESIS_HASH;

  for (const entry of sorted) {
    const entryHash = await sha256Hex(`${previousHash}|${canonicalize(entry)}`);
    rows.push({
      id: entry.id,
      parcel_id: entry.parcelId,
      stage: entry.stage,
      entered_on: entry.enteredOn,
      exited_on: entry.exitedOn ?? null,
      handled_by_role: entry.handledByRole,
      note: entry.note,
      prev_hash: previousHash,
      entry_hash: entryHash,
    });
    previousHash = entryHash;
  }

  return rows;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script.');
    process.exit(1);
  }

  const client = createClient(url, serviceRoleKey);

  const projectRows = demoProjects.map((project) => ({
    id: project.id,
    name: project.name,
    sector: project.sector,
    state: project.state,
    implementing_agency: project.implementingAgency,
    sanctioned_on: project.sanctionedOn,
    target_completion_on: project.targetCompletionOn,
    total_area_required_hectares: project.totalAreaRequiredHectares,
    compensation_sanctioned: project.compensationSanctioned,
    affected_families: project.rAndR.affectedFamilies,
    displaced_families: project.rAndR.displacedFamilies,
    families_resettled: project.rAndR.familiesResettled,
    rr_checklist_complete: project.rAndR.rrChecklistComplete,
  }));

  console.log(`Seeding ${projectRows.length} projects...`);
  const { error: projectError } = await client.from('projects').upsert(projectRows, { onConflict: 'id' });
  if (projectError) {
    throw projectError;
  }

  const parcelRows = demoParcels.map((parcel) => ({
    id: parcel.id,
    project_id: parcel.projectId,
    survey_number: parcel.surveyNumber,
    owner_name: parcel.owner.name,
    owner_phone: parcel.owner.phone,
    owner_preferred_language: parcel.owner.preferredLanguage,
    village: parcel.village,
    tehsil: parcel.tehsil,
    district: parcel.district,
    area_hectares: parcel.areaHectares,
    current_stage: parcel.currentStage,
    stage_entered_on: parcel.stageEnteredOn,
    declaration_on: parcel.declarationOn,
    compensation_estimate: parcel.compensationEstimate,
    compensation_paid: parcel.compensationPaid,
    latitude: parcel.coordinates.lat,
    longitude: parcel.coordinates.lng,
  }));

  console.log(`Seeding ${parcelRows.length} parcels...`);
  for (const batch of chunk(parcelRows, 200)) {
    const { error } = await client.from('parcels').upsert(batch, { onConflict: 'id' });
    if (error) {
      throw error;
    }
  }

  let historyCount = 0;
  let documentCount = 0;
  let objectionCount = 0;

  for (const parcel of demoParcels) {
    const historyRows = await buildHashedHistoryRows(parcel);
    if (historyRows.length > 0) {
      const { error } = await client.from('stage_history').upsert(historyRows, { onConflict: 'id' });
      if (error) {
        throw error;
      }
      historyCount += historyRows.length;
    }

    const documentRows = parcel.documents.map((document) => ({
      id: document.id,
      parcel_id: document.parcelId,
      stage: document.stage,
      kind: document.kind,
      title: document.title,
      uploaded_on: document.uploadedOn,
      uploaded_by_role: document.uploadedByRole,
      file_type: document.fileType,
      url: document.url,
      status: document.status,
      rejection_reason: document.rejectionReason ?? null,
      reviewed_by_role: document.reviewedByRole ?? null,
      reviewed_on: document.reviewedOn ?? null,
      quality_check_verdict: document.qualityCheckVerdict ?? null,
    }));
    if (documentRows.length > 0) {
      const { error } = await client.from('documents').upsert(documentRows, { onConflict: 'id' });
      if (error) {
        throw error;
      }
      documentCount += documentRows.length;
    }

    const objectionRows = parcel.objections.map((objection) => ({
      id: objection.id,
      parcel_id: objection.parcelId,
      submitted_on: objection.submittedOn,
      submitted_by: objection.submittedBy,
      reason: objection.reason,
      description: objection.description,
      status: objection.status,
      updated_on: objection.updatedOn,
      assigned_to_role: objection.assignedToRole,
    }));
    if (objectionRows.length > 0) {
      const { error } = await client.from('objections').upsert(objectionRows, { onConflict: 'id' });
      if (error) {
        throw error;
      }
      objectionCount += objectionRows.length;
    }
  }

  console.log(
    `Done. Seeded ${projectRows.length} projects, ${parcelRows.length} parcels, ${historyCount} stage_history rows (hash-chained per parcel), ${documentCount} documents, ${objectionCount} objections.`,
  );
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
