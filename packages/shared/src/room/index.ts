// Room module - room code generation, validation, and management
export {
  generateRoomCode,
  isValidRoomCode,
  normalizeRoomCode,
  ROOM_CODE_CHARS,
  ROOM_CODE_LENGTH,
} from './roomCode.js';

export {
  RoomManager,
  type Room,
  type RoomPlayer,
  type RoomCreateResult,
  type RoomJoinResult,
  type RoomLeaveResult,
} from './RoomManager.js';
