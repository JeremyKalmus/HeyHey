import { describe, it, expect, beforeEach } from 'vitest';
import { RoomManager } from './RoomManager.js';

describe('RoomManager', () => {
  let manager: RoomManager;

  beforeEach(() => {
    manager = new RoomManager();
  });

  describe('createRoom', () => {
    it('creates a room with the host as the first player', () => {
      const result = manager.createRoom('host-1', 'HostPlayer');

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.room.hostId).toBe('host-1');
      expect(result.room.players.size).toBe(1);
      expect(result.room.players.get('host-1')?.name).toBe('HostPlayer');
    });

    it('generates a valid 6-character code', () => {
      const result = manager.createRoom('host-1', 'HostPlayer');

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.room.code).toMatch(/^[A-Z0-9]{6}$/);
    });

    it('generates unique room codes', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 10; i++) {
        const result = manager.createRoom(`host-${i}`, `Host${i}`);
        expect(result.success).toBe(true);
        if (result.success) {
          codes.add(result.room.code);
        }
      }
      expect(codes.size).toBe(10);
    });
  });

  describe('joinRoom', () => {
    it('allows a player to join an existing room', () => {
      const createResult = manager.createRoom('host-1', 'HostPlayer');
      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      const joinResult = manager.joinRoom(createResult.room.code, 'player-2', 'Player2');

      expect(joinResult.success).toBe(true);
      if (!joinResult.success) return;

      expect(joinResult.room.players.size).toBe(2);
      expect(joinResult.room.players.get('player-2')?.name).toBe('Player2');
    });

    it('accepts case-insensitive room codes', () => {
      const createResult = manager.createRoom('host-1', 'HostPlayer');
      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      const lowerCode = createResult.room.code.toLowerCase();
      const joinResult = manager.joinRoom(lowerCode, 'player-2', 'Player2');

      expect(joinResult.success).toBe(true);
    });

    it('returns error for invalid room code format', () => {
      const result = manager.joinRoom('INVALID', 'player-1', 'Player1');

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error).toBe('invalid_code');
    });

    it('returns error for non-existent room', () => {
      const result = manager.joinRoom('ZZZZZZ', 'player-1', 'Player1');

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error).toBe('room_not_found');
    });

    it('returns error if player is already in room', () => {
      const createResult = manager.createRoom('host-1', 'HostPlayer');
      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      const joinResult = manager.joinRoom(createResult.room.code, 'host-1', 'HostPlayer');

      expect(joinResult.success).toBe(false);
      if (joinResult.success) return;
      expect(joinResult.error).toBe('already_in_room');
    });
  });

  describe('leaveRoom', () => {
    it('removes a player from the room', () => {
      const createResult = manager.createRoom('host-1', 'HostPlayer');
      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      manager.joinRoom(createResult.room.code, 'player-2', 'Player2');
      const leaveResult = manager.leaveRoom(createResult.room.code, 'player-2');

      expect(leaveResult.success).toBe(true);
      if (!leaveResult.success) return;
      expect(leaveResult.roomClosed).toBe(false);

      const players = manager.getPlayers(createResult.room.code);
      expect(players.length).toBe(1);
      expect(players[0]?.id).toBe('host-1');
    });

    it('closes the room when the last player leaves', () => {
      const createResult = manager.createRoom('host-1', 'HostPlayer');
      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      const leaveResult = manager.leaveRoom(createResult.room.code, 'host-1');

      expect(leaveResult.success).toBe(true);
      if (!leaveResult.success) return;
      expect(leaveResult.roomClosed).toBe(true);

      expect(manager.hasRoom(createResult.room.code)).toBe(false);
    });

    it('transfers host when host leaves', () => {
      const createResult = manager.createRoom('host-1', 'HostPlayer');
      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      manager.joinRoom(createResult.room.code, 'player-2', 'Player2');
      const leaveResult = manager.leaveRoom(createResult.room.code, 'host-1');

      expect(leaveResult.success).toBe(true);
      if (!leaveResult.success) return;
      expect(leaveResult.roomClosed).toBe(false);
      expect(leaveResult.newHostId).toBe('player-2');

      const room = manager.getRoom(createResult.room.code);
      expect(room?.hostId).toBe('player-2');
    });

    it('returns error for non-existent room', () => {
      const result = manager.leaveRoom('ZZZZZZ', 'player-1');

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error).toBe('room_not_found');
    });

    it('returns error if player is not in room', () => {
      const createResult = manager.createRoom('host-1', 'HostPlayer');
      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      const leaveResult = manager.leaveRoom(createResult.room.code, 'player-2');

      expect(leaveResult.success).toBe(false);
      if (leaveResult.success) return;
      expect(leaveResult.error).toBe('player_not_in_room');
    });
  });

  describe('getRoom', () => {
    it('returns the room if it exists', () => {
      const createResult = manager.createRoom('host-1', 'HostPlayer');
      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      const room = manager.getRoom(createResult.room.code);
      expect(room).not.toBeNull();
      expect(room?.code).toBe(createResult.room.code);
    });

    it('returns null for non-existent room', () => {
      const room = manager.getRoom('ZZZZZZ');
      expect(room).toBeNull();
    });

    it('returns null for invalid code format', () => {
      const room = manager.getRoom('INVALID');
      expect(room).toBeNull();
    });
  });

  describe('getPlayers', () => {
    it('returns all players in a room', () => {
      const createResult = manager.createRoom('host-1', 'HostPlayer');
      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      manager.joinRoom(createResult.room.code, 'player-2', 'Player2');
      manager.joinRoom(createResult.room.code, 'player-3', 'Player3');

      const players = manager.getPlayers(createResult.room.code);
      expect(players.length).toBe(3);
      expect(players.map(p => p.id)).toContain('host-1');
      expect(players.map(p => p.id)).toContain('player-2');
      expect(players.map(p => p.id)).toContain('player-3');
    });

    it('returns empty array for non-existent room', () => {
      const players = manager.getPlayers('ZZZZZZ');
      expect(players).toEqual([]);
    });
  });

  describe('hasRoom', () => {
    it('returns true if room exists', () => {
      const createResult = manager.createRoom('host-1', 'HostPlayer');
      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      expect(manager.hasRoom(createResult.room.code)).toBe(true);
    });

    it('returns false if room does not exist', () => {
      expect(manager.hasRoom('ZZZZZZ')).toBe(false);
    });
  });

  describe('getRoomCount', () => {
    it('returns the number of active rooms', () => {
      expect(manager.getRoomCount()).toBe(0);

      manager.createRoom('host-1', 'Host1');
      expect(manager.getRoomCount()).toBe(1);

      manager.createRoom('host-2', 'Host2');
      expect(manager.getRoomCount()).toBe(2);
    });
  });

  describe('closeRoom', () => {
    it('forcefully closes an existing room', () => {
      const createResult = manager.createRoom('host-1', 'HostPlayer');
      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      const closed = manager.closeRoom(createResult.room.code);
      expect(closed).toBe(true);
      expect(manager.hasRoom(createResult.room.code)).toBe(false);
    });

    it('returns false for non-existent room', () => {
      const closed = manager.closeRoom('ZZZZZZ');
      expect(closed).toBe(false);
    });
  });
});
