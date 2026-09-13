# Supabase schema — RLS: prototype vs. production

This file exists because handbook §11.2 ("is it secure?") and the deck's
slide-6 security reference both need one honest, written answer, and that
answer is long enough that it does not belong as a comment scattered across
`schema.sql`. Read this alongside `schema.sql`'s `-- ── Row Level Security
──` section — the SQL there is the source of truth; this is the narrative.

## What is true today

Every table's active policy is `using (true)` / `with check (true)`. The
app has no Supabase Auth session at all — officials pick a role and a
state/district scope from a **client-side demo login** (see
`IMPLEMENTATION_PROGRESS.md` Step 24), which is convenient for judging a
prototype without needing every judge to have a login, but it means every
request to Supabase carries only the shared anon key. RLS cannot scope by
role or district if the database has no way to know who is asking — so
today it does not try, and says so honestly rather than pretending a
`using (true)` policy is a security boundary.

This has been true since Step 10 and is a **deliberate, scoped-out**
decision, not an oversight: FINALS_UPGRADE_PLAN.md Step 51 says explicitly
*"you are not adding authentication in this step — you are making the
shape of real policy visible and testable."* This document, plus the
commented policies in `schema.sql`, is that shape.

## What Step 51 adds

1. **A `profiles` table** — `user_id` (references `auth.users`), `app_role`,
   `state_scope`, `district_scope`. Its own RLS is **active today, not
   commented**: a signed-in user may read/update only their own row (`auth.uid()
   = user_id`), and there is no self-serve insert — provisioning is a
   service-role-key operation, same as `scripts/seedSupabase.ts`. This
   costs nothing to turn on now because nothing reads `profiles` yet.
2. **Real, commented policies** for `projects`, `parcels`, `stage_history`,
   `documents`, `objections` — one `exists (select 1 from profiles p
   where p.user_id = auth.uid() and ...)` predicate per table, hand-derived
   from `src/domain/access.ts`'s `isProjectInScope`/`isParcelInScope` so the
   SQL and the TypeScript scoping logic cannot silently drift apart:
   - `national_admin` — sees everything.
   - `state_authority` — sees rows whose project's `state` matches
     `profiles.state_scope`.
   - `district_officer` / `field_officer` — same state match, narrowed
     further to rows whose `district` matches `profiles.district_scope`.
   - `landowner` — no branch matches, so the policy denies (this app role
     never reads the tables directly — see the next point).
3. **Two security-definer RPC functions** (also commented, same reason) —
   `landowner_get_parcel_status(p_identifier)` and
   `landowner_submit_objection(...)` — as the production answer for the
   **zero-login citizen portal**, which cannot satisfy an `auth.uid()`-based
   policy at all because it has no login by design. These are narrow: the
   read function returns exactly one parcel (matched by survey number or
   id) plus its own children, nothing else is queryable; the write function
   inserts exactly one `objections` row tied to that same parcel. Once they
   exist, `anon`'s direct `select`/`insert`/`update` grants on the four
   citizen-reachable tables are revoked — the scoped policies above never
   grant `anon` anything (no `profiles` row ever exists for an anonymous
   caller), so this is strictly a removal, not a new restriction.

## Why not just add `anon` back into the scoped policies?

That was the first design considered and rejected, for a concrete reason:
a policy like `using (true or exists (...profiles...))` gives every
anonymous caller a full-table read on `parcels`, `stage_history`,
`documents`, and `objections` — i.e. today's permissive shape again, just
wearing the scoped policy as camouflage. Anyone could list all ~250
parcels in the country over the anon key, not only the one parcel whose
survey number a landowner already knows. A `security definer` RPC is the
standard Postgres pattern for exactly this shape of requirement — "a
public caller may look up or write one specific record they can name, and
nothing else" — so that is what is proposed here instead.

## The switch-over checklist (what actually changes when Auth is wired)

This is **not done** in Step 51 — it is the ordered list for whoever wires
Supabase Auth next:

1. Stand up Supabase Auth (email/OTP or SSO — out of this repo's scope to
   pick) and, on account creation, insert a `profiles` row for the new user
   with their `app_role`/`state_scope`/`district_scope` (an admin action,
   using the service-role key — mirrors how `scripts/seedSupabase.ts`
   already writes to this project).
2. Replace the client-side demo login (`SessionContext`) with real
   `supabase.auth.signIn*` calls; keep the same `ScopableSession` shape so
   `src/domain/access.ts` and every page that already calls
   `scopeParcelsToSession`/`scopeProjectsToSession` needs **zero** changes
   — scoping is already centralized there, this step only changes where the
   session's role/scope values come from.
3. In `schema.sql`: uncomment the `scoped *` policies and the two RPC
   functions, run the `revoke ... from anon` line, then drop the five
   `"public *"` permissive policies (`drop policy "public read parcels" on
   parcels;` etc. — the `if exists` guards make this safe to run more than
   once).
4. In `src/data/supabaseRepository.ts`: the two landowner-reachable
   functions (`getParcelBySurveyNumber`/`getParcelById` and `addObjection`,
   when called from the unauthenticated `/landowner/*` routes only —
   officials keep using the direct table calls, now protected by the
   scoped policies) switch from `.from('parcels').select(...)` /
   `.from('objections').insert(...)` to `supabase.rpc('landowner_get_parcel_status',
   ...)` / `supabase.rpc('landowner_submit_objection', ...)`.
5. Re-run this project's existing verification discipline against a real
   Supabase project (not just `pglite`, see `IMPLEMENTATION_PROGRESS.md`
   Step 50's honest caveat about this environment having neither Docker nor
   Supabase credentials): sign in as each of the four official roles and
   confirm out-of-scope rows are genuinely absent from the response (not
   just hidden in the UI), then confirm the landowner routes still work
   with zero `anon` table grants remaining.

## Honest answer to "is it secure?"

**Today: no**, by design and by explicit written acknowledgment, not by
accident — every table is `using (true)` because there is no Supabase Auth
session to scope against, a scoped-out decision documented since Step 10
and reaffirmed by Step 51's own framing. **The shape of the real answer
exists and is reviewable**: a `profiles`-and-`auth.uid()` scoping model
that mirrors the app's own TypeScript access-control logic column-for-column,
plus a deliberately narrow RPC surface for the one part of the product
(the zero-login citizen portal) that a login-based model cannot cover, all
committed as real, syntactically valid SQL rather than left as an
unspecified "add auth later." What remains is wiring — a switch-over, not
a redesign — and that switch-over is written down above so it is a checklist,
not a research problem, for whoever does it next.
