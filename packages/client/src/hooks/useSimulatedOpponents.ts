// useSimulatedOpponents - Timer-based opponent simulation for Storybook
// Simulates opponents making valid foundation moves at random intervals
// FOR STORYBOOK DEMOS ONLY - not for production use

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Card, PlayerGameState, Suit } from '@heyhey/shared';
import type { PlayerColor } from '../components/Card/CardBack';
import type { FoundationPile } from '../components/Foundation';

const SUITS: readonly Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

/**
 * Simulated player state for the hook
 */
export interface SimulatedPlayer {
  playerId: string;
  playerName: string;
  playerColor: PlayerColor;
  /** Current Nertz pile count */
  nertzCount: number;
  /** Is this player currently "active" (just made a move) */
  isActive: boolean;
}

/**
 * Foundation state per player (4 piles per player)
 */
export interface PlayerFoundations {
  playerId: string;
  playerName: string;
  playerColor: PlayerColor;
  /** Top rank of each foundation pile (0 = empty, 1 = Ace, ..., 13 = King) */
  topRanks: [number, number, number, number];
}

/** Information about the most recent opponent move */
export interface SimulatedMove {
  /** Player who made the move */
  playerId: string;
  playerName: string;
  /** Target foundation pile owner (may differ from playerId) */
  targetPlayerId: string;
  /** Suit of the foundation pile */
  suit: Suit;
  /** Rank of the card played */
  rank: number;
  /** Timestamp for detecting new moves */
  timestamp: number;
}

/**
 * Simulation state returned by the hook
 */
export interface SimulationState {
  /** Foundation state for each player */
  playerFoundations: PlayerFoundations[];
  /** Opponent states (for OpponentMini display) */
  opponents: SimulatedPlayer[];
  /** Recent move for visual feedback */
  lastMove: SimulatedMove | null;
  /** Whether simulation is running */
  isRunning: boolean;
  /** Total moves made */
  moveCount: number;
}

export interface UseSimulatedOpponentsOptions {
  /** Number of players (including "you") */
  playerCount: 2 | 4 | 6 | 8;
  /** Player names */
  playerNames: string[];
  /** Player colors */
  playerColors: PlayerColor[];
  /** Minimum interval between opponent moves (ms) */
  minInterval?: number;
  /** Maximum interval between opponent moves (ms) */
  maxInterval?: number;
  /** Whether to start simulation automatically */
  autoStart?: boolean;
  /** Initial foundation ranks (optional, defaults to all 0) */
  initialFoundations?: [number, number, number, number][];
  /** Initial nertz counts for opponents */
  initialNertzCounts?: number[];
}

/**
 * Hook for simulating opponent moves in Storybook demos
 * Creates the "racing" feel of multiplayer Nertz
 */
export function useSimulatedOpponents({
  playerCount,
  playerNames,
  playerColors,
  minInterval = 800,
  maxInterval = 2500,
  autoStart = true,
  initialFoundations,
  initialNertzCounts,
}: UseSimulatedOpponentsOptions): SimulationState & {
  start: () => void;
  stop: () => void;
  reset: () => void;
} {
  // Initialize foundation state for each player
  const [playerFoundations, setPlayerFoundations] = useState<PlayerFoundations[]>(() =>
    Array.from({ length: playerCount }, (_, i) => ({
      playerId: `player-${i + 1}`,
      playerName: playerNames[i] ?? `Player ${i + 1}`,
      playerColor: playerColors[i] ?? 'blue',
      topRanks: (initialFoundations?.[i] ?? [0, 0, 0, 0]) as [number, number, number, number],
    }))
  );

  // Initialize opponent states (all players except player 0 = "you")
  const [opponents, setOpponents] = useState<SimulatedPlayer[]>(() =>
    Array.from({ length: playerCount - 1 }, (_, i) => ({
      playerId: `player-${i + 2}`,
      playerName: playerNames[i + 1] ?? `Player ${i + 2}`,
      playerColor: playerColors[i + 1] ?? 'blue',
      nertzCount: initialNertzCounts?.[i] ?? 13,
      isActive: false,
    }))
  );

  const [lastMove, setLastMove] = useState<SimulationState['lastMove']>(null);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [moveCount, setMoveCount] = useState(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Find all valid moves for opponents
   * A valid move: playing the next card (topRank + 1) to any foundation
   */
  const findValidMoves = useCallback((): Array<{
    playerId: string;
    playerName: string;
    playerColor: PlayerColor;
    targetPlayerId: string;
    suitIndex: number;
    suit: Suit;
    rank: number;
  }> => {
    const moves: Array<{
      playerId: string;
      playerName: string;
      playerColor: PlayerColor;
      targetPlayerId: string;
      suitIndex: number;
      suit: Suit;
      rank: number;
    }> = [];

    // For each opponent (not player 0)
    for (let oppIndex = 0; oppIndex < opponents.length; oppIndex++) {
      const opp = opponents[oppIndex]!;

      // Skip if nertz pile is empty (they've won)
      if (opp.nertzCount <= 0) continue;

      // Check all foundation piles (from all players)
      for (const pf of playerFoundations) {
        for (let suitIndex = 0; suitIndex < 4; suitIndex++) {
          const topRank = pf.topRanks[suitIndex]!;
          const nextRank = topRank + 1;

          // Can only play up to King (13)
          if (nextRank <= 13) {
            moves.push({
              playerId: opp.playerId,
              playerName: opp.playerName,
              playerColor: opp.playerColor,
              targetPlayerId: pf.playerId,
              suitIndex,
              suit: SUITS[suitIndex]!,
              rank: nextRank,
            });
          }
        }
      }
    }

    return moves;
  }, [opponents, playerFoundations]);

  /**
   * Execute a random valid move
   */
  const makeRandomMove = useCallback(() => {
    const validMoves = findValidMoves();

    if (validMoves.length === 0) {
      // No valid moves available
      return;
    }

    // Pick a random move
    const move = validMoves[Math.floor(Math.random() * validMoves.length)]!;

    // Update foundation
    setPlayerFoundations(prev =>
      prev.map(pf => {
        if (pf.playerId === move.targetPlayerId) {
          const newTopRanks = [...pf.topRanks] as [number, number, number, number];
          newTopRanks[move.suitIndex] = move.rank;
          return { ...pf, topRanks: newTopRanks };
        }
        return pf;
      })
    );

    // Update opponent state (decrease nertz, set active)
    setOpponents(prev =>
      prev.map(opp => {
        if (opp.playerId === move.playerId) {
          return {
            ...opp,
            nertzCount: Math.max(0, opp.nertzCount - 1),
            isActive: true,
          };
        }
        // Clear active state for others
        return { ...opp, isActive: false };
      })
    );

    // Record the move
    setLastMove({
      playerId: move.playerId,
      playerName: move.playerName,
      targetPlayerId: move.targetPlayerId,
      suit: move.suit,
      rank: move.rank,
      timestamp: Date.now(),
    });

    setMoveCount(c => c + 1);
  }, [findValidMoves]);

  /**
   * Schedule next move
   */
  const scheduleNextMove = useCallback(() => {
    if (!isRunning) return;

    const delay = minInterval + Math.random() * (maxInterval - minInterval);

    timerRef.current = setTimeout(() => {
      makeRandomMove();
      scheduleNextMove();
    }, delay);
  }, [isRunning, minInterval, maxInterval, makeRandomMove]);

  // Start/stop simulation
  useEffect(() => {
    if (isRunning) {
      scheduleNextMove();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isRunning, scheduleNextMove]);

  // Control functions
  const start = useCallback(() => setIsRunning(true), []);
  const stop = useCallback(() => {
    setIsRunning(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);

  const reset = useCallback(() => {
    stop();
    setPlayerFoundations(
      Array.from({ length: playerCount }, (_, i) => ({
        playerId: `player-${i + 1}`,
        playerName: playerNames[i] ?? `Player ${i + 1}`,
        playerColor: playerColors[i] ?? 'blue',
        topRanks: (initialFoundations?.[i] ?? [0, 0, 0, 0]) as [number, number, number, number],
      }))
    );
    setOpponents(
      Array.from({ length: playerCount - 1 }, (_, i) => ({
        playerId: `player-${i + 2}`,
        playerName: playerNames[i + 1] ?? `Player ${i + 2}`,
        playerColor: playerColors[i + 1] ?? 'blue',
        nertzCount: initialNertzCounts?.[i] ?? 13,
        isActive: false,
      }))
    );
    setLastMove(null);
    setMoveCount(0);
  }, [stop, playerCount, playerNames, playerColors, initialFoundations, initialNertzCounts]);

  return {
    playerFoundations,
    opponents,
    lastMove,
    isRunning,
    moveCount,
    start,
    stop,
    reset,
  };
}

/**
 * Convert simulation state to PlayerFoundationGroup format for MultiFoundationArea
 */
export function toPlayerFoundationGroups(
  playerFoundations: PlayerFoundations[]
): Array<{
  playerId: string;
  playerName: string;
  playerColor: PlayerColor;
  piles: FoundationPile[];
}> {
  return playerFoundations.map(pf => ({
    playerId: pf.playerId,
    playerName: pf.playerName,
    playerColor: pf.playerColor,
    piles: SUITS.map((suit, i) => {
      const topRank = pf.topRanks[i]!;
      // Create cards from Ace up to current top rank
      const cards: Card[] = Array.from({ length: topRank }, (_, rank) => ({
        suit,
        rank: rank + 1,
        deckId: pf.playerId,
      }));
      return {
        suit,
        cards,
        ownerId: pf.playerId,
      };
    }),
  }));
}

/**
 * Convert simulation opponent state to PlayerGameState for OpponentMini
 */
export function toPlayerGameState(opponent: SimulatedPlayer): PlayerGameState {
  return {
    playerId: opponent.playerId,
    deckId: opponent.playerId,
    nertzPile: Array.from({ length: opponent.nertzCount }, (_, i) => ({
      suit: SUITS[i % 4]!,
      rank: (i % 13) + 1,
      deckId: opponent.playerId,
    })),
    stockPile: Array.from({ length: Math.max(0, 35 - opponent.nertzCount) }, (_, i) => ({
      suit: SUITS[i % 4]!,
      rank: (i % 13) + 1,
      deckId: opponent.playerId,
    })),
    wastePile: [],
    workPiles: [[], [], [], []],
  };
}

/**
 * Convert simulation lastMove to OpponentMove format for MultiFoundationArea animations.
 * The OpponentMove uses targetPlayerId as playerId since animations happen on the pile that received the card.
 */
export function toOpponentMove(lastMove: SimulatedMove | null): {
  playerId: string;
  suit: Suit;
  rank: number;
  timestamp: number;
} | null {
  if (!lastMove) return null;
  return {
    playerId: lastMove.targetPlayerId,
    suit: lastMove.suit,
    rank: lastMove.rank,
    timestamp: lastMove.timestamp,
  };
}
