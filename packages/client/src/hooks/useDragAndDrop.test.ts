// useDragAndDrop tests
// Tests drag-and-drop state management and move handling
// Uses proper TypeScript type assertions for all mocks

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useDragAndDrop,
  createDragId,
  parseDragId,
  createDropId,
  parseDropId,
} from './useDragAndDrop';
import type {
  Card,
  GameState,
  PlayerGameState,
  FoundationPile,
  MoveSource,
  MoveDestination,
} from '@heyhey/shared';
import type { DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core';

/* =============================================================================
   TEST HELPERS
   ============================================================================= */

function createCard(suit: Card['suit'], rank: number, deckId = 'player1'): Card {
  return { suit, rank, deckId };
}

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

function createFoundation(suit: Card['suit'], cards: Card[] = []): FoundationPile {
  return { suit, cards };
}

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
    ...overrides,
  };
}

// Type-safe mock event creators
function createMockDragStartEvent(
  id: string,
  data: { card: Card; cardCount?: number; pileIndex?: number; cardIndex?: number }
): DragStartEvent {
  return {
    active: {
      id,
      data: { current: data },
      rect: { current: { initial: null, translated: null } },
    },
    activatorEvent: new Event('pointer'),
  } as unknown as DragStartEvent;
}

function createMockDragOverEvent(overId: string | null): DragOverEvent {
  return {
    active: {
      id: 'test-drag',
      data: { current: {} },
      rect: { current: { initial: null, translated: null } },
    },
    over: overId
      ? {
          id: overId,
          rect: { width: 100, height: 100, top: 0, left: 0, right: 100, bottom: 100 },
          data: { current: {} },
          disabled: false,
        }
      : null,
    activatorEvent: new Event('pointer'),
    collisions: null,
    delta: { x: 0, y: 0 },
  } as unknown as DragOverEvent;
}

function createMockDragEndEvent(overId: string | null): DragEndEvent {
  return {
    active: {
      id: 'test-drag',
      data: { current: {} },
      rect: { current: { initial: null, translated: null } },
    },
    over: overId
      ? {
          id: overId,
          rect: { width: 100, height: 100, top: 0, left: 0, right: 100, bottom: 100 },
          data: { current: {} },
          disabled: false,
        }
      : null,
    activatorEvent: new Event('pointer'),
    collisions: null,
    delta: { x: 0, y: 0 },
  } as unknown as DragEndEvent;
}

/* =============================================================================
   ID FUNCTION TESTS
   ============================================================================= */

describe('useDragAndDrop', () => {
  describe('createDragId', () => {
    it('should create drag ID for nertz card', () => {
      const card = createCard('hearts', 5);
      const id = createDragId('nertz', card);
      expect(id).toBe('drag-nertz-hearts-5');
    });

    it('should create drag ID for waste card', () => {
      const card = createCard('diamonds', 10);
      const id = createDragId('waste', card);
      expect(id).toBe('drag-waste-diamonds-10');
    });

    it('should create drag ID for work pile card with indices', () => {
      const card = createCard('clubs', 7);
      const id = createDragId('work', card, 2, 3);
      expect(id).toBe('drag-work-clubs-7-2-3');
    });

    it('should create drag ID for work pile card with only pile index', () => {
      const card = createCard('spades', 1);
      const id = createDragId('work', card, 1);
      expect(id).toBe('drag-work-spades-1-1');
    });
  });

  describe('parseDragId', () => {
    it('should return null for invalid id', () => {
      expect(parseDragId('invalid')).toBeNull();
      expect(parseDragId('drop-work-0')).toBeNull();
      expect(parseDragId('')).toBeNull();
    });

    it('should parse nertz drag id', () => {
      const result = parseDragId('drag-nertz-hearts-5');
      expect(result).toEqual({ type: 'nertz' });
    });

    it('should parse waste drag id', () => {
      const result = parseDragId('drag-waste-diamonds-10');
      expect(result).toEqual({ type: 'waste' });
    });

    it('should parse work pile drag id with indices', () => {
      const result = parseDragId('drag-work-clubs-7-2-3');
      expect(result).toEqual({ type: 'work', pileIndex: 2, cardIndex: 3 });
    });

    it('should parse numeric id by converting to string', () => {
      const result = parseDragId(123);
      expect(result).toBeNull();
    });
  });

  describe('createDropId', () => {
    it('should create drop ID for work pile', () => {
      const id = createDropId('work', 2);
      expect(id).toBe('drop-work-2');
    });

    it('should create drop ID for foundation', () => {
      const id = createDropId('foundation', 0);
      expect(id).toBe('drop-foundation-0');
    });
  });

  describe('parseDropId', () => {
    it('should return null for invalid id', () => {
      expect(parseDropId('invalid')).toBeNull();
      expect(parseDropId('drag-work-0')).toBeNull();
      expect(parseDropId('')).toBeNull();
    });

    it('should parse work pile drop id', () => {
      const result = parseDropId('drop-work-2');
      expect(result).toEqual({ type: 'work', index: 2 });
    });

    it('should parse foundation drop id', () => {
      const result = parseDropId('drop-foundation-1');
      expect(result).toEqual({ type: 'foundation', index: 1 });
    });

    it('should return null for unknown drop type', () => {
      const result = parseDropId('drop-unknown-0');
      expect(result).toBeNull();
    });

    it('should return NaN index when index part is empty string', () => {
      // Note: parseInt('', 10) returns NaN, not 0
      const result = parseDropId('drop-work-');
      expect(result?.type).toBe('work');
      expect(Number.isNaN(result?.index)).toBe(true);
    });
  });

  /* ===========================================================================
     HOOK TESTS
     =========================================================================== */

  describe('hook behavior', () => {
    // Properly typed mocks using Mock<T> where T is the function signature
    let mockOnMove: Mock<(source: MoveSource, destination: MoveDestination, cardCount?: number) => void>;
    let mockOnFoundationMove: Mock<(card: Card, foundationIndex: number, source: MoveSource) => void>;

    beforeEach(() => {
      vi.useFakeTimers();
      mockOnMove = vi.fn();
      mockOnFoundationMove = vi.fn();
    });

    afterEach(() => {
      vi.runOnlyPendingTimers();
      vi.useRealTimers();
    });

    describe('initial state', () => {
      it('should have correct initial state', () => {
        const gameState = createGameState({
          players: [createPlayerState('player1')],
        });

        const { result } = renderHook(() =>
          useDragAndDrop({
            gameState,
            playerId: 'player1',
          })
        );

        expect(result.current.isDragging).toBe(false);
        expect(result.current.dragSource).toBeNull();
        expect(result.current.activeDropTarget).toBeNull();
        expect(result.current.validDropTargets).toEqual([]);
        expect(result.current.lastDropResult).toBeNull();
      });
    });

    describe('handleDragStart', () => {
      it('should set dragging state when drag starts', () => {
        const card = createCard('hearts', 5);
        const gameState = createGameState({
          players: [
            createPlayerState('player1', {
              nertzPile: [card],
            }),
          ],
        });

        const { result } = renderHook(() =>
          useDragAndDrop({
            gameState,
            playerId: 'player1',
          })
        );

        act(() => {
          result.current.handleDragStart(
            createMockDragStartEvent('drag-nertz-hearts-5', { card, cardCount: 1 })
          );
        });

        expect(result.current.isDragging).toBe(true);
        expect(result.current.dragSource).toEqual({
          type: 'nertz',
          card,
          pileIndex: undefined,
          cardIndex: undefined,
          cardCount: 1,
        });
      });

      it('should not set state for invalid drag id', () => {
        const gameState = createGameState({
          players: [createPlayerState('player1')],
        });

        const { result } = renderHook(() =>
          useDragAndDrop({
            gameState,
            playerId: 'player1',
          })
        );

        act(() => {
          result.current.handleDragStart(
            createMockDragStartEvent('invalid-id', { card: createCard('hearts', 1) })
          );
        });

        expect(result.current.isDragging).toBe(false);
        expect(result.current.dragSource).toBeNull();
      });

      it('should not set state when card data is missing', () => {
        const gameState = createGameState({
          players: [createPlayerState('player1')],
        });

        const { result } = renderHook(() =>
          useDragAndDrop({
            gameState,
            playerId: 'player1',
          })
        );

        const event = {
          active: {
            id: 'drag-nertz-hearts-5',
            data: { current: {} },
            rect: { current: { initial: null, translated: null } },
          },
          activatorEvent: new Event('pointer'),
        } as unknown as DragStartEvent;

        act(() => {
          result.current.handleDragStart(event);
        });

        expect(result.current.isDragging).toBe(false);
      });
    });

    describe('handleDragOver', () => {
      it('should set active drop target when over valid area', () => {
        const gameState = createGameState({
          players: [createPlayerState('player1')],
        });

        const { result } = renderHook(() =>
          useDragAndDrop({
            gameState,
            playerId: 'player1',
          })
        );

        act(() => {
          result.current.handleDragOver(createMockDragOverEvent('drop-work-2'));
        });

        expect(result.current.activeDropTarget).toEqual({ type: 'work', index: 2 });
      });

      it('should clear active drop target when not over any area', () => {
        const gameState = createGameState({
          players: [createPlayerState('player1')],
        });

        const { result } = renderHook(() =>
          useDragAndDrop({
            gameState,
            playerId: 'player1',
          })
        );

        act(() => {
          result.current.handleDragOver(createMockDragOverEvent('drop-work-2'));
        });

        act(() => {
          result.current.handleDragOver(createMockDragOverEvent(null));
        });

        expect(result.current.activeDropTarget).toBeNull();
      });
    });

    describe('handleDragEnd', () => {
      it('should call onMove for valid work pile drop', () => {
        const card = createCard('hearts', 6);
        const targetCard = createCard('spades', 7);
        const gameState = createGameState({
          players: [
            createPlayerState('player1', {
              nertzPile: [card],
              workPiles: [[targetCard], [], [], []],
            }),
          ],
        });

        const { result } = renderHook(() =>
          useDragAndDrop({
            gameState,
            playerId: 'player1',
            onMove: mockOnMove,
          })
        );

        // Start drag
        act(() => {
          result.current.handleDragStart(
            createMockDragStartEvent('drag-nertz-hearts-6', { card, cardCount: 1 })
          );
        });

        // End drag on valid target
        act(() => {
          result.current.handleDragEnd(createMockDragEndEvent('drop-work-0'));
        });

        expect(mockOnMove).toHaveBeenCalledWith(
          { type: 'nertz' },
          { type: 'work', pileIndex: 0 },
          1
        );
        expect(result.current.lastDropResult).toBe('success');
        expect(result.current.isDragging).toBe(false);
      });

      it('should call onFoundationMove for valid foundation drop', () => {
        const card = createCard('hearts', 1); // Ace
        const gameState = createGameState({
          players: [
            createPlayerState('player1', {
              nertzPile: [card],
            }),
          ],
        });

        const { result } = renderHook(() =>
          useDragAndDrop({
            gameState,
            playerId: 'player1',
            onFoundationMove: mockOnFoundationMove,
          })
        );

        // Start drag
        act(() => {
          result.current.handleDragStart(
            createMockDragStartEvent('drag-nertz-hearts-1', { card, cardCount: 1 })
          );
        });

        // End drag on foundation
        act(() => {
          result.current.handleDragEnd(createMockDragEndEvent('drop-foundation-0'));
        });

        expect(mockOnFoundationMove).toHaveBeenCalledWith(
          card,
          0,
          { type: 'nertz' }
        );
        expect(result.current.lastDropResult).toBe('success');
      });

      it('should set invalid result when dropped on invalid target', () => {
        const card = createCard('hearts', 6);
        const gameState = createGameState({
          players: [
            createPlayerState('player1', {
              nertzPile: [card],
            }),
          ],
        });

        const { result } = renderHook(() =>
          useDragAndDrop({
            gameState,
            playerId: 'player1',
            onMove: mockOnMove,
          })
        );

        // Start drag
        act(() => {
          result.current.handleDragStart(
            createMockDragStartEvent('drag-nertz-hearts-6', { card, cardCount: 1 })
          );
        });

        // End drag on foundation (invalid - not an Ace)
        act(() => {
          result.current.handleDragEnd(createMockDragEndEvent('drop-foundation-0'));
        });

        expect(mockOnMove).not.toHaveBeenCalled();
        expect(result.current.lastDropResult).toBe('invalid');
      });

      it('should set invalid result when dropped outside any target', () => {
        const card = createCard('hearts', 6);
        const gameState = createGameState({
          players: [
            createPlayerState('player1', {
              nertzPile: [card],
            }),
          ],
        });

        const { result } = renderHook(() =>
          useDragAndDrop({
            gameState,
            playerId: 'player1',
            onMove: mockOnMove,
          })
        );

        // Start drag
        act(() => {
          result.current.handleDragStart(
            createMockDragStartEvent('drag-nertz-hearts-6', { card, cardCount: 1 })
          );
        });

        // End drag outside
        act(() => {
          result.current.handleDragEnd(createMockDragEndEvent(null));
        });

        expect(mockOnMove).not.toHaveBeenCalled();
        expect(result.current.lastDropResult).toBe('invalid');
      });

      it('should clear drop result after timeout', () => {
        const card = createCard('hearts', 6);
        const gameState = createGameState({
          players: [
            createPlayerState('player1', {
              nertzPile: [card],
            }),
          ],
        });

        const { result } = renderHook(() =>
          useDragAndDrop({
            gameState,
            playerId: 'player1',
          })
        );

        // Start and end drag
        act(() => {
          result.current.handleDragStart(
            createMockDragStartEvent('drag-nertz-hearts-6', { card, cardCount: 1 })
          );
        });

        act(() => {
          result.current.handleDragEnd(createMockDragEndEvent(null));
        });

        expect(result.current.lastDropResult).toBe('invalid');

        // Advance timer
        act(() => {
          vi.advanceTimersByTime(350);
        });

        expect(result.current.lastDropResult).toBeNull();
      });
    });

    describe('handleDragCancel', () => {
      it('should reset state and set cancelled result', () => {
        const card = createCard('hearts', 5);
        const gameState = createGameState({
          players: [
            createPlayerState('player1', {
              nertzPile: [card],
            }),
          ],
        });

        const { result } = renderHook(() =>
          useDragAndDrop({
            gameState,
            playerId: 'player1',
          })
        );

        // Start drag
        act(() => {
          result.current.handleDragStart(
            createMockDragStartEvent('drag-nertz-hearts-5', { card, cardCount: 1 })
          );
        });

        expect(result.current.isDragging).toBe(true);

        // Cancel drag
        act(() => {
          result.current.handleDragCancel();
        });

        expect(result.current.isDragging).toBe(false);
        expect(result.current.dragSource).toBeNull();
        expect(result.current.activeDropTarget).toBeNull();
        expect(result.current.lastDropResult).toBe('cancelled');
      });

      it('should clear cancelled result after timeout', () => {
        const card = createCard('hearts', 5);
        const gameState = createGameState({
          players: [
            createPlayerState('player1', {
              nertzPile: [card],
            }),
          ],
        });

        const { result } = renderHook(() =>
          useDragAndDrop({
            gameState,
            playerId: 'player1',
          })
        );

        act(() => {
          result.current.handleDragStart(
            createMockDragStartEvent('drag-nertz-hearts-5', { card, cardCount: 1 })
          );
        });

        act(() => {
          result.current.handleDragCancel();
        });

        expect(result.current.lastDropResult).toBe('cancelled');

        act(() => {
          vi.advanceTimersByTime(350);
        });

        expect(result.current.lastDropResult).toBeNull();
      });
    });

    describe('clearDropResult', () => {
      it('should manually clear drop result', () => {
        const card = createCard('hearts', 5);
        const gameState = createGameState({
          players: [
            createPlayerState('player1', {
              nertzPile: [card],
            }),
          ],
        });

        const { result } = renderHook(() =>
          useDragAndDrop({
            gameState,
            playerId: 'player1',
          })
        );

        act(() => {
          result.current.handleDragStart(
            createMockDragStartEvent('drag-nertz-hearts-5', { card, cardCount: 1 })
          );
        });

        act(() => {
          result.current.handleDragCancel();
        });

        expect(result.current.lastDropResult).toBe('cancelled');

        act(() => {
          result.current.clearDropResult();
        });

        expect(result.current.lastDropResult).toBeNull();
      });
    });

    describe('validDropTargets', () => {
      it('should calculate valid work pile targets', () => {
        const dragCard = createCard('hearts', 6); // Red 6
        const targetCard = createCard('spades', 7); // Black 7
        const gameState = createGameState({
          players: [
            createPlayerState('player1', {
              nertzPile: [dragCard],
              workPiles: [[targetCard], [], [], []],
            }),
          ],
        });

        const { result } = renderHook(() =>
          useDragAndDrop({
            gameState,
            playerId: 'player1',
          })
        );

        act(() => {
          result.current.handleDragStart(
            createMockDragStartEvent('drag-nertz-hearts-6', { card: dragCard, cardCount: 1 })
          );
        });

        // Red 6 can go on black 7 (pile 0) and empty piles (1, 2, 3)
        expect(result.current.validDropTargets).toContainEqual({ type: 'work', index: 0 });
        expect(result.current.validDropTargets).toContainEqual({ type: 'work', index: 1 });
        expect(result.current.validDropTargets).toContainEqual({ type: 'work', index: 2 });
        expect(result.current.validDropTargets).toContainEqual({ type: 'work', index: 3 });
      });

      it('should calculate valid foundation targets for Ace', () => {
        const ace = createCard('hearts', 1);
        const gameState = createGameState({
          players: [
            createPlayerState('player1', {
              nertzPile: [ace],
            }),
          ],
        });

        const { result } = renderHook(() =>
          useDragAndDrop({
            gameState,
            playerId: 'player1',
          })
        );

        act(() => {
          result.current.handleDragStart(
            createMockDragStartEvent('drag-nertz-hearts-1', { card: ace, cardCount: 1 })
          );
        });

        // Ace of hearts can go on hearts foundation (index 0)
        expect(result.current.validDropTargets).toContainEqual({ type: 'foundation', index: 0 });
      });

      it('should not include foundation for multi-card moves', () => {
        const ace = createCard('hearts', 1);
        const two = createCard('clubs', 2);
        const gameState = createGameState({
          players: [
            createPlayerState('player1', {
              workPiles: [[ace, two], [], [], []],
            }),
          ],
        });

        const { result } = renderHook(() =>
          useDragAndDrop({
            gameState,
            playerId: 'player1',
          })
        );

        act(() => {
          result.current.handleDragStart(
            createMockDragStartEvent('drag-work-hearts-1-0-0', {
              card: ace,
              cardCount: 2,
              pileIndex: 0,
              cardIndex: 0,
            })
          );
        });

        // Multi-card move should not target foundation
        const foundationTargets = result.current.validDropTargets.filter(
          (t) => t.type === 'foundation'
        );
        expect(foundationTargets).toHaveLength(0);
      });

      it('should exclude source pile from valid targets', () => {
        const card = createCard('hearts', 5);
        const gameState = createGameState({
          players: [
            createPlayerState('player1', {
              workPiles: [[card], [], [], []],
            }),
          ],
        });

        const { result } = renderHook(() =>
          useDragAndDrop({
            gameState,
            playerId: 'player1',
          })
        );

        act(() => {
          result.current.handleDragStart(
            createMockDragStartEvent('drag-work-hearts-5-0-0', {
              card,
              cardCount: 1,
              pileIndex: 0,
              cardIndex: 0,
            })
          );
        });

        // Should not include pile 0 as it's the source
        expect(result.current.validDropTargets).not.toContainEqual({ type: 'work', index: 0 });
      });
    });

    describe('isValidDropTarget', () => {
      it('should return true for valid target', () => {
        const dragCard = createCard('hearts', 6);
        const targetCard = createCard('spades', 7);
        const gameState = createGameState({
          players: [
            createPlayerState('player1', {
              nertzPile: [dragCard],
              workPiles: [[targetCard], [], [], []],
            }),
          ],
        });

        const { result } = renderHook(() =>
          useDragAndDrop({
            gameState,
            playerId: 'player1',
          })
        );

        act(() => {
          result.current.handleDragStart(
            createMockDragStartEvent('drag-nertz-hearts-6', { card: dragCard, cardCount: 1 })
          );
        });

        expect(result.current.isValidDropTarget({ type: 'work', index: 0 })).toBe(true);
      });

      it('should return false for invalid target', () => {
        const dragCard = createCard('hearts', 6);
        const targetCard = createCard('diamonds', 7); // Same color
        const gameState = createGameState({
          players: [
            createPlayerState('player1', {
              nertzPile: [dragCard],
              workPiles: [[targetCard], [], [], []],
            }),
          ],
        });

        const { result } = renderHook(() =>
          useDragAndDrop({
            gameState,
            playerId: 'player1',
          })
        );

        act(() => {
          result.current.handleDragStart(
            createMockDragStartEvent('drag-nertz-hearts-6', { card: dragCard, cardCount: 1 })
          );
        });

        expect(result.current.isValidDropTarget({ type: 'work', index: 0 })).toBe(false);
      });
    });

    describe('rapid drag sequences', () => {
      it('should handle rapid start-cancel sequences', () => {
        const card = createCard('hearts', 5);
        const gameState = createGameState({
          players: [
            createPlayerState('player1', {
              nertzPile: [card],
            }),
          ],
        });

        const { result } = renderHook(() =>
          useDragAndDrop({
            gameState,
            playerId: 'player1',
          })
        );

        // Rapid sequence of start-cancel
        for (let i = 0; i < 5; i++) {
          act(() => {
            result.current.handleDragStart(
              createMockDragStartEvent('drag-nertz-hearts-5', { card, cardCount: 1 })
            );
          });
          expect(result.current.isDragging).toBe(true);

          act(() => {
            result.current.handleDragCancel();
          });
          expect(result.current.isDragging).toBe(false);

          // Clear timeout
          act(() => {
            vi.advanceTimersByTime(350);
          });
        }
      });

      it('should handle rapid start-end sequences', () => {
        const card = createCard('hearts', 6);
        const targetCard = createCard('spades', 7);
        const gameState = createGameState({
          players: [
            createPlayerState('player1', {
              nertzPile: [card],
              workPiles: [[targetCard], [], [], []],
            }),
          ],
        });

        const { result } = renderHook(() =>
          useDragAndDrop({
            gameState,
            playerId: 'player1',
            onMove: mockOnMove,
          })
        );

        // Rapid sequence of start-end
        for (let i = 0; i < 3; i++) {
          act(() => {
            result.current.handleDragStart(
              createMockDragStartEvent('drag-nertz-hearts-6', { card, cardCount: 1 })
            );
          });

          act(() => {
            result.current.handleDragEnd(createMockDragEndEvent('drop-work-0'));
          });

          act(() => {
            vi.advanceTimersByTime(350);
          });
        }

        expect(mockOnMove).toHaveBeenCalledTimes(3);
      });
    });

    describe('work pile drag with card indices', () => {
      it('should handle drag from work pile with indices', () => {
        const bottomCard = createCard('hearts', 7);
        const topCard = createCard('spades', 6);
        const gameState = createGameState({
          players: [
            createPlayerState('player1', {
              workPiles: [[bottomCard, topCard], [], [], []],
            }),
          ],
        });

        const { result } = renderHook(() =>
          useDragAndDrop({
            gameState,
            playerId: 'player1',
            onMove: mockOnMove,
          })
        );

        // Drag both cards from work pile 0
        act(() => {
          result.current.handleDragStart(
            createMockDragStartEvent('drag-work-hearts-7-0-0', {
              card: bottomCard,
              cardCount: 2,
              pileIndex: 0,
              cardIndex: 0,
            })
          );
        });

        expect(result.current.dragSource).toEqual({
          type: 'work',
          card: bottomCard,
          pileIndex: 0,
          cardIndex: 0,
          cardCount: 2,
        });

        // Drop on pile 1
        act(() => {
          result.current.handleDragEnd(createMockDragEndEvent('drop-work-1'));
        });

        expect(mockOnMove).toHaveBeenCalledWith(
          { type: 'work', pileIndex: 0, cardIndex: 0 },
          { type: 'work', pileIndex: 1 },
          2
        );
      });
    });

    describe('waste pile drag', () => {
      it('should handle drag from waste pile', () => {
        const card = createCard('diamonds', 9);
        const targetCard = createCard('clubs', 10);
        const gameState = createGameState({
          players: [
            createPlayerState('player1', {
              wastePile: [card],
              workPiles: [[targetCard], [], [], []],
            }),
          ],
        });

        const { result } = renderHook(() =>
          useDragAndDrop({
            gameState,
            playerId: 'player1',
            onMove: mockOnMove,
          })
        );

        act(() => {
          result.current.handleDragStart(
            createMockDragStartEvent('drag-waste-diamonds-9', { card, cardCount: 1 })
          );
        });

        expect(result.current.dragSource?.type).toBe('waste');

        act(() => {
          result.current.handleDragEnd(createMockDragEndEvent('drop-work-0'));
        });

        expect(mockOnMove).toHaveBeenCalledWith(
          { type: 'waste' },
          { type: 'work', pileIndex: 0 },
          1
        );
      });
    });
  });
});
