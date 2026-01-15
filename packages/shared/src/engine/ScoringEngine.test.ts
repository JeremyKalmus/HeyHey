import { describe, it, expect } from 'vitest';
import {
  countFoundationCards,
  countNertzPenalty,
  calculatePlayerRoundScore,
  calculateRoundResult,
  createScoringState,
  applyRoundResult,
  getStandings,
  getRoundDetails,
  FOUNDATION_CARD_POINTS,
  NERTZ_PENALTY_PER_CARD,
} from './ScoringEngine.js';
import type {
  Card,
  GameState,
  PlayerGameState,
  ScoringState,
} from '../types/index.js';

// Test helpers
function card(suit: Card['suit'], rank: number, deckId: string): Card {
  return { suit, rank, deckId };
}

function createTestPlayer(overrides: Partial<PlayerGameState> = {}): PlayerGameState {
  return {
    playerId: 'player1',
    deckId: 'deck1',
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
    phase: 'scoring',
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
}

describe('ScoringEngine', () => {
  describe('constants', () => {
    it('has correct foundation card points', () => {
      expect(FOUNDATION_CARD_POINTS).toBe(1);
    });

    it('has correct nertz penalty per card', () => {
      expect(NERTZ_PENALTY_PER_CARD).toBe(2);
    });
  });

  describe('countFoundationCards', () => {
    it('returns 0 when no cards in foundations', () => {
      const state = createTestGameState();
      expect(countFoundationCards(state, 'deck1')).toBe(0);
    });

    it('counts cards belonging to specific player', () => {
      const state = createTestGameState({
        foundations: [
          { suit: 'hearts', cards: [card('hearts', 1, 'deck1'), card('hearts', 2, 'deck1')], ownerId: 'deck1' },
          { suit: 'diamonds', cards: [card('diamonds', 1, 'deck2')], ownerId: 'deck2' },
          { suit: 'clubs', cards: [], ownerId: 'system' },
          { suit: 'spades', cards: [card('spades', 1, 'deck1')], ownerId: 'deck1' },
        ],
      });
      expect(countFoundationCards(state, 'deck1')).toBe(3);
      expect(countFoundationCards(state, 'deck2')).toBe(1);
    });

    it('counts cards across all foundations', () => {
      const state = createTestGameState({
        foundations: [
          { suit: 'hearts', cards: [card('hearts', 1, 'deck1')], ownerId: 'deck1' },
          { suit: 'diamonds', cards: [card('diamonds', 1, 'deck1')], ownerId: 'deck1' },
          { suit: 'clubs', cards: [card('clubs', 1, 'deck1')], ownerId: 'deck1' },
          { suit: 'spades', cards: [card('spades', 1, 'deck1')], ownerId: 'deck1' },
        ],
      });
      expect(countFoundationCards(state, 'deck1')).toBe(4);
    });
  });

  describe('countNertzPenalty', () => {
    it('returns 0 when nertz pile is empty', () => {
      const state = createTestGameState({
        players: [createTestPlayer({ playerId: 'player1', nertzPile: [] })],
      });
      expect(countNertzPenalty(state, 'player1')).toBe(0);
    });

    it('returns correct count when nertz pile has cards', () => {
      const state = createTestGameState({
        players: [createTestPlayer({
          playerId: 'player1',
          nertzPile: [card('hearts', 1, 'deck1'), card('hearts', 2, 'deck1'), card('hearts', 3, 'deck1')],
        })],
      });
      expect(countNertzPenalty(state, 'player1')).toBe(3);
    });

    it('returns 0 for non-existent player', () => {
      const state = createTestGameState({ players: [] });
      expect(countNertzPenalty(state, 'nonexistent')).toBe(0);
    });
  });

  describe('calculatePlayerRoundScore', () => {
    it('calculates positive score with no penalty', () => {
      const state = createTestGameState({
        players: [createTestPlayer({ playerId: 'player1', deckId: 'deck1', nertzPile: [] })],
        foundations: [
          { suit: 'hearts', cards: [card('hearts', 1, 'deck1'), card('hearts', 2, 'deck1')], ownerId: 'deck1' },
          { suit: 'diamonds', cards: [], ownerId: 'system' },
          { suit: 'clubs', cards: [], ownerId: 'system' },
          { suit: 'spades', cards: [], ownerId: 'system' },
        ],
      });

      const score = calculatePlayerRoundScore(state, 'player1');
      expect(score.foundationCards).toBe(2);
      expect(score.nertzPenalty).toBe(0);
      expect(score.roundScore).toBe(2);
    });

    it('calculates score with penalty', () => {
      const state = createTestGameState({
        players: [createTestPlayer({
          playerId: 'player1',
          deckId: 'deck1',
          nertzPile: [card('spades', 1, 'deck1'), card('spades', 2, 'deck1')],
        })],
        foundations: [
          { suit: 'hearts', cards: [card('hearts', 1, 'deck1'), card('hearts', 2, 'deck1'), card('hearts', 3, 'deck1')], ownerId: 'deck1' },
          { suit: 'diamonds', cards: [], ownerId: 'system' },
          { suit: 'clubs', cards: [], ownerId: 'system' },
          { suit: 'spades', cards: [], ownerId: 'system' },
        ],
      });

      const score = calculatePlayerRoundScore(state, 'player1');
      expect(score.foundationCards).toBe(3);
      expect(score.nertzPenalty).toBe(2);
      expect(score.roundScore).toBe(3 - (2 * 2)); // 3 - 4 = -1
    });

    it('can have negative score', () => {
      const state = createTestGameState({
        players: [createTestPlayer({
          playerId: 'player1',
          deckId: 'deck1',
          nertzPile: [
            card('spades', 1, 'deck1'),
            card('spades', 2, 'deck1'),
            card('spades', 3, 'deck1'),
            card('spades', 4, 'deck1'),
            card('spades', 5, 'deck1'),
          ],
        })],
        foundations: [
          { suit: 'hearts', cards: [card('hearts', 1, 'deck1')], ownerId: 'deck1' },
          { suit: 'diamonds', cards: [], ownerId: 'system' },
          { suit: 'clubs', cards: [], ownerId: 'system' },
          { suit: 'spades', cards: [], ownerId: 'system' },
        ],
      });

      const score = calculatePlayerRoundScore(state, 'player1');
      expect(score.foundationCards).toBe(1);
      expect(score.nertzPenalty).toBe(5);
      expect(score.roundScore).toBe(1 - (5 * 2)); // 1 - 10 = -9
    });

    it('returns zero score for non-existent player', () => {
      const state = createTestGameState({ players: [] });
      const score = calculatePlayerRoundScore(state, 'nonexistent');
      expect(score.roundScore).toBe(0);
    });
  });

  describe('calculateRoundResult', () => {
    it('calculates scores for all players', () => {
      const state = createTestGameState({
        calledBy: 'player1',
        players: [
          createTestPlayer({ playerId: 'player1', deckId: 'deck1', nertzPile: [] }),
          createTestPlayer({ playerId: 'player2', deckId: 'deck2', nertzPile: [card('clubs', 1, 'deck2')] }),
        ],
        foundations: [
          { suit: 'hearts', cards: [card('hearts', 1, 'deck1'), card('hearts', 2, 'deck2')], ownerId: 'deck1' },
          { suit: 'diamonds', cards: [], ownerId: 'system' },
          { suit: 'clubs', cards: [], ownerId: 'system' },
          { suit: 'spades', cards: [], ownerId: 'system' },
        ],
      });

      const result = calculateRoundResult(state, 1);
      expect(result.roundNumber).toBe(1);
      expect(result.calledBy).toBe('player1');
      expect(result.playerScores).toHaveLength(2);

      const p1Score = result.playerScores.find(s => s.playerId === 'player1');
      expect(p1Score?.foundationCards).toBe(1);
      expect(p1Score?.nertzPenalty).toBe(0);
      expect(p1Score?.roundScore).toBe(1);

      const p2Score = result.playerScores.find(s => s.playerId === 'player2');
      expect(p2Score?.foundationCards).toBe(1);
      expect(p2Score?.nertzPenalty).toBe(1);
      expect(p2Score?.roundScore).toBe(-1); // 1 - 2
    });

    it('throws when no player called Nertz', () => {
      const state = createTestGameState({ calledBy: undefined });
      expect(() => calculateRoundResult(state, 1)).toThrow('no player called Nertz');
    });

    it('has timestamp', () => {
      const state = createTestGameState({ calledBy: 'player1', players: [] });
      const before = Date.now();
      const result = calculateRoundResult(state, 1);
      const after = Date.now();
      expect(result.timestamp).toBeGreaterThanOrEqual(before);
      expect(result.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('createScoringState', () => {
    it('creates initial state with all players at zero', () => {
      const state = createScoringState(['p1', 'p2', 'p3'], 100);
      expect(state.rounds).toEqual([]);
      expect(state.targetScore).toBe(100);
      expect(state.totalScores).toEqual([
        { playerId: 'p1', total: 0 },
        { playerId: 'p2', total: 0 },
        { playerId: 'p3', total: 0 },
      ]);
      expect(state.gameWinner).toBeUndefined();
    });
  });

  describe('applyRoundResult', () => {
    it('accumulates scores', () => {
      const scoringState = createScoringState(['p1', 'p2'], 100);
      const roundResult = {
        roundNumber: 1,
        calledBy: 'p1',
        playerScores: [
          { playerId: 'p1', foundationCards: 10, nertzPenalty: 0, roundScore: 10 },
          { playerId: 'p2', foundationCards: 5, nertzPenalty: 2, roundScore: 1 },
        ],
        timestamp: Date.now(),
      };

      const { scoringState: newState, gameOver, winner } = applyRoundResult(scoringState, roundResult);
      expect(newState.rounds).toHaveLength(1);
      expect(newState.totalScores.find(s => s.playerId === 'p1')?.total).toBe(10);
      expect(newState.totalScores.find(s => s.playerId === 'p2')?.total).toBe(1);
      expect(gameOver).toBe(false);
      expect(winner).toBeUndefined();
    });

    it('detects winner when target reached', () => {
      const scoringState: ScoringState = {
        rounds: [],
        totalScores: [
          { playerId: 'p1', total: 95 },
          { playerId: 'p2', total: 50 },
        ],
        targetScore: 100,
      };

      const roundResult = {
        roundNumber: 5,
        calledBy: 'p1',
        playerScores: [
          { playerId: 'p1', foundationCards: 10, nertzPenalty: 0, roundScore: 10 },
          { playerId: 'p2', foundationCards: 5, nertzPenalty: 0, roundScore: 5 },
        ],
        timestamp: Date.now(),
      };

      const { scoringState: newState, gameOver, winner } = applyRoundResult(scoringState, roundResult);
      expect(newState.totalScores.find(s => s.playerId === 'p1')?.total).toBe(105);
      expect(gameOver).toBe(true);
      expect(winner).toBe('p1');
      expect(newState.gameWinner).toBe('p1');
    });

    it('accumulates across multiple rounds', () => {
      let scoringState = createScoringState(['p1', 'p2'], 100);

      const round1 = {
        roundNumber: 1,
        calledBy: 'p1',
        playerScores: [
          { playerId: 'p1', foundationCards: 15, nertzPenalty: 0, roundScore: 15 },
          { playerId: 'p2', foundationCards: 10, nertzPenalty: 3, roundScore: 4 },
        ],
        timestamp: Date.now(),
      };

      ({ scoringState } = applyRoundResult(scoringState, round1));
      expect(scoringState.totalScores.find(s => s.playerId === 'p1')?.total).toBe(15);

      const round2 = {
        roundNumber: 2,
        calledBy: 'p2',
        playerScores: [
          { playerId: 'p1', foundationCards: 8, nertzPenalty: 5, roundScore: -2 },
          { playerId: 'p2', foundationCards: 20, nertzPenalty: 0, roundScore: 20 },
        ],
        timestamp: Date.now(),
      };

      ({ scoringState } = applyRoundResult(scoringState, round2));
      expect(scoringState.totalScores.find(s => s.playerId === 'p1')?.total).toBe(13); // 15 + (-2)
      expect(scoringState.totalScores.find(s => s.playerId === 'p2')?.total).toBe(24); // 4 + 20
      expect(scoringState.rounds).toHaveLength(2);
    });
  });

  describe('getStandings', () => {
    it('sorts players by score descending', () => {
      const scoringState: ScoringState = {
        rounds: [],
        totalScores: [
          { playerId: 'p1', total: 50 },
          { playerId: 'p2', total: 75 },
          { playerId: 'p3', total: 25 },
        ],
        targetScore: 100,
      };

      const standings = getStandings(scoringState);
      expect(standings[0]).toEqual({ playerId: 'p2', total: 75, rank: 1 });
      expect(standings[1]).toEqual({ playerId: 'p1', total: 50, rank: 2 });
      expect(standings[2]).toEqual({ playerId: 'p3', total: 25, rank: 3 });
    });
  });

  describe('getRoundDetails', () => {
    it('returns round by number', () => {
      const scoringState: ScoringState = {
        rounds: [
          { roundNumber: 1, calledBy: 'p1', playerScores: [], timestamp: 1000 },
          { roundNumber: 2, calledBy: 'p2', playerScores: [], timestamp: 2000 },
        ],
        totalScores: [],
        targetScore: 100,
      };

      const round = getRoundDetails(scoringState, 2);
      expect(round?.calledBy).toBe('p2');
      expect(round?.timestamp).toBe(2000);
    });

    it('returns undefined for non-existent round', () => {
      const scoringState: ScoringState = {
        rounds: [],
        totalScores: [],
        targetScore: 100,
      };

      expect(getRoundDetails(scoringState, 1)).toBeUndefined();
    });
  });
});
