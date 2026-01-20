// Session persistence for game reconnection
// Stores gameId, playerId, roomCode in localStorage

import { createStorageHelper } from './storageHelper';

const SESSION_KEY = 'heyhey_session';

/** Maximum session age in milliseconds (15 minutes) */
const MAX_SESSION_AGE_MS = 15 * 60 * 1000;

export interface GameSession {
  gameId: string;
  playerId: string;
  roomCode: string;
}

const sessionStorage = createStorageHelper<GameSession>(SESSION_KEY, {
  maxAge: MAX_SESSION_AGE_MS,
});

/**
 * Save current game session to localStorage
 */
export function saveSession(gameId: string, playerId: string, roomCode: string): void {
  sessionStorage.save({ gameId, playerId, roomCode });
}

/**
 * Load game session from localStorage
 * Returns null if no session exists or session is expired
 */
export function loadSession(): GameSession | null {
  return sessionStorage.load();
}

/**
 * Clear stored session from localStorage
 */
export function clearSession(): void {
  sessionStorage.clear();
}

/**
 * Check if a valid session exists
 */
export function hasValidSession(): boolean {
  return sessionStorage.exists();
}
