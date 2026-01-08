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

export type GamePhase = 'lobby' | 'setup' | 'playing' | 'scoring' | 'finished';

// Lobby Types
export interface LobbyPlayer {
  id: string;
  name: string;
  isHost: boolean;
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
  startGame: () => void;
  setupComplete: () => void;
}

// Socket Event Types - Server to Client
export interface ServerToClientEvents {
  roomCreated: (payload: RoomCreatedPayload) => void;
  roomJoined: (payload: RoomJoinedPayload) => void;
  playerJoined: (payload: PlayerJoinedPayload) => void;
  playerLeft: (payload: PlayerLeftPayload) => void;
  settingsUpdated: (payload: SettingsUpdatedPayload) => void;
  gameStarted: (payload: GameStartedPayload) => void;
  error: (payload: ErrorPayload) => void;
  hostChanged: (payload: HostChangedPayload) => void;
  playerSetupComplete: (payload: PlayerSetupCompletePayload) => void;
  allPlayersReady: (payload: AllPlayersReadyPayload) => void;
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

export interface PlayerSetupCompletePayload {
  playerId: string;
  playersReady: number;
  totalPlayers: number;
}

export interface AllPlayersReadyPayload {
  gameId: string;
}
