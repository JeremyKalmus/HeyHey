import { describe, it, expect, beforeEach } from 'vitest';
import {
  areAlternatingColors,
  canPlaceOnWorkPile,
  canPlaceOnFoundation,
  validateMove,
  findValidFoundations,
  findValidWorkPiles,
  hasPlayerWon,
  getErrorMessage,
  getPlayerState,
} from './RulesEngine.js';
import type {
  Card,
  GameState,
  PlayerGameState,
  FoundationPile,
  CardMove,
  DrawMove,
  FlipStockMove,
} from '../types/index.js';

// Test helpers to create cards
function card(suit: Card['suit'], rank: number, deckId = 'player1'): Card {
  return { suit, rank, deckId };
}

// Create a minimal game state for testing
function createTestGameState(overrides: Partial<GameState> = {}): GameState {
  const defaultState: GameState = {
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
    roundNumber: 1,
    currentStarterIndex: 0,
    ...overrides,
  };
  return defaultState;
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

describe('RulesEngine', () => {
  describe('areAlternatingColors', () => {
    it('returns true for red and black cards', () => {
      expect(areAlternatingColors(card('hearts', 5), card('clubs', 6))).toBe(true);
      expect(areAlternatingColors(card('diamonds', 5), card('spades', 6))).toBe(true);
    });

    it('returns true for black and red cards', () => {
      expect(areAlternatingColors(card('clubs', 5), card('hearts', 6))).toBe(true);
      expect(areAlternatingColors(card('spades', 5), card('diamonds', 6))).toBe(true);
    });

    it('returns false for same color cards', () => {
      expect(areAlternatingColors(card('hearts', 5), card('diamonds', 6))).toBe(false);
      expect(areAlternatingColors(card('clubs', 5), card('spades', 6))).toBe(false);
    });
  });

  describe('canPlaceOnWorkPile', () => {
    it('allows any card on empty pile', () => {
      expect(canPlaceOnWorkPile(card('hearts', 5), undefined)).toBe(true);
      expect(canPlaceOnWorkPile(card('hearts', 13), undefined)).toBe(true);
      expect(canPlaceOnWorkPile(card('clubs', 1), undefined)).toBe(true);
    });

    it('allows descending rank with alternating colors', () => {
      // Black 6 on Red 7
      expect(canPlaceOnWorkPile(card('clubs', 6), card('hearts', 7))).toBe(true);
      // Red 5 on Black 6
      expect(canPlaceOnWorkPile(card('diamonds', 5), card('spades', 6))).toBe(true);
    });

    it('rejects same color cards', () => {
      expect(canPlaceOnWorkPile(card('hearts', 6), card('diamonds', 7))).toBe(false);
      expect(canPlaceOnWorkPile(card('clubs', 6), card('spades', 7))).toBe(false);
    });

    it('rejects wrong rank (not descending by 1)', () => {
      // Same rank
      expect(canPlaceOnWorkPile(card('clubs', 6), card('hearts', 6))).toBe(false);
      // Ascending
      expect(canPlaceOnWorkPile(card('clubs', 8), card('hearts', 7))).toBe(false);
      // Skip ranks
      expect(canPlaceOnWorkPile(card('clubs', 5), card('hearts', 7))).toBe(false);
    });
  });

  describe('canPlaceOnFoundation', () => {
    it('allows Ace on empty foundation of matching suit', () => {
      const foundation: FoundationPile = { suit: 'hearts', cards: [], ownerId: 'system' };
      expect(canPlaceOnFoundation(card('hearts', 1), foundation)).toBe(true);
    });

    it('rejects non-Ace on empty foundation', () => {
      const foundation: FoundationPile = { suit: 'hearts', cards: [], ownerId: 'system' };
      expect(canPlaceOnFoundation(card('hearts', 2), foundation)).toBe(false);
      expect(canPlaceOnFoundation(card('hearts', 13), foundation)).toBe(false);
    });

    it('rejects wrong suit', () => {
      const foundation: FoundationPile = { suit: 'hearts', cards: [], ownerId: 'system' };
      expect(canPlaceOnFoundation(card('diamonds', 1), foundation)).toBe(false);
    });

    it('allows ascending same suit cards', () => {
      const foundation: FoundationPile = {
        suit: 'hearts',
        cards: [card('hearts', 1), card('hearts', 2)],
        ownerId: 'system',
      };
      expect(canPlaceOnFoundation(card('hearts', 3), foundation)).toBe(true);
    });

    it('rejects wrong rank sequence', () => {
      const foundation: FoundationPile = {
        suit: 'hearts',
        cards: [card('hearts', 1), card('hearts', 2)],
        ownerId: 'system',
      };
      // Skip a rank
      expect(canPlaceOnFoundation(card('hearts', 4), foundation)).toBe(false);
      // Same rank
      expect(canPlaceOnFoundation(card('hearts', 2), foundation)).toBe(false);
      // Descending
      expect(canPlaceOnFoundation(card('hearts', 1), foundation)).toBe(false);
    });

    it('rejects cards on complete foundation', () => {
      const foundation: FoundationPile = {
        suit: 'hearts',
        cards: Array.from({ length: 13 }, (_, i) => card('hearts', i + 1)),
        ownerId: 'system',
      };
      expect(canPlaceOnFoundation(card('hearts', 1), foundation)).toBe(false);
    });
  });

  describe('validateMove - card moves', () => {
    let gameState: GameState;
    let player: PlayerGameState;

    beforeEach(() => {
      player = createTestPlayer({
        nertzPile: [card('hearts', 5)],
        workPiles: [[card('clubs', 7)], [card('diamonds', 8)], [], []],
        wastePile: [card('spades', 3)],
      });
      gameState = createTestGameState({
        players: [player],
      });
    });

    describe('from nertz pile', () => {
      it('allows valid move to work pile', () => {
        // Red 5 on Black 6 (we need a black 6 on work pile)
        player.workPiles[0] = [card('clubs', 6)];

        const move: CardMove = {
          type: 'card',
          playerId: 'player1',
          source: { type: 'nertz' },
          destination: { type: 'work', pileIndex: 0 },
        };

        const result = validateMove(gameState, move);
        expect(result.valid).toBe(true);
      });

      it('allows valid move to foundation', () => {
        player.nertzPile = [card('hearts', 1)]; // Ace

        const move: CardMove = {
          type: 'card',
          playerId: 'player1',
          source: { type: 'nertz' },
          destination: { type: 'foundation', foundationIndex: 0 },
        };

        const result = validateMove(gameState, move);
        expect(result.valid).toBe(true);
      });

      it('rejects move from empty nertz pile', () => {
        player.nertzPile = [];

        const move: CardMove = {
          type: 'card',
          playerId: 'player1',
          source: { type: 'nertz' },
          destination: { type: 'work', pileIndex: 0 },
        };

        const result = validateMove(gameState, move);
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.error).toBe('empty_source');
        }
      });
    });

    describe('from work pile', () => {
      it('allows moving single card to another work pile', () => {
        player.workPiles[0] = [card('clubs', 7)];
        player.workPiles[1] = [card('hearts', 8)];

        const move: CardMove = {
          type: 'card',
          playerId: 'player1',
          source: { type: 'work', pileIndex: 0 },
          destination: { type: 'work', pileIndex: 1 },
        };

        const result = validateMove(gameState, move);
        expect(result.valid).toBe(true);
      });

      it('allows moving multiple cards to another work pile', () => {
        // Stack on pile 0: 7♣, 6♥ (7 on bottom, 6 on top)
        player.workPiles[0] = [card('clubs', 7), card('hearts', 6)];
        player.workPiles[1] = [card('diamonds', 8)];

        const move: CardMove = {
          type: 'card',
          playerId: 'player1',
          source: { type: 'work', pileIndex: 0, cardIndex: 0 },
          destination: { type: 'work', pileIndex: 1 },
          cardCount: 2,
        };

        const result = validateMove(gameState, move);
        expect(result.valid).toBe(true);
      });

      it('allows moving card to foundation', () => {
        player.workPiles[0] = [card('hearts', 1)];

        const move: CardMove = {
          type: 'card',
          playerId: 'player1',
          source: { type: 'work', pileIndex: 0 },
          destination: { type: 'foundation', foundationIndex: 0 },
        };

        const result = validateMove(gameState, move);
        expect(result.valid).toBe(true);
      });

      it('rejects moving multiple cards to foundation', () => {
        player.workPiles[0] = [card('hearts', 1), card('clubs', 2)];

        const move: CardMove = {
          type: 'card',
          playerId: 'player1',
          source: { type: 'work', pileIndex: 0 },
          destination: { type: 'foundation', foundationIndex: 0 },
          cardCount: 2,
        };

        const result = validateMove(gameState, move);
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.error).toBe('invalid_card_count');
        }
      });

      it('rejects wrong color for work pile', () => {
        player.workPiles[0] = [card('hearts', 6)];
        player.workPiles[1] = [card('diamonds', 7)]; // Same color

        const move: CardMove = {
          type: 'card',
          playerId: 'player1',
          source: { type: 'work', pileIndex: 0 },
          destination: { type: 'work', pileIndex: 1 },
        };

        const result = validateMove(gameState, move);
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.error).toBe('wrong_color_for_work');
        }
      });

      it('rejects wrong rank for work pile', () => {
        player.workPiles[0] = [card('clubs', 5)];
        player.workPiles[1] = [card('hearts', 7)]; // Need 6, not 5

        const move: CardMove = {
          type: 'card',
          playerId: 'player1',
          source: { type: 'work', pileIndex: 0 },
          destination: { type: 'work', pileIndex: 1 },
        };

        const result = validateMove(gameState, move);
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.error).toBe('wrong_rank_for_work');
        }
      });
    });

    describe('from waste pile', () => {
      it('allows valid move to work pile', () => {
        player.wastePile = [card('clubs', 6)];
        player.workPiles[0] = [card('hearts', 7)];

        const move: CardMove = {
          type: 'card',
          playerId: 'player1',
          source: { type: 'waste' },
          destination: { type: 'work', pileIndex: 0 },
        };

        const result = validateMove(gameState, move);
        expect(result.valid).toBe(true);
      });

      it('allows valid move to foundation', () => {
        player.wastePile = [card('hearts', 1)];

        const move: CardMove = {
          type: 'card',
          playerId: 'player1',
          source: { type: 'waste' },
          destination: { type: 'foundation', foundationIndex: 0 },
        };

        const result = validateMove(gameState, move);
        expect(result.valid).toBe(true);
      });

      it('rejects move from empty waste pile', () => {
        player.wastePile = [];

        const move: CardMove = {
          type: 'card',
          playerId: 'player1',
          source: { type: 'waste' },
          destination: { type: 'work', pileIndex: 0 },
        };

        const result = validateMove(gameState, move);
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.error).toBe('empty_source');
        }
      });

      it('rejects moving multiple cards from waste', () => {
        player.wastePile = [card('hearts', 5), card('clubs', 6)];

        const move: CardMove = {
          type: 'card',
          playerId: 'player1',
          source: { type: 'waste' },
          destination: { type: 'work', pileIndex: 0 },
          cardCount: 2,
        };

        const result = validateMove(gameState, move);
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.error).toBe('invalid_card_count');
        }
      });
    });

    describe('to foundation', () => {
      it('rejects wrong suit', () => {
        player.nertzPile = [card('diamonds', 1)]; // Diamond ace

        const move: CardMove = {
          type: 'card',
          playerId: 'player1',
          source: { type: 'nertz' },
          destination: { type: 'foundation', foundationIndex: 0 }, // Hearts foundation
        };

        const result = validateMove(gameState, move);
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.error).toBe('wrong_suit_for_foundation');
        }
      });

      it('rejects wrong rank', () => {
        player.nertzPile = [card('hearts', 3)];
        gameState.foundations[0]!.cards = [card('hearts', 1)]; // Has ace, needs 2

        const move: CardMove = {
          type: 'card',
          playerId: 'player1',
          source: { type: 'nertz' },
          destination: { type: 'foundation', foundationIndex: 0 },
        };

        const result = validateMove(gameState, move);
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.error).toBe('wrong_rank_for_foundation');
        }
      });

      it('rejects placing on full foundation', () => {
        player.nertzPile = [card('hearts', 1)];
        // Fill foundation to King
        gameState.foundations[0]!.cards = Array.from({ length: 13 }, (_, i) =>
          card('hearts', i + 1)
        );

        const move: CardMove = {
          type: 'card',
          playerId: 'player1',
          source: { type: 'nertz' },
          destination: { type: 'foundation', foundationIndex: 0 },
        };

        const result = validateMove(gameState, move);
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.error).toBe('foundation_full');
        }
      });
    });

    it('rejects moves from unknown player', () => {
      const move: CardMove = {
        type: 'card',
        playerId: 'unknown-player',
        source: { type: 'nertz' },
        destination: { type: 'work', pileIndex: 0 },
      };

      const result = validateMove(gameState, move);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('player_not_found');
      }
    });

    it('rejects invalid destination index', () => {
      const move: CardMove = {
        type: 'card',
        playerId: 'player1',
        source: { type: 'nertz' },
        destination: { type: 'work', pileIndex: 99 },
      };

      const result = validateMove(gameState, move);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('invalid_destination');
      }
    });
  });

  describe('validateMove - draw', () => {
    it('allows drawing from stock with cards', () => {
      const player = createTestPlayer({
        stockPile: [card('hearts', 5), card('clubs', 3), card('diamonds', 7)],
      });
      const gameState = createTestGameState({ players: [player] });

      const move: DrawMove = {
        type: 'draw',
        playerId: 'player1',
      };

      const result = validateMove(gameState, move);
      expect(result.valid).toBe(true);
    });

    it('rejects drawing from empty stock', () => {
      const player = createTestPlayer({
        stockPile: [],
      });
      const gameState = createTestGameState({ players: [player] });

      const move: DrawMove = {
        type: 'draw',
        playerId: 'player1',
      };

      const result = validateMove(gameState, move);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('empty_source');
      }
    });
  });

  describe('validateMove - flipStock', () => {
    it('allows flipping when stock empty and waste has cards', () => {
      const player = createTestPlayer({
        stockPile: [],
        wastePile: [card('hearts', 5), card('clubs', 3)],
      });
      const gameState = createTestGameState({ players: [player] });

      const move: FlipStockMove = {
        type: 'flipStock',
        playerId: 'player1',
      };

      const result = validateMove(gameState, move);
      expect(result.valid).toBe(true);
    });

    it('rejects flipping when stock not empty', () => {
      const player = createTestPlayer({
        stockPile: [card('hearts', 5)],
        wastePile: [card('clubs', 3)],
      });
      const gameState = createTestGameState({ players: [player] });

      const move: FlipStockMove = {
        type: 'flipStock',
        playerId: 'player1',
      };

      const result = validateMove(gameState, move);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('stock_not_empty');
      }
    });

    it('rejects flipping when waste is empty', () => {
      const player = createTestPlayer({
        stockPile: [],
        wastePile: [],
      });
      const gameState = createTestGameState({ players: [player] });

      const move: FlipStockMove = {
        type: 'flipStock',
        playerId: 'player1',
      };

      const result = validateMove(gameState, move);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('waste_empty');
      }
    });
  });

  describe('findValidFoundations', () => {
    it('finds foundation for Ace', () => {
      const gameState = createTestGameState();
      const aceOfHearts = card('hearts', 1);

      const valid = findValidFoundations(gameState, aceOfHearts);
      expect(valid).toEqual([0]); // Hearts foundation is index 0
    });

    it('finds foundation for next card in sequence', () => {
      const gameState = createTestGameState();
      gameState.foundations[2]!.cards = [card('clubs', 1)]; // Has ace

      const twoOfClubs = card('clubs', 2);
      const valid = findValidFoundations(gameState, twoOfClubs);
      expect(valid).toEqual([2]);
    });

    it('returns empty array when no valid foundation', () => {
      const gameState = createTestGameState();
      const threeOfHearts = card('hearts', 3); // Can't place 3 on empty

      const valid = findValidFoundations(gameState, threeOfHearts);
      expect(valid).toEqual([]);
    });
  });

  describe('findValidWorkPiles', () => {
    it('finds empty piles for any card', () => {
      const player = createTestPlayer({
        workPiles: [[], [], [], []],
      });

      const valid = findValidWorkPiles(player, card('hearts', 5));
      expect(valid).toEqual([0, 1, 2, 3]);
    });

    it('finds piles with matching descending alternating color', () => {
      const player = createTestPlayer({
        workPiles: [
          [card('clubs', 7)], // Black 7 - red 6 can go here
          [card('hearts', 8)], // Red 8 - black 7 can go here
          [card('diamonds', 5)], // Red 5 - black 4 can go here
          [], // Empty - any card
        ],
      });

      // Red 6 can go on black 7 (pile 0) or empty (pile 3)
      expect(findValidWorkPiles(player, card('hearts', 6))).toEqual([0, 3]);

      // Black 7 can go on red 8 (pile 1) or empty (pile 3)
      expect(findValidWorkPiles(player, card('spades', 7))).toEqual([1, 3]);
    });

    it('returns only empty piles when no color/rank match', () => {
      const player = createTestPlayer({
        workPiles: [
          [card('clubs', 7)],
          [card('hearts', 8)],
          [card('diamonds', 5)],
          [],
        ],
      });

      // Red 3 - no pile has black 4, only empty works
      expect(findValidWorkPiles(player, card('hearts', 3))).toEqual([3]);
    });
  });

  describe('hasPlayerWon', () => {
    it('returns true when nertz pile is empty', () => {
      const player = createTestPlayer({ nertzPile: [] });
      expect(hasPlayerWon(player)).toBe(true);
    });

    it('returns false when nertz pile has cards', () => {
      const player = createTestPlayer({
        nertzPile: [card('hearts', 5)],
      });
      expect(hasPlayerWon(player)).toBe(false);
    });
  });

  describe('getPlayerState', () => {
    it('finds player by id', () => {
      const player = createTestPlayer({ playerId: 'player1' });
      const gameState = createTestGameState({ players: [player] });

      const found = getPlayerState(gameState, 'player1');
      expect(found).toBe(player);
    });

    it('returns undefined for unknown player', () => {
      const gameState = createTestGameState({ players: [] });

      const found = getPlayerState(gameState, 'unknown');
      expect(found).toBeUndefined();
    });
  });

  describe('getErrorMessage', () => {
    it('returns human readable messages', () => {
      expect(getErrorMessage('wrong_color_for_work')).toBe('Card must be a different color');
      expect(getErrorMessage('wrong_rank_for_work')).toBe('Card must be one rank lower');
      expect(getErrorMessage('wrong_suit_for_foundation')).toBe('Card must match foundation suit');
      expect(getErrorMessage('empty_source')).toBe('No card to move from that location');
    });
  });
});
