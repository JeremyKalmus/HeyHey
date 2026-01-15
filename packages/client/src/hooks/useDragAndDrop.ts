// useDragAndDrop - Hook for drag-and-drop card interactions
// Integrates with @dnd-kit and existing useLocalPlayerState hook

import { useState, useCallback, useMemo } from 'react';
import type { DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import type { Card, MoveSource, MoveDestination, GameState, GameConfig } from '@heyhey/shared';
import { findValidWorkPiles } from '@heyhey/shared';

/* =============================================================================
   TYPES
   ============================================================================= */

export type DragSourceType = 'nertz' | 'work' | 'waste';
export type DropTargetType = 'work' | 'foundation';

export interface DragSource {
  type: DragSourceType;
  card: Card;
  pileIndex?: number;
  cardIndex?: number;
  cardCount: number;
}

export interface DropTarget {
  type: DropTargetType;
  index: number;
}

export interface UseDragAndDropOptions {
  /** Full game state for validation */
  gameState: GameState | null;
  /** Game configuration (reserved for future use) */
  config?: GameConfig;
  /** Player ID */
  playerId: string;
  /** Callback when a card move is completed */
  onMove?: (source: MoveSource, destination: MoveDestination, cardCount?: number) => void;
  /** Callback when a foundation move is completed */
  onFoundationMove?: (card: Card, foundationIndex: number, source: MoveSource) => void;
}

export type DropResult = 'success' | 'invalid' | 'cancelled' | null;

export interface UseDragAndDropReturn {
  /** Whether a drag is currently in progress */
  isDragging: boolean;
  /** Current drag source info */
  dragSource: DragSource | null;
  /** Currently hovered drop target */
  activeDropTarget: DropTarget | null;
  /** Valid drop targets for current drag */
  validDropTargets: DropTarget[];
  /** Result of last drop operation */
  lastDropResult: DropResult;
  /** Handler for drag start */
  handleDragStart: (event: DragStartEvent) => void;
  /** Handler for drag over */
  handleDragOver: (event: DragOverEvent) => void;
  /** Handler for drag end */
  handleDragEnd: (event: DragEndEvent) => void;
  /** Handler for drag cancel */
  handleDragCancel: () => void;
  /** Check if a drop target is valid for current drag */
  isValidDropTarget: (target: DropTarget) => boolean;
  /** Clear the drop result (call after animation completes) */
  clearDropResult: () => void;
}

/* =============================================================================
   DRAG ID PARSING
   ============================================================================= */

/**
 * Create a drag ID for a draggable card
 * Format: "drag-{type}-{pileIndex?}-{cardIndex?}"
 */
export function createDragId(
  type: DragSourceType,
  card: Card,
  pileIndex?: number,
  cardIndex?: number
): string {
  const parts = ['drag', type, card.suit, card.rank.toString()];
  if (pileIndex !== undefined) parts.push(pileIndex.toString());
  if (cardIndex !== undefined) parts.push(cardIndex.toString());
  return parts.join('-');
}

/**
 * Parse a drag ID back to source info
 */
export function parseDragId(id: string | number): Partial<DragSource> | null {
  const str = String(id);
  if (!str.startsWith('drag-')) return null;

  const parts = str.split('-');
  const type = parts[1] as DragSourceType;

  if (type === 'nertz') {
    return { type };
  }

  if (type === 'waste') {
    return { type };
  }

  if (type === 'work') {
    return {
      type,
      pileIndex: parts[4] !== undefined ? parseInt(parts[4], 10) : undefined,
      cardIndex: parts[5] !== undefined ? parseInt(parts[5], 10) : undefined,
    };
  }

  return null;
}

/**
 * Create a drop ID for a droppable target
 * Format: "drop-{type}-{index}"
 */
export function createDropId(type: DropTargetType, index: number): string {
  return `drop-${type}-${index}`;
}

/**
 * Parse a drop ID back to target info
 */
export function parseDropId(id: string | number): DropTarget | null {
  const str = String(id);
  if (!str.startsWith('drop-')) return null;

  const parts = str.split('-');
  const type = parts[1] as DropTargetType;
  const index = parseInt(parts[2] ?? '0', 10);

  if (type === 'work' || type === 'foundation') {
    return { type, index };
  }

  return null;
}

/* =============================================================================
   HOOK
   ============================================================================= */

export function useDragAndDrop(options: UseDragAndDropOptions): UseDragAndDropReturn {
  const { gameState, playerId, onMove, onFoundationMove } = options;

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragSource, setDragSource] = useState<DragSource | null>(null);
  const [activeDropTarget, setActiveDropTarget] = useState<DropTarget | null>(null);
  const [lastDropResult, setLastDropResult] = useState<DropResult>(null);

  // Clear drop result (for use after animation completes)
  const clearDropResult = useCallback(() => {
    setLastDropResult(null);
  }, []);

  // Calculate valid drop targets for current drag source
  const validDropTargets = useMemo((): DropTarget[] => {
    if (!dragSource || !gameState) return [];

    const targets: DropTarget[] = [];
    const playerState = gameState.players.find((p: { playerId: string }) => p.playerId === playerId);
    if (!playerState) return [];

    // Get the card being dragged
    const card = dragSource.card;

    // Find valid work pile destinations using the same logic as click selection
    const validWorkPiles = findValidWorkPiles(playerState, card);
    for (const pileIndex of validWorkPiles) {
      // Skip if dragging from this work pile
      if (dragSource.type === 'work' && dragSource.pileIndex === pileIndex) continue;
      targets.push({ type: 'work', index: pileIndex });
    }

    // Check ALL foundation piles (only for single card moves)
    // In multiplayer, there are 4 foundations per player
    if (dragSource.cardCount === 1) {
      for (let i = 0; i < gameState.foundations.length; i++) {
        const foundation = gameState.foundations[i];
        if (!foundation) continue;

        // Foundation accepts: same suit, next rank
        const topCard = foundation.cards[foundation.cards.length - 1];
        const expectedRank = topCard ? topCard.rank + 1 : 1;

        if (card.suit === foundation.suit && card.rank === expectedRank) {
          targets.push({ type: 'foundation', index: i });
        }
      }
    }

    return targets;
  }, [dragSource, gameState, playerId]);

  // Check if a specific target is valid
  const isValidDropTarget = useCallback(
    (target: DropTarget): boolean => {
      return validDropTargets.some(
        (t) => t.type === target.type && t.index === target.index
      );
    },
    [validDropTargets]
  );

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const parsed = parseDragId(event.active.id);
    if (!parsed) return;

    const data = event.active.data.current as {
      card: Card;
      cardCount?: number;
      pileIndex?: number;
      cardIndex?: number;
    } | undefined;

    if (!data?.card) return;

    setIsDragging(true);
    setDragSource({
      type: parsed.type!,
      card: data.card,
      pileIndex: parsed.pileIndex ?? data.pileIndex,
      cardIndex: parsed.cardIndex ?? data.cardIndex,
      cardCount: data.cardCount ?? 1,
    });
  }, []);

  // Handle drag over
  const handleDragOver = useCallback((event: DragOverEvent) => {
    if (!event.over) {
      setActiveDropTarget(null);
      return;
    }

    const target = parseDropId(event.over.id);
    setActiveDropTarget(target);
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { over } = event;
      let dropResult: DropResult = 'invalid';

      if (over && dragSource) {
        const target = parseDropId(over.id);

        if (target && isValidDropTarget(target)) {
          // Build source for move
          const source: MoveSource =
            dragSource.type === 'nertz'
              ? { type: 'nertz' }
              : dragSource.type === 'waste'
                ? { type: 'waste' }
                : {
                    type: 'work',
                    pileIndex: dragSource.pileIndex!,
                    cardIndex: dragSource.cardIndex,
                  };

          // Execute move
          if (target.type === 'foundation') {
            onFoundationMove?.(dragSource.card, target.index, source);
          } else {
            const destination: MoveDestination = {
              type: 'work',
              pileIndex: target.index,
            };
            onMove?.(source, destination, dragSource.cardCount);
          }
          dropResult = 'success';
        }
      }

      // Set drop result for animation feedback
      setLastDropResult(dropResult);

      // Reset state
      setIsDragging(false);
      setDragSource(null);
      setActiveDropTarget(null);

      // Clear drop result after animation duration
      setTimeout(() => {
        setLastDropResult(null);
      }, 350);
    },
    [dragSource, isValidDropTarget, onMove, onFoundationMove]
  );

  // Handle drag cancel
  const handleDragCancel = useCallback(() => {
    setLastDropResult('cancelled');
    setIsDragging(false);
    setDragSource(null);
    setActiveDropTarget(null);

    // Clear drop result after animation duration
    setTimeout(() => {
      setLastDropResult(null);
    }, 350);
  }, []);

  return {
    isDragging,
    dragSource,
    activeDropTarget,
    validDropTargets,
    lastDropResult,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
    isValidDropTarget,
    clearDropResult,
  };
}

export default useDragAndDrop;
