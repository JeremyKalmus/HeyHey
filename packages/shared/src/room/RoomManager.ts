// Room Manager for HeyHey!
// Manages room creation, joining, leaving, and lifecycle

import { generateRoomCode, normalizeRoomCode } from './roomCode.js';

export interface RoomPlayer {
  id: string;
  name: string;
  joinedAt: Date;
}

export interface Room {
  code: string;
  hostId: string;
  players: Map<string, RoomPlayer>;
  createdAt: Date;
}

export type RoomCreateResult =
  | { success: true; room: Room }
  | { success: false; error: 'max_attempts_exceeded' };

export type RoomJoinResult =
  | { success: true; room: Room }
  | { success: false; error: 'room_not_found' | 'invalid_code' | 'already_in_room' };

export type RoomLeaveResult =
  | { success: true; roomClosed: boolean; newHostId?: string }
  | { success: false; error: 'room_not_found' | 'player_not_in_room' };

const MAX_CODE_GENERATION_ATTEMPTS = 100;

export class RoomManager {
  private rooms: Map<string, Room> = new Map();

  /**
   * Creates a new room with the specified player as host
   * @param hostId - Unique identifier for the host player
   * @param hostName - Display name for the host player
   * @returns Result object with the created room or an error
   */
  createRoom(hostId: string, hostName: string): RoomCreateResult {
    // Generate a unique room code
    let code: string;
    let attempts = 0;

    do {
      code = generateRoomCode();
      attempts++;
      if (attempts > MAX_CODE_GENERATION_ATTEMPTS) {
        return { success: false, error: 'max_attempts_exceeded' };
      }
    } while (this.rooms.has(code));

    const now = new Date();
    const host: RoomPlayer = {
      id: hostId,
      name: hostName,
      joinedAt: now,
    };

    const room: Room = {
      code,
      hostId,
      players: new Map([[hostId, host]]),
      createdAt: now,
    };

    this.rooms.set(code, room);
    return { success: true, room };
  }

  /**
   * Joins an existing room by code
   * @param code - Room code to join
   * @param playerId - Unique identifier for the joining player
   * @param playerName - Display name for the joining player
   * @returns Result object with the room or an error
   */
  joinRoom(code: string, playerId: string, playerName: string): RoomJoinResult {
    const normalizedCode = normalizeRoomCode(code);
    if (!normalizedCode) {
      return { success: false, error: 'invalid_code' };
    }

    const room = this.rooms.get(normalizedCode);
    if (!room) {
      return { success: false, error: 'room_not_found' };
    }

    if (room.players.has(playerId)) {
      return { success: false, error: 'already_in_room' };
    }

    const player: RoomPlayer = {
      id: playerId,
      name: playerName,
      joinedAt: new Date(),
    };

    room.players.set(playerId, player);
    return { success: true, room };
  }

  /**
   * Removes a player from a room. If the room becomes empty, it is closed.
   * If the host leaves, the next oldest player becomes host.
   * @param code - Room code
   * @param playerId - ID of the player leaving
   * @returns Result object indicating success and any state changes
   */
  leaveRoom(code: string, playerId: string): RoomLeaveResult {
    const normalizedCode = normalizeRoomCode(code);
    if (!normalizedCode) {
      return { success: false, error: 'room_not_found' };
    }

    const room = this.rooms.get(normalizedCode);
    if (!room) {
      return { success: false, error: 'room_not_found' };
    }

    if (!room.players.has(playerId)) {
      return { success: false, error: 'player_not_in_room' };
    }

    room.players.delete(playerId);

    // Room is empty - close it
    if (room.players.size === 0) {
      this.rooms.delete(normalizedCode);
      return { success: true, roomClosed: true };
    }

    // Host left - transfer to next oldest player
    if (room.hostId === playerId) {
      const newHost = this.findOldestPlayer(room);
      if (newHost) {
        room.hostId = newHost.id;
        return { success: true, roomClosed: false, newHostId: newHost.id };
      }
    }

    return { success: true, roomClosed: false };
  }

  /**
   * Gets a room by its code
   * @param code - Room code to look up
   * @returns The room if found, null otherwise
   */
  getRoom(code: string): Room | null {
    const normalizedCode = normalizeRoomCode(code);
    if (!normalizedCode) {
      return null;
    }
    return this.rooms.get(normalizedCode) ?? null;
  }

  /**
   * Gets all players in a room
   * @param code - Room code
   * @returns Array of players, empty array if room not found
   */
  getPlayers(code: string): RoomPlayer[] {
    const room = this.getRoom(code);
    if (!room) {
      return [];
    }
    return Array.from(room.players.values());
  }

  /**
   * Checks if a room exists
   * @param code - Room code to check
   * @returns true if room exists
   */
  hasRoom(code: string): boolean {
    return this.getRoom(code) !== null;
  }

  /**
   * Gets the current count of active rooms
   */
  getRoomCount(): number {
    return this.rooms.size;
  }

  /**
   * Closes a room forcefully (for admin/cleanup purposes)
   * @param code - Room code to close
   * @returns true if room was closed, false if not found
   */
  closeRoom(code: string): boolean {
    const normalizedCode = normalizeRoomCode(code);
    if (!normalizedCode) {
      return false;
    }
    return this.rooms.delete(normalizedCode);
  }

  /**
   * Finds the oldest player in a room (by join time)
   */
  private findOldestPlayer(room: Room): RoomPlayer | null {
    let oldest: RoomPlayer | null = null;
    for (const player of room.players.values()) {
      if (!oldest || player.joinedAt < oldest.joinedAt) {
        oldest = player;
      }
    }
    return oldest;
  }
}
