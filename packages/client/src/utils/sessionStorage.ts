// Session persistence for game reconnection
// Stores gameId, playerId, roomCode in localStorage

const SESSION_KEY = 'heyhey_session';

export interface GameSession {
  gameId: string;
  playerId: string;
  roomCode: string;
  savedAt: number;
}

/** Maximum session age in milliseconds (5 minutes) */
const MAX_SESSION_AGE_MS = 5 * 60 * 1000;

/**
 * Save current game session to localStorage
 */
export function saveSession(gameId: string, playerId: string, roomCode: string): void {
  const session: GameSession = {
    gameId,
    playerId,
    roomCode,
    savedAt: Date.now(),
  };
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.warn('[Session] Failed to save session:', error);
  }
}

/**
 * Load game session from localStorage
 * Returns null if no session exists or session is expired
 */
export function loadSession(): GameSession | null {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return null;

    const session: GameSession = JSON.parse(stored);

    // Check if session is expired
    const age = Date.now() - session.savedAt;
    if (age > MAX_SESSION_AGE_MS) {
      clearSession();
      return null;
    }

    return session;
  } catch (error) {
    console.warn('[Session] Failed to load session:', error);
    clearSession();
    return null;
  }
}

/**
 * Clear stored session from localStorage
 */
export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.warn('[Session] Failed to clear session:', error);
  }
}

/**
 * Check if a valid session exists
 */
export function hasValidSession(): boolean {
  return loadSession() !== null;
}
