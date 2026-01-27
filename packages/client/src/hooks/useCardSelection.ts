// useCardSelection - Hook for managing card selection during gameplay
// Handles selecting cards from piles and placing them on valid destinations

import { useState, useCallback, useMemo } from 'react';
import type {
  Card,
  GameState,
  PlayerGameState,
  MoveSource,
  MoveDestination,
  MoveValidationResult,
} from '@heyhey/shared';
import {
  findValidFoundations,
  findValidWorkPiles,
  validateMove,
} from '@heyhey/shared';
import { hapticsManager } from '../utils/haptics';

/**
 * Represents the source of a selected card
 */
export interface CardSource {
  /** Type of source pile */
  type: 'nertz' | 'work' | 'waste';
  /** For work piles, the index of the pile */
  pileIndex?: number;
  /** For work piles, the index of the card in the pile (for multi-card moves) */
  cardIndex?: number;
}

/**
 * Represents a valid destination for the selected card
 */
export interface ValidDestination {
  /** Type of destination */
  type: 'work' | 'foundation';
  /** Index of the pile */
  index: number;
}

/**
 * Current selection state
 */
export interface SelectionState {
  /** The selected card (or bottom card of stack for multi-card moves) */
  card: Card;
  /** Source of the selected card */
  source: CardSource;
  /** Number of cards selected (for work pile stacks) */
  cardCount: number;
}

/**
 * Options for the useCardSelection hook
 */
export interface UseCardSelectionOptions {
  /** Current game state */
  gameState: GameState;
  /** Current player's ID */
  playerId: string;
  /** Callback when a move is executed */
  onMove?: (source: MoveSource, destination: MoveDestination, cardCount: number) => void;
  /** Callback when selection changes */
  onSelectionChange?: (selection: SelectionState | null) => void;
}

/**
 * Return type for the useCardSelection hook
 */
export interface UseCardSelectionReturn {
  /** Current selection state (null if nothing selected) */
  selection: SelectionState | null;
  /** Valid destinations for the currently selected card */
  validDestinations: ValidDestination[];
  /** Whether a card is currently selected */
  hasSelection: boolean;
  /** Select a card from a source pile */
  selectCard: (card: Card, source: CardSource, cardCount?: number) => void;
  /** Place the selected card on a destination */
  placeCard: (destination: ValidDestination) => MoveValidationResult;
  /** Clear the current selection */
  clearSelection: () => void;
  /** Check if a destination is valid for the current selection */
  isValidDestination: (destination: ValidDestination) => boolean;
}

/**
 * Hook for managing card selection and placement during gameplay.
 *
 * Usage:
 * 1. Call selectCard() when user clicks a card in nertz, work, or waste pile
 * 2. Valid destinations are automatically calculated
 * 3. Call placeCard() when user clicks a valid destination
 * 4. Call clearSelection() to deselect
 *
 * The hook automatically validates moves using the rules engine.
 */
export function useCardSelection(options: UseCardSelectionOptions): UseCardSelectionReturn {
  const { gameState, playerId, onMove, onSelectionChange } = options;

  // Selection state
  const [selection, setSelection] = useState<SelectionState | null>(null);

  // Get current player's game state
  const playerState = useMemo((): PlayerGameState | undefined => {
    return gameState.players.find((p) => p.playerId === playerId);
  }, [gameState.players, playerId]);

  // Calculate valid destinations for the selected card
  const validDestinations = useMemo((): ValidDestination[] => {
    if (!selection || !playerState) {
      return [];
    }

    const destinations: ValidDestination[] = [];

    // Find valid work piles
    const validWorkPiles = findValidWorkPiles(playerState, selection.card);
    for (const pileIndex of validWorkPiles) {
      // Don't include source pile as valid destination
      if (selection.source.type === 'work' && selection.source.pileIndex === pileIndex) {
        continue;
      }
      destinations.push({ type: 'work', index: pileIndex });
    }

    // Find valid foundations (only for single card moves)
    if (selection.cardCount === 1) {
      const validFoundations = findValidFoundations(gameState, selection.card);
      for (const foundationIndex of validFoundations) {
        destinations.push({ type: 'foundation', index: foundationIndex });
      }
    }

    return destinations;
  }, [selection, playerState, gameState]);

  /**
   * Select a card from a source pile
   */
  const selectCard = useCallback(
    (card: Card, source: CardSource, cardCount: number = 1) => {
      const newSelection: SelectionState = {
        card,
        source,
        cardCount,
      };
      setSelection(newSelection);
      onSelectionChange?.(newSelection);
      hapticsManager.play('cardSelect');
    },
    [onSelectionChange]
  );

  /**
   * Place the selected card on a destination
   */
  const placeCard = useCallback(
    (destination: ValidDestination): MoveValidationResult => {
      if (!selection) {
        return { valid: false, error: 'no_card_selected' };
      }

      // Convert to move types
      const moveSource: MoveSource =
        selection.source.type === 'nertz'
          ? { type: 'nertz' }
          : selection.source.type === 'waste'
            ? { type: 'waste' }
            : {
                type: 'work',
                pileIndex: selection.source.pileIndex!,
                cardIndex: selection.source.cardIndex,
              };

      const moveDestination: MoveDestination =
        destination.type === 'work'
          ? { type: 'work', pileIndex: destination.index }
          : { type: 'foundation', foundationIndex: destination.index };

      // Validate the move
      const validationResult = validateMove(gameState, {
        type: 'card',
        playerId,
        source: moveSource,
        destination: moveDestination,
        cardCount: selection.cardCount,
      });

      if (validationResult.valid) {
        // Execute the move
        onMove?.(moveSource, moveDestination, selection.cardCount);
        // Clear selection after successful move
        setSelection(null);
        onSelectionChange?.(null);
        hapticsManager.play('cardPlace');
      } else {
        hapticsManager.play('invalidMove');
      }

      return validationResult;
    },
    [selection, gameState, playerId, onMove, onSelectionChange]
  );

  /**
   * Clear the current selection
   */
  const clearSelection = useCallback(() => {
    setSelection(null);
    onSelectionChange?.(null);
  }, [onSelectionChange]);

  /**
   * Check if a destination is valid for the current selection
   */
  const isValidDestination = useCallback(
    (destination: ValidDestination): boolean => {
      return validDestinations.some(
        (d) => d.type === destination.type && d.index === destination.index
      );
    },
    [validDestinations]
  );

  return {
    selection,
    validDestinations,
    hasSelection: selection !== null,
    selectCard,
    placeCard,
    clearSelection,
    isValidDestination,
  };
}

export default useCardSelection;
