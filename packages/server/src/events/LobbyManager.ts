// Lobby Manager - extends RoomManager with settings and socket tracking
import { RoomManager, Room, RoomPlayer } from '@heyhey/shared';
import type { GameConfig, LobbyPlayer, RoomState } from '@heyhey/shared';

export interface LobbyRoom {
  room: Room;
  settings: GameConfig;
}

const DEFAULT_SETTINGS: GameConfig = {
  nertzPileSize: 13,
  drawCount: 3,
  targetScore: 100,
};

export class LobbyManager {
  private roomManager = new RoomManager();
  private roomSettings: Map<string, GameConfig> = new Map();
  private socketToRoom: Map<string, string> = new Map();
  private socketToPlayer: Map<string, { playerId: string; playerName: string }> =
    new Map();
  private playerCustomization: Map<string, { color?: string; avatar?: string }> =
    new Map();

  createRoom(
    socketId: string,
    playerName: string
  ): { success: true; room: RoomState; playerId: string } | { success: false; error: string } {
    const result = this.roomManager.createRoom(socketId, playerName);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const settings = { ...DEFAULT_SETTINGS };
    this.roomSettings.set(result.room.code, settings);
    this.socketToRoom.set(socketId, result.room.code);
    this.socketToPlayer.set(socketId, { playerId: socketId, playerName });

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

    this.socketToRoom.set(socketId, result.room.code);
    this.socketToPlayer.set(socketId, { playerId: socketId, playerName });

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
    const roomCode = this.socketToRoom.get(socketId);
    if (!roomCode) {
      return { success: false };
    }

    const result = this.roomManager.leaveRoom(roomCode, socketId);

    if (!result.success) {
      return { success: false };
    }

    this.socketToRoom.delete(socketId);
    this.socketToPlayer.delete(socketId);
    this.playerCustomization.delete(socketId);

    if (result.roomClosed) {
      this.roomSettings.delete(roomCode);
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
    const roomCode = this.socketToRoom.get(socketId);
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
    const roomCode = this.socketToRoom.get(socketId);
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
    const roomCode = this.socketToRoom.get(socketId);
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
    return this.socketToRoom.get(socketId);
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
}
