// useLocalPlayerState - Hook for managing local player state with optimistic updates
// Handles stock/waste cycling, card movement, and pending move rollback

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type {
  Card,
  PlayerGameState,
  GameState,
  Move,
  MoveSource,
  MoveValidationResult,
  GameConfig,
} from '@heyhey/shared';
import { useCardSelection, type CardSource, type ValidDestination } from './useCardSelection';

/**
 * A pending optimistic move that may need rollback
 */
interface PendingMove {
  id: number;
  move: Move;
  previousState: PlayerGameState;
  timestamp: number;
}

/**
 * Options for the useLocalPlayerState hook
 */
export interface UseLocalPlayerStateOptions {
  /** Server-authoritative player state */
  serverState: PlayerGameState | null;
  /** Full game state (for validation and foundation access) */
  gameState: GameState | null;
  /** Game configuration */
  config: GameConfig;
  /** Player ID */
  playerId: string;
  /** Callback when a move should be sent to the server */
  onMove?: (move: Move) => void;
  /** Callback when a foundation move should be sent */
  onFoundationMove?: (card: Card, foundationIndex: number, source: MoveSource) => void;
  /** Timeout for pending moves before auto-rollback (ms) */
  pendingMoveTimeout?: number;
}

/**
 * Return type for the useLocalPlayerState hook
 */
export interface UseLocalPlayerStateReturn {
  /** Current local player state (with optimistic updates applied) */
  localState: PlayerGameState | null;
  /** Whether there are pending optimistic updates */
  hasPendingMoves: boolean;
  /** Number of pending moves */
  pendingMoveCount: number;

  // Card selection (delegated from useCardSelection)
  /** Currently selected card info */
  selectedCard: {
    card: Card;
    source: CardSource;
    cardCount: number;
  } | null;
  /** Valid work pile destinations for current selection */
  validWorkPileDestinations: number[];
  /** Valid foundation destinations for current selection */
  validFoundationDestinations: number[];
  /** Whether a card is currently selected */
  hasSelection: boolean;

  // Actions
  /** Draw cards from stock to waste */
  drawCards: () => void;
  /** Recycle waste pile back to stock */
  recycleWaste: () => void;
  /** Select a card from a source */
  selectCard: (card: Card, source: CardSource, cardCount?: number) => void;
  /** Move selected card to destination (returns validation result) */
  moveToDestination: (destination: ValidDestination) => MoveValidationResult;
  /** Clear current selection */
  clearSelection: () => void;
  /** Check if a destination is valid for current selection */
  isValidDestination: (destination: ValidDestination) => boolean;
  /** Rollback a move (called when server rejects it) */
  rollbackMove: (moveId: number) => void;
  /** Sync local state with server state (clears pending moves) */
  syncWithServer: () => void;

  // Pile-specific click handlers
  /** Handler for clicking on Nertz pile top card */
  handleNertzClick: (card: Card) => void;
  /** Handler for double-clicking Nertz pile (auto-move to foundation) */
  handleNertzDoubleClick: (card: Card) => void;
  /** Handler for clicking on a work pile card */
  handleWorkPileClick: (card: Card, pileIndex: number, cardIndex: number) => void;
  /** Handler for double-clicking work pile card (auto-move to foundation) */
  handleWorkPileDoubleClick: (card: Card, pileIndex: number, cardIndex: number) => void;
  /** Handler for clicking an empty work pile or placing a card */
  handleWorkPileTarget: (pileIndex: number) => void;
  /** Handler for clicking on waste pile top card */
  handleWasteClick: (card: Card) => void;
  /** Handler for double-clicking waste pile (auto-move to foundation) */
  handleWasteDoubleClick: (card: Card) => void;
  /** Handler for clicking stock pile (draw or recycle) */
  handleStockClick: () => void;
  /** Handler for clicking a foundation pile */
  handleFoundationClick: (foundationIndex: number) => void;
}

// Move ID counter
let moveIdCounter = 0;
function getNextMoveId(): number {
  return ++moveIdCounter;
}

/**
 * Deep clone a PlayerGameState for state snapshots
 */
function clonePlayerState(state: PlayerGameState): PlayerGameState {
  return {
    playerId: state.playerId,
    deckId: state.deckId,
    nertzPile: [...state.nertzPile],
    workPiles: state.workPiles.map((pile: Card[]) => [...pile]) as [Card[], Card[], Card[], Card[]],
    stockPile: [...state.stockPile],
    wastePile: [...state.wastePile],
  };
}

/**
 * Apply a move optimistically to local player state
 */
function applyMoveOptimistically(
  state: PlayerGameState,
  move: Move,
  config: GameConfig
): PlayerGameState {
  const newState = clonePlayerState(state);

  switch (move.type) {
    case 'card': {
      const cardCount = move.cardCount ?? 1;

      // Remove cards from source
      switch (move.source.type) {
        case 'nertz':
          newState.nertzPile.pop();
          break;
        case 'work': {
          const pile = newState.workPiles[move.source.pileIndex];
          if (pile) {
            pile.splice(pile.length - cardCount, cardCount);
          }
          break;
        }
        case 'waste':
          newState.wastePile.pop();
          break;
      }

      // For work pile destinations, add cards (foundation moves are handled by server)
      if (move.destination.type === 'work') {
        const destPile = newState.workPiles[move.destination.pileIndex];
        if (destPile) {
          // Get the cards that were moved (we need to reconstruct them)
          // For optimistic updates, we trust the UI had the right cards
          // This is a simplification - real implementation would track moved cards
        }
      }
      break;
    }

    case 'draw': {
      const drawCount = Math.min(config.drawCount, newState.stockPile.length);
      const drawnCards: Card[] = [];
      for (let i = 0; i < drawCount; i++) {
        const card = newState.stockPile.pop();
        if (card) {
          drawnCards.push(card);
        }
      }
      newState.wastePile.push(...drawnCards);
      break;
    }

    case 'flipStock': {
      newState.stockPile = [...newState.wastePile].reverse();
      newState.wastePile = [];
      break;
    }
  }

  return newState;
}

/**
 * Hook for managing local player state with optimistic updates.
 *
 * This hook provides:
 * - Optimistic updates for immediate UI feedback
 * - Stock/waste cycling (draw cards, recycle waste)
 * - Integration with useCardSelection for card movement
 * - Rollback capability for rejected moves
 */
export function useLocalPlayerState(
  options: UseLocalPlayerStateOptions
): UseLocalPlayerStateReturn {
  const {
    serverState,
    gameState,
    config,
    playerId,
    onMove,
    onFoundationMove,
    pendingMoveTimeout = 5000,
  } = options;

  // Local state with optimistic updates
  const [localState, setLocalState] = useState<PlayerGameState | null>(null);

  // Pending moves for potential rollback
  const pendingMovesRef = useRef<PendingMove[]>([]);
  const [pendingMoveCount, setPendingMoveCount] = useState(0);

  // Sync local state from server when server state changes and no pending moves
  useEffect(() => {
    if (serverState && pendingMovesRef.current.length === 0) {
      setLocalState(clonePlayerState(serverState));
    }
  }, [serverState]);

  // Timeout cleanup for stale pending moves
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const staleThreshold = now - pendingMoveTimeout;

      const staleMovesExist = pendingMovesRef.current.some(
        (pm) => pm.timestamp < staleThreshold
      );

      if (staleMovesExist) {
        // Rollback all stale moves and sync with server
        pendingMovesRef.current = [];
        setPendingMoveCount(0);
        if (serverState) {
          setLocalState(clonePlayerState(serverState));
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [serverState, pendingMoveTimeout]);

  // Build a mock game state using local player state for validation
  const localGameState = useMemo((): GameState | null => {
    if (!gameState || !localState) return null;

    return {
      ...gameState,
      players: gameState.players.map((p: PlayerGameState) =>
        p.playerId === playerId ? localState : p
      ),
    };
  }, [gameState, localState, playerId]);

  // Use card selection hook with local state
  const cardSelection = useCardSelection({
    gameState: localGameState ?? {
      gameId: '',
      phase: 'playing',
      players: [],
      foundations: [],
      config,
      roundNumber: 1,
      currentStarterIndex: 0,
    },
    playerId,
    onMove: (source, destination, cardCount) => {
      if (!localState) return;

      const move: Move = {
        type: 'card',
        playerId,
        source,
        destination,
        cardCount,
      };

      // Apply optimistic update
      applyOptimisticMove(move);

      // Send to server
      if (destination.type === 'foundation') {
        // Foundation moves need special handling
        const sourceCard = getTopCardFromSource(localState, source);
        if (sourceCard && onFoundationMove) {
          onFoundationMove(sourceCard, destination.foundationIndex, source);
        }
      } else {
        onMove?.(move);
      }
    },
  });

  /**
   * Get top card from a source pile
   */
  const getTopCardFromSource = useCallback(
    (state: PlayerGameState, source: MoveSource): Card | undefined => {
      switch (source.type) {
        case 'nertz':
          return state.nertzPile[state.nertzPile.length - 1];
        case 'work': {
          const pile = state.workPiles[source.pileIndex];
          return pile?.[pile.length - 1];
        }
        case 'waste':
          return state.wastePile[state.wastePile.length - 1];
      }
    },
    []
  );

  /**
   * Apply an optimistic move update
   */
  const applyOptimisticMove = useCallback(
    (move: Move) => {
      if (!localState) return;

      const pendingMove: PendingMove = {
        id: getNextMoveId(),
        move,
        previousState: clonePlayerState(localState),
        timestamp: Date.now(),
      };

      pendingMovesRef.current.push(pendingMove);
      setPendingMoveCount(pendingMovesRef.current.length);

      const newState = applyMoveOptimistically(localState, move, config);
      setLocalState(newState);
    },
    [localState, config]
  );

  /**
   * Draw cards from stock to waste
   */
  const drawCards = useCallback(() => {
    if (!localState || localState.stockPile.length === 0) return;

    const move: Move = {
      type: 'draw',
      playerId,
    };

    applyOptimisticMove(move);
    onMove?.(move);
  }, [localState, playerId, applyOptimisticMove, onMove]);

  /**
   * Recycle waste pile back to stock
   */
  const recycleWaste = useCallback(() => {
    if (!localState || localState.stockPile.length > 0 || localState.wastePile.length === 0) {
      return;
    }

    const move: Move = {
      type: 'flipStock',
      playerId,
    };

    applyOptimisticMove(move);
    onMove?.(move);
  }, [localState, playerId, applyOptimisticMove, onMove]);

  /**
   * Rollback a specific move
   */
  const rollbackMove = useCallback((moveId: number) => {
    const moveIndex = pendingMovesRef.current.findIndex((pm) => pm.id === moveId);
    if (moveIndex === -1) return;

    // Get the previous state from the rolled back move
    const rolledBackMove = pendingMovesRef.current[moveIndex];
    if (rolledBackMove) {
      // Remove this and all subsequent pending moves
      pendingMovesRef.current = pendingMovesRef.current.slice(0, moveIndex);
      setPendingMoveCount(pendingMovesRef.current.length);

      // Restore to previous state
      setLocalState(clonePlayerState(rolledBackMove.previousState));
    }
  }, []);

  /**
   * Sync local state with server state, clearing all pending moves
   */
  const syncWithServer = useCallback(() => {
    pendingMovesRef.current = [];
    setPendingMoveCount(0);
    if (serverState) {
      setLocalState(clonePlayerState(serverState));
    }
  }, [serverState]);

  // Pile-specific click handlers

  /**
   * Handle clicking on Nertz pile top card
   */
  const handleNertzClick = useCallback(
    (card: Card) => {
      // If we have a selection and clicking same card, deselect
      if (
        cardSelection.selection?.source.type === 'nertz' &&
        cardSelection.selection.card.suit === card.suit &&
        cardSelection.selection.card.rank === card.rank
      ) {
        cardSelection.clearSelection();
        return;
      }

      // Select the nertz pile top card
      cardSelection.selectCard(card, { type: 'nertz' }, 1);
    },
    [cardSelection]
  );

  /**
   * Handle double-clicking Nertz pile (auto-move to foundation)
   */
  const handleNertzDoubleClick = useCallback(
    (card: Card) => {
      // Find valid foundation
      const validFoundations = cardSelection.validDestinations.filter(
        (d) => d.type === 'foundation'
      );

      if (validFoundations.length > 0) {
        // Select and immediately place
        cardSelection.selectCard(card, { type: 'nertz' }, 1);
        // Defer the placement to next tick so selection is processed
        setTimeout(() => {
          cardSelection.placeCard(validFoundations[0]!);
        }, 0);
      }
    },
    [cardSelection]
  );

  /**
   * Handle clicking on a work pile card
   */
  const handleWorkPileClick = useCallback(
    (card: Card, pileIndex: number, cardIndex: number) => {
      const pile = localState?.workPiles[pileIndex];
      if (!pile) return;

      // If we have a selection from elsewhere and this is a valid destination, place the card
      if (
        cardSelection.hasSelection &&
        cardSelection.selection?.source.type !== 'work'
      ) {
        const isValid = cardSelection.validDestinations.some(
          (d) => d.type === 'work' && d.index === pileIndex
        );
        if (isValid) {
          cardSelection.placeCard({ type: 'work', index: pileIndex });
          return;
        }
      }

      // If clicking same card, deselect
      if (
        cardSelection.selection?.source.type === 'work' &&
        cardSelection.selection.source.pileIndex === pileIndex &&
        cardSelection.selection.source.cardIndex === cardIndex
      ) {
        cardSelection.clearSelection();
        return;
      }

      // Select this card (and all cards below it for multi-card moves)
      const cardCount = pile.length - cardIndex;
      cardSelection.selectCard(
        card,
        { type: 'work', pileIndex, cardIndex },
        cardCount
      );
    },
    [localState, cardSelection]
  );

  /**
   * Handle double-clicking work pile card (auto-move to foundation)
   */
  const handleWorkPileDoubleClick = useCallback(
    (card: Card, pileIndex: number, cardIndex: number) => {
      const pile = localState?.workPiles[pileIndex];
      if (!pile) return;

      // Only allow auto-move for top card
      if (cardIndex !== pile.length - 1) return;

      // Select the card first
      cardSelection.selectCard(card, { type: 'work', pileIndex, cardIndex }, 1);

      // Find valid foundation - need to recalculate after selection
      setTimeout(() => {
        const validFoundations = cardSelection.validDestinations.filter(
          (d) => d.type === 'foundation'
        );
        if (validFoundations.length > 0) {
          cardSelection.placeCard(validFoundations[0]!);
        }
      }, 0);
    },
    [localState, cardSelection]
  );

  /**
   * Handle clicking an empty work pile or placing a card
   */
  const handleWorkPileTarget = useCallback(
    (pileIndex: number) => {
      if (!cardSelection.hasSelection) return;

      const isValid = cardSelection.validDestinations.some(
        (d) => d.type === 'work' && d.index === pileIndex
      );

      if (isValid) {
        cardSelection.placeCard({ type: 'work', index: pileIndex });
      }
    },
    [cardSelection]
  );

  /**
   * Handle clicking on waste pile top card
   */
  const handleWasteClick = useCallback(
    (card: Card) => {
      // If clicking same card, deselect
      if (
        cardSelection.selection?.source.type === 'waste' &&
        cardSelection.selection.card.suit === card.suit &&
        cardSelection.selection.card.rank === card.rank
      ) {
        cardSelection.clearSelection();
        return;
      }

      // Select the waste pile top card
      cardSelection.selectCard(card, { type: 'waste' }, 1);
    },
    [cardSelection]
  );

  /**
   * Handle double-clicking waste pile (auto-move to foundation)
   */
  const handleWasteDoubleClick = useCallback(
    (card: Card) => {
      cardSelection.selectCard(card, { type: 'waste' }, 1);

      setTimeout(() => {
        const validFoundations = cardSelection.validDestinations.filter(
          (d) => d.type === 'foundation'
        );
        if (validFoundations.length > 0) {
          cardSelection.placeCard(validFoundations[0]!);
        }
      }, 0);
    },
    [cardSelection]
  );

  /**
   * Handle clicking stock pile (draw or recycle)
   */
  const handleStockClick = useCallback(() => {
    if (!localState) return;

    if (localState.stockPile.length > 0) {
      drawCards();
    } else if (localState.wastePile.length > 0) {
      recycleWaste();
    }
  }, [localState, drawCards, recycleWaste]);

  /**
   * Handle clicking a foundation pile
   */
  const handleFoundationClick = useCallback(
    (foundationIndex: number) => {
      if (!cardSelection.hasSelection) return;

      const isValid = cardSelection.validDestinations.some(
        (d) => d.type === 'foundation' && d.index === foundationIndex
      );

      if (isValid) {
        cardSelection.placeCard({ type: 'foundation', index: foundationIndex });
      }
    },
    [cardSelection]
  );

  // Calculate valid destinations split by type
  const validWorkPileDestinations = useMemo(
    () =>
      cardSelection.validDestinations
        .filter((d) => d.type === 'work')
        .map((d) => d.index),
    [cardSelection.validDestinations]
  );

  const validFoundationDestinations = useMemo(
    () =>
      cardSelection.validDestinations
        .filter((d) => d.type === 'foundation')
        .map((d) => d.index),
    [cardSelection.validDestinations]
  );

  return {
    localState,
    hasPendingMoves: pendingMoveCount > 0,
    pendingMoveCount,

    // Card selection
    selectedCard: cardSelection.selection,
    validWorkPileDestinations,
    validFoundationDestinations,
    hasSelection: cardSelection.hasSelection,

    // Actions
    drawCards,
    recycleWaste,
    selectCard: cardSelection.selectCard,
    moveToDestination: cardSelection.placeCard,
    clearSelection: cardSelection.clearSelection,
    isValidDestination: cardSelection.isValidDestination,
    rollbackMove,
    syncWithServer,

    // Pile handlers
    handleNertzClick,
    handleNertzDoubleClick,
    handleWorkPileClick,
    handleWorkPileDoubleClick,
    handleWorkPileTarget,
    handleWasteClick,
    handleWasteDoubleClick,
    handleStockClick,
    handleFoundationClick,
  };
}

export default useLocalPlayerState;
