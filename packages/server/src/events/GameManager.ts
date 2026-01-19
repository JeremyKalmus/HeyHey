// HeyHey! Game Manager
// Manages active game sessions with state synchronization
// Includes foundation conflict resolution (first-received-wins)

import type {
  Card,
  GameState,
  Move,
  MoveRejection,
  StateUpdate,
  FoundationPile,
  FoundationMovePayload,
  ScoringState,
  RoundResult,
  OpponentStateUpdatePayload,
} from '@heyhey/shared';
import {
  StateManager,
  getErrorMessage,
  canPlaceOnFoundation,
  calculateRoundResult,
  applyRoundResult,
  createScoringState,
} from '@heyhey/shared';

interface ActiveGame {
  gameId: string;
  roomCode: string;
  stateManager: StateManager;
  playerSockets: Map<string, string>; // playerId -> socketId
  sequence: number; // Global sequence number for foundation moves
  scoringState: ScoringState; // Accumulated scores across rounds
}

export type BroadcastFn = (roomCode: string, update: StateUpdate) => void;
export type RejectFn = (socketId: string, rejection: MoveRejection) => void;
export type BroadcastOpponentStateFn = (roomCode: string, payload: OpponentStateUpdatePayload, excludePlayerId: string) => void;

export type FoundationMoveResult =
  | {
      success: true;
      foundationIndex: number;
      card: Card;
      playerId: string;
      sequence: number;
    }
  | {
      success: false;
      error: string;
      clientSequence: number;
      currentState: {
        foundationIndex: number;
        topRank: number | null;
      };
    };

export type StartRoundResult =
  | {
      success: true;
      starterId: string;
      starterName: string;
      roundNumber: number;
    }
  | {
      success: false;
      error: string;
    };

export type RoundEndResult =
  | {
      success: true;
      roundResult: RoundResult;
      totalScores: { playerId: string; total: number }[];
      gameOver: boolean;
      winner?: string;
    }
  | {
      success: false;
      error: string;
    };

export type PlayerReadyResult =
  | {
      success: true;
      playerId: string;
      allReady: boolean;
      nextRoundNumber?: number;
      nextStarterId?: string;
    }
  | {
      success: false;
      error: string;
    };

/**
 * Manages active game sessions and state synchronization
 */
export class GameManager {
  private games: Map<string, ActiveGame> = new Map(); // roomCode -> ActiveGame
  private socketToRoom: Map<string, string> = new Map(); // socketId -> roomCode
  private readyForNextRound: Map<string, Set<string>> = new Map(); // roomCode -> Set of ready playerIds
  private broadcast: BroadcastFn;
  private reject: RejectFn;
  private broadcastOpponentStateFn: BroadcastOpponentStateFn;

  constructor(broadcast?: BroadcastFn, reject?: RejectFn, broadcastOpponentState?: BroadcastOpponentStateFn) {
    this.broadcast = broadcast ?? (() => {});
    this.reject = reject ?? (() => {});
    this.broadcastOpponentStateFn = broadcastOpponentState ?? (() => {});
  }

  /**
   * Initialize a new game for a room
   */
  initializeGame(
    roomCode: string,
    gameId: string,
    playerIds: string[]
  ): void {
    // Create initial game state
    // Each player gets 4 foundation piles (one per suit)
    // Foundation index = playerIndex * 4 + suitIndex
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
    const foundations: FoundationPile[] = playerIds.flatMap((playerId) =>
      suits.map((suit) => ({ suit, cards: [], ownerId: playerId }))
    );

    const initialState: GameState = {
      gameId,
      phase: 'waiting_for_start',
      players: playerIds.map((playerId) => ({
        playerId,
        deckId: playerId,
        nertzPile: [],
        workPiles: [[], [], [], []],
        stockPile: [],
        wastePile: [],
      })),
      foundations,
      config: { nertzPileSize: 13, drawCount: 3, targetScore: 100 },
      roundNumber: 1,
      currentStarterIndex: 0,
    };

    const stateManager = new StateManager(initialState);
    const playerSockets = new Map<string, string>();

    // Map player IDs to socket IDs (they're the same in our setup)
    for (const playerId of playerIds) {
      playerSockets.set(playerId, playerId);
      this.socketToRoom.set(playerId, roomCode);
    }

    // Initialize scoring state
    const scoringState = createScoringState(playerIds, initialState.config.targetScore);

    this.games.set(roomCode, {
      gameId,
      roomCode,
      stateManager,
      playerSockets,
      sequence: 0,
      scoringState,
    });
  }

  /**
   * Process a move from a player
   * Validates, applies, and broadcasts or rejects
   */
  processMove(socketId: string, move: Move): { success: boolean } {
    const roomCode = this.socketToRoom.get(socketId);
    if (!roomCode) {
      return { success: false };
    }

    const game = this.games.get(roomCode);
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
      // Note: result.error is typed as string in ApplyMoveResult but values match MoveValidationError
      const errorCode = result.error as import('@heyhey/shared').MoveValidationError;
      this.reject(socketId, {
        move,
        error: errorCode,
        message: getErrorMessage(errorCode),
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
   * Process a foundation move with first-received-wins conflict resolution
   */
  processFoundationMove(
    roomCode: string,
    playerId: string,
    move: FoundationMovePayload
  ): FoundationMoveResult {
    const game = this.games.get(roomCode);

    if (!game) {
      return {
        success: false,
        error: 'game_not_found',
        clientSequence: move.clientSequence,
        currentState: {
          foundationIndex: move.foundationIndex,
          topRank: null,
        },
      };
    }

    // Validate player is in game
    if (!game.playerSockets.has(playerId)) {
      return {
        success: false,
        error: 'player_not_in_game',
        clientSequence: move.clientSequence,
        currentState: {
          foundationIndex: move.foundationIndex,
          topRank: this.getFoundationTopRank(game, move.foundationIndex),
        },
      };
    }

    const state = game.stateManager.getState();

    // Validate foundation index
    if (move.foundationIndex < 0 || move.foundationIndex >= state.foundations.length) {
      return {
        success: false,
        error: 'invalid_foundation_index',
        clientSequence: move.clientSequence,
        currentState: {
          foundationIndex: move.foundationIndex,
          topRank: null,
        },
      };
    }

    const foundation = state.foundations[move.foundationIndex]!;

    // Validate move using shared rules engine
    // This is the conflict resolution point - first valid move received wins
    if (!canPlaceOnFoundation(move.card, foundation)) {
      return {
        success: false,
        error: 'invalid_move',
        clientSequence: move.clientSequence,
        currentState: {
          foundationIndex: move.foundationIndex,
          topRank: this.getFoundationTopRank(game, move.foundationIndex),
        },
      };
    }

    // Move is valid - apply it (first-received-wins)
    foundation.cards.push(move.card);
    game.sequence++;

    return {
      success: true,
      foundationIndex: move.foundationIndex,
      card: move.card,
      playerId,
      sequence: game.sequence,
    };
  }

  /**
   * Process a Nertz call from a player
   */
  processNertzCall(socketId: string): { success: boolean } {
    const roomCode = this.socketToRoom.get(socketId);
    if (!roomCode) {
      return { success: false };
    }

    const game = this.games.get(roomCode);
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
   * Process round end after Nertz is called
   * Calculates scores and updates scoring state
   */
  processRoundEnd(roomCode: string): RoundEndResult {
    const game = this.games.get(roomCode);
    if (!game) {
      return { success: false, error: 'game_not_found' };
    }

    const state = game.stateManager.getState();

    // Verify nertz was called (calledBy should be set)
    if (!state.calledBy) {
      return { success: false, error: 'nertz_not_called' };
    }

    // Calculate round result
    const roundResult = calculateRoundResult(state, state.roundNumber);

    // Apply to scoring state
    const result = applyRoundResult(game.scoringState, roundResult);
    game.scoringState = result.scoringState;

    return {
      success: true,
      roundResult,
      totalScores: result.scoringState.totalScores,
      gameOver: result.gameOver,
      winner: result.winner,
    };
  }

  /**
   * Process a player ready for next round
   * Returns whether all players are now ready
   */
  processPlayerReady(roomCode: string, playerId: string): PlayerReadyResult {
    const game = this.games.get(roomCode);
    if (!game) {
      return { success: false, error: 'game_not_found' };
    }

    // Verify player is in game
    if (!game.playerSockets.has(playerId)) {
      return { success: false, error: 'player_not_in_game' };
    }

    // Get or create ready set for this room
    let readySet = this.readyForNextRound.get(roomCode);
    if (!readySet) {
      readySet = new Set();
      this.readyForNextRound.set(roomCode, readySet);
    }

    // Add player to ready set
    readySet.add(playerId);

    // Check if all players are ready
    const allReady = readySet.size >= game.playerSockets.size;

    if (allReady) {
      // Calculate next round info
      const state = game.stateManager.getState();
      const nextRoundNumber = state.roundNumber + 1;
      const nextStarterIndex = (nextRoundNumber - 1) % state.players.length;
      const nextStarter = state.players[nextStarterIndex];

      return {
        success: true,
        playerId,
        allReady: true,
        nextRoundNumber,
        nextStarterId: nextStarter?.playerId,
      };
    }

    return {
      success: true,
      playerId,
      allReady: false,
    };
  }

  /**
   * Clear ready state for a room (call when transitioning to next round)
   */
  clearReadyState(roomCode: string): void {
    this.readyForNextRound.delete(roomCode);
  }

  /**
   * Get players who are ready for next round
   */
  getReadyPlayers(roomCode: string): string[] {
    const readySet = this.readyForNextRound.get(roomCode);
    return readySet ? Array.from(readySet) : [];
  }

  /**
   * Prepare for next round - update state and clear ready status
   */
  prepareNextRound(roomCode: string): boolean {
    const game = this.games.get(roomCode);
    if (!game) return false;

    const state = game.stateManager.getState();

    // Update round number
    const nextRoundNumber = state.roundNumber + 1;
    (state as { roundNumber: number }).roundNumber = nextRoundNumber;

    // Update starter index
    const nextStarterIndex = (nextRoundNumber - 1) % state.players.length;
    (state as { currentStarterIndex: number }).currentStarterIndex = nextStarterIndex;

    // Clear calledBy for new round
    delete (state as { calledBy?: string }).calledBy;

    // Transition to waiting_for_start
    (state as { phase: string }).phase = 'waiting_for_start';

    // Clear foundations for new round
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
    state.foundations = state.players.flatMap((player) =>
      suits.map((suit) => ({ suit, cards: [], ownerId: player.playerId }))
    );

    // Clear ready state
    this.clearReadyState(roomCode);

    return true;
  }

  /**
   * Process a round start request
   * Only the current starter can start the round
   */
  processStartRound(roomCode: string, playerId: string): StartRoundResult {
    const game = this.games.get(roomCode);
    if (!game) {
      return { success: false, error: 'game_not_found' };
    }

    const state = game.stateManager.getState();

    // Verify game is in waiting_for_start phase
    if (state.phase !== 'waiting_for_start') {
      return { success: false, error: 'not_in_waiting_phase' };
    }

    // Calculate who should be the starter
    // Rotation formula: starterIndex = (roundNumber - 1) % players.length
    const starterIndex = (state.roundNumber - 1) % state.players.length;
    const starter = state.players[starterIndex];

    if (!starter || starter.playerId !== playerId) {
      return { success: false, error: 'not_starter' };
    }

    // Get starter name from playerSockets (in real impl, would come from room state)
    const starterName = starter.playerId; // Using playerId as name for now

    return {
      success: true,
      starterId: starter.playerId,
      starterName,
      roundNumber: state.roundNumber,
    };
  }

  /**
   * Transition game from waiting_for_start to playing phase
   */
  transitionToPlaying(roomCode: string): boolean {
    const game = this.games.get(roomCode);
    if (!game) return false;

    const state = game.stateManager.getState();
    if (state.phase !== 'waiting_for_start') return false;

    // Update phase directly (StateManager doesn't have a method for this)
    (state as { phase: string }).phase = 'playing';
    return true;
  }

  /**
   * Get current starter info for a room
   */
  getCurrentStarter(roomCode: string): { playerId: string; index: number } | null {
    const game = this.games.get(roomCode);
    if (!game) return null;

    const state = game.stateManager.getState();
    const starterIndex = (state.roundNumber - 1) % state.players.length;
    const starter = state.players[starterIndex];

    if (!starter) return null;

    return {
      playerId: starter.playerId,
      index: starterIndex,
    };
  }

  /**
   * Get game state for a room
   */
  getGameState(roomCode: string): GameState | null {
    const game = this.games.get(roomCode);
    if (!game) return null;
    return game.stateManager.getState();
  }

  /**
   * Get foundations for a room
   */
  getFoundations(roomCode: string): FoundationPile[] | null {
    const game = this.games.get(roomCode);
    if (!game) return null;
    return game.stateManager.getState().foundations;
  }

  /**
   * Get current sequence number for a game
   */
  getSequence(roomCode: string): number {
    const game = this.games.get(roomCode);
    if (!game) return 0;
    return game.sequence;
  }

  /**
   * Handle player disconnect
   */
  handleDisconnect(socketId: string): { gameId?: string; roomCode?: string } {
    const roomCode = this.socketToRoom.get(socketId);
    if (!roomCode) return {};

    const game = this.games.get(roomCode);
    if (!game) return {};

    // Find and remove the player
    for (const [playerId, sId] of game.playerSockets.entries()) {
      if (sId === socketId) {
        game.playerSockets.delete(playerId);
        break;
      }
    }

    this.socketToRoom.delete(socketId);

    return { gameId: game.gameId, roomCode: game.roomCode };
  }

  /**
   * Handle player leaving during game
   */
  handlePlayerLeave(roomCode: string, playerId: string): void {
    const game = this.games.get(roomCode);
    if (!game) return;

    game.playerSockets.delete(playerId);
    this.socketToRoom.delete(playerId);

    // If no players left, clean up the game
    if (game.playerSockets.size === 0) {
      this.games.delete(roomCode);
    }
  }

  /**
   * Clean up a finished game
   */
  cleanupGame(roomCode: string): void {
    const game = this.games.get(roomCode);
    if (!game) return;

    // Remove all socket mappings
    for (const socketId of game.playerSockets.values()) {
      this.socketToRoom.delete(socketId);
    }

    this.games.delete(roomCode);
    this.readyForNextRound.delete(roomCode);
  }

  /**
   * Get game by room code (for testing)
   */
  getGame(roomCode: string): ActiveGame | undefined {
    return this.games.get(roomCode);
  }

  /**
   * Broadcast a player's visible state to all opponents (ADR-009)
   * Called after moves, draws, and flip stock actions
   */
  broadcastOpponentState(roomCode: string, playerId: string): void {
    const game = this.games.get(roomCode);
    if (!game) return;

    const state = game.stateManager.getState();
    const playerState = state.players.find(p => p.playerId === playerId);
    if (!playerState) return;

    // Build opponent state payload with only visible (face-up) information
    const payload: OpponentStateUpdatePayload = {
      playerId,
      stockCount: playerState.stockPile.length,
      wasteTopCard: playerState.wastePile.length > 0
        ? playerState.wastePile[playerState.wastePile.length - 1]
        : undefined,
      nertzCount: playerState.nertzPile.length,
      nertzTopCard: playerState.nertzPile.length > 0
        ? playerState.nertzPile[playerState.nertzPile.length - 1]
        : undefined,
      // Work piles: send all face-up cards (in Nertz, all work pile cards are face-up)
      workPiles: playerState.workPiles,
    };

    // Broadcast to all players except the one who made the move
    this.broadcastOpponentStateFn(roomCode, payload, playerId);
  }

  /**
   * Broadcast all players' visible states to all opponents (ADR-009)
   * Called when a round starts so everyone can see initial opponent states
   */
  broadcastAllOpponentStates(roomCode: string): void {
    const game = this.games.get(roomCode);
    if (!game) return;

    const state = game.stateManager.getState();

    // For each player, broadcast their state to all other players
    for (const playerState of state.players) {
      this.broadcastOpponentState(roomCode, playerState.playerId);
    }
  }

  /**
   * Get the top card rank of a foundation (for rejection messages)
   */
  private getFoundationTopRank(game: ActiveGame, foundationIndex: number): number | null {
    const state = game.stateManager.getState();
    const foundation = state.foundations[foundationIndex];
    if (!foundation || foundation.cards.length === 0) {
      return null;
    }
    return foundation.cards[foundation.cards.length - 1]!.rank;
  }
}
