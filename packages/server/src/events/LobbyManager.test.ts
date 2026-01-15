import { describe, it, expect, beforeEach } from 'vitest';
import { LobbyManager } from './LobbyManager.js';

describe('LobbyManager', () => {
  let manager: LobbyManager;

  beforeEach(() => {
    manager = new LobbyManager();
  });

  describe('createRoom', () => {
    it('creates a room with default settings', () => {
      const result = manager.createRoom('socket-1', 'Alice');

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.room.code).toBeDefined();
      expect(result.room.hostId).toBe('socket-1');
      expect(result.room.players).toHaveLength(1);
      expect(result.room.players[0]).toEqual({
        id: 'socket-1',
        name: 'Alice',
        isHost: true,
      });
      expect(result.room.settings).toEqual({
        nertzPileSize: 13,
        drawCount: 3,
        targetScore: 100,
      });
      expect(result.playerId).toBe('socket-1');
    });

    it('tracks socket to room mapping', () => {
      const result = manager.createRoom('socket-1', 'Alice');
      if (!result.success) return;

      expect(manager.getRoomCode('socket-1')).toBe(result.room.code);
    });
  });

  describe('joinRoom', () => {
    it('allows a player to join an existing room', () => {
      const createResult = manager.createRoom('socket-1', 'Alice');
      if (!createResult.success) return;

      const joinResult = manager.joinRoom(
        'socket-2',
        createResult.room.code,
        'Bob'
      );

      expect(joinResult.success).toBe(true);
      if (!joinResult.success) return;

      expect(joinResult.room.players).toHaveLength(2);
      expect(joinResult.newPlayer).toEqual({
        id: 'socket-2',
        name: 'Bob',
        isHost: false,
      });
      expect(joinResult.playerId).toBe('socket-2');
    });

    it('fails when room does not exist', () => {
      // Use a validly formatted code that doesn't exist
      // Room codes are 6-character format using SAFE_CHARS (no I, L, O, 0, 1)
      const result = manager.joinRoom('socket-1', 'ZZZZZZ', 'Alice');

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error).toBe('room_not_found');
    });

    it('fails with invalid room code', () => {
      const result = manager.joinRoom('socket-1', 'invalid', 'Alice');

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error).toBe('invalid_code');
    });

    it('fails when player is already in room', () => {
      const createResult = manager.createRoom('socket-1', 'Alice');
      if (!createResult.success) return;

      const result = manager.joinRoom(
        'socket-1',
        createResult.room.code,
        'Alice'
      );

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error).toBe('already_in_room');
    });
  });

  describe('leaveRoom', () => {
    it('removes player from room', () => {
      const createResult = manager.createRoom('socket-1', 'Alice');
      if (!createResult.success) return;

      manager.joinRoom('socket-2', createResult.room.code, 'Bob');

      const result = manager.leaveRoom('socket-2');

      expect(result.success).toBe(true);
      expect(result.roomCode).toBe(createResult.room.code);
      expect(result.roomClosed).toBe(false);
      expect(manager.getRoomCode('socket-2')).toBeUndefined();
    });

    it('closes room when last player leaves', () => {
      const createResult = manager.createRoom('socket-1', 'Alice');
      if (!createResult.success) return;

      const result = manager.leaveRoom('socket-1');

      expect(result.success).toBe(true);
      expect(result.roomClosed).toBe(true);
      expect(manager.getRoom(createResult.room.code)).toBeNull();
    });

    it('transfers host when host leaves', () => {
      const createResult = manager.createRoom('socket-1', 'Alice');
      if (!createResult.success) return;

      manager.joinRoom('socket-2', createResult.room.code, 'Bob');

      const result = manager.leaveRoom('socket-1');

      expect(result.success).toBe(true);
      expect(result.newHostId).toBe('socket-2');
    });

    it('fails when not in a room', () => {
      const result = manager.leaveRoom('socket-1');

      expect(result.success).toBe(false);
    });
  });

  describe('updateSettings', () => {
    it('allows host to update settings', () => {
      const createResult = manager.createRoom('socket-1', 'Alice');
      if (!createResult.success) return;

      const result = manager.updateSettings('socket-1', {
        nertzPileSize: 10,
        targetScore: 200,
      });

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.settings).toEqual({
        nertzPileSize: 10,
        drawCount: 3,
        targetScore: 200,
      });
    });

    it('fails when not in a room', () => {
      const result = manager.updateSettings('socket-1', { nertzPileSize: 10 });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error).toBe('not_in_room');
    });

    it('fails when not host', () => {
      const createResult = manager.createRoom('socket-1', 'Alice');
      if (!createResult.success) return;

      manager.joinRoom('socket-2', createResult.room.code, 'Bob');

      const result = manager.updateSettings('socket-2', { nertzPileSize: 10 });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error).toBe('not_host');
    });

    it('validates nertz pile size', () => {
      const createResult = manager.createRoom('socket-1', 'Alice');
      if (!createResult.success) return;

      const result = manager.updateSettings('socket-1', {
        nertzPileSize: 15 as 10 | 13,
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error).toBe('invalid_nertz_pile_size');
    });

    it('validates draw count', () => {
      const createResult = manager.createRoom('socket-1', 'Alice');
      if (!createResult.success) return;

      const result = manager.updateSettings('socket-1', {
        drawCount: 2 as 1 | 3,
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error).toBe('invalid_draw_count');
    });

    it('validates target score range', () => {
      const createResult = manager.createRoom('socket-1', 'Alice');
      if (!createResult.success) return;

      const result = manager.updateSettings('socket-1', { targetScore: 0 });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error).toBe('invalid_target_score');
    });
  });

  describe('startGame', () => {
    it('allows host to start game with enough players', () => {
      const createResult = manager.createRoom('socket-1', 'Alice');
      if (!createResult.success) return;

      manager.joinRoom('socket-2', createResult.room.code, 'Bob');

      const result = manager.startGame('socket-1');

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.roomCode).toBe(createResult.room.code);
    });

    it('fails when not in a room', () => {
      const result = manager.startGame('socket-1');

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error).toBe('not_in_room');
    });

    it('fails when not host', () => {
      const createResult = manager.createRoom('socket-1', 'Alice');
      if (!createResult.success) return;

      manager.joinRoom('socket-2', createResult.room.code, 'Bob');

      const result = manager.startGame('socket-2');

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error).toBe('not_host');
    });

    it('fails with not enough players', () => {
      const createResult = manager.createRoom('socket-1', 'Alice');
      if (!createResult.success) return;

      const result = manager.startGame('socket-1');

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error).toBe('not_enough_players');
    });
  });

  describe('getSocketsInRoom', () => {
    it('returns all socket IDs in a room', () => {
      const createResult = manager.createRoom('socket-1', 'Alice');
      if (!createResult.success) return;

      manager.joinRoom('socket-2', createResult.room.code, 'Bob');
      manager.joinRoom('socket-3', createResult.room.code, 'Charlie');

      const sockets = manager.getSocketsInRoom(createResult.room.code);

      expect(sockets).toHaveLength(3);
      expect(sockets).toContain('socket-1');
      expect(sockets).toContain('socket-2');
      expect(sockets).toContain('socket-3');
    });

    it('returns empty array for non-existent room', () => {
      const sockets = manager.getSocketsInRoom('HH-XXXX');

      expect(sockets).toEqual([]);
    });
  });
});
