// =========================================================================
// Advanced Cache & Offline Background Sync System for HR Portal
// =========================================================================

import { supabase } from './supabase';

export interface AuditChangeRecord {
  id: string;
  timestamp: string;
  action: 'create' | 'update' | 'delete';
  entity: 'Employee' | 'Leave' | 'Loan' | 'Shift Timing' | 'Device Setting' | 'Complaint' | 'Holiday' | 'Attendance';
  targetId: string | number;
  targetName: string;
  userId?: string;
  userPin?: string;
  userName?: string;
  previousData?: any;
  newData?: any;
  status: 'saved' | 'failed' | 'pending';
  errorMessage?: string;
  table?: string;
}

export interface PendingMutation {
  id: string;
  timestamp: string;
  table: string;
  type: 'insert' | 'update' | 'delete' | 'upsert';
  payload: any;
  matchKey?: string;
  matchValue?: any;
  auditId: string;
}

// In-Memory Fast Cache
const memoryCache = new Map<string, { data: any; timestamp: number }>();
const DEFAULT_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

const HISTORY_STORAGE_KEY = 'hr_portal_audit_change_history';
const PENDING_STORAGE_KEY = 'hr_portal_pending_mutations';
const CACHE_PREFIX = 'hr_cache_';

// -------------------------------------------------------------------------
// 1. In-Memory & LocalStorage Cache Helpers
// -------------------------------------------------------------------------

export function getCachedData<T>(key: string): T | null {
  // Check memory cache first (instant)
  const mem = memoryCache.get(key);
  if (mem && Date.now() - mem.timestamp < DEFAULT_CACHE_TTL) {
    return mem.data as T;
  }

  // Fallback to localStorage
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.data !== undefined) {
      memoryCache.set(key, { data: parsed.data, timestamp: parsed.timestamp || Date.now() });
      return parsed.data as T;
    }
  } catch (e) {
    // ignore parse errors
  }
  return null;
}

export function setCachedData<T>(key: string, data: T): void {
  const now = Date.now();
  memoryCache.set(key, { data, timestamp: now });
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, timestamp: now }));
  } catch (e) {
    // localStorage full or disabled
  }
}

export function invalidateCache(key: string): void {
  memoryCache.delete(key);
  try {
    localStorage.removeItem(CACHE_PREFIX + key);
  } catch (e) {}
}

export function clearAllPortalCaches(): void {
  memoryCache.clear();
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch (e) {}
}

/**
 * Stale-while-revalidate wrapper:
 * Returns cached data immediately if available, while fetching fresh data in the background.
 */
export async function withCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  onBackgroundUpdate?: (freshData: T) => void,
  _ttlMs = DEFAULT_CACHE_TTL
): Promise<T> {
  const cached = getCachedData<T>(key);

  if (cached !== null) {
    // Asynchronously revalidate in background without blocking caller
    fetchFn()
      .then(fresh => {
        setCachedData(key, fresh);
        if (onBackgroundUpdate) {
          onBackgroundUpdate(fresh);
        }
      })
      .catch(() => {
        // silent background failure; cache continues serving
      });
    return cached;
  }

  // No cache present: fetch synchronously
  const fresh = await fetchFn();
  setCachedData(key, fresh);
  return fresh;
}

// -------------------------------------------------------------------------
// 2. Change History (Audit Log) & Pending Mutations
// -------------------------------------------------------------------------

export function getChangeHistory(): AuditChangeRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveChangeHistory(list: AuditChangeRecord[]): void {
  try {
    // Keep up to 250 most recent changes to prevent storage bloat
    const trimmed = list.slice(0, 250);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {}
}

export function getPendingMutations(): PendingMutation[] {
  try {
    const raw = localStorage.getItem(PENDING_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function savePendingMutations(list: PendingMutation[]): void {
  try {
    localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {}
}

export function recordAuditChange(
  entry: Omit<AuditChangeRecord, 'id' | 'timestamp'>
): AuditChangeRecord {
  const record: AuditChangeRecord = {
    ...entry,
    id: 'audit_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    timestamp: new Date().toISOString()
  };

  const current = getChangeHistory();
  saveChangeHistory([record, ...current]);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hr_portal_audit_updated', { detail: record }));
  }

  return record;
}

export function updateAuditStatus(
  auditId: string,
  status: 'saved' | 'failed' | 'pending',
  errorMessage?: string
): void {
  const current = getChangeHistory();
  const idx = current.findIndex(c => c.id === auditId);
  if (idx !== -1) {
    current[idx].status = status;
    if (errorMessage) current[idx].errorMessage = errorMessage;
    saveChangeHistory(current);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hr_portal_audit_updated', { detail: current[idx] }));
    }
  }
}

export function queuePendingMutation(mutation: PendingMutation): void {
  const list = getPendingMutations();
  savePendingMutations([...list, mutation]);
}

export function removePendingMutation(id: string): void {
  const list = getPendingMutations().filter(m => m.id !== id);
  savePendingMutations(list);
}

// -------------------------------------------------------------------------
// 3. Robust Background Sync Execution
// -------------------------------------------------------------------------

export async function executeMutationOnline(mutation: PendingMutation): Promise<boolean> {
  try {
    const { table, type, payload, matchKey, matchValue } = mutation;

    if (type === 'insert') {
      const { error } = await supabase.from(table).insert(payload);
      if (error) throw error;
    } else if (type === 'update') {
      if (!matchKey) throw new Error('Missing match key for update');
      const { error } = await supabase.from(table).update(payload).eq(matchKey, matchValue);
      if (error) throw error;
    } else if (type === 'delete') {
      if (!matchKey) throw new Error('Missing match key for delete');
      const { error } = await supabase.from(table).delete().eq(matchKey, matchValue);
      if (error) throw error;
    } else if (type === 'upsert') {
      const { error } = await supabase.from(table).upsert(payload);
      if (error) throw error;
    }

    // Success! Update audit record
    updateAuditStatus(mutation.auditId, 'saved');
    removePendingMutation(mutation.id);
    return true;
  } catch (err: any) {
    const msg = err?.message || String(err);
    updateAuditStatus(mutation.auditId, 'failed', msg);
    return false;
  }
}

/**
 * Attempt syncing all pending offline mutations to Supabase
 */
export async function syncAllPendingMutations(): Promise<{ synced: number; failed: number }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  const pending = getPendingMutations();
  if (pending.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const item of pending) {
    const ok = await executeMutationOnline(item);
    if (ok) {
      synced++;
    } else {
      failed++;
    }
  }

  if (synced > 0 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hr_portal_sync_complete', { detail: { synced, failed } }));
  }

  return { synced, failed };
}

/**
 * Revert a previously saved change
 */
export async function revertSavedChange(auditId: string): Promise<{ success: boolean; message: string }> {
  const history = getChangeHistory();
  const record = history.find(h => h.id === auditId);

  if (!record) {
    return { success: false, message: 'Change record not found.' };
  }

  if (!record.previousData && record.action !== 'create') {
    return { success: false, message: 'No previous state stored to revert this change.' };
  }

  const table = record.table;
  if (!table) {
    return { success: false, message: 'Database table identifier missing for this record.' };
  }

  try {
    if (record.action === 'create') {
      // Reverting a creation = deleting the newly created record
      const idKey = typeof record.targetId === 'number' ? 'id' : 'id';
      const { error } = await supabase.from(table).delete().eq(idKey, record.targetId);
      if (error) throw error;
    } else if (record.action === 'delete') {
      // Reverting a deletion = re-inserting the previous data
      const { error } = await supabase.from(table).insert(record.previousData);
      if (error) throw error;
    } else if (record.action === 'update') {
      // Reverting an update = restoring previousData
      const idKey = 'id';
      const { error } = await supabase.from(table).update(record.previousData).eq(idKey, record.targetId);
      if (error) throw error;
    }

    // Record the revert action itself in audit log
    recordAuditChange({
      action: record.action === 'create' ? 'delete' : record.action === 'delete' ? 'create' : 'update',
      entity: record.entity,
      targetId: record.targetId,
      targetName: `Revert: ${record.targetName}`,
      userId: record.userId,
      userPin: record.userPin,
      userName: record.userName,
      previousData: record.newData,
      newData: record.previousData,
      status: 'saved',
      table: record.table
    });

    // Invalidate table cache so views reflect reverted data immediately
    invalidateCache(`cache_${table}`);
    clearAllPortalCaches();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hr_portal_sync_complete', { detail: { reverted: true } }));
    }

    return { success: true, message: `Successfully reverted change on ${record.targetName}.` };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to revert change.' };
  }
}

/**
 * Manually retry a specific failed/pending mutation
 */
export async function retryPendingChange(auditId: string): Promise<boolean> {
  const pending = getPendingMutations();
  const item = pending.find(p => p.auditId === auditId);
  if (!item) return false;
  return await executeMutationOnline(item);
}

/**
 * Discard a failed/pending mutation
 */
export function discardPendingChange(auditId: string): void {
  const pending = getPendingMutations();
  const filtered = pending.filter(p => p.auditId !== auditId);
  savePendingMutations(filtered);
  updateAuditStatus(auditId, 'failed', 'Discarded by user');
}

/**
 * Clear the entire audit log history
 */
export function clearAuditLog(): void {
  saveChangeHistory([]);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hr_portal_audit_updated', { detail: null }));
  }
}

// -------------------------------------------------------------------------
// 4. Background Sync Listener Initialization
// -------------------------------------------------------------------------

let syncIntervalStarted = false;

export function initBackgroundSync(): void {
  if (typeof window === 'undefined' || syncIntervalStarted) return;
  syncIntervalStarted = true;

  // Sync on internet re-connection
  window.addEventListener('online', () => {
    syncAllPendingMutations();
  });

  // Periodic background sync attempt every 15 seconds
  setInterval(() => {
    if (navigator.onLine && getPendingMutations().length > 0) {
      syncAllPendingMutations();
    }
  }, 15000);
}
