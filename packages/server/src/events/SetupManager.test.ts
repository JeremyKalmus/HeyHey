// SetupManager Tests
import { describe, it, expect, beforeEach } from 'vitest';
import { SetupManager } from './SetupManager';

describe('SetupManager', () => {
  let setupManager: SetupManager;

  beforeEach(() => {
    setupManager = new SetupManager();
  });

  describe('initializeRoom', () => {
    it('initializes setup tracking for a room', () => {
      setupManager.initializeRoom('ABCD', 'game-123', ['player1', 'player2']);

      const status = setupManager.getRoomStatus('ABCD');
      expect(status).toEqual({
        gameId: 'game-123',
        totalPlayers: 2,
        completedPlayers: new Set(),
      });
    });

    it('can initialize multiple rooms', () => {
      setupManager.initializeRoom('ROOM1', 'game-1', ['p1', 'p2']);
      setupManager.initializeRoom('ROOM2', 'game-2', ['p3', 'p4', 'p5']);

      const status1 = setupManager.getRoomStatus('ROOM1');
      const status2 = setupManager.getRoomStatus('ROOM2');

      expect(status1?.totalPlayers).toBe(2);
      expect(status2?.totalPlayers).toBe(3);
    });
  });

  describe('markPlayerComplete', () => {
    beforeEach(() => {
      setupManager.initializeRoom('ABCD', 'game-123', ['player1', 'player2', 'player3']);
    });

    it('marks a player as complete and returns progress', () => {
      const result = setupManager.markPlayerComplete('ABCD', 'player1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.playersReady).toBe(1);
        expect(result.totalPlayers).toBe(3);
        expect(result.allReady).toBe(false);
        expect(result.gameId).toBe('game-123');
      }
    });

    it('tracks multiple players completing', () => {
      setupManager.markPlayerComplete('ABCD', 'player1');
      const result = setupManager.markPlayerComplete('ABCD', 'player2');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.playersReady).toBe(2);
        expect(result.totalPlayers).toBe(3);
        expect(result.allReady).toBe(false);
      }
    });

    it('returns allReady=true when all players complete', () => {
      setupManager.markPlayerComplete('ABCD', 'player1');
      setupManager.markPlayerComplete('ABCD', 'player2');
      const result = setupManager.markPlayerComplete('ABCD', 'player3');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.playersReady).toBe(3);
        expect(result.totalPlayers).toBe(3);
        expect(result.allReady).toBe(true);
      }
    });

    it('fails if setup not initialized', () => {
      const result = setupManager.markPlayerComplete('INVALID', 'player1');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('setup_not_initialized');
      }
    });

    it('fails if player already complete', () => {
      setupManager.markPlayerComplete('ABCD', 'player1');
      const result = setupManager.markPlayerComplete('ABCD', 'player1');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('already_complete');
      }
    });
  });

  describe('isPlayerComplete', () => {
    beforeEach(() => {
      setupManager.initializeRoom('ABCD', 'game-123', ['player1', 'player2']);
    });

    it('returns false for incomplete player', () => {
      expect(setupManager.isPlayerComplete('ABCD', 'player1')).toBe(false);
    });

    it('returns true for complete player', () => {
      setupManager.markPlayerComplete('ABCD', 'player1');
      expect(setupManager.isPlayerComplete('ABCD', 'player1')).toBe(true);
    });

    it('returns false for unknown room', () => {
      expect(setupManager.isPlayerComplete('INVALID', 'player1')).toBe(false);
    });
  });

  describe('handlePlayerLeave', () => {
    beforeEach(() => {
      setupManager.initializeRoom('ABCD', 'game-123', ['player1', 'player2', 'player3']);
    });

    it('removes player from tracking and updates total', () => {
      setupManager.handlePlayerLeave('ABCD', 'player1');

      const status = setupManager.getRoomStatus('ABCD');
      expect(status?.totalPlayers).toBe(2);
    });

    it('removes completed player from completed set', () => {
      setupManager.markPlayerComplete('ABCD', 'player1');
      setupManager.handlePlayerLeave('ABCD', 'player1');

      expect(setupManager.isPlayerComplete('ABCD', 'player1')).toBe(false);
    });

    it('returns allReady=true if remaining players are all ready', () => {
      setupManager.markPlayerComplete('ABCD', 'player1');
      setupManager.markPlayerComplete('ABCD', 'player2');
      // player3 not complete, but leaves
      const result = setupManager.handlePlayerLeave('ABCD', 'player3');

      expect(result?.allReady).toBe(true);
      expect(result?.gameId).toBe('game-123');
    });

    it('returns null for unknown room', () => {
      const result = setupManager.handlePlayerLeave('INVALID', 'player1');
      expect(result).toBeNull();
    });

    it('cleans up room when last player leaves', () => {
      setupManager.handlePlayerLeave('ABCD', 'player1');
      setupManager.handlePlayerLeave('ABCD', 'player2');
      const result = setupManager.handlePlayerLeave('ABCD', 'player3');

      expect(result).toBeNull();
      expect(setupManager.getRoomStatus('ABCD')).toBeNull();
    });
  });

  describe('cleanupRoom', () => {
    it('removes room setup state', () => {
      setupManager.initializeRoom('ABCD', 'game-123', ['player1', 'player2']);
      setupManager.cleanupRoom('ABCD');

      expect(setupManager.getRoomStatus('ABCD')).toBeNull();
    });

    it('handles cleanup of non-existent room', () => {
      // Should not throw
      setupManager.cleanupRoom('INVALID');
    });
  });

  describe('two player game flow', () => {
    it('completes full setup flow for two players', () => {
      // Initialize
      setupManager.initializeRoom('GAME', 'game-001', ['alice', 'bob']);

      // Alice completes
      const result1 = setupManager.markPlayerComplete('GAME', 'alice');
      expect(result1.success).toBe(true);
      if (result1.success) {
        expect(result1.playersReady).toBe(1);
        expect(result1.allReady).toBe(false);
      }

      // Bob completes
      const result2 = setupManager.markPlayerComplete('GAME', 'bob');
      expect(result2.success).toBe(true);
      if (result2.success) {
        expect(result2.playersReady).toBe(2);
        expect(result2.allReady).toBe(true);
      }

      // Cleanup
      setupManager.cleanupRoom('GAME');
      expect(setupManager.getRoomStatus('GAME')).toBeNull();
    });
  });
});
