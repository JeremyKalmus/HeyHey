// useCardSelection tests
// Tests card selection state management and valid destination calculation

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCardSelection } from './useCardSelection';
import type { Card, GameState, PlayerGameState, FoundationPile } from '@heyhey/shared';

// Helper to create a card
function createCard(suit: Card['suit'], rank: number, deckId: string = 'player1'): Card {
  return { suit, rank, deckId };
}

// Helper to create a player game state
function createPlayerState(
  playerId: string,
  overrides: Partial<PlayerGameState> = {}
): PlayerGameState {
  return {
    playerId,
    deckId: playerId,
    nertzPile: [],
    workPiles: [[], [], [], []],
    stockPile: [],
    wastePile: [],
    ...overrides,
  };
}

// Helper to create a foundation pile
function createFoundation(suit: Card['suit'], cards: Card[] = [], ownerId = 'player1'): FoundationPile {
  return { suit, cards, ownerId };
}

// Helper to create game state
function createGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    gameId: 'game1',
    phase: 'playing',
    players: [],
    foundations: [
      createFoundation('hearts'),
      createFoundation('diamonds'),
      createFoundation('clubs'),
      createFoundation('spades'),
    ],
    config: { nertzPileSize: 13, drawCount: 3, targetScore: 100 },
    roundNumber: 1,
    currentStarterIndex: 0,
    ...overrides,
  };
}

describe('useCardSelection', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockOnMove: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockOnSelectionChange: any;

  beforeEach(() => {
    mockOnMove = vi.fn();
    mockOnSelectionChange = vi.fn();
  });

  describe('initial state', () => {
    it('should have no selection initially', () => {
      const gameState = createGameState({
        players: [createPlayerState('player1')],
      });

      const { result } = renderHook(() =>
        useCardSelection({
          gameState,
          playerId: 'player1',
        })
      );

      expect(result.current.selection).toBeNull();
      expect(result.current.hasSelection).toBe(false);
      expect(result.current.validDestinations).toEqual([]);
    });
  });

  describe('selectCard', () => {
    it('should select a card from nertz pile', () => {
      const card = createCard('hearts', 5);
      const gameState = createGameState({
        players: [
          createPlayerState('player1', {
            nertzPile: [card],
          }),
        ],
      });

      const { result } = renderHook(() =>
        useCardSelection({
          gameState,
          playerId: 'player1',
          onSelectionChange: mockOnSelectionChange,
        })
      );

      act(() => {
        result.current.selectCard(card, { type: 'nertz' });
      });

      expect(result.current.selection).toEqual({
        card,
        source: { type: 'nertz' },
        cardCount: 1,
      });
      expect(result.current.hasSelection).toBe(true);
      expect(mockOnSelectionChange).toHaveBeenCalledWith({
        card,
        source: { type: 'nertz' },
        cardCount: 1,
      });
    });

    it('should select a card from work pile', () => {
      const card = createCard('diamonds', 7);
      const gameState = createGameState({
        players: [
          createPlayerState('player1', {
            workPiles: [[card], [], [], []],
          }),
        ],
      });

      const { result } = renderHook(() =>
        useCardSelection({
          gameState,
          playerId: 'player1',
        })
      );

      act(() => {
        result.current.selectCard(card, { type: 'work', pileIndex: 0 });
      });

      expect(result.current.selection).toEqual({
        card,
        source: { type: 'work', pileIndex: 0 },
        cardCount: 1,
      });
    });

    it('should select multiple cards from work pile', () => {
      const bottomCard = createCard('hearts', 6);
      const topCard = createCard('spades', 5);
      const gameState = createGameState({
        players: [
          createPlayerState('player1', {
            workPiles: [[bottomCard, topCard], [], [], []],
          }),
        ],
      });

      const { result } = renderHook(() =>
        useCardSelection({
          gameState,
          playerId: 'player1',
        })
      );

      act(() => {
        result.current.selectCard(bottomCard, { type: 'work', pileIndex: 0, cardIndex: 0 }, 2);
      });

      expect(result.current.selection?.cardCount).toBe(2);
    });
  });

  describe('clearSelection', () => {
    it('should clear the current selection', () => {
      const card = createCard('hearts', 5);
      const gameState = createGameState({
        players: [
          createPlayerState('player1', {
            nertzPile: [card],
          }),
        ],
      });

      const { result } = renderHook(() =>
        useCardSelection({
          gameState,
          playerId: 'player1',
          onSelectionChange: mockOnSelectionChange,
        })
      );

      act(() => {
        result.current.selectCard(card, { type: 'nertz' });
      });

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selection).toBeNull();
      expect(result.current.hasSelection).toBe(false);
      expect(mockOnSelectionChange).toHaveBeenLastCalledWith(null);
    });
  });

  describe('validDestinations', () => {
    it('should find valid work pile destinations', () => {
      // Red 6 can go on black 7
      const selectedCard = createCard('hearts', 6);
      const targetCard = createCard('spades', 7);

      const gameState = createGameState({
        players: [
          createPlayerState('player1', {
            nertzPile: [selectedCard],
            workPiles: [[targetCard], [], [], []],
          }),
        ],
      });

      const { result } = renderHook(() =>
        useCardSelection({
          gameState,
          playerId: 'player1',
        })
      );

      act(() => {
        result.current.selectCard(selectedCard, { type: 'nertz' });
      });

      // Should include pile 0 (has black 7), and empty piles 1, 2, 3
      expect(result.current.validDestinations).toContainEqual({ type: 'work', index: 0 });
      expect(result.current.validDestinations).toContainEqual({ type: 'work', index: 1 });
      expect(result.current.validDestinations).toContainEqual({ type: 'work', index: 2 });
      expect(result.current.validDestinations).toContainEqual({ type: 'work', index: 3 });
    });

    it('should find valid foundation destinations for Ace', () => {
      const ace = createCard('hearts', 1);

      const gameState = createGameState({
        players: [
          createPlayerState('player1', {
            nertzPile: [ace],
          }),
        ],
      });

      const { result } = renderHook(() =>
        useCardSelection({
          gameState,
          playerId: 'player1',
        })
      );

      act(() => {
        result.current.selectCard(ace, { type: 'nertz' });
      });

      // Ace of hearts can go on hearts foundation (index 0)
      expect(result.current.validDestinations).toContainEqual({ type: 'foundation', index: 0 });
    });

    it('should not include foundation for multi-card moves', () => {
      const bottomCard = createCard('hearts', 1); // Ace
      const topCard = createCard('clubs', 2);

      const gameState = createGameState({
        players: [
          createPlayerState('player1', {
            workPiles: [[bottomCard, topCard], [], [], []],
          }),
        ],
      });

      const { result } = renderHook(() =>
        useCardSelection({
          gameState,
          playerId: 'player1',
        })
      );

      act(() => {
        result.current.selectCard(bottomCard, { type: 'work', pileIndex: 0, cardIndex: 0 }, 2);
      });

      // Should not include foundation destinations for multi-card moves
      const foundationDestinations = result.current.validDestinations.filter(
        (d) => d.type === 'foundation'
      );
      expect(foundationDestinations).toHaveLength(0);
    });

    it('should exclude source pile from valid destinations', () => {
      const card = createCard('hearts', 5);

      const gameState = createGameState({
        players: [
          createPlayerState('player1', {
            workPiles: [[card], [], [], []],
          }),
        ],
      });

      const { result } = renderHook(() =>
        useCardSelection({
          gameState,
          playerId: 'player1',
        })
      );

      act(() => {
        result.current.selectCard(card, { type: 'work', pileIndex: 0 });
      });

      // Should not include pile 0 as it's the source
      expect(result.current.validDestinations).not.toContainEqual({ type: 'work', index: 0 });
    });
  });

  describe('isValidDestination', () => {
    it('should return true for valid destination', () => {
      const selectedCard = createCard('hearts', 6);
      const targetCard = createCard('spades', 7);

      const gameState = createGameState({
        players: [
          createPlayerState('player1', {
            nertzPile: [selectedCard],
            workPiles: [[targetCard], [], [], []],
          }),
        ],
      });

      const { result } = renderHook(() =>
        useCardSelection({
          gameState,
          playerId: 'player1',
        })
      );

      act(() => {
        result.current.selectCard(selectedCard, { type: 'nertz' });
      });

      expect(result.current.isValidDestination({ type: 'work', index: 0 })).toBe(true);
    });

    it('should return false for invalid destination', () => {
      // Red 6 cannot go on red 7
      const selectedCard = createCard('hearts', 6);
      const targetCard = createCard('diamonds', 7);

      const gameState = createGameState({
        players: [
          createPlayerState('player1', {
            nertzPile: [selectedCard],
            workPiles: [[targetCard], [], [], []],
          }),
        ],
      });

      const { result } = renderHook(() =>
        useCardSelection({
          gameState,
          playerId: 'player1',
        })
      );

      act(() => {
        result.current.selectCard(selectedCard, { type: 'nertz' });
      });

      expect(result.current.isValidDestination({ type: 'work', index: 0 })).toBe(false);
    });
  });

  describe('placeCard', () => {
    it('should return error when no card is selected', () => {
      const gameState = createGameState({
        players: [createPlayerState('player1')],
      });

      const { result } = renderHook(() =>
        useCardSelection({
          gameState,
          playerId: 'player1',
        })
      );

      const validationResult = result.current.placeCard({ type: 'work', index: 0 });

      expect(validationResult.valid).toBe(false);
      if (!validationResult.valid) {
        expect(validationResult.error).toBe('no_card_selected');
      }
    });

    it('should call onMove and clear selection on valid move', () => {
      const selectedCard = createCard('hearts', 6);
      const targetCard = createCard('spades', 7);

      const gameState = createGameState({
        players: [
          createPlayerState('player1', {
            nertzPile: [selectedCard],
            workPiles: [[targetCard], [], [], []],
          }),
        ],
      });

      const { result } = renderHook(() =>
        useCardSelection({
          gameState,
          playerId: 'player1',
          onMove: mockOnMove,
        })
      );

      act(() => {
        result.current.selectCard(selectedCard, { type: 'nertz' });
      });

      let validationResult: ReturnType<typeof result.current.placeCard>;
      act(() => {
        validationResult = result.current.placeCard({ type: 'work', index: 0 });
      });

      expect(validationResult!.valid).toBe(true);
      expect(mockOnMove).toHaveBeenCalledWith(
        { type: 'nertz' },
        { type: 'work', pileIndex: 0 },
        1
      );
      expect(result.current.selection).toBeNull();
    });

    it('should place card on foundation', () => {
      const ace = createCard('hearts', 1);

      const gameState = createGameState({
        players: [
          createPlayerState('player1', {
            nertzPile: [ace],
          }),
        ],
      });

      const { result } = renderHook(() =>
        useCardSelection({
          gameState,
          playerId: 'player1',
          onMove: mockOnMove,
        })
      );

      act(() => {
        result.current.selectCard(ace, { type: 'nertz' });
      });

      let validationResult: ReturnType<typeof result.current.placeCard>;
      act(() => {
        validationResult = result.current.placeCard({ type: 'foundation', index: 0 });
      });

      expect(validationResult!.valid).toBe(true);
      expect(mockOnMove).toHaveBeenCalledWith(
        { type: 'nertz' },
        { type: 'foundation', foundationIndex: 0 },
        1
      );
    });

    it('should return validation error for invalid move', () => {
      // Try to place 6 on foundation (invalid - needs Ace)
      const six = createCard('hearts', 6);

      const gameState = createGameState({
        players: [
          createPlayerState('player1', {
            nertzPile: [six],
          }),
        ],
      });

      const { result } = renderHook(() =>
        useCardSelection({
          gameState,
          playerId: 'player1',
          onMove: mockOnMove,
        })
      );

      act(() => {
        result.current.selectCard(six, { type: 'nertz' });
      });

      let validationResult: ReturnType<typeof result.current.placeCard>;
      act(() => {
        validationResult = result.current.placeCard({ type: 'foundation', index: 0 });
      });

      expect(validationResult!.valid).toBe(false);
      expect(mockOnMove).not.toHaveBeenCalled();
      // Selection should remain (move failed)
      expect(result.current.selection).not.toBeNull();
    });
  });
});
