import { describe, it, expect, beforeEach } from 'vitest';
import { StateManager, createInitialGameState } from './StateManager.js';
import type {
  Card,
  GameState,
  PlayerGameState,
  CardMove,
  DrawMove,
  FlipStockMove,
  GameConfig,
} from '../types/index.js';

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
      { suit: 'hearts', cards: [], ownerId: 'system' },
      { suit: 'diamonds', cards: [], ownerId: 'system' },
      { suit: 'clubs', cards: [], ownerId: 'system' },
      { suit: 'spades', cards: [], ownerId: 'system' },
    ],
    config: {
      nertzPileSize: 13,
      drawCount: 3,
      targetScore: 100,
    },
    ...overrides,
  };
}

describe('StateManager', () => {
  let stateManager: StateManager;
  let initialState: GameState;

  beforeEach(() => {
    initialState = createTestGameState({
      players: [
        createTestPlayer({
          playerId: 'player1',
          nertzPile: [card('hearts', 5)],
          workPiles: [
            [card('clubs', 7)],
            [card('hearts', 10)],
            [],
            [],
          ],
          stockPile: [card('spades', 2), card('diamonds', 3), card('clubs', 4)],
          wastePile: [],
        }),
      ],
    });
    stateManager = new StateManager(initialState);
  });

  describe('getState', () => {
    it('returns the current game state', () => {
      const state = stateManager.getState();
      expect(state.gameId).toBe('test-game');
      expect(state.phase).toBe('playing');
    });
  });

  describe('getSequence', () => {
    it('starts at 0', () => {
      expect(stateManager.getSequence()).toBe(0);
    });
  });

  describe('createUpdate', () => {
    it('increments sequence number', () => {
      const delta = { type: 'stockFlipped' as const, playerId: 'player1' };

      const update1 = stateManager.createUpdate(delta);
      expect(update1.sequence).toBe(1);

      const update2 = stateManager.createUpdate(delta);
      expect(update2.sequence).toBe(2);

      const update3 = stateManager.createUpdate(delta);
      expect(update3.sequence).toBe(3);
    });

    it('includes timestamp', () => {
      const before = Date.now();
      const delta = { type: 'stockFlipped' as const, playerId: 'player1' };
      const update = stateManager.createUpdate(delta);
      const after = Date.now();

      expect(update.timestamp).toBeGreaterThanOrEqual(before);
      expect(update.timestamp).toBeLessThanOrEqual(after);
    });

    it('includes game ID', () => {
      const delta = { type: 'stockFlipped' as const, playerId: 'player1' };
      const update = stateManager.createUpdate(delta);
      expect(update.gameId).toBe('test-game');
    });
  });

  describe('applyMove - card moves', () => {
    it('moves card from nertz to work pile', () => {
      const move: CardMove = {
        type: 'card',
        playerId: 'player1',
        source: { type: 'nertz' },
        destination: { type: 'work', pileIndex: 0 }, // Has 7 of clubs, need 6 of red
      };

      // First set up a valid move (5 of hearts on 6 of clubs doesn't work)
      // Let's put a 6 of diamonds on the nertz pile and move to the 7 of clubs
      initialState.players[0]!.nertzPile = [card('diamonds', 6)];
      stateManager = new StateManager(initialState);

      const result = stateManager.applyMove(move);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.delta.type).toBe('cardMoved');
        expect(result.newState.players[0]!.nertzPile).toHaveLength(0);
        expect(result.newState.players[0]!.workPiles[0]).toHaveLength(2);
      }
    });

    it('moves card from work pile to foundation', () => {
      // Put ace of hearts on work pile
      initialState.players[0]!.workPiles[2] = [card('hearts', 1)];
      stateManager = new StateManager(initialState);

      const move: CardMove = {
        type: 'card',
        playerId: 'player1',
        source: { type: 'work', pileIndex: 2 },
        destination: { type: 'foundation', foundationIndex: 0 }, // hearts foundation
      };

      const result = stateManager.applyMove(move);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.delta.type).toBe('cardMoved');
        expect(result.newState.foundations[0]!.cards).toHaveLength(1);
        expect(result.newState.players[0]!.workPiles[2]).toHaveLength(0);
      }
    });

    it('rejects invalid move', () => {
      // Try to move 5 of hearts to foundation (needs ace first)
      initialState.players[0]!.workPiles[2] = [card('hearts', 5)];
      stateManager = new StateManager(initialState);

      const move: CardMove = {
        type: 'card',
        playerId: 'player1',
        source: { type: 'work', pileIndex: 2 },
        destination: { type: 'foundation', foundationIndex: 0 },
      };

      const result = stateManager.applyMove(move);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('wrong_rank_for_foundation');
      }
    });

    it('generates correct delta for card move', () => {
      initialState.players[0]!.workPiles[2] = [card('hearts', 1)];
      stateManager = new StateManager(initialState);

      const move: CardMove = {
        type: 'card',
        playerId: 'player1',
        source: { type: 'work', pileIndex: 2 },
        destination: { type: 'foundation', foundationIndex: 0 },
      };

      const result = stateManager.applyMove(move);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.delta).toEqual({
          type: 'cardMoved',
          playerId: 'player1',
          source: { type: 'work', pileIndex: 2 },
          destination: { type: 'foundation', foundationIndex: 0 },
          cards: [{ suit: 'hearts', rank: 1, deckId: 'player1' }],
        });
      }
    });
  });

  describe('applyMove - draw moves', () => {
    it('draws cards from stock to waste', () => {
      const move: DrawMove = {
        type: 'draw',
        playerId: 'player1',
      };

      const result = stateManager.applyMove(move);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.delta.type).toBe('cardsDrawn');
        // Draw 3 cards (config.drawCount = 3)
        expect(result.newState.players[0]!.stockPile).toHaveLength(0);
        expect(result.newState.players[0]!.wastePile).toHaveLength(3);
      }
    });

    it('draws only available cards when stock has fewer than drawCount', () => {
      initialState.players[0]!.stockPile = [card('hearts', 1), card('hearts', 2)];
      stateManager = new StateManager(initialState);

      const move: DrawMove = {
        type: 'draw',
        playerId: 'player1',
      };

      const result = stateManager.applyMove(move);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.newState.players[0]!.stockPile).toHaveLength(0);
        expect(result.newState.players[0]!.wastePile).toHaveLength(2);
      }
    });

    it('generates correct delta for draw', () => {
      const move: DrawMove = {
        type: 'draw',
        playerId: 'player1',
      };

      const result = stateManager.applyMove(move);

      expect(result.success).toBe(true);
      if (result.success && result.delta.type === 'cardsDrawn') {
        expect(result.delta.playerId).toBe('player1');
        expect(result.delta.cards).toHaveLength(3);
      }
    });
  });

  describe('applyMove - flip stock moves', () => {
    it('flips waste back to stock when stock is empty', () => {
      initialState.players[0]!.stockPile = [];
      initialState.players[0]!.wastePile = [
        card('hearts', 1),
        card('hearts', 2),
        card('hearts', 3),
      ];
      stateManager = new StateManager(initialState);

      const move: FlipStockMove = {
        type: 'flipStock',
        playerId: 'player1',
      };

      const result = stateManager.applyMove(move);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.delta.type).toBe('stockFlipped');
        expect(result.newState.players[0]!.stockPile).toHaveLength(3);
        expect(result.newState.players[0]!.wastePile).toHaveLength(0);
      }
    });

    it('rejects flip when stock is not empty', () => {
      const move: FlipStockMove = {
        type: 'flipStock',
        playerId: 'player1',
      };

      const result = stateManager.applyMove(move);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('stock_not_empty');
      }
    });
  });

  describe('callNertz', () => {
    it('allows nertz call when nertz pile is empty', () => {
      initialState.players[0]!.nertzPile = [];
      stateManager = new StateManager(initialState);

      const result = stateManager.callNertz('player1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.delta.type).toBe('nertzCalled');
        expect(result.newState.calledBy).toBe('player1');
        expect(result.newState.phase).toBe('scoring');
      }
    });

    it('rejects nertz call when nertz pile is not empty', () => {
      const result = stateManager.callNertz('player1');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('nertz_pile_not_empty');
      }
    });

    it('rejects nertz call for unknown player', () => {
      const result = stateManager.callNertz('unknown');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('player_not_found');
      }
    });
  });
});

describe('createInitialGameState', () => {
  it('creates a valid game state', () => {
    const config: GameConfig = {
      nertzPileSize: 13,
      drawCount: 3,
      targetScore: 100,
    };

    const players = [
      {
        playerId: 'player1',
        deckId: 'deck1',
        nertzPile: [card('hearts', 1), card('hearts', 2)],
        workPiles: [[card('clubs', 3)], [], [], []],
        stockPile: [card('diamonds', 4)],
      },
    ];

    const state = createInitialGameState('game-123', players, config);

    expect(state.gameId).toBe('game-123');
    expect(state.phase).toBe('playing');
    expect(state.players).toHaveLength(1);
    expect(state.foundations).toHaveLength(4);
    expect(state.config).toEqual(config);
  });

  it('creates 4 foundation piles for each suit', () => {
    const config: GameConfig = {
      nertzPileSize: 13,
      drawCount: 3,
      targetScore: 100,
    };

    const state = createInitialGameState('game-123', [], config);

    expect(state.foundations.map(f => f.suit)).toEqual([
      'hearts',
      'diamonds',
      'clubs',
      'spades',
    ]);
    expect(state.foundations.every(f => f.cards.length === 0)).toBe(true);
  });
});
