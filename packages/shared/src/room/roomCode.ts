// Room Code Generator for HeyHey!
// Generates simple 6-character room codes

// Character set excluding ambiguous characters (0/O, 1/I/L)
const SAFE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const CODE_PATTERN = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;

/**
 * Generates a random 6-character room code
 * Uses characters that are unambiguous (no 0/O, 1/I/L)
 */
export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    const randomIndex = Math.floor(Math.random() * SAFE_CHARS.length);
    code += SAFE_CHARS[randomIndex];
  }
  return code;
}

/**
 * Validates that a room code matches the expected format
 * @param code - The room code to validate
 * @returns true if the code is valid, false otherwise
 */
export function isValidRoomCode(code: string): boolean {
  if (typeof code !== 'string') {
    return false;
  }
  return CODE_PATTERN.test(code.toUpperCase());
}

/**
 * Normalizes a room code to uppercase format
 * @param code - The room code to normalize
 * @returns The normalized code or null if invalid
 */
export function normalizeRoomCode(code: string): string | null {
  if (typeof code !== 'string') {
    return null;
  }
  const normalized = code.toUpperCase().trim();
  return isValidRoomCode(normalized) ? normalized : null;
}

// Export constants for external use if needed
export const ROOM_CODE_CHARS = SAFE_CHARS;
export const ROOM_CODE_LENGTH = CODE_LENGTH;
