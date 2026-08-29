import type { StageHistoryEntry } from './types';

export type AuditChainLink = {
  entry: StageHistoryEntry;
  hash: string;
  previousHash: string;
  isValid: boolean;
};

const GENESIS_HASH = '0'.repeat(64);

function canonicalize(entry: StageHistoryEntry): string {
  return [entry.id, entry.parcelId, entry.stage, entry.enteredOn, entry.exitedOn ?? '', entry.handledByRole, entry.note].join(
    '|',
  );
}

export function isAuditChainSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.crypto?.subtle?.digest === 'function';
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

// Seals a fresh chain over the given history: each link's hash covers the
// previous link's hash plus this entry's own fields, so any later edit to an
// earlier entry is detectable without a server round-trip.
export async function buildAuditChain(history: StageHistoryEntry[]): Promise<AuditChainLink[]> {
  const links: AuditChainLink[] = [];
  let previousHash = GENESIS_HASH;

  for (const entry of history) {
    const hash = await sha256Hex(`${previousHash}|${canonicalize(entry)}`);
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
    const hash = await sha256Hex(`${previousHash}|${canonicalize(entry)}`);
    const sealedHash = sealedHashes[index];
    links.push({ entry, hash, previousHash, isValid: hash === sealedHash });
    previousHash = hash;
  }

  return links;
}
