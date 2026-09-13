import { isSupabaseConfigured } from '../lib/supabaseClient';
import { demoRepository } from './demoRepository';
import { createOfflineAwareRepository } from './offlineRepository';
import { supabaseRepository } from './supabaseRepository';
import type { ParcelRepository } from './types';

const baseRepository: ParcelRepository = isSupabaseConfigured ? supabaseRepository : demoRepository;

// Pages depend only on this repository, never on demoRepository or
// supabaseRepository directly, so backend selection stays in one place. It is
// wrapped for offline-first field capture (Step 55) — reads fall back to an
// IndexedDB cache and writes queue locally whenever the browser reports
// itself offline, regardless of which backend is active underneath.
export const repository: ParcelRepository = createOfflineAwareRepository(baseRepository);

export * from './types';
export { drainOfflineQueue, getPendingActions, subscribeOfflineQueue, type PendingAction } from './offlineRepository';
