/**
 * Lobby Manager - extends RoomManager with settings and socket tracking
 *
 * ## Activity Tracking Architecture
 *
 * This module owns **room-level** activity tracking for lobby garbage collection.
 * Activity tracking exists at three levels across the server:
 *
 * | Level   | Owner        | Purpose                      | Timeouts                    |
 * |---------|--------------|------------------------------|------------------------------|
 * | Room    | LobbyManager | Lobby room garbage collection| Empty: 5m, Inactive: 30m    |
 * | Game    | GameManager  | Abandoned game cleanup       | Disconnect: 5m, Inactive: 30m|
 * | Player  | GameManager  | In-game UI feedback          | Configurable thresholds      |
 *
 * ### LobbyManager Responsibilities (this module):
 * - Track when rooms were created and last had activity
 * - Clean up empty rooms after 5 minutes
 * - Clean up inactive rooms (no game) after 30 minutes
 * - **Skip** rooms with active games (defers to GameManager)
 *
 * ### Coordination with GameManager:
 * - `markRoomHasGame(code, true)` - Called when game starts, prevents LobbyManager cleanup
 * - `markRoomHasGame(code, false)` - Called when game is abandoned, allows LobbyManager cleanup
 *
 * ### Cleanup Flow:
 * 1. Periodic cleanup sweep runs every 5 minutes (lobbyEvents.ts)
 * 2. LobbyManager.cleanupExpiredRooms() handles lobby rooms (skips rooms with games)
 * 3. GameManager.cleanupAbandonedGames() handles active games
 * 4. If game is abandoned → markRoomHasGame(false) → room becomes eligible for LobbyManager cleanup
 *
 * @see GameManager for game-level and player-level activity tracking
 */
import { RoomManager, Room, RoomPlayer } from '@heyhey/shared';
import type { GameConfig, LobbyPlayer, RoomState } from '@heyhey/shared';
import { SocketRegistry } from '../services/SocketRegistry.js';

export interface LobbyRoom {
  room: Room;
  settings: GameConfig;
}

/**
 * Room activity tracking for garbage collection.
 * Tracks room-level activity to determine when to clean up idle lobby rooms.
 *
 * Note: This is separate from GameManager's activity tracking which handles:
 * - Game-level activity (for abandoned game cleanup)
 * - Player-level activity (for in-game inactivity UI feedback)
 */
interface RoomActivity {
  /** When the room was created (for debugging/monitoring) */
  createdAt: number;
  /** Last activity timestamp - updated on joins, settings changes, etc. */
  lastActivityAt: number;
  /** If true, room has an active game and cleanup is deferred to GameManager */
  hasActiveGame: boolean;
}

/** Room inactivity timeout: 30 minutes */
const ROOM_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
/** Empty room timeout: 5 minutes */
const EMPTY_ROOM_TIMEOUT_MS = 5 * 60 * 1000;

const DEFAULT_SETTINGS: GameConfig = {
  nertzPileSize: 13,
  drawCount: 3,
  targetScore: 100,
};

export class LobbyManager {
  private roomManager = new RoomManager();
  private roomSettings: Map<string, GameConfig> = new Map();
  private socketRegistry: SocketRegistry;
  private socketToPlayer: Map<string, { playerId: string; playerName: string }> =
    new Map();
  private playerCustomization: Map<string, { color?: string; avatar?: string }> =
    new Map();
  private roomActivity: Map<string, RoomActivity> = new Map();

  constructor(socketRegistry?: SocketRegistry) {
    this.socketRegistry = socketRegistry ?? new SocketRegistry();
  }

  createRoom(
    socketId: string,
    playerName: string
  ): { success: true; room: RoomState; playerId: string } | { success: false; error: string } {
    const result = this.roomManager.createRoom(socketId, playerName);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const settings = { ...DEFAULT_SETTINGS };
    const now = Date.now();
    this.roomSettings.set(result.room.code, settings);
    this.socketRegistry.join(socketId, result.room.code);
    this.socketToPlayer.set(socketId, { playerId: socketId, playerName });
    this.roomActivity.set(result.room.code, {
      createdAt: now,
      lastActivityAt: now,
      hasActiveGame: false,
    });

    return {
      success: true,
      room: this.toRoomState(result.room, settings),
      playerId: socketId,
    };
  }

  joinRoom(
    socketId: string,
    roomCode: string,
    playerName: string
  ):
    | { success: true; room: RoomState; playerId: string; newPlayer: LobbyPlayer }
    | { success: false; error: string } {
    const result = this.roomManager.joinRoom(roomCode, socketId, playerName);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    this.socketRegistry.join(socketId, result.room.code);
    this.socketToPlayer.set(socketId, { playerId: socketId, playerName });
    this.updateRoomActivity(result.room.code);

    const settings = this.roomSettings.get(result.room.code) ?? DEFAULT_SETTINGS;
    const newPlayer: LobbyPlayer = {
      id: socketId,
      name: playerName,
      isHost: false,
    };

    return {
      success: true,
      room: this.toRoomState(result.room, settings),
      playerId: socketId,
      newPlayer,
    };
  }

  leaveRoom(socketId: string): {
    success: boolean;
    roomCode?: string;
    roomClosed?: boolean;
    newHostId?: string;
  } {
    const roomCode = this.socketRegistry.getRoom(socketId);
    if (!roomCode) {
      return { success: false };
    }

    const result = this.roomManager.leaveRoom(roomCode, socketId);

    if (!result.success) {
      return { success: false };
    }

    this.socketRegistry.leave(socketId);
    this.socketToPlayer.delete(socketId);
    this.playerCustomization.delete(socketId);

    if (result.roomClosed) {
      this.roomSettings.delete(roomCode);
      this.roomActivity.delete(roomCode);
    } else {
      // Room still has players, update activity
      this.updateRoomActivity(roomCode);
    }

    return {
      success: true,
      roomCode,
      roomClosed: result.roomClosed,
      newHostId: result.newHostId,
    };
  }

  updateSettings(
    socketId: string,
    settings: Partial<GameConfig>
  ): { success: true; settings: GameConfig; roomCode: string } | { success: false; error: string } {
    const roomCode = this.socketRegistry.getRoom(socketId);
    if (!roomCode) {
      return { success: false, error: 'not_in_room' };
    }

    const room = this.roomManager.getRoom(roomCode);
    if (!room) {
      return { success: false, error: 'room_not_found' };
    }

    // Only host can update settings
    if (room.hostId !== socketId) {
      return { success: false, error: 'not_host' };
    }

    const currentSettings = this.roomSettings.get(roomCode) ?? DEFAULT_SETTINGS;
    const newSettings: GameConfig = {
      ...currentSettings,
      ...settings,
    };

    // Validate settings
    if (![10, 13].includes(newSettings.nertzPileSize)) {
      return { success: false, error: 'invalid_nertz_pile_size' };
    }
    if (![1, 3].includes(newSettings.drawCount)) {
      return { success: false, error: 'invalid_draw_count' };
    }
    if (newSettings.targetScore < 1 || newSettings.targetScore > 1000) {
      return { success: false, error: 'invalid_target_score' };
    }

    this.roomSettings.set(roomCode, newSettings);

    return { success: true, settings: newSettings, roomCode };
  }

  updatePlayer(
    socketId: string,
    updates: { name?: string; color?: string; avatar?: string }
  ): { success: true; player: LobbyPlayer; roomCode: string } | { success: false; error: string } {
    const roomCode = this.socketRegistry.getRoom(socketId);
    if (!roomCode) {
      return { success: false, error: 'not_in_room' };
    }

    const room = this.roomManager.getRoom(roomCode);
    if (!room) {
      return { success: false, error: 'room_not_found' };
    }

    const playerInfo = this.socketToPlayer.get(socketId);
    if (!playerInfo) {
      return { success: false, error: 'player_not_found' };
    }

    // Update name if provided
    if (updates.name !== undefined) {
      playerInfo.playerName = updates.name;
      this.socketToPlayer.set(socketId, playerInfo);
      // Update in room manager
      const roomPlayer = room.players.get(socketId);
      if (roomPlayer) {
        roomPlayer.name = updates.name;
      }
    }

    // Update customization (color, avatar)
    const currentCustomization = this.playerCustomization.get(socketId) ?? {};
    if (updates.color !== undefined) {
      currentCustomization.color = updates.color;
    }
    if (updates.avatar !== undefined) {
      currentCustomization.avatar = updates.avatar;
    }
    this.playerCustomization.set(socketId, currentCustomization);

    // Return the updated player info
    const player: LobbyPlayer = {
      id: socketId,
      name: playerInfo.playerName,
      isHost: room.hostId === socketId,
      color: currentCustomization.color,
      avatar: currentCustomization.avatar,
    };

    return { success: true, player, roomCode };
  }

  startGame(socketId: string): { success: true; roomCode: string } | { success: false; error: string } {
    const roomCode = this.socketRegistry.getRoom(socketId);
    if (!roomCode) {
      return { success: false, error: 'not_in_room' };
    }

    const room = this.roomManager.getRoom(roomCode);
    if (!room) {
      return { success: false, error: 'room_not_found' };
    }

    // Only host can start game
    if (room.hostId !== socketId) {
      return { success: false, error: 'not_host' };
    }

    // Need at least 2 players
    if (room.players.size < 2) {
      return { success: false, error: 'not_enough_players' };
    }

    return { success: true, roomCode };
  }

  getRoomCode(socketId: string): string | undefined {
    return this.socketRegistry.getRoom(socketId);
  }

  getRoom(roomCode: string): Room | null {
    return this.roomManager.getRoom(roomCode);
  }

  getSettings(roomCode: string): GameConfig | undefined {
    return this.roomSettings.get(roomCode);
  }

  getSocketsInRoom(roomCode: string): string[] {
    const room = this.roomManager.getRoom(roomCode);
    if (!room) return [];
    return Array.from(room.players.keys());
  }

  getPlayerInfo(socketId: string): { playerId: string; playerName: string } | undefined {
    return this.socketToPlayer.get(socketId);
  }

  registerReconnectedPlayer(
    socketId: string,
    roomCode: string,
    playerName: string
  ): void {
    // Update socket-to-room and socket-to-player mappings for the new socket
    this.socketRegistry.join(socketId, roomCode);
    this.socketToPlayer.set(socketId, { playerId: socketId, playerName });
  }

  private toRoomState(room: Room, settings: GameConfig): RoomState {
    const players: LobbyPlayer[] = Array.from(room.players.values()).map(
      (p: RoomPlayer) => {
        const customization = this.playerCustomization.get(p.id) ?? {};
        return {
          id: p.id,
          name: p.name,
          isHost: p.id === room.hostId,
          color: customization.color,
          avatar: customization.avatar,
        };
      }
    );

    return {
      code: room.code,
      players,
      settings,
      hostId: room.hostId,
    };
  }

  /**
   * Update room activity timestamp (call on any lobby room activity).
   *
   * This resets the inactivity timer for room-level cleanup.
   * Called from lobbyEvents.ts when:
   * - Player joins room
   * - Settings are updated
   * - Player customization changes
   * - Player leaves (room still has players)
   *
   * Note: Once a game starts, GameManager takes over activity tracking.
   * Room-level activity is only relevant for pre-game lobby state.
   *
   * @see GameManager.updateGameActivity - For game-level activity
   * @see GameManager.updatePlayerActivity - For player-level activity during gameplay
   */
  updateRoomActivity(roomCode: string): void {
    const activity = this.roomActivity.get(roomCode);
    if (activity) {
      activity.lastActivityAt = Date.now();
    }
  }

  /**
   * Mark a room as having an active game (prevents inactivity cleanup).
   *
   * This is the coordination point between LobbyManager and GameManager:
   * - `markRoomHasGame(code, true)` - Called when game starts, LobbyManager defers to GameManager
   * - `markRoomHasGame(code, false)` - Called when game is abandoned, LobbyManager resumes cleanup duty
   *
   * While hasActiveGame is true, cleanupExpiredRooms() will skip this room.
   * GameManager.cleanupAbandonedGames() handles the cleanup instead.
   */
  markRoomHasGame(roomCode: string, hasGame: boolean): void {
    const activity = this.roomActivity.get(roomCode);
    if (activity) {
      activity.hasActiveGame = hasGame;
      activity.lastActivityAt = Date.now();
    }
  }

  /**
   * Get all room codes managed by this instance
   */
  getAllRoomCodes(): string[] {
    return Array.from(this.roomActivity.keys());
  }

  /**
   * Check if a room has an active game
   */
  roomHasActiveGame(roomCode: string): boolean {
    return this.roomActivity.get(roomCode)?.hasActiveGame ?? false;
  }

  /**
   * Clean up expired rooms based on inactivity or empty status.
   * Called periodically from lobbyEvents.ts cleanup interval.
   *
   * **Important**: Rooms with hasActiveGame=true are SKIPPED.
   * Those rooms are managed by GameManager.cleanupAbandonedGames() instead.
   *
   * Cleanup rules:
   * - Empty rooms (0 players): Cleaned after 5 minutes (EMPTY_ROOM_TIMEOUT_MS)
   * - Inactive rooms (no game): Cleaned after 30 minutes (ROOM_INACTIVITY_TIMEOUT_MS)
   * - Rooms with active games: Skipped (deferred to GameManager)
   *
   * @returns List of cleaned up room codes with their reasons and affected socket IDs
   */
  cleanupExpiredRooms(): Array<{
    roomCode: string;
    reason: 'inactivity' | 'empty';
    socketIds: string[];
  }> {
    const now = Date.now();
    const expiredRooms: Array<{
      roomCode: string;
      reason: 'inactivity' | 'empty';
      socketIds: string[];
    }> = [];

    for (const [roomCode, activity] of this.roomActivity.entries()) {
      const room = this.roomManager.getRoom(roomCode);
      if (!room) {
        // Room doesn't exist in RoomManager, clean up our tracking
        this.roomSettings.delete(roomCode);
        this.roomActivity.delete(roomCode);
        continue;
      }

      const timeSinceActivity = now - activity.lastActivityAt;
      const playerCount = room.players.size;

      // Don't clean up rooms with active games (those are managed by GameManager)
      if (activity.hasActiveGame) {
        continue;
      }

      // Empty room timeout (5 minutes)
      if (playerCount === 0 && timeSinceActivity >= EMPTY_ROOM_TIMEOUT_MS) {
        const socketIds = this.getSocketsInRoom(roomCode);
        expiredRooms.push({ roomCode, reason: 'empty', socketIds });
        this.forceCleanupRoom(roomCode);
        continue;
      }

      // Inactivity timeout (30 minutes) - only for rooms without active games
      if (timeSinceActivity >= ROOM_INACTIVITY_TIMEOUT_MS) {
        const socketIds = this.getSocketsInRoom(roomCode);
        expiredRooms.push({ roomCode, reason: 'inactivity', socketIds });
        this.forceCleanupRoom(roomCode);
      }
    }

    if (expiredRooms.length > 0) {
      console.log(`[LobbyManager] Cleaned up ${expiredRooms.length} expired room(s):`,
        expiredRooms.map(r => `${r.roomCode} (${r.reason})`).join(', '));
    }

    return expiredRooms;
  }

  /**
   * Force cleanup a room (used by cleanup sweep or when game is abandoned)
   */
  forceCleanupRoom(roomCode: string): string[] {
    const room = this.roomManager.getRoom(roomCode);
    const socketIds: string[] = [];

    if (room) {
      // Collect all socket IDs for notification
      for (const playerId of room.players.keys()) {
        socketIds.push(playerId);
        this.socketRegistry.leave(playerId);
        this.socketToPlayer.delete(playerId);
        this.playerCustomization.delete(playerId);
      }

      // Force delete from RoomManager by leaving all players
      for (const playerId of room.players.keys()) {
        this.roomManager.leaveRoom(roomCode, playerId);
      }
    }

    // Clean up our tracking
    this.roomSettings.delete(roomCode);
    this.roomActivity.delete(roomCode);

    return socketIds;
  }

  /**
   * Get room statistics for monitoring
   */
  getRoomStats(): {
    totalRooms: number;
    roomsWithGames: number;
    emptyRooms: number;
    oldestInactiveMs: number;
  } {
    const now = Date.now();
    let roomsWithGames = 0;
    let emptyRooms = 0;
    let oldestInactiveMs = 0;

    for (const [roomCode, activity] of this.roomActivity.entries()) {
      const room = this.roomManager.getRoom(roomCode);
      if (!room) continue;

      if (activity.hasActiveGame) {
        roomsWithGames++;
      }
      if (room.players.size === 0) {
        emptyRooms++;
      }

      const inactiveMs = now - activity.lastActivityAt;
      if (inactiveMs > oldestInactiveMs) {
        oldestInactiveMs = inactiveMs;
      }
    }

    return {
      totalRooms: this.roomActivity.size,
      roomsWithGames,
      emptyRooms,
      oldestInactiveMs,
    };
  }
}
