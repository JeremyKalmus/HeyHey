/**
 * HeyHey! Game Manager
 * Manages active game sessions with state synchronization.
 * Includes foundation conflict resolution (first-received-wins).
 *
 * ## Activity Tracking Architecture
 *
 * This module owns **game-level** and **player-level** activity tracking.
 * Activity tracking exists at three levels across the server:
 *
 * | Level   | Owner        | Purpose                      | Timeouts                    |
 * |---------|--------------|------------------------------|------------------------------|
 * | Room    | LobbyManager | Lobby room garbage collection| Empty: 5m, Inactive: 30m    |
 * | Game    | GameManager  | Abandoned game cleanup       | Disconnect: 5m, Inactive: 30m|
 * | Player  | GameManager  | In-game UI feedback          | Configurable thresholds      |
 *
 * ### GameManager Responsibilities (this module):
 *
 * **Game-level activity** (ActiveGame.lastActivityAt):
 * - Track when the game last had any move/action
 * - Clean up abandoned games after 30 minutes inactivity
 * - Handle player disconnection with 5 minute reconnect window
 * - Methods: updateGameActivity(), cleanupAbandonedGames(), isGameAbandoned()
 *
 * **Player-level activity** (PlayerActivityState):
 * - Track individual player inactivity during gameplay
 * - Broadcast status changes to other players (warning → inactive → disconnected)
 * - Allows UI to show "Player X is inactive" indicators
 * - Methods: updatePlayerActivity(), getPlayerInactivityStatus(), checkAllGamesInactivity()
 *
 * ### Coordination with LobbyManager:
 * - When game starts: LobbyManager.markRoomHasGame(code, true) - prevents room cleanup
 * - When game abandoned: Cleanup sweep calls LobbyManager.markRoomHasGame(code, false)
 * - This ensures only ONE manager is responsible for cleanup at any time
 *
 * ### Cleanup Flow:
 * 1. Periodic cleanup sweep runs every 5 minutes (lobbyEvents.ts)
 * 2. LobbyManager.cleanupExpiredRooms() handles lobby rooms (skips rooms with games)
 * 3. GameManager.cleanupAbandonedGames() handles active games
 * 4. If game is abandoned → lobbyEvents.ts calls markRoomHasGame(false)
 *
 * @see LobbyManager for room-level activity tracking
 */

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
  InactivityStatus,
  InactivityConfig,
  PlayerInactivityUpdatePayload,
} from '@heyhey/shared';
import {
  StateManager,
  getErrorMessage,
  canPlaceOnFoundation,
  calculateRoundResult,
  applyRoundResult,
  createScoringState,
  DEFAULT_INACTIVITY_CONFIG,
} from '@heyhey/shared';
import { SocketRegistry } from '../services/SocketRegistry.js';

interface DisconnectedPlayer {
  playerId: string;
  playerName: string;
  disconnectedAt: number;
}

/**
 * Player-level activity state for in-game inactivity tracking.
 *
 * This is separate from game-level activity (ActiveGame.lastActivityAt).
 * Player activity tracks INDIVIDUAL player actions to show UI indicators
 * like "Player X is inactive" to other players.
 *
 * Status transitions: active → warning → inactive → disconnected
 * Each transition triggers a broadcast to all players via broadcastInactivityFn.
 *
 * @see LobbyManager.RoomActivity - For room-level activity (pre-game)
 * @see ActiveGame.lastActivityAt - For game-level activity (cleanup trigger)
 */
interface PlayerActivityState {
  /** Timestamp of player's last action (move, foundation play, etc.) */
  lastActivityTimestamp: number;
  /** Current inactivity status, broadcasted to other players on change */
  status: InactivityStatus;
  /** Player's display name for broadcast messages */
  playerName: string;
}

/**
 * State for tracking an active draw proposal.
 * A draw is proposed by one player and must be accepted by all others.
 */
interface DrawState {
  /** Player who proposed the draw */
  proposerId: string;
  /** Player name for broadcasts */
  proposerName: string;
  /** When the draw was proposed */
  proposedAt: number;
  /** Map of playerId -> accepted (true/false). Proposer auto-accepts. */
  responses: Map<string, boolean>;
  /** Timeout ID for auto-rejection after 30 seconds */
  timeoutId: ReturnType<typeof setTimeout>;
}

/**
 * Active game state including both game-level and player-level activity tracking.
 */
interface ActiveGame {
  gameId: string;
  roomCode: string;
  stateManager: StateManager;
  playerSockets: Map<string, string>; // playerId -> socketId
  disconnectedPlayers: Map<string, DisconnectedPlayer>; // playerId -> DisconnectedPlayer
  sequence: number; // Global sequence number for foundation moves
  scoringState: ScoringState; // Accumulated scores across rounds

  // === Player-level activity tracking (for UI feedback) ===
  /** Per-player activity state for inactivity indicators. @see PlayerActivityState */
  playerActivity: Map<string, PlayerActivityState>;
  /** Configurable thresholds for warning/inactive/disconnected status */
  inactivityConfig: InactivityConfig;

  // === Game-level activity tracking (for cleanup) ===
  /** When the game was created (for debugging/monitoring) */
  createdAt: number;
  /**
   * Last game-level activity timestamp. Updated on any move/action.
   * Used by cleanupAbandonedGames() - games inactive for 30 min are cleaned up.
   * Note: This is SEPARATE from playerActivity which tracks individual players.
   */
  lastActivityAt: number;

  playerNertzCounts: Map<string, number>; // playerId -> last reported nertz pile count (for scoring)

  // === Draw proposal tracking ===
  /** Active draw proposal state, if any */
  drawState?: DrawState;
}

/** Reconnection timeout in milliseconds (10 minutes) */
const RECONNECT_TIMEOUT_MS = 10 * 60 * 1000;
/** Game inactivity timeout: 30 minutes */
const GAME_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

/** Inactivity check interval in milliseconds (5 seconds) */
const INACTIVITY_CHECK_INTERVAL_MS = 5_000;

/** Draw proposal timeout in milliseconds (30 seconds) */
const DRAW_TIMEOUT_MS = 30_000;

export type BroadcastFn = (roomCode: string, update: StateUpdate) => void;
export type RejectFn = (socketId: string, rejection: MoveRejection) => void;
export type BroadcastOpponentStateFn = (roomCode: string, payload: OpponentStateUpdatePayload, excludePlayerId: string) => void;
export type BroadcastInactivityFn = (roomCode: string, payload: PlayerInactivityUpdatePayload) => void;
export type BroadcastDrawRejectedFn = (roomCode: string, rejectedBy: string, rejectedByName: string, reason: 'declined' | 'timeout') => void;

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

export type CallDrawResult =
  | {
      success: true;
      proposerId: string;
      proposerName: string;
      timeout: number;
      roomCode: string;
    }
  | {
      success: false;
      error: string;
    };

export type RespondToDrawResult =
  | {
      success: true;
      responderId: string;
      responderName: string;
      accepted: boolean;
      allAccepted: boolean;
      rejected: boolean;
      rejectedBy?: string;
      rejectedByName?: string;
      roomCode: string;
    }
  | {
      success: false;
      error: string;
    };

export type DrawRoundEndResult =
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

/**
 * Manages active game sessions and state synchronization
 */
export class GameManager {
  private games: Map<string, ActiveGame> = new Map(); // roomCode -> ActiveGame
  private socketRegistry: SocketRegistry;
  private readyForNextRound: Map<string, Set<string>> = new Map(); // roomCode -> Set of ready playerIds
  private broadcast: BroadcastFn;
  private reject: RejectFn;
  private broadcastOpponentStateFn: BroadcastOpponentStateFn;
  private broadcastInactivityFn: BroadcastInactivityFn;
  private broadcastDrawRejectedFn: BroadcastDrawRejectedFn;
  private inactivityCheckInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    broadcast?: BroadcastFn,
    reject?: RejectFn,
    broadcastOpponentState?: BroadcastOpponentStateFn,
    broadcastInactivity?: BroadcastInactivityFn,
    socketRegistry?: SocketRegistry,
    broadcastDrawRejected?: BroadcastDrawRejectedFn
  ) {
    this.broadcast = broadcast ?? (() => {});
    this.reject = reject ?? (() => {});
    this.broadcastOpponentStateFn = broadcastOpponentState ?? (() => {});
    this.broadcastInactivityFn = broadcastInactivity ?? (() => {});
    this.broadcastDrawRejectedFn = broadcastDrawRejected ?? (() => {});
    this.socketRegistry = socketRegistry ?? new SocketRegistry();

    // Start inactivity check interval
    this.startInactivityChecker();
  }

  /**
   * Start the periodic inactivity checker
   */
  private startInactivityChecker(): void {
    if (this.inactivityCheckInterval) return;

    this.inactivityCheckInterval = setInterval(() => {
      this.checkAllGamesInactivity();
    }, INACTIVITY_CHECK_INTERVAL_MS);
  }

  /**
   * Stop the inactivity checker (for cleanup)
   */
  stopInactivityChecker(): void {
    if (this.inactivityCheckInterval) {
      clearInterval(this.inactivityCheckInterval);
      this.inactivityCheckInterval = null;
    }
  }

  /**
   * Check inactivity for all active games
   */
  private checkAllGamesInactivity(): void {
    const now = Date.now();

    for (const [roomCode, game] of this.games.entries()) {
      // Only check inactivity during playing phase
      const state = game.stateManager.getState();
      if (state.phase !== 'playing') continue;

      for (const [playerId, activity] of game.playerActivity.entries()) {
        const timeSinceActivity = now - activity.lastActivityTimestamp;
        let newStatus: InactivityStatus = 'active';

        // Determine new status based on time thresholds
        if (timeSinceActivity >= game.inactivityConfig.disconnectedThresholdMs) {
          newStatus = 'disconnected';
        } else if (timeSinceActivity >= game.inactivityConfig.inactiveThresholdMs) {
          newStatus = 'inactive';
        } else if (timeSinceActivity >= game.inactivityConfig.warningThresholdMs) {
          newStatus = 'warning';
        }

        // Only broadcast if status changed
        if (newStatus !== activity.status) {
          activity.status = newStatus;

          this.broadcastInactivityFn(roomCode, {
            playerId,
            playerName: activity.playerName,
            status: newStatus,
            lastActivityTimestamp: activity.lastActivityTimestamp,
          });
        }
      }
    }
  }

  /**
   * Update player activity timestamp (call this when player takes any action).
   *
   * This is **player-level** activity tracking for UI feedback.
   * Updates the individual player's activity state and broadcasts status changes
   * to other players (e.g., "Player X is now active").
   *
   * Called from:
   * - processMove() - after successful move
   * - processFoundationMove() - after successful foundation play
   * - processNertzCall() - after nertz call
   *
   * Note: This also implicitly updates game-level activity (lastActivityAt)
   * through the calling methods, which handle game-level cleanup timing.
   *
   * @see updateGameActivity - For game-level activity (cleanup timing)
   * @see LobbyManager.updateRoomActivity - For room-level activity (pre-game)
   */
  updatePlayerActivity(roomCode: string, playerId: string): void {
    const game = this.games.get(roomCode);
    if (!game) return;

    const activity = game.playerActivity.get(playerId);
    if (!activity) return;

    const wasInactive = activity.status !== 'active';
    activity.lastActivityTimestamp = Date.now();

    // If player was inactive, mark them active and broadcast
    if (wasInactive) {
      activity.status = 'active';
      this.broadcastInactivityFn(roomCode, {
        playerId,
        playerName: activity.playerName,
        status: 'active',
        lastActivityTimestamp: activity.lastActivityTimestamp,
      });
    }
  }

  /**
   * Update player's nertz pile count (reported by client)
   * This is used for scoring since cards are dealt client-side
   */
  updatePlayerNertzCount(roomCode: string, playerId: string, nertzCount: number): void {
    const game = this.games.get(roomCode);
    if (!game) return;
    game.playerNertzCounts.set(playerId, nertzCount);
  }

  /**
   * Get player's last reported nertz count
   */
  getPlayerNertzCount(roomCode: string, playerId: string): number {
    const game = this.games.get(roomCode);
    if (!game) return 0;
    return game.playerNertzCounts.get(playerId) ?? 0;
  }

  /**
   * Get all player nertz counts for a room
   */
  getAllPlayerNertzCounts(roomCode: string): Map<string, number> | null {
    const game = this.games.get(roomCode);
    if (!game) return null;
    return game.playerNertzCounts;
  }

  /**
   * Get inactivity status for a player
   */
  getPlayerInactivityStatus(roomCode: string, playerId: string): InactivityStatus | null {
    const game = this.games.get(roomCode);
    if (!game) return null;

    const activity = game.playerActivity.get(playerId);
    return activity?.status ?? null;
  }

  /**
   * Get all player inactivity states for a room
   */
  getPlayerInactivityStates(roomCode: string): Map<string, PlayerActivityState> | null {
    const game = this.games.get(roomCode);
    if (!game) return null;
    return game.playerActivity;
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
      this.socketRegistry.join(playerId, roomCode);
    }

    // Initialize scoring state
    const scoringState = createScoringState(playerIds, initialState.config.targetScore);

// Initialize player activity tracking
    const playerActivity = new Map<string, PlayerActivityState>();
    const now = Date.now();
    for (const playerId of playerIds) {
      playerActivity.set(playerId, {
        lastActivityTimestamp: now,
        status: 'active',
        playerName: playerId, // Using playerId as name for now
      });
    }
    this.games.set(roomCode, {
      gameId,
      roomCode,
      stateManager,
      playerSockets,
      disconnectedPlayers: new Map(),
      sequence: 0,
      scoringState,
      playerActivity,
      playerNertzCounts: new Map(), // Tracks client-reported nertz counts for scoring
      inactivityConfig: { ...DEFAULT_INACTIVITY_CONFIG },
      createdAt: now,
      lastActivityAt: now,
    });
  }

  /**
   * Process a move from a player
   * Validates, applies, and broadcasts or rejects
   */
  processMove(socketId: string, move: Move): { success: boolean } {
    const roomCode = this.socketRegistry.getRoom(socketId);
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

    // Update activity timestamp
    game.lastActivityAt = Date.now();

    // Create sequenced update and broadcast to all players
    const update = game.stateManager.createUpdate(result.delta);
    this.broadcast(game.roomCode, update);

    // Update player activity
    this.updatePlayerActivity(roomCode, move.playerId);

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
    game.lastActivityAt = Date.now();

    // Update player activity
    this.updatePlayerActivity(roomCode, playerId);

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
    const roomCode = this.socketRegistry.getRoom(socketId);
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

    // Update player activity
    this.updatePlayerActivity(roomCode, playerId);

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

    // Inject client-reported nertz counts into state for scoring
    // Cards are dealt client-side, so the server's nertzPile arrays are empty
    // We populate them with placeholder cards so calculateRoundResult can count penalties
    for (const playerState of state.players) {
      const reportedCount = game.playerNertzCounts.get(playerState.playerId) ?? 0;
      // Create placeholder cards for counting (only the count matters for scoring)
      playerState.nertzPile = Array.from({ length: reportedCount }, () => ({
        suit: 'hearts' as const,
        rank: 1,
        deckId: playerState.deckId,
      }));
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
   * Process a draw proposal from a player.
   * Creates a new draw state and starts the timeout timer.
   * The proposer automatically accepts their own draw.
   */
  processCallDraw(socketId: string): CallDrawResult {
    const roomCode = this.socketRegistry.getRoom(socketId);
    if (!roomCode) {
      return { success: false, error: 'not_in_room' };
    }

    const game = this.games.get(roomCode);
    if (!game) {
      return { success: false, error: 'game_not_found' };
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
      return { success: false, error: 'player_not_in_game' };
    }

    const state = game.stateManager.getState();

    // Verify game is in playing phase
    if (state.phase !== 'playing') {
      return { success: false, error: 'not_in_playing_phase' };
    }

    // Check if there's already an active draw proposal
    if (game.drawState) {
      return { success: false, error: 'draw_already_proposed' };
    }

    // Get player name (using playerId for now)
    const proposerName = playerId;

    // Create responses map - proposer auto-accepts
    const responses = new Map<string, boolean>();
    responses.set(playerId, true);

    // Set up timeout for auto-rejection
    const timeoutId = setTimeout(() => {
      this.handleDrawTimeout(roomCode);
    }, DRAW_TIMEOUT_MS);

    // Create draw state
    game.drawState = {
      proposerId: playerId,
      proposerName,
      proposedAt: Date.now(),
      responses,
      timeoutId,
    };

    return {
      success: true,
      proposerId: playerId,
      proposerName,
      timeout: DRAW_TIMEOUT_MS,
      roomCode,
    };
  }

  /**
   * Process a player's response to a draw proposal.
   * If rejected by anyone, the draw is cancelled.
   * If all players accept, the draw is agreed.
   */
  processRespondToDraw(socketId: string, accept: boolean): RespondToDrawResult {
    const roomCode = this.socketRegistry.getRoom(socketId);
    if (!roomCode) {
      return { success: false, error: 'not_in_room' };
    }

    const game = this.games.get(roomCode);
    if (!game) {
      return { success: false, error: 'game_not_found' };
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
      return { success: false, error: 'player_not_in_game' };
    }

    // Check if there's an active draw proposal
    if (!game.drawState) {
      return { success: false, error: 'no_active_draw' };
    }

    // Check if player already responded
    if (game.drawState.responses.has(playerId)) {
      return { success: false, error: 'already_responded' };
    }

    // Get player name (using playerId for now)
    const responderName = playerId;

    // Record response
    game.drawState.responses.set(playerId, accept);

    if (!accept) {
      // Draw rejected - clear state and return rejection info
      const rejectedBy = playerId;
      const rejectedByName = responderName;
      this.clearDrawState(roomCode);

      return {
        success: true,
        responderId: playerId,
        responderName,
        accepted: false,
        allAccepted: false,
        rejected: true,
        rejectedBy,
        rejectedByName,
        roomCode,
      };
    }

    // Check if all players have accepted
    const allPlayersResponded = game.drawState.responses.size >= game.playerSockets.size;
    const allAccepted = allPlayersResponded &&
      Array.from(game.drawState.responses.values()).every(v => v === true);

    if (allAccepted) {
      // Clear timeout since draw is agreed
      clearTimeout(game.drawState.timeoutId);
    }

    return {
      success: true,
      responderId: playerId,
      responderName,
      accepted: true,
      allAccepted,
      rejected: false,
      roomCode,
    };
  }

  /**
   * Process round end when a draw is agreed.
   * Similar to processRoundEnd but marks the round as a draw.
   */
  processDrawRoundEnd(roomCode: string, proposerId: string): DrawRoundEndResult {
    const game = this.games.get(roomCode);
    if (!game) {
      return { success: false, error: 'game_not_found' };
    }

    const state = game.stateManager.getState();

    // Inject client-reported nertz counts into state for scoring
    for (const playerState of state.players) {
      const reportedCount = game.playerNertzCounts.get(playerState.playerId) ?? 0;
      playerState.nertzPile = Array.from({ length: reportedCount }, () => ({
        suit: 'hearts' as const,
        rank: 1,
        deckId: playerState.deckId,
      }));
    }

    // Set calledBy to the proposer for round result calculation
    (state as { calledBy?: string }).calledBy = proposerId;

    // Calculate round result
    const roundResult = calculateRoundResult(state, state.roundNumber);

    // Mark as draw
    roundResult.isDraw = true;

    // Apply to scoring state
    const result = applyRoundResult(game.scoringState, roundResult);
    game.scoringState = result.scoringState;

    // Clear draw state
    this.clearDrawState(roomCode);

    return {
      success: true,
      roundResult,
      totalScores: result.scoringState.totalScores,
      gameOver: result.gameOver,
      winner: result.winner,
    };
  }

  /**
   * Handle draw timeout - auto-reject the draw proposal and broadcast
   * @private
   */
  private handleDrawTimeout(roomCode: string): {
    timedOut: boolean;
    proposerId?: string;
    proposerName?: string;
  } {
    const game = this.games.get(roomCode);
    if (!game || !game.drawState) {
      return { timedOut: false };
    }

    const { proposerId, proposerName } = game.drawState;

    // Clear draw state
    this.clearDrawState(roomCode);

    // Broadcast draw rejected due to timeout
    this.broadcastDrawRejectedFn(roomCode, proposerId, proposerName, 'timeout');

    console.log(`Draw proposal by ${proposerName} timed out in room ${roomCode}`);

    return {
      timedOut: true,
      proposerId,
      proposerName,
    };
  }

  /**
   * Clear draw state for a room
   * @private
   */
  private clearDrawState(roomCode: string): void {
    const game = this.games.get(roomCode);
    if (!game || !game.drawState) return;

    // Clear timeout if still active
    clearTimeout(game.drawState.timeoutId);
    game.drawState = undefined;
  }

  /**
   * Get active draw state for a room (for external checks)
   */
  getDrawState(roomCode: string): DrawState | undefined {
    const game = this.games.get(roomCode);
    return game?.drawState;
  }

  /**
   * Check if a draw is currently proposed for a room
   */
  hasActiveDrawProposal(roomCode: string): boolean {
    const game = this.games.get(roomCode);
    return !!game?.drawState;
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

    // Clear ready state, nertz counts, and any lingering draw state for new round
    this.clearReadyState(roomCode);
    this.clearDrawState(roomCode);
    game.playerNertzCounts.clear();

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
   * Handle player disconnect - mark as disconnected for potential rejoin
   */
  handleDisconnect(socketId: string): {
    inActiveGame: boolean;
    gameId?: string;
    roomCode?: string;
    playerId?: string;
    playerName?: string;
  } {
    const roomCode = this.socketRegistry.getRoom(socketId);
    if (!roomCode) return { inActiveGame: false };

    const game = this.games.get(roomCode);
    if (!game) return { inActiveGame: false };

    // Find the player
    let disconnectedPlayerId: string | undefined;
    for (const [playerId, sId] of game.playerSockets.entries()) {
      if (sId === socketId) {
        disconnectedPlayerId = playerId;
        break;
      }
    }

    if (!disconnectedPlayerId) return { inActiveGame: false };

    // Get player name from state (using playerId as name for now)
    const playerName = disconnectedPlayerId;

    // Mark player as disconnected (don't remove yet - allow reconnection)
    game.disconnectedPlayers.set(disconnectedPlayerId, {
      playerId: disconnectedPlayerId,
      playerName,
      disconnectedAt: Date.now(),
    });

    // Remove socket mapping but keep player in game
    game.playerSockets.delete(disconnectedPlayerId);
    this.socketRegistry.leave(socketId);

    // Schedule cleanup after timeout
    setTimeout(() => {
      this.cleanupDisconnectedPlayer(roomCode, disconnectedPlayerId!);
    }, RECONNECT_TIMEOUT_MS);

    return {
      inActiveGame: true,
      gameId: game.gameId,
      roomCode: game.roomCode,
      playerId: disconnectedPlayerId,
      playerName,
    };
  }

  /**
   * Rejoin a disconnected player to their game
   */
  rejoinGame(
    socketId: string,
    gameId: string,
    playerId: string,
    roomCode: string
  ): {
    success: true;
    playerName: string;
    room: import('@heyhey/shared').RoomState;
    gamePhase: import('@heyhey/shared').GamePhase;
    roundNumber: number;
    currentStarterIndex: number;
    foundations: FoundationPile[];
    opponentStates: OpponentStateUpdatePayload[];
  } | {
    success: false;
    reason: 'game_not_found' | 'player_not_found' | 'game_ended' | 'invalid_credentials';
  } {
    const game = this.games.get(roomCode);

    if (!game) {
      return { success: false, reason: 'game_not_found' };
    }

    if (game.gameId !== gameId) {
      return { success: false, reason: 'invalid_credentials' };
    }

    // Check if player is in disconnected list
    const disconnectedPlayer = game.disconnectedPlayers.get(playerId);

    // Also check if player is still in the game state
    const state = game.stateManager.getState();
    const playerInGame = state.players.some(p => p.playerId === playerId);

    if (!disconnectedPlayer && !playerInGame) {
      return { success: false, reason: 'player_not_found' };
    }

    // Check if game has ended
    if (state.phase === 'finished') {
      return { success: false, reason: 'game_ended' };
    }

    // Restore player connection
    game.playerSockets.set(playerId, socketId);
    game.disconnectedPlayers.delete(playerId);
    this.socketRegistry.join(socketId, roomCode);

    const playerName = disconnectedPlayer?.playerName ?? playerId;

    // Build RoomState from game state
    const players = state.players.map(p => ({
      id: p.playerId,
      name: p.playerId, // Using playerId as name for now
      isHost: false, // Not tracking host in game state
    }));

    const room: import('@heyhey/shared').RoomState = {
      code: roomCode,
      players,
      settings: state.config,
      hostId: players[0]?.id ?? '',
    };

    // Build opponent states for the reconnecting player
    // Note: Server doesn't have full card data (dealt client-side), but we have
    // the last reported counts from reportState events stored in playerNertzCounts
    const opponentStates: OpponentStateUpdatePayload[] = [];
    for (const playerState of state.players) {
      if (playerState.playerId !== playerId) {
        // Use stored nertz count from client reports, fallback to 0
        const nertzCount = game.playerNertzCounts.get(playerState.playerId) ?? 0;
        opponentStates.push({
          playerId: playerState.playerId,
          stockCount: 0, // Will be updated by opponent's next reportState
          wasteTopCard: undefined,
          nertzCount,
          nertzTopCard: undefined,
          workPiles: [[], [], [], []], // Will be updated by opponent's next reportState
        });
      }
    }

    return {
      success: true,
      playerName,
      room,
      gamePhase: state.phase,
      roundNumber: state.roundNumber,
      currentStarterIndex: state.currentStarterIndex,
      foundations: state.foundations,
      opponentStates,
    };
  }

  /**
   * Clean up a disconnected player after timeout
   */
  private cleanupDisconnectedPlayer(roomCode: string, playerId: string): void {
    const game = this.games.get(roomCode);
    if (!game) return;

    const disconnectedPlayer = game.disconnectedPlayers.get(playerId);
    if (!disconnectedPlayer) return; // Player reconnected

    // Check if still disconnected after timeout
    const now = Date.now();
    if (now - disconnectedPlayer.disconnectedAt >= RECONNECT_TIMEOUT_MS) {
      // Remove player from game entirely
      game.disconnectedPlayers.delete(playerId);

      // If no connected or disconnected players, clean up game
      if (game.playerSockets.size === 0 && game.disconnectedPlayers.size === 0) {
        this.games.delete(roomCode);
      }
    }
  }

  /**
   * Check if a player can rejoin a game
   */
  canRejoin(roomCode: string, playerId: string): boolean {
    const game = this.games.get(roomCode);
    if (!game) return false;

    // Check if player is in disconnected list
    if (game.disconnectedPlayers.has(playerId)) return true;

    // Check if player is in game state but not connected
    const state = game.stateManager.getState();
    const playerInGame = state.players.some(p => p.playerId === playerId);
    const playerConnected = game.playerSockets.has(playerId);

    return playerInGame && !playerConnected;
  }

  /**
   * Handle player leaving during game
   */
  handlePlayerLeave(roomCode: string, playerId: string): void {
    const game = this.games.get(roomCode);
    if (!game) return;

    game.playerSockets.delete(playerId);
    this.socketRegistry.leave(playerId);

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
      this.socketRegistry.leave(socketId);
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
   * Get the original playerId for a given socketId
   * Used to handle reconnection where socketId changes but playerId stays the same
   */
  getPlayerIdForSocket(roomCode: string, socketId: string): string | null {
    const game = this.games.get(roomCode);
    if (!game) return null;

    // playerSockets maps playerId -> socketId
    // We need to find the playerId that maps to this socketId
    for (const [playerId, mappedSocketId] of game.playerSockets.entries()) {
      if (mappedSocketId === socketId) {
        return playerId;
      }
    }
    return null;
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

  /**
   * Update activity timestamp for a game (call on any game action).
   *
   * This is **game-level** activity tracking for abandoned game cleanup.
   * Games inactive for 30 minutes are cleaned up by cleanupAbandonedGames().
   *
   * Note: This is SEPARATE from player-level activity which tracks individual
   * players for UI feedback. A game can be "active" (not abandoned) even if
   * individual players are showing as "inactive" in the UI.
   *
   * Typically called automatically by processMove(), processFoundationMove(),
   * etc. - you rarely need to call this directly.
   *
   * @see updatePlayerActivity - For player-level activity (UI feedback)
   * @see LobbyManager.updateRoomActivity - For room-level activity (pre-game)
   */
  updateGameActivity(roomCode: string): void {
    const game = this.games.get(roomCode);
    if (game) {
      game.lastActivityAt = Date.now();
    }
  }

  /**
   * Get all room codes with active games
   */
  getAllGameRoomCodes(): string[] {
    return Array.from(this.games.keys());
  }

  /**
   * Clean up abandoned games (all players disconnected or inactive for 30 minutes).
   * Called periodically from lobbyEvents.ts cleanup interval.
   *
   * **Important**: After cleaning up a game, the caller (lobbyEvents.ts) should
   * call LobbyManager.markRoomHasGame(roomCode, false) to allow room-level cleanup.
   *
   * Cleanup rules:
   * - All players disconnected AND past reconnect timeout (5 min): Cleaned up
   * - Game inactive for 30 minutes (GAME_INACTIVITY_TIMEOUT_MS): Cleaned up
   *
   * Note: Individual player inactivity (warning/inactive status) does NOT
   * trigger game cleanup - that's for UI feedback only.
   *
   * @returns List of cleaned up games with their reasons for cleanup
   */
  cleanupAbandonedGames(): Array<{
    roomCode: string;
    gameId: string;
    reason: 'all_disconnected' | 'inactivity';
  }> {
    const now = Date.now();
    const abandonedGames: Array<{
      roomCode: string;
      gameId: string;
      reason: 'all_disconnected' | 'inactivity';
    }> = [];

    for (const [roomCode, game] of this.games.entries()) {
      const connectedPlayers = game.playerSockets.size;
      const disconnectedPlayers = game.disconnectedPlayers.size;
      const timeSinceActivity = now - game.lastActivityAt;

      // All players disconnected and past reconnect timeout
      if (connectedPlayers === 0 && disconnectedPlayers > 0) {
        // Check if all disconnected players are past timeout
        let allPastTimeout = true;
        for (const disconnected of game.disconnectedPlayers.values()) {
          if (now - disconnected.disconnectedAt < RECONNECT_TIMEOUT_MS) {
            allPastTimeout = false;
            break;
          }
        }

        if (allPastTimeout) {
          abandonedGames.push({
            roomCode,
            gameId: game.gameId,
            reason: 'all_disconnected',
          });
          this.cleanupGame(roomCode);
          continue;
        }
      }

      // No connected players and no disconnected players (shouldn't happen but clean up anyway)
      if (connectedPlayers === 0 && disconnectedPlayers === 0) {
        abandonedGames.push({
          roomCode,
          gameId: game.gameId,
          reason: 'all_disconnected',
        });
        this.cleanupGame(roomCode);
        continue;
      }

      // Inactivity timeout (30 minutes with no moves)
      if (timeSinceActivity >= GAME_INACTIVITY_TIMEOUT_MS) {
        abandonedGames.push({
          roomCode,
          gameId: game.gameId,
          reason: 'inactivity',
        });
        this.cleanupGame(roomCode);
      }
    }

    if (abandonedGames.length > 0) {
      console.log(`[GameManager] Cleaned up ${abandonedGames.length} abandoned game(s):`,
        abandonedGames.map(g => `${g.roomCode} (${g.reason})`).join(', '));
    }

    return abandonedGames;
  }

  /**
   * Check if a game is abandoned (for external checks)
   */
  isGameAbandoned(roomCode: string): boolean {
    const game = this.games.get(roomCode);
    if (!game) return false;

    const now = Date.now();
    const connectedPlayers = game.playerSockets.size;
    const timeSinceActivity = now - game.lastActivityAt;

    // No connected players
    if (connectedPlayers === 0) {
      // Check if all disconnected past timeout
      for (const disconnected of game.disconnectedPlayers.values()) {
        if (now - disconnected.disconnectedAt < RECONNECT_TIMEOUT_MS) {
          return false; // Still within reconnect window
        }
      }
      return true;
    }

    // Inactive for 30 minutes
    return timeSinceActivity >= GAME_INACTIVITY_TIMEOUT_MS;
  }

  /**
   * Get game statistics for monitoring
   */
  getGameStats(): {
    totalGames: number;
    gamesWithDisconnectedPlayers: number;
    oldestInactiveMs: number;
    totalConnectedPlayers: number;
    totalDisconnectedPlayers: number;
  } {
    const now = Date.now();
    let gamesWithDisconnectedPlayers = 0;
    let oldestInactiveMs = 0;
    let totalConnectedPlayers = 0;
    let totalDisconnectedPlayers = 0;

    for (const game of this.games.values()) {
      totalConnectedPlayers += game.playerSockets.size;
      totalDisconnectedPlayers += game.disconnectedPlayers.size;

      if (game.disconnectedPlayers.size > 0) {
        gamesWithDisconnectedPlayers++;
      }

      const inactiveMs = now - game.lastActivityAt;
      if (inactiveMs > oldestInactiveMs) {
        oldestInactiveMs = inactiveMs;
      }
    }

    return {
      totalGames: this.games.size,
      gamesWithDisconnectedPlayers,
      oldestInactiveMs,
      totalConnectedPlayers,
      totalDisconnectedPlayers,
    };
  }
}
