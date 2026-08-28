-- SIH26016 Land Acquisition Tracker — Supabase schema
-- Run this in the Supabase SQL editor (or `supabase db push`) on a fresh project.
-- Safe to re-run: guarded with `if not exists` / `on conflict` where practical.

-- ── Enums ─────────────────────────────────────────────────────────────────
-- Kept in sync with src/domain/constants.ts. If a stage, role, or document
-- kind changes there, mirror the change here with `alter type ... add value`.

do $$ begin
  create type official_role as enum (
    'district_collector',
    'land_acquisition_officer',
    'survey_officer',
    'valuation_officer',
    'compensation_officer'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type stage_id as enum (
    'notification',
    'survey',
    'objection_review',
    'valuation',
    'compensation_approval',
    'award',
    'possession'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type document_kind as enum (
    'section_11_notification',
    'joint_survey_sketch',
    'ownership_record',
    'objection_hearing_minutes',
    'valuation_report',
    'compensation_statement',
    'award_order',
    'possession_memo'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type objection_status as enum ('pending', 'under_review', 'resolved');
exception when duplicate_object then null; end $$;

-- Step 27: document verification status, kept in sync with
-- src/domain/constants.ts DOCUMENT_STATUSES.
do $$ begin
  create type document_status as enum ('pending_verification', 'verified', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type objection_reason as enum (
    'ownership',
    'measurement',
    'valuation',
    'compensation',
    'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type preferred_language as enum ('en', 'hi', 'mr');
exception when duplicate_object then null; end $$;

-- Step 12+: national-dashboard project domain (kept in sync with
-- src/domain/constants.ts PROJECT_SECTORS / STATE_NAMES).
do $$ begin
  create type project_sector as enum (
    'national_highway',
    'railway',
    'irrigation',
    'industrial_corridor',
    'power_transmission',
    'urban_infrastructure',
    'port',
    'mining'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type state_name as enum (
    'maharashtra',
    'gujarat',
    'madhya_pradesh',
    'telangana',
    'odisha',
    'uttar_pradesh',
    'rajasthan',
    'karnataka',
    'tamil_nadu',
    'west_bengal'
  );
exception when duplicate_object then null; end $$;

-- ── Tables ────────────────────────────────────────────────────────────────

create table if not exists projects (
  id text primary key,
  name text not null,
  sector project_sector not null,
  state state_name not null,
  implementing_agency text not null,
  sanctioned_on date not null,
  target_completion_on date not null,
  total_area_required_hectares numeric(10, 2) not null,
  compensation_sanctioned numeric(14, 2) not null,
  affected_families integer not null default 0,
  displaced_families integer not null default 0,
  families_resettled integer not null default 0,
  rr_checklist_complete boolean not null default false
);

create index if not exists projects_state_idx on projects (state);

create table if not exists parcels (
  id text primary key,
  project_id text not null references projects (id) on delete restrict,
  survey_number text not null unique,
  owner_name text not null,
  owner_phone text not null,
  owner_preferred_language preferred_language not null,
  village text not null,
  tehsil text not null,
  district text not null,
  area_hectares numeric(10, 2) not null,
  current_stage stage_id not null,
  stage_entered_on date not null,
  compensation_estimate numeric(14, 2) not null,
  compensation_paid numeric(14, 2) not null default 0,
  latitude double precision not null,
  longitude double precision not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists parcels_district_idx on parcels (district);
create index if not exists parcels_current_stage_idx on parcels (current_stage);
create index if not exists parcels_survey_number_idx on parcels (survey_number);

create table if not exists stage_history (
  id text primary key,
  parcel_id text not null references parcels (id) on delete cascade,
  stage stage_id not null,
  entered_on date not null,
  exited_on date,
  handled_by_role official_role not null,
  note text not null
);

create index if not exists stage_history_parcel_idx on stage_history (parcel_id);

create table if not exists documents (
  id text primary key,
  parcel_id text not null references parcels (id) on delete cascade,
  stage stage_id not null,
  kind document_kind not null,
  title text not null,
  uploaded_on date not null,
  uploaded_by_role official_role not null,
  file_type text not null check (file_type in ('pdf', 'image')),
  url text not null,
  -- Step 27: document verification. status has a default so this stays a
  -- purely additive change for a schema not yet applied to any live
  -- project; the other four columns are nullable (no review has happened
  -- yet for a freshly uploaded document).
  status document_status not null default 'pending_verification',
  rejection_reason text,
  reviewed_by_role official_role,
  reviewed_on date,
  quality_check_verdict text check (quality_check_verdict in ('looks_complete', 'needs_review', 'flagged'))
);

create index if not exists documents_parcel_idx on documents (parcel_id);
create index if not exists documents_parcel_stage_idx on documents (parcel_id, stage);

create table if not exists objections (
  id text primary key,
  parcel_id text not null references parcels (id) on delete cascade,
  submitted_on date not null,
  submitted_by text not null,
  reason objection_reason not null,
  description text not null,
  status objection_status not null default 'pending',
  updated_on date not null,
  assigned_to_role official_role not null
);

create index if not exists objections_parcel_idx on objections (parcel_id);

-- ── Row Level Security ───────────────────────────────────────────────────
-- This is a hackathon prototype (see IMPLEMENTATION_PROGRESS.md Step 10:
-- production authentication is explicitly out of scope). Both roles read and
-- write through the anon key, so policies are intentionally permissive —
-- this is not the shape production RLS should take.

alter table projects enable row level security;
alter table parcels enable row level security;
alter table stage_history enable row level security;
alter table documents enable row level security;
alter table objections enable row level security;

drop policy if exists "public read projects" on projects;
create policy "public read projects" on projects for select using (true);
drop policy if exists "public insert projects" on projects;
create policy "public insert projects" on projects for insert with check (true);
drop policy if exists "public update projects" on projects;
create policy "public update projects" on projects for update using (true);

drop policy if exists "public read parcels" on parcels;
create policy "public read parcels" on parcels for select using (true);
drop policy if exists "public update parcels" on parcels;
create policy "public update parcels" on parcels for update using (true);
drop policy if exists "public insert parcels" on parcels;
create policy "public insert parcels" on parcels for insert with check (true);

drop policy if exists "public read stage_history" on stage_history;
create policy "public read stage_history" on stage_history for select using (true);
drop policy if exists "public insert stage_history" on stage_history;
create policy "public insert stage_history" on stage_history for insert with check (true);
drop policy if exists "public update stage_history" on stage_history;
create policy "public update stage_history" on stage_history for update using (true);

drop policy if exists "public read documents" on documents;
create policy "public read documents" on documents for select using (true);
drop policy if exists "public insert documents" on documents;
create policy "public insert documents" on documents for insert with check (true);
drop policy if exists "public update documents" on documents;
create policy "public update documents" on documents for update using (true);

drop policy if exists "public read objections" on objections;
create policy "public read objections" on objections for select using (true);
drop policy if exists "public insert objections" on objections;
create policy "public insert objections" on objections for insert with check (true);
drop policy if exists "public update objections" on objections;
create policy "public update objections" on objections for update using (true);

-- ── Storage (used by Step 6 upload UI) ──────────────────────────────────

insert into storage.buckets (id, name, public)
values ('parcel-documents', 'parcel-documents', true)
on conflict (id) do nothing;

drop policy if exists "public read parcel-documents" on storage.objects;
create policy "public read parcel-documents" on storage.objects
  for select using (bucket_id = 'parcel-documents');

drop policy if exists "public upload parcel-documents" on storage.objects;
create policy "public upload parcel-documents" on storage.objects
  for insert with check (bucket_id = 'parcel-documents');

-- ── Seed guidance ────────────────────────────────────────────────────────
-- There is no static seed data file: src/domain/demoData.ts is the single
-- source of truth for the ~25 fictional parcels (including hero parcel
-- 124/7) and, from Step 13 on, the demoProjects each parcel belongs to.
-- To seed a real Supabase project for a demo:
--   1. Write a one-off Node/tsx script that imports `demoParcels` and
--      `demoProjects` from src/domain/demoData.ts.
--   2. Insert in FK order: projects, then parcels, then stage_history,
--      documents, objections, mapping each domain field to its snake_case
--      column (see src/data/supabaseRepository.ts for the exact mapping).
--   3. Run it once against the target project with the service-role key
--      (never bundle the service-role key in frontend code).
