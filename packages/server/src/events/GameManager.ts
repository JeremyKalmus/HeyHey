// HeyHey! Game Manager
// Manages active game sessions with state synchronization

import type {
  GameState,
  Move,
  MoveRejection,
  StateUpdate,
} from '@heyhey/shared';
import { StateManager, getErrorMessage } from '@heyhey/shared';

interface ActiveGame {
  gameId: string;
  roomCode: string;
  stateManager: StateManager;
  playerSockets: Map<string, string>; // playerId -> socketId
}

export type BroadcastFn = (roomCode: string, update: StateUpdate) => void;
export type RejectFn = (socketId: string, rejection: MoveRejection) => void;

/**
 * Manages active game sessions and state synchronization
 */
export class GameManager {
  private games: Map<string, ActiveGame> = new Map(); // gameId -> ActiveGame
  private socketToGame: Map<string, string> = new Map(); // socketId -> gameId
  private broadcast: BroadcastFn;
  private reject: RejectFn;

  constructor(broadcast: BroadcastFn, reject: RejectFn) {
    this.broadcast = broadcast;
    this.reject = reject;
  }

  /**
   * Initialize a new game
   */
  initializeGame(
    gameId: string,
    roomCode: string,
    initialState: GameState,
    playerSockets: Map<string, string>
  ): void {
    const stateManager = new StateManager(initialState);

    this.games.set(gameId, {
      gameId,
      roomCode,
      stateManager,
      playerSockets,
    });

    // Track socket -> game mapping
    for (const socketId of playerSockets.values()) {
      this.socketToGame.set(socketId, gameId);
    }
  }

  /**
   * Process a move from a player
   * Validates, applies, and broadcasts or rejects
   */
  processMove(socketId: string, move: Move): { success: boolean } {
    const gameId = this.socketToGame.get(socketId);
    if (!gameId) {
      return { success: false };
    }

    const game = this.games.get(gameId);
    if (!game) {
      return { success: false };
    }

    // Verify the socket owns this player
    const expectedSocketId = game.playerSockets.get(move.playerId);
    if (expectedSocketId !== socketId) {
      this.reject(socketId, {
        move,
        error: 'player_not_found',
        message: 'You cannot make moves for another player',
        timestamp: Date.now(),
      });
      return { success: false };
    }

    // Apply the move
    const result = game.stateManager.applyMove(move);

    if (!result.success) {
      // Send rejection to the individual player
      this.reject(socketId, {
        move,
        error: result.error as any,
        message: getErrorMessage(result.error as any),
        timestamp: Date.now(),
      });
      return { success: false };
    }

    // Create sequenced update and broadcast to all players
    const update = game.stateManager.createUpdate(result.delta);
    this.broadcast(game.roomCode, update);

    return { success: true };
  }

  /**
   * Process a Nertz call from a player
   */
  processNertzCall(socketId: string): { success: boolean } {
    const gameId = this.socketToGame.get(socketId);
    if (!gameId) {
      return { success: false };
    }

    const game = this.games.get(gameId);
    if (!game) {
      return { success: false };
    }

    // Find the player ID for this socket
    let playerId: string | undefined;
    for (const [pId, sId] of game.playerSockets.entries()) {
      if (sId === socketId) {
        playerId = pId;
        break;
      }
    }

    if (!playerId) {
      return { success: false };
    }

    const result = game.stateManager.callNertz(playerId);

    if (!result.success) {
      // Nertz call failed - player's nertz pile not empty
      return { success: false };
    }

    // Broadcast the nertz call
    const update = game.stateManager.createUpdate(result.delta);
    this.broadcast(game.roomCode, update);

    return { success: true };
  }

  /**
   * Get game state for a socket
   */
  getGameState(socketId: string): GameState | null {
    const gameId = this.socketToGame.get(socketId);
    if (!gameId) return null;

    const game = this.games.get(gameId);
    if (!game) return null;

    return game.stateManager.getState();
  }

  /**
   * Get current sequence number for a game
   */
  getSequence(socketId: string): number {
    const gameId = this.socketToGame.get(socketId);
    if (!gameId) return 0;

    const game = this.games.get(gameId);
    if (!game) return 0;

    return game.stateManager.getSequence();
  }

  /**
   * Get game ID for a socket
   */
  getGameId(socketId: string): string | undefined {
    return this.socketToGame.get(socketId);
  }

  /**
   * Handle player disconnect
   */
  handleDisconnect(socketId: string): { gameId?: string; roomCode?: string } {
    const gameId = this.socketToGame.get(socketId);
    if (!gameId) return {};

    const game = this.games.get(gameId);
    if (!game) return {};

    // Find and remove the player
    for (const [playerId, sId] of game.playerSockets.entries()) {
      if (sId === socketId) {
        game.playerSockets.delete(playerId);
        break;
      }
    }

    this.socketToGame.delete(socketId);

    return { gameId, roomCode: game.roomCode };
  }

  /**
   * Clean up a finished game
   */
  cleanupGame(gameId: string): void {
    const game = this.games.get(gameId);
    if (!game) return;

    // Remove all socket mappings
    for (const socketId of game.playerSockets.values()) {
      this.socketToGame.delete(socketId);
    }

    this.games.delete(gameId);
  }

  /**
   * Get game by ID (for testing)
   */
  getGame(gameId: string): ActiveGame | undefined {
    return this.games.get(gameId);
  }
}
