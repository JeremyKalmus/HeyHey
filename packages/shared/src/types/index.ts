// HeyHey! Type Definitions

export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: number; // 1-13 (Ace=1, King=13)
  deckId: string; // Unique identifier for the player's deck
}

export interface Player {
  id: string;
  name: string;
  deckId: string;
}

export interface GameConfig {
  nertzPileSize: 10 | 13;
  drawCount: 1 | 3;
  targetScore: number;
}

export type GamePhase = 'lobby' | 'setup' | 'waiting_for_start' | 'playing' | 'scoring' | 'finished';

// Lobby Types
export interface LobbyPlayer {
  id: string;
  name: string;
  isHost: boolean;
  color?: string;  // Player's chosen color (e.g., 'blue', 'red')
  avatar?: string; // Player's avatar string (e.g., 'ghost:hexagon')
}

export interface RoomState {
  code: string;
  players: LobbyPlayer[];
  settings: GameConfig;
  hostId: string;
}

// Socket Event Types - Client to Server
export interface ClientToServerEvents {
  createRoom: (payload: CreateRoomPayload) => void;
  joinRoom: (payload: JoinRoomPayload) => void;
  leaveRoom: () => void;
  updateSettings: (payload: UpdateSettingsPayload) => void;
  updatePlayer: (payload: UpdatePlayerPayload) => void;
  startGame: () => void;
  setupComplete: () => void;
  foundationMove: (payload: FoundationMovePayload) => void;
  startRound: () => void; // Only the current starter can call this
  readyForNextRound: () => void; // Player is ready to proceed to next round
  rejoinGame: (payload: RejoinGamePayload) => void; // Reconnect to active game
}

// Socket Event Types - Server to Client
export interface ServerToClientEvents {
  roomCreated: (payload: RoomCreatedPayload) => void;
  roomJoined: (payload: RoomJoinedPayload) => void;
  playerJoined: (payload: PlayerJoinedPayload) => void;
  playerLeft: (payload: PlayerLeftPayload) => void;
  playerUpdated: (payload: PlayerUpdatedPayload) => void;
  settingsUpdated: (payload: SettingsUpdatedPayload) => void;
  gameStarted: (payload: GameStartedPayload) => void;
  error: (payload: ErrorPayload) => void;
  hostChanged: (payload: HostChangedPayload) => void;
  roomExpired: (payload: RoomExpiredPayload) => void;
  allPlayersReady: (payload: { gameId: string }) => void;
  playerSetupComplete: (payload: { playerId: string; playersReady: number; totalPlayers: number }) => void;
  foundationUpdated: (payload: FoundationUpdatedPayload) => void;
  foundationMoveRejected: (payload: FoundationMoveRejectedPayload) => void;
  roundStarting: (payload: RoundStartingPayload) => void;
  roundStarted: (payload: RoundStartedPayload) => void;
  roundEnded: (payload: RoundEndedPayload) => void;
  playerReadyForNextRound: (payload: PlayerReadyForNextRoundPayload) => void;
  allReadyForNextRound: (payload: AllReadyForNextRoundPayload) => void;
  opponentStateUpdate: (payload: OpponentStateUpdatePayload) => void;
  rejoinGameSuccess: (payload: RejoinGameSuccessPayload) => void;
  rejoinGameFailed: (payload: RejoinGameFailedPayload) => void;
  playerReconnected: (payload: PlayerReconnectedPayload) => void;
  playerDisconnected: (payload: PlayerDisconnectedPayload) => void;
}

// Event Payloads - Client to Server
export interface CreateRoomPayload {
  playerName: string;
}

export interface JoinRoomPayload {
  roomCode: string;
  playerName: string;
}

export interface UpdateSettingsPayload {
  settings: Partial<GameConfig>;
}

export interface UpdatePlayerPayload {
  name?: string;
  color?: string;
  avatar?: string;
}

// Event Payloads - Server to Client
export interface RoomCreatedPayload {
  room: RoomState;
  playerId: string;
}

export interface RoomJoinedPayload {
  room: RoomState;
  playerId: string;
}

export interface PlayerJoinedPayload {
  player: LobbyPlayer;
}

export interface PlayerLeftPayload {
  playerId: string;
}

export interface PlayerUpdatedPayload {
  player: LobbyPlayer;
}

export interface SettingsUpdatedPayload {
  settings: GameConfig;
}

export interface GameStartedPayload {
  gameId: string;
}

export interface ErrorPayload {
  code: string;
  message: string;
}

export interface HostChangedPayload {
  newHostId: string;
}

export interface RoomExpiredPayload {
  roomCode: string;
  reason: 'inactivity' | 'empty' | 'game_abandoned';
}

// Round Start Payloads
export interface RoundStartingPayload {
  starterId: string;
  starterName: string;
  roundNumber: number;
}

export interface RoundStartedPayload {
  timestamp: number;
  roundNumber: number;
}

// Round End Payloads
export interface RoundEndedPayload {
  roundResult: RoundResult;
  totalScores: { playerId: string; total: number }[];
  gameOver: boolean;
  winner?: string;
}

// Ready for Next Round Payloads
export interface PlayerReadyForNextRoundPayload {
  playerId: string;
}

export interface AllReadyForNextRoundPayload {
  nextRoundNumber: number;
  nextStarterId: string;
}

// Opponent State Update Payload (ADR-009)
export interface OpponentStateUpdatePayload {
  playerId: string;
  stockCount: number;
  wasteTopCard?: Card;
  nertzCount: number;
  nertzTopCard?: Card;
  workPiles: Card[][]; // Full face-up cards for each work pile
}

// Session Reconnection Payloads
export interface RejoinGamePayload {
  gameId: string;
  playerId: string;
  roomCode: string;
}

export interface RejoinGameSuccessPayload {
  room: RoomState;
  playerId: string;
  gamePhase: GamePhase;
  roundNumber: number;
  currentStarterIndex: number;
  foundations: FoundationPile[];
}

export interface RejoinGameFailedPayload {
  reason: 'game_not_found' | 'player_not_found' | 'game_ended' | 'invalid_credentials';
  message: string;
}

export interface PlayerReconnectedPayload {
  playerId: string;
  playerName: string;
}

export interface PlayerDisconnectedPayload {
  playerId: string;
  playerName: string;
  /** Whether the player can still reconnect (within timeout) */
  canReconnect: boolean;
}

// Game Event Payloads - Client to Server
export interface FoundationMovePayload {
  card: Card;
  foundationIndex: number;
  source: MoveSource;
  clientSequence: number; // Client's local sequence for this move
}

// Game Event Payloads - Server to Client
export interface FoundationUpdatedPayload {
  foundationIndex: number;
  card: Card;
  playerId: string;
  sequence: number; // Server-authoritative sequence number
}

export interface FoundationMoveRejectedPayload {
  reason: string;
  clientSequence: number; // The client sequence of the rejected move
  currentState: {
    foundationIndex: number;
    topRank: number | null; // null if empty, otherwise current top card rank
  };
}

// Game State Types
export interface CardPile {
  cards: Card[];
  faceUp: boolean;
}

export interface PlayerGameState {
  playerId: string;
  deckId: string;
  nertzPile: Card[]; // Top card is last element (face up)
  workPiles: Card[][]; // 4 piles, top card is last element
  stockPile: Card[]; // Face down, top is last
  wastePile: Card[]; // Face up, top is last (visible cards)
}

/**
 * Lightweight opponent state for real-time visualization
 * Contains only card counts and visible top cards (not full card data)
 * Used by OpponentArea component to display opponent progress
 */
export interface OpponentPlayerState {
  playerId: string;
  deckId: string;
  /** Number of cards remaining in nertz pile (0 = winner!) */
  nertzCount: number;
  /** Top card of nertz pile if face up */
  nertzTopCard?: Card;
  /** Number of cards in stock pile */
  stockCount: number;
  /** Number of cards in waste pile */
  wasteCount: number;
  /** Top card of waste pile if any */
  wasteTopCard?: Card;
  /** Card counts and top cards for each work pile */
  workPiles: {
    count: number;
    topCard?: Card;
  }[];
  /** Timestamp of last state change (for activity indicator) */
  lastActivity: number;
}

export interface FoundationPile {
  suit: Card['suit'];
  cards: Card[]; // Bottom to top, starts with Ace
  ownerId: string; // Player who contributed this foundation pile (for multiplayer)
}

export interface GameState {
  gameId: string;
  phase: GamePhase;
  players: PlayerGameState[];
  foundations: FoundationPile[]; // 4 per suit, shared by all players
  config: GameConfig;
  calledBy?: string; // Player who called HeyHey
  roundNumber: number; // Current round (1-indexed)
  currentStarterIndex: number; // Index of player who starts this round (rotates each round)
}

// Move Types
export type MoveSource =
  | { type: 'nertz' }
  | { type: 'work'; pileIndex: number; cardIndex?: number }
  | { type: 'waste' };

export type MoveDestination =
  | { type: 'work'; pileIndex: number }
  | { type: 'foundation'; foundationIndex: number };

export interface CardMove {
  type: 'card';
  playerId: string;
  source: MoveSource;
  destination: MoveDestination;
  cardCount?: number; // For moving multiple cards from work pile
}

export interface DrawMove {
  type: 'draw';
  playerId: string;
}

export interface FlipStockMove {
  type: 'flipStock';
  playerId: string;
}

export type Move = CardMove | DrawMove | FlipStockMove;

export type MoveValidationError =
  | 'invalid_source'
  | 'invalid_destination'
  | 'empty_source'
  | 'no_card_selected'
  | 'wrong_color_for_work'
  | 'wrong_rank_for_work'
  | 'wrong_suit_for_foundation'
  | 'wrong_rank_for_foundation'
  | 'work_pile_full'
  | 'foundation_full'
  | 'stock_not_empty'
  | 'waste_empty'
  | 'player_not_found'
  | 'invalid_card_count';

export type MoveValidationResult =
  | { valid: true }
  | { valid: false; error: MoveValidationError };

// State Synchronization Types

/**
 * Atomic state changes (deltas) that can be applied to game state
 */
export type StateDelta =
  | { type: 'cardMoved'; playerId: string; source: MoveSource; destination: MoveDestination; cards: Card[] }
  | { type: 'cardsDrawn'; playerId: string; cards: Card[] }
  | { type: 'stockFlipped'; playerId: string }
  | { type: 'nertzCalled'; playerId: string }
  | { type: 'phaseChanged'; phase: GamePhase }
  | { type: 'playerJoinedGame'; player: PlayerGameState }
  | { type: 'playerLeftGame'; playerId: string }
  | { type: 'roundScored'; roundResult: RoundResult; totalScores: { playerId: string; total: number }[] };

/**
 * A sequenced state update for ordering
 */
export interface StateUpdate {
  sequence: number;
  timestamp: number;
  delta: StateDelta;
  gameId: string;
}

/**
 * Move rejection sent to individual player
 */
export interface MoveRejection {
  move: Move;
  error: MoveValidationError;
  message: string;
  timestamp: number;
}

/**
 * Game play socket events - Client to Server
 */
export interface GameClientToServerEvents {
  makeMove: (payload: MakeMovePayload) => void;
  callNertz: () => void;
}

/**
 * Game play socket events - Server to Client
 */
export interface GameServerToClientEvents {
  stateUpdate: (payload: StateUpdate) => void;
  moveRejected: (payload: MoveRejection) => void;
  gameEnded: (payload: GameEndedPayload) => void;
  roundScored: (payload: RoundScoredPayload) => void;
}

export interface MakeMovePayload {
  move: Move;
}

export interface GameEndedPayload {
  gameId: string;
  winner: string;
  scores: { playerId: string; score: number }[];
}

// === Scoring Types ===

/**
 * Score breakdown for a single player in a single round
 */
export interface PlayerRoundScore {
  playerId: string;
  foundationCards: number; // Cards this player played to foundations (+1 each)
  nertzPenalty: number; // Cards remaining in nertz pile (-2 each)
  roundScore: number; // Net score: foundationCards - (nertzPenalty * 2)
}

/**
 * Complete scoring result for a round
 */
export interface RoundResult {
  roundNumber: number;
  calledBy: string; // Player who called Nertz
  playerScores: PlayerRoundScore[];
  timestamp: number;
}

/**
 * Accumulated scores across multiple rounds
 */
export interface ScoringState {
  rounds: RoundResult[];
  totalScores: { playerId: string; total: number }[];
  targetScore: number;
  gameWinner?: string; // Set when a player reaches target score
}

/**
 * Payload for round scored event
 */
export interface RoundScoredPayload {
  roundResult: RoundResult;
  totalScores: { playerId: string; total: number }[];
  gameOver: boolean;
  winner?: string;
}

/**
 * Combined socket events for full game flow
 */
export interface AllClientToServerEvents extends ClientToServerEvents, GameClientToServerEvents {}
export interface AllServerToClientEvents extends ServerToClientEvents, GameServerToClientEvents {}
