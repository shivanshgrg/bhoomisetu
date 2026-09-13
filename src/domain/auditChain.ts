import type { StageHistoryEntry } from './types';

export type AuditChainLink = {
  entry: StageHistoryEntry;
  hash: string;
  previousHash: string;
  isValid: boolean;
};

// GENESIS_HASH is also the DB-side default for stage_history.prev_hash on a
// parcel's first row (see supabase/schema.sql, Step 50) — keep both in sync.
export const GENESIS_HASH = '0'.repeat(64);

export function canonicalize(entry: StageHistoryEntry): string {
  return [entry.id, entry.parcelId, entry.stage, entry.enteredOn, entry.exitedOn ?? '', entry.handledByRole, entry.note].join(
    '|',
  );
}

// Uses the global WebCrypto `crypto.subtle`, not `window.crypto` — this
// keeps the module usable unmodified from Node (Node 19+ exposes the same
// global), which is what lets scripts/seedSupabase.ts (Step 50) import and
// reuse this exact hash logic instead of re-implementing it.
export function isAuditChainSupported(): boolean {
  return typeof crypto !== 'undefined' && typeof crypto.subtle?.digest === 'function';
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

// Computes the single next link in the chain given the previous link's hash
// — the primitive `buildAuditChain` uses internally, exposed separately so
// callers that persist one new stage_history row at a time (the live-mode
// write path, and the seed script) don't need to replay the whole history
// just to hash its newest entry.
export async function computeNextHash(previousHash: string, entry: StageHistoryEntry): Promise<string> {
  return sha256Hex(`${previousHash}|${canonicalize(entry)}`);
}

// Seals a fresh chain over the given history: each link's hash covers the
// previous link's hash plus this entry's own fields, so any later edit to an
// earlier entry is detectable without a server round-trip.
export async function buildAuditChain(history: StageHistoryEntry[]): Promise<AuditChainLink[]> {
  const links: AuditChainLink[] = [];
  let previousHash = GENESIS_HASH;

  for (const entry of history) {
    const hash = await computeNextHash(previousHash, entry);
    links.push({ entry, hash, previousHash, isValid: true });
    previousHash = hash;
  }

  return links;
}

// Recomputes hashes over the (possibly-mutated) history and compares each one
// against the hash sealed at build time — a single changed field breaks
// verification at that link and every link after it, since each hash folds
// in the one before it.
export async function verifyAuditChain(
  history: StageHistoryEntry[],
  sealedHashes: readonly string[],
): Promise<AuditChainLink[]> {
  const links: AuditChainLink[] = [];
  let previousHash = GENESIS_HASH;

  for (let index = 0; index < history.length; index += 1) {
    const entry = history[index];
    const hash = await computeNextHash(previousHash, entry);
    const sealedHash = sealedHashes[index];
    links.push({ entry, hash, previousHash, isValid: hash === sealedHash });
    previousHash = hash;
  }

  return links;
}
