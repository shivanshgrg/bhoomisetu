import { isSupabaseConfigured } from '../lib/supabaseClient';
import { demoRepository } from './demoRepository';
import { supabaseRepository } from './supabaseRepository';
import type { ParcelRepository } from './types';

// Pages depend only on this repository, never on demoRepository or
// supabaseRepository directly, so backend selection stays in one place.
export const repository: ParcelRepository = isSupabaseConfigured ? supabaseRepository : demoRepository;

export * from './types';
