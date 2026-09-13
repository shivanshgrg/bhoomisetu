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
  create type preferred_language as enum ('en', 'hi', 'mr', 'bn', 'te', 'ta', 'gu', 'kn', 'or', 'pa');
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

-- Step 51: access-scope role for the (not-yet-wired) `profiles` table below.
-- This is deliberately a separate enum from `official_role` above:
-- `official_role` is a job title stamped onto stage_history/documents/
-- objections rows ("who handled this"), while `app_role` is the
-- access-scope role from src/domain/constants.ts APP_ROLES / src/domain/
-- access.ts ScopableSession ("what can this signed-in user see"). The two
-- are unrelated axes — e.g. a `land_acquisition_officer` (official_role)
-- could be scoped as a `district_officer` or a `state_authority`
-- (app_role) depending on their posting.
do $$ begin
  create type app_role as enum (
    'national_admin',
    'state_authority',
    'district_officer',
    'field_officer',
    'landowner'
  );
exception when duplicate_object then null; end $$;

-- ── Audit-column trigger (Step 50) ──────────────────────────────────────
-- One shared trigger function stamps `updated_at` on every table below;
-- `created_at` only ever needs its column default, never a trigger.

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ── Tables ────────────────────────────────────────────────────────────────

create table if not exists projects (
  id text primary key,
  name text not null,
  sector project_sector not null,
  state state_name not null,
  implementing_agency text not null,
  sanctioned_on date not null,
  target_completion_on date not null,
  total_area_required_hectares numeric(10, 2) not null check (total_area_required_hectares >= 0),
  compensation_sanctioned numeric(14, 2) not null check (compensation_sanctioned >= 0),
  affected_families integer not null default 0 check (affected_families >= 0),
  displaced_families integer not null default 0 check (displaced_families >= 0),
  families_resettled integer not null default 0 check (families_resettled >= 0),
  rr_checklist_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_sanctioned_before_target check (sanctioned_on < target_completion_on)
);

create index if not exists projects_state_idx on projects (state);

drop trigger if exists projects_set_updated_at on projects;
create trigger projects_set_updated_at before update on projects
  for each row execute function set_updated_at();

create table if not exists parcels (
  id text primary key,
  project_id text not null references projects (id) on delete restrict,
  -- Kept globally unique, not just unique per project: the landowner portal
  -- looks a parcel up by survey number alone (no project context — an owner
  -- does not know or care which project ID their land sits under), so a
  -- global unique constraint is required for that lookup to be unambiguous.
  -- It also subsumes the plan's "unique(project_id, survey_number)" floor —
  -- global uniqueness is the stronger guarantee, so no separate composite
  -- constraint is added on top of it.
  survey_number text not null unique,
  owner_name text not null,
  owner_phone text not null,
  owner_preferred_language preferred_language not null,
  village text not null,
  tehsil text not null,
  district text not null,
  area_hectares numeric(10, 2) not null check (area_hectares > 0),
  current_stage stage_id not null,
  stage_entered_on date not null,
  -- Step 63: Section 19 declaration date for the statutory lapse clock
  -- (src/domain/lapse.ts). Postgres can't default this to another column's
  -- value, so every writer (supabaseRepository.ts) sets it explicitly —
  -- typically equal to the 'notification' stage's entered_on.
  declaration_on date not null,
  compensation_estimate numeric(14, 2) not null check (compensation_estimate >= 0),
  compensation_paid numeric(14, 2) not null default 0 check (compensation_paid >= 0),
  latitude double precision not null,
  longitude double precision not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint parcels_paid_not_over_estimate check (compensation_paid <= compensation_estimate)
);

create index if not exists parcels_project_id_idx on parcels (project_id);
create index if not exists parcels_district_idx on parcels (district);
create index if not exists parcels_current_stage_idx on parcels (current_stage);
create index if not exists parcels_survey_number_idx on parcels (survey_number);

drop trigger if exists parcels_set_updated_at on parcels;
create trigger parcels_set_updated_at before update on parcels
  for each row execute function set_updated_at();

create table if not exists stage_history (
  id text primary key,
  parcel_id text not null references parcels (id) on delete cascade,
  stage stage_id not null,
  entered_on date not null,
  exited_on date,
  handled_by_role official_role not null,
  note text not null,
  -- Step 50: persists the tamper-evident hash chain that
  -- src/domain/auditChain.ts previously only ever computed in-browser at
  -- load time (see AuditChainLedger.tsx). `prev_hash` is the chain's
  -- genesis constant ('0' x 64) for a parcel's first stage_history row.
  -- Both are nullable so existing/seeded rows can be backfilled once, then
  -- the application is expected to always supply both on insert.
  prev_hash text,
  entry_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stage_history_valid_date_range check (exited_on is null or entered_on <= exited_on)
);

create index if not exists stage_history_parcel_idx on stage_history (parcel_id);

drop trigger if exists stage_history_set_updated_at on stage_history;
create trigger stage_history_set_updated_at before update on stage_history
  for each row execute function set_updated_at();

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
  quality_check_verdict text check (quality_check_verdict in ('looks_complete', 'needs_review', 'flagged')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists documents_parcel_idx on documents (parcel_id);
create index if not exists documents_parcel_stage_idx on documents (parcel_id, stage);

drop trigger if exists documents_set_updated_at on documents;
create trigger documents_set_updated_at before update on documents
  for each row execute function set_updated_at();

create table if not exists objections (
  id text primary key,
  parcel_id text not null references parcels (id) on delete cascade,
  submitted_on date not null,
  submitted_by text not null,
  reason objection_reason not null,
  description text not null,
  status objection_status not null default 'pending',
  updated_on date not null,
  assigned_to_role official_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint objections_valid_date_range check (submitted_on <= updated_on)
);

create index if not exists objections_parcel_idx on objections (parcel_id);
create index if not exists objections_parcel_status_idx on objections (parcel_id, status);

drop trigger if exists objections_set_updated_at on objections;
create trigger objections_set_updated_at before update on objections
  for each row execute function set_updated_at();

-- Step 51: identity + scope for real (not-yet-wired) RLS. Columns mirror
-- src/domain/access.ts's `ScopableSession` exactly (`app_role`/`state_scope`/
-- `district_scope` <-> `role`/`stateScope`/`districtScope`), so the policies
-- below can read straight off this table instead of re-deriving scope logic
-- in SQL that could drift from the TypeScript original.
create table if not exists profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  app_role app_role not null,
  -- Unset for national_admin (no restriction). state_authority/
  -- district_officer/field_officer all require state_scope; the latter two
  -- also require district_scope. landowner rows are not expected to exist
  -- here — the citizen portal is zero-login by design (see the RPC-based
  -- access path documented at the bottom of the RLS section below) — but
  -- the value is kept in the enum for a 1:1 mirror of AppRole regardless.
  state_scope state_name,
  district_scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on profiles;
create trigger profiles_set_updated_at before update on profiles
  for each row execute function set_updated_at();

alter table profiles enable row level security;

-- Real policy, active today (not commented like the rest of this section):
-- nothing in the app reads or writes `profiles` yet (Step 51 does not wire
-- Supabase Auth — see supabase/README.md), so there is no permissive
-- baseline here to preserve, and strict-from-day-one costs nothing. A
-- signed-in user can read/update only their own row; provisioning a
-- profile is an admin operation done with the service-role key (bypasses
-- RLS), matching how scripts/seedSupabase.ts already writes to Supabase.
drop policy if exists "read own profile" on profiles;
create policy "read own profile" on profiles for select using (auth.uid() = user_id);
drop policy if exists "update own profile" on profiles;
create policy "update own profile" on profiles for update using (auth.uid() = user_id);

-- ── Row Level Security ───────────────────────────────────────────────────
-- This is a hackathon prototype (see IMPLEMENTATION_PROGRESS.md Step 10:
-- production authentication is explicitly out of scope). Both roles read and
-- write through the anon key, so policies are intentionally permissive —
-- this is not the shape production RLS should take.
--
-- Step 51 adds the real, commented policies this comment used to only
-- promise "the shape production RLS should take" in prose. They are not
-- switched on — the permissive policies immediately below stay active and
-- unchanged, because Step 51 deliberately does not wire Supabase Auth into
-- the app (see FINALS_UPGRADE_PLAN.md's own framing: "you are not adding
-- authentication in this step"). Uncommenting the real policies today would
-- not "fail safe", it would fail *total* — every current request goes
-- through the anon key with no Supabase-Auth JWT, so `auth.uid()` resolves
-- to null and every scoped policy below would deny every row, including to
-- the officials who are supposed to see them. See supabase/README.md for
-- the full switch-over write-up and the honest answer to "is it secure?".

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

-- Production policy (enable once auth is wired): mirrors
-- src/domain/access.ts's isProjectInScope exactly. national_admin sees
-- every project; state_authority/district_officer/field_officer see only
-- projects in their own state; landowner (app_role has no matching branch
-- below) sees none — the citizen portal never reads this table directly,
-- see the RPC-based access path documented after the objections policies.
-- The app never inserts/updates projects at runtime (they only ever come
-- from scripts/seedSupabase.ts, which uses the service-role key and so
-- bypasses RLS entirely), so no production insert/update policy is defined
-- here — the permissive ones above would simply be dropped, not replaced.
--
-- create policy "scoped read projects" on projects for select using (
--   exists (
--     select 1 from profiles p
--     where p.user_id = auth.uid()
--       and (
--         p.app_role = 'national_admin'
--         or (p.app_role in ('state_authority', 'district_officer', 'field_officer')
--             and p.state_scope = projects.state)
--       )
--   )
-- );

drop policy if exists "public read parcels" on parcels;
create policy "public read parcels" on parcels for select using (true);
drop policy if exists "public update parcels" on parcels;
create policy "public update parcels" on parcels for update using (true);
drop policy if exists "public insert parcels" on parcels;
create policy "public insert parcels" on parcels for insert with check (true);

-- Production policy (enable once auth is wired): mirrors
-- src/domain/access.ts's isParcelInScope exactly — a parcel is in scope
-- when its project is in scope AND, for district_officer/field_officer
-- only, the parcel's own district also matches. national_admin and
-- state_authority stop at the project-level (state) check, same as the
-- TypeScript original. Officials advance a parcel's stage via `update`
-- (src/data/supabaseRepository.ts's advanceParcelStage), so the same
-- predicate covers both select and update; there is no production `insert`
-- policy because the app never inserts parcels at runtime (seed-only, via
-- the service-role key).
--
-- create policy "scoped read parcels" on parcels for select using (
--   exists (
--     select 1 from profiles p
--     join projects pr on pr.id = parcels.project_id
--     where p.user_id = auth.uid()
--       and (
--         p.app_role = 'national_admin'
--         or (p.app_role = 'state_authority' and p.state_scope = pr.state)
--         or (p.app_role in ('district_officer', 'field_officer')
--             and p.state_scope = pr.state
--             and p.district_scope = parcels.district)
--       )
--   )
-- );
-- create policy "scoped update parcels" on parcels for update using (
--   exists (
--     select 1 from profiles p
--     join projects pr on pr.id = parcels.project_id
--     where p.user_id = auth.uid()
--       and (
--         p.app_role = 'national_admin'
--         or (p.app_role = 'state_authority' and p.state_scope = pr.state)
--         or (p.app_role in ('district_officer', 'field_officer')
--             and p.state_scope = pr.state
--             and p.district_scope = parcels.district)
--       )
--   )
-- );

drop policy if exists "public read stage_history" on stage_history;
create policy "public read stage_history" on stage_history for select using (true);
drop policy if exists "public insert stage_history" on stage_history;
create policy "public insert stage_history" on stage_history for insert with check (true);
drop policy if exists "public update stage_history" on stage_history;
create policy "public update stage_history" on stage_history for update using (true);

-- Production policy (enable once auth is wired): same scoped predicate as
-- parcels above, joined one hop further (stage_history -> parcels ->
-- projects) since stage_history has no direct project_id/district column
-- of its own. Covers select/insert/update — advanceParcelStage does all
-- three (closes the current open row with `update`, opens the next with
-- `insert`) in one officialdom-only write path.
--
-- create policy "scoped read stage_history" on stage_history for select using (
--   exists (
--     select 1 from profiles p
--     join parcels pa on pa.id = stage_history.parcel_id
--     join projects pr on pr.id = pa.project_id
--     where p.user_id = auth.uid()
--       and (
--         p.app_role = 'national_admin'
--         or (p.app_role = 'state_authority' and p.state_scope = pr.state)
--         or (p.app_role in ('district_officer', 'field_officer')
--             and p.state_scope = pr.state
--             and p.district_scope = pa.district)
--       )
--   )
-- );
-- create policy "scoped insert stage_history" on stage_history for insert with check (
--   exists (
--     select 1 from profiles p
--     join parcels pa on pa.id = stage_history.parcel_id
--     join projects pr on pr.id = pa.project_id
--     where p.user_id = auth.uid()
--       and (
--         p.app_role = 'national_admin'
--         or (p.app_role = 'state_authority' and p.state_scope = pr.state)
--         or (p.app_role in ('district_officer', 'field_officer')
--             and p.state_scope = pr.state
--             and p.district_scope = pa.district)
--       )
--   )
-- );
-- create policy "scoped update stage_history" on stage_history for update using (
--   exists (
--     select 1 from profiles p
--     join parcels pa on pa.id = stage_history.parcel_id
--     join projects pr on pr.id = pa.project_id
--     where p.user_id = auth.uid()
--       and (
--         p.app_role = 'national_admin'
--         or (p.app_role = 'state_authority' and p.state_scope = pr.state)
--         or (p.app_role in ('district_officer', 'field_officer')
--             and p.state_scope = pr.state
--             and p.district_scope = pa.district)
--       )
--   )
-- );

drop policy if exists "public read documents" on documents;
create policy "public read documents" on documents for select using (true);
drop policy if exists "public insert documents" on documents;
create policy "public insert documents" on documents for insert with check (true);
drop policy if exists "public update documents" on documents;
create policy "public update documents" on documents for update using (true);

-- Production policy (enable once auth is wired): same scoped predicate,
-- joined through parcels/projects the same way as stage_history above.
-- Covers select (officials review a document), insert (upload), and
-- update (verify/reject) — src/data/supabaseRepository.ts's addDocument
-- and verifyDocument are both officialdom-only, so there is no separate
-- unauthenticated write path here the way there is for objections below.
--
-- create policy "scoped read documents" on documents for select using (
--   exists (
--     select 1 from profiles p
--     join parcels pa on pa.id = documents.parcel_id
--     join projects pr on pr.id = pa.project_id
--     where p.user_id = auth.uid()
--       and (
--         p.app_role = 'national_admin'
--         or (p.app_role = 'state_authority' and p.state_scope = pr.state)
--         or (p.app_role in ('district_officer', 'field_officer')
--             and p.state_scope = pr.state
--             and p.district_scope = pa.district)
--       )
--   )
-- );
-- create policy "scoped insert documents" on documents for insert with check (
--   exists (
--     select 1 from profiles p
--     join parcels pa on pa.id = documents.parcel_id
--     join projects pr on pr.id = pa.project_id
--     where p.user_id = auth.uid()
--       and (
--         p.app_role = 'national_admin'
--         or (p.app_role = 'state_authority' and p.state_scope = pr.state)
--         or (p.app_role in ('district_officer', 'field_officer')
--             and p.state_scope = pr.state
--             and p.district_scope = pa.district)
--       )
--   )
-- );
-- create policy "scoped update documents" on documents for update using (
--   exists (
--     select 1 from profiles p
--     join parcels pa on pa.id = documents.parcel_id
--     join projects pr on pr.id = pa.project_id
--     where p.user_id = auth.uid()
--       and (
--         p.app_role = 'national_admin'
--         or (p.app_role = 'state_authority' and p.state_scope = pr.state)
--         or (p.app_role in ('district_officer', 'field_officer')
--             and p.state_scope = pr.state
--             and p.district_scope = pa.district)
--       )
--   )
-- );

drop policy if exists "public read objections" on objections;
create policy "public read objections" on objections for select using (true);
drop policy if exists "public insert objections" on objections;
create policy "public insert objections" on objections for insert with check (true);
drop policy if exists "public update objections" on objections;
create policy "public update objections" on objections for update using (true);

-- Production policy (enable once auth is wired): select and update (an
-- official resolving/reviewing an objection, ParcelDetailPage's
-- updateObjectionStatus) are officialdom-only, same scoped predicate as
-- documents/stage_history above. There is deliberately **no** production
-- `insert` policy for objections here: the only insert path in the app is
-- an unauthenticated landowner filing their own objection
-- (LandownerStatusPage -> addObjection), which cannot be an
-- auth.uid()-scoped policy at all — see the RPC-based design directly
-- below, which is the actual production answer for that write.
--
-- create policy "scoped read objections" on objections for select using (
--   exists (
--     select 1 from profiles p
--     join parcels pa on pa.id = objections.parcel_id
--     join projects pr on pr.id = pa.project_id
--     where p.user_id = auth.uid()
--       and (
--         p.app_role = 'national_admin'
--         or (p.app_role = 'state_authority' and p.state_scope = pr.state)
--         or (p.app_role in ('district_officer', 'field_officer')
--             and p.state_scope = pr.state
--             and p.district_scope = pa.district)
--       )
--   )
-- );
-- create policy "scoped update objections" on objections for update using (
--   exists (
--     select 1 from profiles p
--     join parcels pa on pa.id = objections.parcel_id
--     join projects pr on pr.id = pa.project_id
--     where p.user_id = auth.uid()
--       and (
--         p.app_role = 'national_admin'
--         or (p.app_role = 'state_authority' and p.state_scope = pr.state)
--         or (p.app_role in ('district_officer', 'field_officer')
--             and p.state_scope = pr.state
--             and p.district_scope = pa.district)
--       )
--   )
-- );

-- ── Zero-login citizen access (Step 51 design note) ─────────────────────
-- The landowner portal has no login by design (IMPLEMENTATION_PROGRESS.md
-- Step 10: a villager looks a parcel up by survey number alone — they do
-- not have or want an account). That is structurally incompatible with
-- every scoped policy above, which requires auth.uid() to resolve against
-- `profiles`. The tempting shortcut — leave parcels/stage_history/
-- documents/objections world-readable to `anon`, on top of the scoped
-- policies for authenticated officials — is exactly today's permissive
-- shape wearing a disguise: any anon caller could still list every parcel
-- in the country, not just the one they know the survey number for. That
-- is not a defensible production answer, so it is not proposed here.
--
-- The actual production answer is to give `anon` two narrow,
-- security-definer functions that do exactly what the landowner portal
-- needs and nothing else, and revoke anon's direct table grants on these
-- four tables entirely once these are in place. A security-definer
-- function runs with the privileges of the function's owner, not the
-- caller, so it can read/write past RLS internally while only exposing the
-- single narrow operation its signature allows — the standard Postgres
-- pattern for "public lookup by a value the requester already knows",
-- the same shape a real DoLR status-check-by-application-number portal
-- would use.
--
-- create or replace function landowner_get_parcel_status(p_identifier text)
-- returns json
-- language sql
-- security definer
-- set search_path = public
-- stable
-- as $$
--   select json_build_object(
--     'parcel', to_jsonb(pa) - 'id',
--     'stage_history', (select coalesce(jsonb_agg(sh), '[]'::jsonb) from stage_history sh where sh.parcel_id = pa.id),
--     'documents', (select coalesce(jsonb_agg(d), '[]'::jsonb) from documents d where d.parcel_id = pa.id),
--     'objections', (select coalesce(jsonb_agg(o), '[]'::jsonb) from objections o where o.parcel_id = pa.id)
--   )
--   from parcels pa
--   where pa.survey_number = p_identifier or pa.id = p_identifier
--   limit 1;
-- $$;
-- revoke all on function landowner_get_parcel_status(text) from public;
-- grant execute on function landowner_get_parcel_status(text) to anon;
--
-- create or replace function landowner_submit_objection(
--   p_survey_number text,
--   p_reason objection_reason,
--   p_description text,
--   p_submitted_by text,
--   p_submitted_on date
-- )
-- returns objections
-- language plpgsql
-- security definer
-- set search_path = public
-- as $$
-- declare
--   v_parcel_id text;
--   v_row objections;
-- begin
--   select id into v_parcel_id from parcels where survey_number = p_survey_number;
--   if v_parcel_id is null then
--     raise exception 'unknown survey number';
--   end if;
--   insert into objections (
--     id, parcel_id, submitted_on, submitted_by, reason, description,
--     status, updated_on, assigned_to_role
--   )
--   values (
--     'objection-' || gen_random_uuid()::text, v_parcel_id, p_submitted_on, p_submitted_by,
--     p_reason, p_description, 'pending', p_submitted_on, 'land_acquisition_officer'
--   )
--   returning * into v_row;
--   return v_row;
-- end;
-- $$;
-- revoke all on function landowner_submit_objection(text, objection_reason, text, text, date) from public;
-- grant execute on function landowner_submit_objection(text, objection_reason, text, text, date) to anon;
--
-- Once both functions exist, the switch-over also revokes anon's direct
-- table access (the scoped official policies above never grant anon
-- anything — they only match rows where a `profiles` row exists for
-- auth.uid() — so this step is about removing the *permissive* policies,
-- not adding a new restriction):
-- revoke select, insert, update on parcels, stage_history, documents, objections from anon;
--
-- See supabase/README.md for the full switch-over checklist, including the
-- one frontend change this requires (src/data/supabaseRepository.ts's
-- getParcelBySurveyNumber/getParcelById and addObjection would call these
-- RPCs via supabase.rpc(...) instead of .from(...).select()/.insert() when
-- called from the unauthenticated landowner routes).

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
-- source of truth for the ~250 fictional parcels (including hero parcel
-- 124/7) and the demoProjects each parcel belongs to.
--
-- Step 50 added the real script this used to only describe:
-- `scripts/seedSupabase.ts` (run with `npm run db:seed`). It imports
-- `demoParcels`/`demoProjects` directly, inserts in FK order (projects,
-- parcels, stage_history, documents, objections) mapping every field to its
-- snake_case column exactly as src/data/supabaseRepository.ts does, and
-- computes and persists the same tamper-evident stage_history hash chain
-- src/domain/auditChain.ts computes in-browser (see that script's own
-- header comment for why the hash logic is duplicated rather than
-- imported). It requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY as
-- environment variables — never the anon key, and never bundled into
-- frontend code — and is safe to re-run (upserts on primary key).
