// GameManager Tests
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { GameManager } from './GameManager.js';
import type {
  Card,
  CardMove,
  StateUpdate,
  MoveRejection,
  FoundationMovePayload,
} from '@heyhey/shared';

// Test helpers
function card(suit: Card['suit'], rank: number, deckId = 'player1'): Card {
  return { suit, rank, deckId };
}

describe('GameManager', () => {
  let gameManager: GameManager;
  let broadcastFn: Mock<(roomCode: string, update: StateUpdate) => void>;
  let rejectFn: Mock<(socketId: string, rejection: MoveRejection) => void>;

  beforeEach(() => {
    broadcastFn = vi.fn();
    rejectFn = vi.fn();
    gameManager = new GameManager(broadcastFn, rejectFn);
  });

  describe('initializeGame', () => {
    it('creates 4 foundation piles per player (one per suit)', () => {
      gameManager.initializeGame('ROOM1', 'game-123', ['player1', 'player2']);

      const foundations = gameManager.getFoundations('ROOM1');
      // 2 players × 4 suits = 8 foundations
      expect(foundations).toHaveLength(8);

      // Player 1's foundations (indices 0-3)
      expect(foundations![0]!.suit).toBe('hearts');
      expect(foundations![0]!.ownerId).toBe('player1');
      expect(foundations![1]!.suit).toBe('diamonds');
      expect(foundations![1]!.ownerId).toBe('player1');
      expect(foundations![2]!.suit).toBe('clubs');
      expect(foundations![2]!.ownerId).toBe('player1');
      expect(foundations![3]!.suit).toBe('spades');
      expect(foundations![3]!.ownerId).toBe('player1');

      // Player 2's foundations (indices 4-7)
      expect(foundations![4]!.suit).toBe('hearts');
      expect(foundations![4]!.ownerId).toBe('player2');
      expect(foundations![5]!.suit).toBe('diamonds');
      expect(foundations![5]!.ownerId).toBe('player2');
      expect(foundations![6]!.suit).toBe('clubs');
      expect(foundations![6]!.ownerId).toBe('player2');
      expect(foundations![7]!.suit).toBe('spades');
      expect(foundations![7]!.ownerId).toBe('player2');
    });

    it('initializes foundations as empty', () => {
      gameManager.initializeGame('ROOM1', 'game-123', ['player1', 'player2']);

      const foundations = gameManager.getFoundations('ROOM1');
      for (const pile of foundations!) {
        expect(pile.cards).toHaveLength(0);
      }
    });

    it('initializes sequence to 0', () => {
      gameManager.initializeGame('ROOM1', 'game-123', ['player1', 'player2']);

      expect(gameManager.getSequence('ROOM1')).toBe(0);
    });

    it('tracks player ids', () => {
      gameManager.initializeGame('ROOM1', 'game-123', ['player1', 'player2']);

      const game = gameManager.getGame('ROOM1');
      expect(game?.playerSockets.has('player1')).toBe(true);
      expect(game?.playerSockets.has('player2')).toBe(true);
    });
  });

  describe('processMove', () => {
    beforeEach(() => {
      gameManager.initializeGame('ROOM1', 'game-123', ['player1']);
      // Set up initial state with a card to move
      const state = gameManager.getGameState('ROOM1');
      if (state) {
        state.players[0]!.workPiles[0] = [card('hearts', 1)];
      }
    });

    it('broadcasts update on valid move', () => {
      const move: CardMove = {
        type: 'card',
        playerId: 'player1',
        source: { type: 'work', pileIndex: 0 },
        destination: { type: 'foundation', foundationIndex: 0 }, // hearts foundation
      };

      const result = gameManager.processMove('player1', move);

      expect(result.success).toBe(true);
      expect(broadcastFn).toHaveBeenCalledTimes(1);
      expect(broadcastFn).toHaveBeenCalledWith(
        'ROOM1',
        expect.objectContaining({
          sequence: 1,
          delta: expect.objectContaining({
            type: 'cardMoved',
          }),
        })
      );
    });

    it('sends rejection on invalid move', () => {
      const move: CardMove = {
        type: 'card',
        playerId: 'player1',
        source: { type: 'work', pileIndex: 0 },
        destination: { type: 'foundation', foundationIndex: 1 }, // wrong suit (diamonds)
      };

      const result = gameManager.processMove('player1', move);

      expect(result.success).toBe(false);
      expect(rejectFn).toHaveBeenCalledTimes(1);
      expect(rejectFn).toHaveBeenCalledWith(
        'player1',
        expect.objectContaining({
          move,
          error: 'wrong_suit_for_foundation',
        })
      );
      expect(broadcastFn).not.toHaveBeenCalled();
    });

    it('rejects move for wrong player', () => {
      const move: CardMove = {
        type: 'card',
        playerId: 'player2', // Not in the game
        source: { type: 'work', pileIndex: 0 },
        destination: { type: 'foundation', foundationIndex: 0 },
      };

      const result = gameManager.processMove('player1', move);

      expect(result.success).toBe(false);
      expect(rejectFn).toHaveBeenCalledWith(
        'player1',
        expect.objectContaining({
          error: 'player_not_found',
          message: 'You cannot make moves for another player',
        })
      );
    });

    it('returns false for unknown socket', () => {
      const move: CardMove = {
        type: 'card',
        playerId: 'player1',
        source: { type: 'work', pileIndex: 0 },
        destination: { type: 'foundation', foundationIndex: 0 },
      };

      const result = gameManager.processMove('unknown-socket', move);

      expect(result.success).toBe(false);
    });
  });

  describe('processFoundationMove', () => {
    const aceOfHearts: Card = { suit: 'hearts', rank: 1, deckId: 'deck1' };
    const twoOfHearts: Card = { suit: 'hearts', rank: 2, deckId: 'deck1' };
    const threeOfHearts: Card = { suit: 'hearts', rank: 3, deckId: 'deck1' };
    const aceOfSpades: Card = { suit: 'spades', rank: 1, deckId: 'deck2' };

    beforeEach(() => {
      gameManager.initializeGame('ROOM1', 'game-123', ['player1', 'player2']);
    });

    describe('valid moves', () => {
      it('accepts Ace on empty foundation of matching suit', () => {
        const move: FoundationMovePayload = {
          card: aceOfHearts,
          foundationIndex: 0, // hearts
          source: { type: 'nertz' },
          clientSequence: 1,
        };

        const result = gameManager.processFoundationMove('ROOM1', 'player1', move);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.foundationIndex).toBe(0);
          expect(result.card).toEqual(aceOfHearts);
          expect(result.playerId).toBe('player1');
          expect(result.sequence).toBe(1);
        }
      });

      it('accepts next rank card on existing foundation', () => {
        // First place Ace
        const aceMove: FoundationMovePayload = {
          card: aceOfHearts,
          foundationIndex: 0,
          source: { type: 'nertz' },
          clientSequence: 1,
        };
        gameManager.processFoundationMove('ROOM1', 'player1', aceMove);

        // Then place 2
        const twoMove: FoundationMovePayload = {
          card: twoOfHearts,
          foundationIndex: 0,
          source: { type: 'waste' },
          clientSequence: 2,
        };

        const result = gameManager.processFoundationMove('ROOM1', 'player2', twoMove);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.card).toEqual(twoOfHearts);
          expect(result.sequence).toBe(2);
        }
      });

      it('increments sequence for each successful move', () => {
        const aceMove: FoundationMovePayload = {
          card: aceOfHearts,
          foundationIndex: 0,
          source: { type: 'nertz' },
          clientSequence: 1,
        };
        const result1 = gameManager.processFoundationMove('ROOM1', 'player1', aceMove);

        const twoMove: FoundationMovePayload = {
          card: twoOfHearts,
          foundationIndex: 0,
          source: { type: 'waste' },
          clientSequence: 2,
        };
        const result2 = gameManager.processFoundationMove('ROOM1', 'player2', twoMove);

        expect(result1.success && result1.sequence).toBe(1);
        expect(result2.success && result2.sequence).toBe(2);
        expect(gameManager.getSequence('ROOM1')).toBe(2);
      });
    });

    describe('invalid moves', () => {
      it('rejects non-Ace on empty foundation', () => {
        const move: FoundationMovePayload = {
          card: twoOfHearts,
          foundationIndex: 0,
          source: { type: 'nertz' },
          clientSequence: 1,
        };

        const result = gameManager.processFoundationMove('ROOM1', 'player1', move);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe('invalid_move');
          expect(result.clientSequence).toBe(1);
          expect(result.currentState.foundationIndex).toBe(0);
          expect(result.currentState.topRank).toBeNull();
        }
      });

      it('rejects wrong suit', () => {
        const move: FoundationMovePayload = {
          card: aceOfSpades,
          foundationIndex: 0, // hearts pile
          source: { type: 'nertz' },
          clientSequence: 1,
        };

        const result = gameManager.processFoundationMove('ROOM1', 'player1', move);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe('invalid_move');
        }
      });

      it('rejects skipping ranks', () => {
        // Place Ace first
        const aceMove: FoundationMovePayload = {
          card: aceOfHearts,
          foundationIndex: 0,
          source: { type: 'nertz' },
          clientSequence: 1,
        };
        gameManager.processFoundationMove('ROOM1', 'player1', aceMove);

        // Try to place 3 (skipping 2)
        const threeMove: FoundationMovePayload = {
          card: threeOfHearts,
          foundationIndex: 0,
          source: { type: 'nertz' },
          clientSequence: 2,
        };

        const result = gameManager.processFoundationMove('ROOM1', 'player2', threeMove);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe('invalid_move');
          expect(result.currentState.topRank).toBe(1); // Ace is on top
        }
      });

      it('rejects move from player not in game', () => {
        const move: FoundationMovePayload = {
          card: aceOfHearts,
          foundationIndex: 0,
          source: { type: 'nertz' },
          clientSequence: 1,
        };

        const result = gameManager.processFoundationMove('ROOM1', 'unknown-player', move);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe('player_not_in_game');
        }
      });

      it('rejects move for non-existent game', () => {
        const move: FoundationMovePayload = {
          card: aceOfHearts,
          foundationIndex: 0,
          source: { type: 'nertz' },
          clientSequence: 1,
        };

        const result = gameManager.processFoundationMove('INVALID', 'player1', move);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe('game_not_found');
        }
      });

      it('rejects invalid foundation index', () => {
        const move: FoundationMovePayload = {
          card: aceOfHearts,
          foundationIndex: 10,
          source: { type: 'nertz' },
          clientSequence: 1,
        };

        const result = gameManager.processFoundationMove('ROOM1', 'player1', move);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe('invalid_foundation_index');
        }
      });
    });

    describe('conflict resolution (first-received-wins)', () => {
      it('first player to play Ace wins, second is rejected', () => {
        const aceFromPlayer1: FoundationMovePayload = {
          card: aceOfHearts,
          foundationIndex: 0,
          source: { type: 'nertz' },
          clientSequence: 1,
        };

        const aceFromPlayer2: FoundationMovePayload = {
          card: { ...aceOfHearts, deckId: 'deck2' },
          foundationIndex: 0,
          source: { type: 'nertz' },
          clientSequence: 1,
        };

        // Player 1's move is processed first
        const result1 = gameManager.processFoundationMove('ROOM1', 'player1', aceFromPlayer1);
        expect(result1.success).toBe(true);

        // Player 2's move arrives after - rejected because Ace is already there
        const result2 = gameManager.processFoundationMove('ROOM1', 'player2', aceFromPlayer2);
        expect(result2.success).toBe(false);
        if (!result2.success) {
          expect(result2.error).toBe('invalid_move');
          expect(result2.currentState.topRank).toBe(1);
        }
      });

      it('racing for 2 after Ace - first received wins', () => {
        // Set up: Ace is already placed
        const aceMove: FoundationMovePayload = {
          card: aceOfHearts,
          foundationIndex: 0,
          source: { type: 'nertz' },
          clientSequence: 1,
        };
        gameManager.processFoundationMove('ROOM1', 'player1', aceMove);

        // Both players try to place 2
        const twoFromP1: FoundationMovePayload = {
          card: twoOfHearts,
          foundationIndex: 0,
          source: { type: 'waste' },
          clientSequence: 2,
        };

        const twoFromP2: FoundationMovePayload = {
          card: { ...twoOfHearts, deckId: 'deck2' },
          foundationIndex: 0,
          source: { type: 'nertz' },
          clientSequence: 1,
        };

        // Player 1 wins the race
        const result1 = gameManager.processFoundationMove('ROOM1', 'player1', twoFromP1);
        expect(result1.success).toBe(true);

        // Player 2's 2 is rejected because 2 is already placed
        const result2 = gameManager.processFoundationMove('ROOM1', 'player2', twoFromP2);
        expect(result2.success).toBe(false);
        if (!result2.success) {
          expect(result2.currentState.topRank).toBe(2);
        }
      });
    });
  });

  describe('processNertzCall', () => {
    it('broadcasts nertz call when nertz pile is empty', () => {
      gameManager.initializeGame('ROOM1', 'game-123', ['player1']);
      // Nertz pile starts empty in our test setup

      const result = gameManager.processNertzCall('player1');

      expect(result.success).toBe(true);
      expect(broadcastFn).toHaveBeenCalledWith(
        'ROOM1',
        expect.objectContaining({
          delta: expect.objectContaining({
            type: 'nertzCalled',
            playerId: 'player1',
          }),
        })
      );
    });

    it('fails when nertz pile is not empty', () => {
      gameManager.initializeGame('ROOM1', 'game-123', ['player1']);
      // Add a card to nertz pile
      const state = gameManager.getGameState('ROOM1');
      if (state) {
        state.players[0]!.nertzPile = [card('hearts', 1)];
      }

      const result = gameManager.processNertzCall('player1');

      expect(result.success).toBe(false);
      expect(broadcastFn).not.toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('returns game info on disconnect', () => {
      gameManager.initializeGame('ROOM1', 'game-123', ['player1']);

      const result = gameManager.handleDisconnect('player1');

      expect(result.gameId).toBe('game-123');
      expect(result.roomCode).toBe('ROOM1');
    });

    it('removes socket mapping', () => {
      gameManager.initializeGame('ROOM1', 'game-123', ['player1']);

      gameManager.handleDisconnect('player1');

      const game = gameManager.getGame('ROOM1');
      expect(game?.playerSockets.has('player1')).toBe(false);
    });
  });

  describe('handlePlayerLeave', () => {
    beforeEach(() => {
      gameManager.initializeGame('ROOM1', 'game-123', ['player1', 'player2', 'player3']);
    });

    it('removes player from game', () => {
      gameManager.handlePlayerLeave('ROOM1', 'player1');

      const game = gameManager.getGame('ROOM1');
      expect(game?.playerSockets.has('player1')).toBe(false);
      expect(game?.playerSockets.has('player2')).toBe(true);
    });

    it('cleans up game when all players leave', () => {
      gameManager.handlePlayerLeave('ROOM1', 'player1');
      gameManager.handlePlayerLeave('ROOM1', 'player2');
      gameManager.handlePlayerLeave('ROOM1', 'player3');

      expect(gameManager.getGameState('ROOM1')).toBeNull();
    });

    it('handles leaving from non-existent game gracefully', () => {
      // Should not throw
      gameManager.handlePlayerLeave('INVALID', 'player1');
    });
  });

  describe('cleanupGame', () => {
    it('removes game state', () => {
      gameManager.initializeGame('ROOM1', 'game-123', ['player1', 'player2']);
      gameManager.cleanupGame('ROOM1');

      expect(gameManager.getGameState('ROOM1')).toBeNull();
      expect(gameManager.getFoundations('ROOM1')).toBeNull();
    });

    it('handles cleanup of non-existent game gracefully', () => {
      // Should not throw
      gameManager.cleanupGame('INVALID');
    });
  });

  describe('getGameState', () => {
    it('returns game state for valid room', () => {
      gameManager.initializeGame('ROOM1', 'game-123', ['player1']);

      const state = gameManager.getGameState('ROOM1');

      expect(state).toBeDefined();
      expect(state?.gameId).toBe('game-123');
    });

    it('returns null for unknown room', () => {
      const state = gameManager.getGameState('unknown');
      expect(state).toBeNull();
    });
  });

  describe('getSequence', () => {
    it('returns current sequence number', () => {
      gameManager.initializeGame('ROOM1', 'game-123', ['player1']);

      expect(gameManager.getSequence('ROOM1')).toBe(0);

      // Make a foundation move to increment sequence
      const move: FoundationMovePayload = {
        card: card('hearts', 1),
        foundationIndex: 0,
        source: { type: 'nertz' },
        clientSequence: 1,
      };
      gameManager.processFoundationMove('ROOM1', 'player1', move);

      expect(gameManager.getSequence('ROOM1')).toBe(1);
    });

    it('returns 0 for unknown room', () => {
      expect(gameManager.getSequence('unknown')).toBe(0);
    });
  });

  describe('multiplayer game flow', () => {
    it('handles complete foundation building by multiple players', () => {
      gameManager.initializeGame('GAME', 'game-001', ['alice', 'bob', 'charlie']);

      // Alice plays Ace of Hearts
      const result1 = gameManager.processFoundationMove('GAME', 'alice', {
        card: { suit: 'hearts', rank: 1, deckId: 'alice-deck' },
        foundationIndex: 0,
        source: { type: 'nertz' },
        clientSequence: 1,
      });
      expect(result1.success).toBe(true);

      // Bob plays 2 of Hearts
      const result2 = gameManager.processFoundationMove('GAME', 'bob', {
        card: { suit: 'hearts', rank: 2, deckId: 'bob-deck' },
        foundationIndex: 0,
        source: { type: 'waste' },
        clientSequence: 1,
      });
      expect(result2.success).toBe(true);

      // Charlie plays 3 of Hearts
      const result3 = gameManager.processFoundationMove('GAME', 'charlie', {
        card: { suit: 'hearts', rank: 3, deckId: 'charlie-deck' },
        foundationIndex: 0,
        source: { type: 'nertz' },
        clientSequence: 1,
      });
      expect(result3.success).toBe(true);

      // Verify foundation state
      const foundations = gameManager.getFoundations('GAME');
      expect(foundations![0]!.cards).toHaveLength(3);
      expect(foundations![0]!.cards[0]!.rank).toBe(1);
      expect(foundations![0]!.cards[1]!.rank).toBe(2);
      expect(foundations![0]!.cards[2]!.rank).toBe(3);

      // Verify sequence
      expect(gameManager.getSequence('GAME')).toBe(3);
    });

    it('handles multiple foundation piles being built simultaneously', () => {
      gameManager.initializeGame('GAME', 'game-001', ['alice', 'bob']);

      // Alice plays Ace of Hearts
      gameManager.processFoundationMove('GAME', 'alice', {
        card: { suit: 'hearts', rank: 1, deckId: 'alice-deck' },
        foundationIndex: 0,
        source: { type: 'nertz' },
        clientSequence: 1,
      });

      // Bob plays Ace of Spades (different pile)
      gameManager.processFoundationMove('GAME', 'bob', {
        card: { suit: 'spades', rank: 1, deckId: 'bob-deck' },
        foundationIndex: 3, // spades
        source: { type: 'nertz' },
        clientSequence: 1,
      });

      const foundations = gameManager.getFoundations('GAME');
      expect(foundations![0]!.cards).toHaveLength(1); // hearts
      expect(foundations![3]!.cards).toHaveLength(1); // spades
      expect(gameManager.getSequence('GAME')).toBe(2);
    });
  });
});
