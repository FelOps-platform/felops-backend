import type { UserDto } from './auth.mapper.js';

export interface RefreshGraceEntry {
  previousTokenHash: string;
  accessToken: string;
  user: UserDto;
  rotatedRefreshToken: string;
  sessionExpiresAt: Date;
  expiresAt: number;
}

const MAX_STORE_ENTRIES = 10_000;
const graceEntries = new Map<string, RefreshGraceEntry>();

export function findRefreshGrace(input: {
  sessionId: string;
  nowMs?: number;
}): RefreshGraceEntry | null {
  const nowMs = input.nowMs ?? Date.now();
  const entry = graceEntries.get(input.sessionId);
  if (!entry) {
    return null;
  }
  if (entry.expiresAt <= nowMs) {
    graceEntries.delete(input.sessionId);
    return null;
  }
  return entry;
}

export function setRefreshGrace(input: {
  sessionId: string;
  entry: RefreshGraceEntry;
  nowMs?: number;
}): void {
  const nowMs = input.nowMs ?? Date.now();
  pruneExpired(graceEntries, (value) => value.expiresAt <= nowMs);
  evictOldestIfFull(graceEntries, input.sessionId);
  graceEntries.set(input.sessionId, input.entry);
}

export function deleteRefreshGrace(sessionId: string): void {
  graceEntries.delete(sessionId);
}

export function clearAuthStores(): void {
  graceEntries.clear();
}

function pruneExpired<T>(store: Map<string, T>, isExpired: (value: T) => boolean): void {
  for (const [key, value] of store) {
    if (isExpired(value)) {
      store.delete(key);
    }
  }
}

function evictOldestIfFull<T>(store: Map<string, T>, incomingKey: string): void {
  if (store.size >= MAX_STORE_ENTRIES && !store.has(incomingKey)) {
    const oldestKey = store.keys().next().value;
    if (oldestKey !== undefined) {
      store.delete(oldestKey);
    }
  }
}
