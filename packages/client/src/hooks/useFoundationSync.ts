// useFoundationSync - Hook for syncing foundation state with optimistic updates
// Handles local-first updates with server reconciliation and rollback on rejection

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  Card,
  FoundationPile,
  FoundationMovePayload,
  FoundationUpdatedPayload,
  FoundationMoveRejectedPayload,
  MoveSource,
} from '@heyhey/shared';
import type { Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@heyhey/shared';
import type { PlayerColor } from '../components/Card/CardBack';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Tracks who played each card to a foundation
 * Key: `${suit}-${rank}` (e.g., "hearts-1" for Ace of Hearts)
 */
export type CardOwnershipMap = Map<string, { playerId: string; color: PlayerColor }>;

/**
 * A pending move waiting for server confirmation
 */
interface PendingMove {
  clientSequence: number;
  foundationIndex: number;
  card: Card;
  source: MoveSource;
  timestamp: number;
}

/**
 * State returned by the hook
 */
export interface UseFoundationSyncState {
  /** Current foundation state (includes optimistic updates) */
  foundations: FoundationPile[];
  /** Map of card ownership for color display */
  cardOwnership: CardOwnershipMap;
  /** Whether there are pending unconfirmed moves */
  hasPendingMoves: boolean;
  /** Last rejection error (clears after 3s) */
  lastError: string | null;
}

/**
 * Actions returned by the hook
 */
export interface UseFoundationSyncActions {
  /** Attempt to play a card to a foundation (optimistic) */
  playToFoundation: (card: Card, foundationIndex: number, source: MoveSource) => boolean;
  /** Reset to server-authoritative state */
  resetToServerState: (foundations: FoundationPile[]) => void;
}

export interface UseFoundationSyncOptions {
  /** Initial foundation state from server */
  initialFoundations: FoundationPile[];
  /** Socket connection for sending moves */
  socket: TypedSocket | null;
  /** Current player's ID */
  playerId: string;
  /** Current player's color */
  playerColor: PlayerColor;
  /** Map of player IDs to their colors */
  playerColors: Map<string, PlayerColor>;
  /** Timeout for pending moves (ms) - default 5000 */
  pendingTimeout?: number;
}

const SUITS: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];

function makeCardKey(card: Card): string {
  return `${card.suit}-${card.rank}`;
}

function createEmptyFoundations(): FoundationPile[] {
  return SUITS.map((suit) => ({ suit, cards: [], ownerId: 'system' }));
}

/**
 * Validates if a card can be played to a foundation pile
 */
function isValidFoundationMove(card: Card, pile: FoundationPile): boolean {
  // Card must match the suit
  if (card.suit !== pile.suit) return false;

  const topCard = pile.cards[pile.cards.length - 1];

  if (!topCard) {
    // Empty pile: only Ace (rank 1) can be placed
    return card.rank === 1;
  }

  // Must be exactly one rank higher
  return card.rank === topCard.rank + 1;
}

export function useFoundationSync(
  options: UseFoundationSyncOptions
): [UseFoundationSyncState, UseFoundationSyncActions] {
  const {
    initialFoundations,
    socket,
    playerId,
    playerColor,
    playerColors,
    pendingTimeout = 5000,
  } = options;

  // Server-authoritative state (what we know the server has confirmed)
  const [serverFoundations, setServerFoundations] = useState<FoundationPile[]>(
    initialFoundations.length > 0 ? initialFoundations : createEmptyFoundations()
  );

  // Pending moves waiting for confirmation
  const [pendingMoves, setPendingMoves] = useState<PendingMove[]>([]);

  // Card ownership tracking
  const [cardOwnership, setCardOwnership] = useState<CardOwnershipMap>(new Map());

  // Last error for UI display
  const [lastError, setLastError] = useState<string | null>(null);

  // Client sequence counter
  const sequenceRef = useRef(0);

  // Compute optimistic foundations by applying pending moves to server state
  const foundations: FoundationPile[] = serverFoundations.map((pile, index) => {
    const pendingForPile = pendingMoves.filter((m) => m.foundationIndex === index);
    if (pendingForPile.length === 0) return pile;

    // Apply pending cards on top
    return {
      ...pile,
      cards: [...pile.cards, ...pendingForPile.map((m) => m.card)],
    };
  });

  // Handle server foundation updates
  useEffect(() => {
    if (!socket) return;

    const handleFoundationUpdated = (payload: FoundationUpdatedPayload) => {
      const { foundationIndex, card, playerId: cardPlayerId } = payload;

      // Update server state
      setServerFoundations((prev) => {
        const updated = [...prev];
        const pile = updated[foundationIndex];
        if (pile) {
          updated[foundationIndex] = {
            ...pile,
            cards: [...pile.cards, card],
          };
        }
        return updated;
      });

      // Track card ownership
      const ownerColor = playerColors.get(cardPlayerId) ?? 'blue';
      setCardOwnership((prev) => {
        const next = new Map(prev);
        next.set(makeCardKey(card), { playerId: cardPlayerId, color: ownerColor });
        return next;
      });

      // Remove matching pending move (if it was ours)
      if (cardPlayerId === playerId) {
        setPendingMoves((prev) =>
          prev.filter(
            (m) =>
              !(
                m.foundationIndex === foundationIndex &&
                m.card.suit === card.suit &&
                m.card.rank === card.rank
              )
          )
        );
      }
    };

    const handleMoveRejected = (payload: FoundationMoveRejectedPayload) => {
      const { reason, clientSequence } = payload;

      // Remove the rejected pending move
      setPendingMoves((prev) => prev.filter((m) => m.clientSequence !== clientSequence));

      // Show error briefly
      setLastError(reason);
      setTimeout(() => setLastError(null), 3000);
    };

    socket.on('foundationUpdated', handleFoundationUpdated);
    socket.on('foundationMoveRejected', handleMoveRejected);

    return () => {
      socket.off('foundationUpdated', handleFoundationUpdated);
      socket.off('foundationMoveRejected', handleMoveRejected);
    };
  }, [socket, playerId, playerColors]);

  // Timeout stale pending moves
  useEffect(() => {
    if (pendingMoves.length === 0) return;

    const checkTimeout = () => {
      const now = Date.now();
      setPendingMoves((prev) =>
        prev.filter((m) => now - m.timestamp < pendingTimeout)
      );
    };

    const interval = setInterval(checkTimeout, 1000);
    return () => clearInterval(interval);
  }, [pendingMoves.length, pendingTimeout]);

  const playToFoundation = useCallback(
    (card: Card, foundationIndex: number, source: MoveSource): boolean => {
      // Find the target pile in optimistic state
      const pile = foundations[foundationIndex];
      if (!pile) return false;

      // Validate the move locally first
      if (!isValidFoundationMove(card, pile)) {
        return false;
      }

      // Generate client sequence
      const clientSequence = ++sequenceRef.current;

      // Add to pending moves (optimistic update)
      const pendingMove: PendingMove = {
        clientSequence,
        foundationIndex,
        card,
        source,
        timestamp: Date.now(),
      };
      setPendingMoves((prev) => [...prev, pendingMove]);

      // Optimistically track ownership
      setCardOwnership((prev) => {
        const next = new Map(prev);
        next.set(makeCardKey(card), { playerId, color: playerColor });
        return next;
      });

      // Send to server
      if (socket) {
        const payload: FoundationMovePayload = {
          card,
          foundationIndex,
          source,
          clientSequence,
        };
        socket.emit('foundationMove', payload);
      }

      return true;
    },
    [foundations, socket, playerId, playerColor]
  );

  const resetToServerState = useCallback((newFoundations: FoundationPile[]) => {
    setServerFoundations(newFoundations);
    setPendingMoves([]);
  }, []);

  const state: UseFoundationSyncState = {
    foundations,
    cardOwnership,
    hasPendingMoves: pendingMoves.length > 0,
    lastError,
  };

  const actions: UseFoundationSyncActions = {
    playToFoundation,
    resetToServerState,
  };

  return [state, actions];
}

export default useFoundationSync;
