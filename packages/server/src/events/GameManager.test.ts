import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { GameManager } from './GameManager.js';
import type {
  Card,
  GameState,
  PlayerGameState,
  CardMove,
  StateUpdate,
  MoveRejection,
} from '@heyhey/shared';

// Test helpers
function card(suit: Card['suit'], rank: number, deckId = 'player1'): Card {
  return { suit, rank, deckId };
}

function createTestPlayer(overrides: Partial<PlayerGameState> = {}): PlayerGameState {
  return {
    playerId: 'player1',
    deckId: 'player1',
    nertzPile: [],
    workPiles: [[], [], [], []],
    stockPile: [],
    wastePile: [],
    ...overrides,
  };
}

function createTestGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    gameId: 'test-game',
    phase: 'playing',
    players: [],
    foundations: [
      { suit: 'hearts', cards: [] },
      { suit: 'diamonds', cards: [] },
      { suit: 'clubs', cards: [] },
      { suit: 'spades', cards: [] },
    ],
    config: {
      nertzPileSize: 13,
      drawCount: 3,
      targetScore: 100,
    },
    ...overrides,
  };
}

describe('GameManager', () => {
  let gameManager: GameManager;
  let broadcastFn: Mock<(roomCode: string, update: StateUpdate) => void>;
  let rejectFn: Mock<(socketId: string, rejection: MoveRejection) => void>;

  beforeEach(() => {
    broadcastFn = vi.fn();
    rejectFn = vi.fn();
    gameManager = new GameManager(broadcastFn, rejectFn);
  });

  describe('initializeGame', () => {
    it('initializes a new game', () => {
      const initialState = createTestGameState({
        players: [createTestPlayer()],
      });

      const playerSockets = new Map([['player1', 'socket1']]);

      gameManager.initializeGame('game-123', 'ROOM1', initialState, playerSockets);

      const game = gameManager.getGame('game-123');
      expect(game).toBeDefined();
      expect(game?.roomCode).toBe('ROOM1');
      expect(game?.gameId).toBe('game-123');
    });

    it('tracks socket to game mapping', () => {
      const initialState = createTestGameState({
        players: [createTestPlayer()],
      });

      const playerSockets = new Map([['player1', 'socket1']]);

      gameManager.initializeGame('game-123', 'ROOM1', initialState, playerSockets);

      expect(gameManager.getGameId('socket1')).toBe('game-123');
    });
  });

  describe('processMove', () => {
    beforeEach(() => {
      const initialState = createTestGameState({
        players: [
          createTestPlayer({
            playerId: 'player1',
            workPiles: [[card('hearts', 1)], [], [], []],
          }),
        ],
      });

      const playerSockets = new Map([['player1', 'socket1']]);
      gameManager.initializeGame('game-123', 'ROOM1', initialState, playerSockets);
    });

    it('broadcasts update on valid move', () => {
      const move: CardMove = {
        type: 'card',
        playerId: 'player1',
        source: { type: 'work', pileIndex: 0 },
        destination: { type: 'foundation', foundationIndex: 0 }, // hearts foundation
      };

      const result = gameManager.processMove('socket1', move);

      expect(result.success).toBe(true);
      expect(broadcastFn).toHaveBeenCalledTimes(1);
      expect(broadcastFn).toHaveBeenCalledWith(
        'ROOM1',
        expect.objectContaining({
          sequence: 1,
          gameId: 'test-game', // createTestGameState uses 'test-game'
          delta: expect.objectContaining({
            type: 'cardMoved',
          }),
        })
      );
    });

    it('sends rejection on invalid move', () => {
      const move: CardMove = {
        type: 'card',
        playerId: 'player1',
        source: { type: 'work', pileIndex: 0 },
        destination: { type: 'foundation', foundationIndex: 1 }, // wrong suit (diamonds)
      };

      const result = gameManager.processMove('socket1', move);

      expect(result.success).toBe(false);
      expect(rejectFn).toHaveBeenCalledTimes(1);
      expect(rejectFn).toHaveBeenCalledWith(
        'socket1',
        expect.objectContaining({
          move,
          error: 'wrong_suit_for_foundation',
        })
      );
      expect(broadcastFn).not.toHaveBeenCalled();
    });

    it('rejects move for wrong player', () => {
      const move: CardMove = {
        type: 'card',
        playerId: 'player2', // Not the socket's player
        source: { type: 'work', pileIndex: 0 },
        destination: { type: 'foundation', foundationIndex: 0 },
      };

      const result = gameManager.processMove('socket1', move);

      expect(result.success).toBe(false);
      expect(rejectFn).toHaveBeenCalledWith(
        'socket1',
        expect.objectContaining({
          error: 'player_not_found',
          message: 'You cannot make moves for another player',
        })
      );
    });

    it('returns false for unknown socket', () => {
      const move: CardMove = {
        type: 'card',
        playerId: 'player1',
        source: { type: 'work', pileIndex: 0 },
        destination: { type: 'foundation', foundationIndex: 0 },
      };

      const result = gameManager.processMove('unknown-socket', move);

      expect(result.success).toBe(false);
    });

    it('increments sequence on each valid move', () => {
      // Set up state with multiple valid moves
      const initialState = createTestGameState({
        players: [
          createTestPlayer({
            playerId: 'player1',
            workPiles: [
              [card('hearts', 1)],
              [card('hearts', 2)],
              [card('hearts', 3)],
              [],
            ],
          }),
        ],
        foundations: [
          { suit: 'hearts', cards: [] },
          { suit: 'diamonds', cards: [] },
          { suit: 'clubs', cards: [] },
          { suit: 'spades', cards: [] },
        ],
      });

      const playerSockets = new Map([['player1', 'socket1']]);
      gameManager.initializeGame('game-456', 'ROOM2', initialState, playerSockets);

      // First move: Ace to foundation
      const move1: CardMove = {
        type: 'card',
        playerId: 'player1',
        source: { type: 'work', pileIndex: 0 },
        destination: { type: 'foundation', foundationIndex: 0 },
      };
      gameManager.processMove('socket1', move1);

      // Second move: 2 to foundation
      const move2: CardMove = {
        type: 'card',
        playerId: 'player1',
        source: { type: 'work', pileIndex: 1 },
        destination: { type: 'foundation', foundationIndex: 0 },
      };
      gameManager.processMove('socket1', move2);

      // Check sequences
      expect(broadcastFn).toHaveBeenCalledTimes(2);
      expect(broadcastFn.mock.calls[0]![1].sequence).toBe(1);
      expect(broadcastFn.mock.calls[1]![1].sequence).toBe(2);
    });
  });

  describe('processNertzCall', () => {
    it('broadcasts nertz call when nertz pile is empty', () => {
      const initialState = createTestGameState({
        players: [
          createTestPlayer({
            playerId: 'player1',
            nertzPile: [], // Empty nertz pile
          }),
        ],
      });

      const playerSockets = new Map([['player1', 'socket1']]);
      gameManager.initializeGame('game-123', 'ROOM1', initialState, playerSockets);

      const result = gameManager.processNertzCall('socket1');

      expect(result.success).toBe(true);
      expect(broadcastFn).toHaveBeenCalledWith(
        'ROOM1',
        expect.objectContaining({
          delta: expect.objectContaining({
            type: 'nertzCalled',
            playerId: 'player1',
          }),
        })
      );
    });

    it('fails when nertz pile is not empty', () => {
      const initialState = createTestGameState({
        players: [
          createTestPlayer({
            playerId: 'player1',
            nertzPile: [card('hearts', 1)], // Not empty
          }),
        ],
      });

      const playerSockets = new Map([['player1', 'socket1']]);
      gameManager.initializeGame('game-123', 'ROOM1', initialState, playerSockets);

      const result = gameManager.processNertzCall('socket1');

      expect(result.success).toBe(false);
      expect(broadcastFn).not.toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('returns game info on disconnect', () => {
      const initialState = createTestGameState({
        players: [createTestPlayer()],
      });

      const playerSockets = new Map([['player1', 'socket1']]);
      gameManager.initializeGame('game-123', 'ROOM1', initialState, playerSockets);

      const result = gameManager.handleDisconnect('socket1');

      expect(result.gameId).toBe('game-123');
      expect(result.roomCode).toBe('ROOM1');
    });

    it('removes socket mapping', () => {
      const initialState = createTestGameState({
        players: [createTestPlayer()],
      });

      const playerSockets = new Map([['player1', 'socket1']]);
      gameManager.initializeGame('game-123', 'ROOM1', initialState, playerSockets);

      gameManager.handleDisconnect('socket1');

      expect(gameManager.getGameId('socket1')).toBeUndefined();
    });
  });

  describe('cleanupGame', () => {
    it('removes all game data', () => {
      const initialState = createTestGameState({
        players: [createTestPlayer()],
      });

      const playerSockets = new Map([['player1', 'socket1']]);
      gameManager.initializeGame('game-123', 'ROOM1', initialState, playerSockets);

      gameManager.cleanupGame('game-123');

      expect(gameManager.getGame('game-123')).toBeUndefined();
      expect(gameManager.getGameId('socket1')).toBeUndefined();
    });
  });

  describe('getGameState', () => {
    it('returns game state for valid socket', () => {
      const initialState = createTestGameState({
        players: [createTestPlayer()],
      });

      const playerSockets = new Map([['player1', 'socket1']]);
      gameManager.initializeGame('game-123', 'ROOM1', initialState, playerSockets);

      const state = gameManager.getGameState('socket1');

      expect(state).toBeDefined();
      expect(state?.gameId).toBe('test-game'); // createTestGameState uses 'test-game'
    });

    it('returns null for unknown socket', () => {
      const state = gameManager.getGameState('unknown');
      expect(state).toBeNull();
    });
  });

  describe('getSequence', () => {
    it('returns current sequence number', () => {
      const initialState = createTestGameState({
        players: [
          createTestPlayer({
            playerId: 'player1',
            workPiles: [[card('hearts', 1)], [], [], []],
          }),
        ],
      });

      const playerSockets = new Map([['player1', 'socket1']]);
      gameManager.initializeGame('game-123', 'ROOM1', initialState, playerSockets);

      expect(gameManager.getSequence('socket1')).toBe(0);

      // Make a valid move
      const move: CardMove = {
        type: 'card',
        playerId: 'player1',
        source: { type: 'work', pileIndex: 0 },
        destination: { type: 'foundation', foundationIndex: 0 },
      };
      gameManager.processMove('socket1', move);

      expect(gameManager.getSequence('socket1')).toBe(1);
    });

    it('returns 0 for unknown socket', () => {
      expect(gameManager.getSequence('unknown')).toBe(0);
    });
  });
});
