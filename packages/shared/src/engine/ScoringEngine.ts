// HeyHey! Scoring Engine
// Calculates round scores and manages score accumulation

import type {
  GameState,
  PlayerRoundScore,
  RoundResult,
  ScoringState,
} from '../types/index.js';

/**
 * Points awarded per card in foundation
 */
export const FOUNDATION_CARD_POINTS = 1;

/**
 * Penalty per card remaining in nertz pile
 */
export const NERTZ_PENALTY_PER_CARD = 1;

/**
 * Count cards belonging to a specific player (by deckId) in all foundations
 */
export function countFoundationCards(state: GameState, deckId: string): number {
  let count = 0;
  for (const foundation of state.foundations) {
    for (const card of foundation.cards) {
      if (card.deckId === deckId) {
        count++;
      }
    }
  }
  return count;
}

/**
 * Count remaining cards in a player's nertz pile
 */
export function countNertzPenalty(state: GameState, playerId: string): number {
  const playerState = state.players.find(p => p.playerId === playerId);
  if (!playerState) return 0;
  return playerState.nertzPile.length;
}

/**
 * Calculate round score for a single player
 */
export function calculatePlayerRoundScore(
  state: GameState,
  playerId: string
): PlayerRoundScore {
  const playerState = state.players.find(p => p.playerId === playerId);
  if (!playerState) {
    return {
      playerId,
      foundationCards: 0,
      nertzPenalty: 0,
      roundScore: 0,
    };
  }

  const foundationCards = countFoundationCards(state, playerState.deckId);
  const nertzPenalty = playerState.nertzPile.length;
  const roundScore = foundationCards - (nertzPenalty * NERTZ_PENALTY_PER_CARD);

  return {
    playerId,
    foundationCards,
    nertzPenalty,
    roundScore,
  };
}

/**
 * Calculate scores for all players in a round
 */
export function calculateRoundResult(
  state: GameState,
  roundNumber: number
): RoundResult {
  if (!state.calledBy) {
    throw new Error('Cannot calculate round result: no player called Nertz');
  }

  const playerScores = state.players.map(player =>
    calculatePlayerRoundScore(state, player.playerId)
  );

  return {
    roundNumber,
    calledBy: state.calledBy,
    playerScores,
    timestamp: Date.now(),
  };
}

/**
 * Create initial scoring state for a game
 */
export function createScoringState(
  playerIds: string[],
  targetScore: number
): ScoringState {
  return {
    rounds: [],
    totalScores: playerIds.map(playerId => ({ playerId, total: 0 })),
    targetScore,
  };
}

/**
 * Apply a round result to the scoring state
 * Returns updated scoring state and whether a winner was determined
 */
export function applyRoundResult(
  scoringState: ScoringState,
  roundResult: RoundResult
): { scoringState: ScoringState; gameOver: boolean; winner?: string } {
  // Create new rounds array with the new result
  const rounds = [...scoringState.rounds, roundResult];

  // Update total scores
  const totalScores = scoringState.totalScores.map(playerTotal => {
    const roundScore = roundResult.playerScores.find(
      ps => ps.playerId === playerTotal.playerId
    );
    return {
      playerId: playerTotal.playerId,
      total: playerTotal.total + (roundScore?.roundScore ?? 0),
    };
  });

  // Check for winner (first player to reach target score)
  const winner = totalScores.find(
    ts => ts.total >= scoringState.targetScore
  )?.playerId;

  return {
    scoringState: {
      rounds,
      totalScores,
      targetScore: scoringState.targetScore,
      gameWinner: winner,
    },
    gameOver: !!winner,
    winner,
  };
}

/**
 * Get current standings sorted by total score (highest first)
 */
export function getStandings(
  scoringState: ScoringState
): { playerId: string; total: number; rank: number }[] {
  const sorted = [...scoringState.totalScores].sort((a, b) => b.total - a.total);
  return sorted.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
}

/**
 * Get score breakdown for a specific round
 */
export function getRoundDetails(
  scoringState: ScoringState,
  roundNumber: number
): RoundResult | undefined {
  return scoringState.rounds.find(r => r.roundNumber === roundNumber);
}
