// GameStateContext - Game state management and socket event handling
// Manages room, players, game phase, local player state

import { createContext, useContext, useCallback, useReducer, useEffect, useRef, type ReactNode } from 'react';
import { useSocket } from './SocketContext';
import type {
  RoomState,
  GameConfig,
  GamePhase,
  PlayerGameState,
  FoundationPile,
  Move,
  MoveSource,
  LobbyPlayer,
  StateUpdate,
  MoveRejection,
  RoundResult,
  OpponentPlayerState,
  OpponentStateUpdatePayload,
  Card,
  RejoinGameSuccessPayload,
  RejoinGameFailedPayload,
  PlayerReconnectedPayload,
  PlayerDisconnectedPayload,
  InactivityStatus,
  PlayerInactivityUpdatePayload,
  ReportStatePayload,
  DrawProposedPayload,
  DrawResponsePayload,
  DrawAgreedPayload,
  DrawRejectedPayload,
} from '@heyhey/shared';
import { saveSession, loadSession, clearSession } from '../utils/sessionStorage';
import type { OpponentMove } from '../components/Foundation/MultiFoundationArea';

/* =============================================================================
   TYPES
   ============================================================================= */

/** Full opponent state from server opponentStateUpdate events (ADR-009) */
export interface OpponentFullState {
  playerId: string;
  stockCount: number;
  wasteTopCard: Card | null;
  nertzCount: number;
  nertzTopCard: Card | null;
  workPiles: Card[][];
  /** Timestamp of last update */
  lastUpdate: number;
}

/** Player inactivity state for UI display */
export interface PlayerInactivityState {
  playerId: string;
  playerName: string;
  status: InactivityStatus;
  lastActivityTimestamp: number;
}

/** Individual player's response to a draw proposal */
export interface DrawResponseState {
  playerId: string;
  playerName: string;
  accepted: boolean;
}

/** Active draw proposal state */
export interface DrawProposalState {
  proposerId: string;
  proposerName: string;
  /** Timeout timestamp (when the proposal expires) */
  timeoutAt: number;
  /** Responses received so far */
  responses: Map<string, DrawResponseState>;
}

export interface GameStateContextValue {
  // Room state
  room: RoomState | null;
  playerId: string | null;
  isHost: boolean;

  // Game state
  gameId: string | null;
  gamePhase: GamePhase;
  playerState: PlayerGameState | null;
  foundations: FoundationPile[];
  opponents: PlayerGameState[];
  /** Lightweight opponent states for real-time visualization */
  opponentStates: Map<string, OpponentPlayerState>;
  /** Full opponent states from server updates (ADR-009) */
  opponentFullStates: Map<string, OpponentFullState>;

  // Round/Scoring state
  roundResult: RoundResult | null;
  totalScores: { playerId: string; total: number }[];
  roundNumber: number;
  currentStarterIndex: number;
  gameOver: boolean;
  gameWinner: string | null;
  playersReadyForNextRound: string[];

  // Celebration state
  nertzCallerId: string | null;

  // Connection state
  isReconnecting: boolean;
  disconnectedPlayers: string[];

  // Player inactivity state
  playerInactivity: Map<string, PlayerInactivityState>;

  // Animation state
  /** Last opponent foundation move for flying card animation */
  lastOpponentFoundationMove: OpponentMove | null;

  // Draw proposal state
  drawProposal: DrawProposalState | null;

  // Actions
  createRoom: (playerName: string) => void;
  joinRoom: (roomCode: string, playerName: string) => void;
  leaveRoom: () => void;
  updateSettings: (settings: Partial<GameConfig>) => void;
  updatePlayer: (updates: { name?: string; color?: string; avatar?: string }) => void;
  startGame: () => void;
  setupComplete: () => void;
  startRound: () => void;
  makeMove: (move: Move) => void;
  callNertz: () => void;
  foundationMove: (card: PlayerGameState['nertzPile'][0], foundationIndex: number, source: MoveSource) => void;
  readyForNextRound: () => void;
  reportState: (state: ReportStatePayload) => void;
  callDraw: () => void;
  respondToDraw: (accept: boolean) => void;
  endGame: () => void;

  // Errors
  error: string | null;
  clearError: () => void;
}

interface GameState {
  room: RoomState | null;
  playerId: string | null;
  gameId: string | null;
  gamePhase: GamePhase;
  playerState: PlayerGameState | null;
  foundations: FoundationPile[];
  opponents: PlayerGameState[];
  /** Lightweight opponent states for real-time visualization */
  opponentStates: Map<string, OpponentPlayerState>;
  /** Full opponent states from server updates (ADR-009) */
  opponentFullStates: Map<string, OpponentFullState>;
  roundResult: RoundResult | null;
  totalScores: { playerId: string; total: number }[];
  nertzCallerId: string | null;
  error: string | null;
  moveSequence: number;
  roundNumber: number;
  currentStarterIndex: number;
  gameOver: boolean;
  gameWinner: string | null;
  playersReadyForNextRound: string[];
  isReconnecting: boolean;
  disconnectedPlayers: string[];
  /** Player inactivity states from server */
  playerInactivity: Map<string, PlayerInactivityState>;
  /** Last opponent foundation move for flying card animation */
  lastOpponentFoundationMove: OpponentMove | null;
  /** Active draw proposal state */
  drawProposal: DrawProposalState | null;
}

type GameAction =
  | { type: 'ROOM_CREATED'; room: RoomState; playerId: string }
  | { type: 'ROOM_JOINED'; room: RoomState; playerId: string }
  | { type: 'PLAYER_JOINED'; player: LobbyPlayer }
  | { type: 'PLAYER_LEFT'; playerId: string }
  | { type: 'PLAYER_UPDATED'; player: LobbyPlayer }
  | { type: 'SETTINGS_UPDATED'; settings: GameConfig }
  | { type: 'HOST_CHANGED'; newHostId: string }
  | { type: 'GAME_STARTED'; gameId: string }
  | { type: 'PLAYER_SETUP_COMPLETE'; playerId: string }
  | { type: 'ALL_PLAYERS_READY' }
  | { type: 'STATE_UPDATE'; update: StateUpdate }
  | { type: 'MOVE_REJECTED'; rejection: MoveRejection }
  | { type: 'FOUNDATION_UPDATED'; foundationIndex: number; card: PlayerGameState['nertzPile'][0]; playerId: string }
  | { type: 'FOUNDATION_MOVE_REJECTED'; reason: string }
  | { type: 'ROUND_SCORED'; roundResult: RoundResult; totalScores: { playerId: string; total: number }[]; gameOver: boolean; winner?: string }
  | { type: 'PLAYER_READY_FOR_NEXT_ROUND'; playerId: string }
  | { type: 'ALL_READY_FOR_NEXT_ROUND'; nextRoundNumber: number; nextStarterId: string }
  | { type: 'GAME_ENDED'; winner: string }
  | { type: 'ROUND_STARTED'; roundNumber: number }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'LEAVE_ROOM' }
  | { type: 'INCREMENT_SEQUENCE' }
  | { type: 'OPPONENT_STATE_UPDATE'; payload: OpponentStateUpdatePayload }
  | { type: 'SET_RECONNECTING'; isReconnecting: boolean }
  | { type: 'REJOIN_SUCCESS'; payload: RejoinGameSuccessPayload }
  | { type: 'REJOIN_FAILED'; reason: string }
  | { type: 'PLAYER_RECONNECTED'; playerId: string }
  | { type: 'PLAYER_DISCONNECTED'; playerId: string; canReconnect: boolean }
  | { type: 'PLAYER_INACTIVITY_UPDATE'; payload: PlayerInactivityUpdatePayload }
  | { type: 'DRAW_PROPOSED'; payload: DrawProposedPayload }
  | { type: 'DRAW_RESPONSE'; payload: DrawResponsePayload }
  | { type: 'DRAW_AGREED'; payload: DrawAgreedPayload }
  | { type: 'DRAW_REJECTED'; payload: DrawRejectedPayload }
  | { type: 'CLEAR_DRAW_PROPOSAL' };

/* =============================================================================
   REDUCER
   ============================================================================= */

const initialState: GameState = {
  room: null,
  playerId: null,
  gameId: null,
  gamePhase: 'lobby',
  playerState: null,
  foundations: [],
  opponents: [],
  opponentStates: new Map(),
  opponentFullStates: new Map(),
  roundResult: null,
  totalScores: [],
  nertzCallerId: null,
  error: null,
  moveSequence: 0,
  roundNumber: 1,
  currentStarterIndex: 0,
  gameOver: false,
  gameWinner: null,
  playersReadyForNextRound: [],
  isReconnecting: false,
  disconnectedPlayers: [],
  playerInactivity: new Map(),
  lastOpponentFoundationMove: null,
  drawProposal: null,
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'ROOM_CREATED':
    case 'ROOM_JOINED':
      return {
        ...state,
        room: action.room,
        playerId: action.playerId,
        gamePhase: 'lobby',
        error: null,
      };

    case 'PLAYER_JOINED':
      if (!state.room) return state;
      return {
        ...state,
        room: {
          ...state.room,
          players: [...state.room.players, action.player],
        },
      };

    case 'PLAYER_LEFT':
      if (!state.room) return state;
      return {
        ...state,
        room: {
          ...state.room,
          players: state.room.players.filter((p) => p.id !== action.playerId),
        },
      };

    case 'PLAYER_UPDATED':
      if (!state.room) return state;
      return {
        ...state,
        room: {
          ...state.room,
          players: state.room.players.map((p) =>
            p.id === action.player.id ? action.player : p
          ),
        },
      };

    case 'SETTINGS_UPDATED':
      if (!state.room) return state;
      return {
        ...state,
        room: {
          ...state.room,
          settings: action.settings,
        },
      };

    case 'HOST_CHANGED':
      if (!state.room) return state;
      return {
        ...state,
        room: {
          ...state.room,
          hostId: action.newHostId,
          players: state.room.players.map((p) => ({
            ...p,
            isHost: p.id === action.newHostId,
          })),
        },
      };

    case 'GAME_STARTED': {
      // Initialize foundations for ALL players (4 piles per player)
      // This is critical for animation to work on all foundation indices
      const playerCount = state.room?.players.length ?? 1;
      const suits: Array<'hearts' | 'diamonds' | 'clubs' | 'spades'> = ['hearts', 'diamonds', 'clubs', 'spades'];
      const foundations: FoundationPile[] = [];
      for (let p = 0; p < playerCount; p++) {
        for (const suit of suits) {
          foundations.push({ suit, cards: [], ownerId: 'system' });
        }
      }
      return {
        ...state,
        gameId: action.gameId,
        gamePhase: 'setup',
        foundations,
      };
    }

    case 'PLAYER_SETUP_COMPLETE':
      // Could track which players are ready here
      return state;

    case 'ALL_PLAYERS_READY':
      return {
        ...state,
        gamePhase: 'waiting_for_start',
      };

    case 'ROUND_STARTED':
      return {
        ...state,
        gamePhase: 'playing',
        roundNumber: action.roundNumber,
      };

    case 'STATE_UPDATE':
      return applyStateUpdate(state, action.update);

    case 'MOVE_REJECTED':
      return {
        ...state,
        error: action.rejection.message,
      };

    case 'FOUNDATION_UPDATED': {
      const newFoundations = [...state.foundations];
      const foundationIndex = action.foundationIndex;
      const foundation = newFoundations[foundationIndex];
      if (foundation) {
        newFoundations[foundationIndex] = {
          ...foundation,
          cards: [...foundation.cards, action.card],
        };
      }

      // Track ALL foundation moves for flying card animation (both own and opponent moves)
      // This lets all players see who played what card where
      const foundationMove: OpponentMove | null = foundation ? {
        playerId: action.playerId,
        foundationIndex: action.foundationIndex,
        suit: foundation.suit as 'hearts' | 'diamonds' | 'clubs' | 'spades',
        rank: action.card.rank,
        timestamp: Date.now(),
        // opponentIndex and totalOpponents will be calculated in the component
      } : null;

      return {
        ...state,
        foundations: newFoundations,
        lastOpponentFoundationMove: foundationMove ?? state.lastOpponentFoundationMove,
      };
    }

    case 'FOUNDATION_MOVE_REJECTED':
      return {
        ...state,
        error: action.reason,
      };

    case 'ROUND_SCORED':
      return {
        ...state,
        gamePhase: 'scoring',
        roundResult: action.roundResult,
        totalScores: action.totalScores,
        gameOver: action.gameOver,
        gameWinner: action.winner ?? null,
        playersReadyForNextRound: [], // Clear ready state when new scoring starts
        drawProposal: null, // Clear draw proposal when round ends
      };

    case 'PLAYER_READY_FOR_NEXT_ROUND':
      // Add player to ready list if not already there
      if (state.playersReadyForNextRound.includes(action.playerId)) {
        return state;
      }
      return {
        ...state,
        playersReadyForNextRound: [...state.playersReadyForNextRound, action.playerId],
      };

    case 'ALL_READY_FOR_NEXT_ROUND': {
      // Reset foundations for new round (same structure as GAME_STARTED)
      const playerCount = state.room?.players.length ?? 1;
      const suits: Array<'hearts' | 'diamonds' | 'clubs' | 'spades'> = ['hearts', 'diamonds', 'clubs', 'spades'];
      const freshFoundations: FoundationPile[] = [];
      for (let p = 0; p < playerCount; p++) {
        for (const suit of suits) {
          freshFoundations.push({ suit, cards: [], ownerId: 'system' });
        }
      }
      return {
        ...state,
        gamePhase: 'waiting_for_start',
        roundNumber: action.nextRoundNumber,
        currentStarterIndex: (action.nextRoundNumber - 1) % (state.room?.players.length ?? 1),
        roundResult: null,
        playersReadyForNextRound: [],
        nertzCallerId: null,
        foundations: freshFoundations,
        opponentFullStates: new Map(), // Clear opponent states for fresh round
      };
    }

    case 'GAME_ENDED':
      return {
        ...state,
        gamePhase: 'finished',
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.error,
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };

    case 'LEAVE_ROOM':
      return initialState;

    case 'INCREMENT_SEQUENCE':
      return {
        ...state,
        moveSequence: state.moveSequence + 1,
      };

    case 'OPPONENT_STATE_UPDATE': {
      // Update full opponent state from server (ADR-009)
      const { payload } = action;
      const newFullStates = new Map(state.opponentFullStates);
      newFullStates.set(payload.playerId, {
        playerId: payload.playerId,
        stockCount: payload.stockCount,
        wasteTopCard: payload.wasteTopCard ?? null,
        nertzCount: payload.nertzCount,
        nertzTopCard: payload.nertzTopCard ?? null,
        workPiles: payload.workPiles,
        lastUpdate: Date.now(),
      });
      return {
        ...state,
        opponentFullStates: newFullStates,
      };
    }

    case 'SET_RECONNECTING':
      return {
        ...state,
        isReconnecting: action.isReconnecting,
      };

    case 'REJOIN_SUCCESS': {
      // Build opponent full states from the server response
      const rejoinOpponentStates = new Map<string, OpponentFullState>();
      if (action.payload.opponentStates) {
        for (const oppState of action.payload.opponentStates) {
          rejoinOpponentStates.set(oppState.playerId, {
            playerId: oppState.playerId,
            stockCount: oppState.stockCount,
            wasteTopCard: oppState.wasteTopCard ?? null,
            nertzCount: oppState.nertzCount,
            nertzTopCard: oppState.nertzTopCard ?? null,
            workPiles: oppState.workPiles,
            lastUpdate: Date.now(),
          });
        }
      }

      // Check if playerState is included in payload (from server-side state persistence)
      // Cast payload to access optional playerState field (added by he-ma7m.1)
      const payloadWithState = action.payload as RejoinGameSuccessPayload & {
        playerState?: PlayerGameState;
      };
      const restoredPlayerState = payloadWithState.playerState ?? null;

      // If player state is restored, skip setup and go directly to playing phase
      // Otherwise use the game phase from server (may be 'setup' requiring re-deal)
      const effectiveGamePhase = restoredPlayerState
        ? (action.payload.gamePhase === 'setup' ? 'playing' : action.payload.gamePhase)
        : action.payload.gamePhase;

      return {
        ...state,
        room: action.payload.room,
        playerId: action.payload.playerId,
        gameId: action.payload.gameId,
        gamePhase: effectiveGamePhase,
        roundNumber: action.payload.roundNumber,
        currentStarterIndex: action.payload.currentStarterIndex,
        foundations: action.payload.foundations,
        opponentFullStates: rejoinOpponentStates,
        playerState: restoredPlayerState,
        isReconnecting: false,
        error: null,
      };
    }

    case 'REJOIN_FAILED':
      // Clear the stored session since rejoin failed
      clearSession();
      return {
        ...state,
        isReconnecting: false,
        error: action.reason === 'game_ended' ? null : `Reconnection failed: ${action.reason}`,
      };

    case 'PLAYER_RECONNECTED':
      // Remove player from disconnected list
      return {
        ...state,
        disconnectedPlayers: state.disconnectedPlayers.filter(id => id !== action.playerId),
      };

    case 'PLAYER_DISCONNECTED':
      // Add player to disconnected list if they can reconnect
      if (action.canReconnect && !state.disconnectedPlayers.includes(action.playerId)) {
        return {
          ...state,
          disconnectedPlayers: [...state.disconnectedPlayers, action.playerId],
        };
      }
      return state;

    case 'PLAYER_INACTIVITY_UPDATE': {
      const { payload } = action;
      const newInactivity = new Map(state.playerInactivity);
      newInactivity.set(payload.playerId, {
        playerId: payload.playerId,
        playerName: payload.playerName,
        status: payload.status,
        lastActivityTimestamp: payload.lastActivityTimestamp,
      });
      return {
        ...state,
        playerInactivity: newInactivity,
      };
    }

    case 'DRAW_PROPOSED': {
      const { payload } = action;
      return {
        ...state,
        drawProposal: {
          proposerId: payload.proposerId,
          proposerName: payload.proposerName,
          timeoutAt: Date.now() + payload.timeout,
          responses: new Map(),
        },
      };
    }

    case 'DRAW_RESPONSE': {
      const { payload } = action;
      if (!state.drawProposal) return state;
      const newResponses = new Map(state.drawProposal.responses);
      newResponses.set(payload.responderId, {
        playerId: payload.responderId,
        playerName: payload.responderName,
        accepted: payload.accepted,
      });
      return {
        ...state,
        drawProposal: {
          ...state.drawProposal,
          responses: newResponses,
        },
      };
    }

    case 'DRAW_AGREED':
      // Draw was agreed - round will end via roundScored event
      // Clear the proposal as the round is ending
      return {
        ...state,
        drawProposal: null,
      };

    case 'DRAW_REJECTED':
      // Draw was rejected - clear the proposal
      return {
        ...state,
        drawProposal: null,
      };

    case 'CLEAR_DRAW_PROPOSAL':
      return {
        ...state,
        drawProposal: null,
      };

    default:
      return state;
  }
}

/**
 * Convert a full PlayerGameState to lightweight OpponentPlayerState
 */
function toOpponentState(player: PlayerGameState, timestamp: number): OpponentPlayerState {
  return {
    playerId: player.playerId,
    deckId: player.deckId,
    nertzCount: player.nertzPile.length,
    nertzTopCard: player.nertzPile.length > 0 ? player.nertzPile[player.nertzPile.length - 1] : undefined,
    stockCount: player.stockPile.length,
    wasteCount: player.wastePile.length,
    wasteTopCard: player.wastePile.length > 0 ? player.wastePile[player.wastePile.length - 1] : undefined,
    workPiles: player.workPiles.map(pile => ({
      count: pile.length,
      topCard: pile.length > 0 ? pile[pile.length - 1] : undefined,
    })),
    lastActivity: timestamp,
  };
}

/**
 * Update opponent state based on a state delta
 * Returns updated opponentStates Map
 */
function updateOpponentStateFromDelta(
  opponentStates: Map<string, OpponentPlayerState>,
  playerId: string,
  delta: StateUpdate['delta'],
  timestamp: number
): Map<string, OpponentPlayerState> {
  const existing = opponentStates.get(playerId);
  if (!existing) return opponentStates;

  const newStates = new Map(opponentStates);
  let updated = { ...existing, lastActivity: timestamp };

  switch (delta.type) {
    case 'cardMoved': {
      // Update counts based on source and destination
      const { source, destination, cards } = delta;
      const cardCount = cards.length;

      // Update source pile count
      if (source.type === 'nertz') {
        updated.nertzCount = Math.max(0, updated.nertzCount - cardCount);
        updated.nertzTopCard = undefined; // We don't know the new top card
      } else if (source.type === 'waste') {
        updated.wasteCount = Math.max(0, updated.wasteCount - cardCount);
        updated.wasteTopCard = undefined;
      } else if (source.type === 'work' && source.pileIndex !== undefined) {
        const pile = updated.workPiles[source.pileIndex];
        if (pile) {
          updated.workPiles = [...updated.workPiles];
          updated.workPiles[source.pileIndex] = {
            count: Math.max(0, pile.count - cardCount),
            topCard: undefined,
          };
        }
      }

      // Update destination pile count
      if (destination.type === 'work' && destination.pileIndex !== undefined) {
        const pile = updated.workPiles[destination.pileIndex];
        if (pile) {
          updated.workPiles = [...updated.workPiles];
          updated.workPiles[destination.pileIndex] = {
            count: pile.count + cardCount,
            topCard: cards[cards.length - 1], // Last card is top
          };
        }
      }
      // Foundation destinations don't affect opponent state display
      break;
    }

    case 'cardsDrawn': {
      // Cards moved from stock to waste
      const cardCount = delta.cards.length;
      updated.stockCount = Math.max(0, updated.stockCount - cardCount);
      updated.wasteCount += cardCount;
      updated.wasteTopCard = delta.cards.length > 0 ? delta.cards[delta.cards.length - 1] : undefined;
      break;
    }

    case 'stockFlipped': {
      // Waste pile moved back to stock
      const wasteCount = updated.wasteCount;
      updated.stockCount = wasteCount;
      updated.wasteCount = 0;
      updated.wasteTopCard = undefined;
      break;
    }
  }

  newStates.set(playerId, updated);
  return newStates;
}

// Apply state delta from server
function applyStateUpdate(state: GameState, update: StateUpdate): GameState {
  const { delta, timestamp } = update;

  switch (delta.type) {
    case 'phaseChanged':
      return { ...state, gamePhase: delta.phase };

    case 'nertzCalled':
      // Someone called nertz, show celebration
      return { ...state, nertzCallerId: delta.playerId };

    case 'roundScored':
      return {
        ...state,
        gamePhase: 'scoring',
        roundResult: delta.roundResult,
        totalScores: delta.totalScores,
        nertzCallerId: null,
      };

    case 'cardMoved': {
      // Update opponent state if this is from another player
      if (delta.playerId !== state.playerId) {
        return {
          ...state,
          opponentStates: updateOpponentStateFromDelta(
            state.opponentStates,
            delta.playerId,
            delta,
            timestamp
          ),
        };
      }
      return state;
    }

    case 'cardsDrawn': {
      // Update opponent state if this is from another player
      if (delta.playerId !== state.playerId) {
        return {
          ...state,
          opponentStates: updateOpponentStateFromDelta(
            state.opponentStates,
            delta.playerId,
            delta,
            timestamp
          ),
        };
      }
      return state;
    }

    case 'stockFlipped': {
      // Update opponent state if this is from another player
      if (delta.playerId !== state.playerId) {
        return {
          ...state,
          opponentStates: updateOpponentStateFromDelta(
            state.opponentStates,
            delta.playerId,
            delta,
            timestamp
          ),
        };
      }
      return state;
    }

    case 'playerJoinedGame': {
      const newOpponentStates = new Map(state.opponentStates);
      newOpponentStates.set(delta.player.playerId, toOpponentState(delta.player, timestamp));
      return {
        ...state,
        opponents: [...state.opponents, delta.player],
        opponentStates: newOpponentStates,
      };
    }

    case 'playerLeftGame': {
      const newOpponentStates = new Map(state.opponentStates);
      newOpponentStates.delete(delta.playerId);
      return {
        ...state,
        opponents: state.opponents.filter((p) => p.playerId !== delta.playerId),
        opponentStates: newOpponentStates,
      };
    }

    default:
      return state;
  }
}

/* =============================================================================
   CONTEXT
   ============================================================================= */

const GameStateContext = createContext<GameStateContextValue | null>(null);

/* =============================================================================
   PROVIDER
   ============================================================================= */

export interface GameStateProviderProps {
  children: ReactNode;
}

export function GameStateProvider({ children }: GameStateProviderProps) {
  const { socket, isConnected } = useSocket();
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // Track if we've ever had a game in this session (to distinguish initial mount from real leave)
  // This prevents clearing the session on initial page load before rejoin can happen
  const hasHadGameRef = useRef(false);

  // Update ref when we get a game
  useEffect(() => {
    if (state.gameId) {
      hasHadGameRef.current = true;
    }
  }, [state.gameId]);

  // Compute derived state
  const isHost = state.room?.hostId === state.playerId;

  // Set up socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Room events
    const onRoomCreated = (payload: { room: RoomState; playerId: string }) => {
      dispatch({ type: 'ROOM_CREATED', room: payload.room, playerId: payload.playerId });
    };

    const onRoomJoined = (payload: { room: RoomState; playerId: string }) => {
      dispatch({ type: 'ROOM_JOINED', room: payload.room, playerId: payload.playerId });
    };

    const onPlayerJoined = (payload: { player: LobbyPlayer }) => {
      dispatch({ type: 'PLAYER_JOINED', player: payload.player });
    };

    const onPlayerLeft = (payload: { playerId: string }) => {
      dispatch({ type: 'PLAYER_LEFT', playerId: payload.playerId });
    };

    const onPlayerUpdated = (payload: { player: LobbyPlayer }) => {
      dispatch({ type: 'PLAYER_UPDATED', player: payload.player });
    };

    const onSettingsUpdated = (payload: { settings: GameConfig }) => {
      dispatch({ type: 'SETTINGS_UPDATED', settings: payload.settings });
    };

    const onHostChanged = (payload: { newHostId: string }) => {
      dispatch({ type: 'HOST_CHANGED', newHostId: payload.newHostId });
    };

    const onGameStarted = (payload: { gameId: string }) => {
      dispatch({ type: 'GAME_STARTED', gameId: payload.gameId });
    };

    const onPlayerSetupComplete = (payload: { playerId: string }) => {
      dispatch({ type: 'PLAYER_SETUP_COMPLETE', playerId: payload.playerId });
    };

    const onAllPlayersReady = () => {
      dispatch({ type: 'ALL_PLAYERS_READY' });
    };

    const onRoundStarted = (payload: { roundNumber: number }) => {
      dispatch({ type: 'ROUND_STARTED', roundNumber: payload.roundNumber });
    };

    const onError = (payload: { code: string; message: string }) => {
      dispatch({ type: 'SET_ERROR', error: payload.message });
    };

    // Game events
    const onStateUpdate = (payload: StateUpdate) => {
      dispatch({ type: 'STATE_UPDATE', update: payload });
    };

    const onMoveRejected = (payload: MoveRejection) => {
      dispatch({ type: 'MOVE_REJECTED', rejection: payload });
    };

    const onFoundationUpdated = (payload: { foundationIndex: number; card: PlayerGameState['nertzPile'][0]; playerId: string }) => {
      dispatch({ type: 'FOUNDATION_UPDATED', ...payload });
    };

    const onFoundationMoveRejected = (payload: { reason: string }) => {
      dispatch({ type: 'FOUNDATION_MOVE_REJECTED', reason: payload.reason });
    };

    const onRoundScored = (payload: { roundResult: RoundResult; totalScores: { playerId: string; total: number }[]; gameOver: boolean; winner?: string }) => {
      dispatch({ type: 'ROUND_SCORED', roundResult: payload.roundResult, totalScores: payload.totalScores, gameOver: payload.gameOver, winner: payload.winner });
    };

    const onRoundEnded = (payload: { roundResult: RoundResult; totalScores: { playerId: string; total: number }[]; gameOver: boolean; winner?: string }) => {
      dispatch({ type: 'ROUND_SCORED', roundResult: payload.roundResult, totalScores: payload.totalScores, gameOver: payload.gameOver, winner: payload.winner });
    };

    const onPlayerReadyForNextRound = (payload: { playerId: string }) => {
      dispatch({ type: 'PLAYER_READY_FOR_NEXT_ROUND', playerId: payload.playerId });
    };

    const onAllReadyForNextRound = (payload: { nextRoundNumber: number; nextStarterId: string }) => {
      dispatch({ type: 'ALL_READY_FOR_NEXT_ROUND', nextRoundNumber: payload.nextRoundNumber, nextStarterId: payload.nextStarterId });
    };

    const onGameEnded = (payload: { winner: string }) => {
      dispatch({ type: 'GAME_ENDED', winner: payload.winner });
    };

    // Opponent state update (ADR-009)
    const onOpponentStateUpdate = (payload: OpponentStateUpdatePayload) => {
      dispatch({ type: 'OPPONENT_STATE_UPDATE', payload });
    };

    // Reconnection events
    const onRejoinGameSuccess = (payload: RejoinGameSuccessPayload) => {
      dispatch({ type: 'REJOIN_SUCCESS', payload });
      // Check if player state was included in payload
      const payloadWithState = payload as RejoinGameSuccessPayload & { playerState?: PlayerGameState };
      if (payloadWithState.playerState) {
        console.log('[GameState] Successfully rejoined game with restored player state');
      } else {
        console.log('[GameState] Successfully rejoined game (no player state - may need re-deal)');
      }
    };

    const onRejoinGameFailed = (payload: RejoinGameFailedPayload) => {
      dispatch({ type: 'REJOIN_FAILED', reason: payload.reason });
      console.log('[GameState] Failed to rejoin game:', payload.reason);
    };

    const onPlayerReconnected = (payload: PlayerReconnectedPayload) => {
      dispatch({ type: 'PLAYER_RECONNECTED', playerId: payload.playerId });
      console.log('[GameState] Player reconnected:', payload.playerName);
    };

    const onPlayerDisconnected = (payload: PlayerDisconnectedPayload) => {
      dispatch({ type: 'PLAYER_DISCONNECTED', playerId: payload.playerId, canReconnect: payload.canReconnect });
      console.log('[GameState] Player disconnected:', payload.playerName, payload.canReconnect ? '(can reconnect)' : '(cannot reconnect)');
    };

    const onPlayerInactivityUpdate = (payload: PlayerInactivityUpdatePayload) => {
      dispatch({ type: 'PLAYER_INACTIVITY_UPDATE', payload });
      if (payload.status !== 'active') {
        console.log('[GameState] Player inactivity update:', payload.playerName, payload.status);
      }
    };

    // Draw events
    const onDrawProposed = (payload: DrawProposedPayload) => {
      dispatch({ type: 'DRAW_PROPOSED', payload });
      console.log('[GameState] Draw proposed by:', payload.proposerName);
    };

    const onDrawResponse = (payload: DrawResponsePayload) => {
      dispatch({ type: 'DRAW_RESPONSE', payload });
      console.log('[GameState] Draw response from:', payload.responderName, payload.accepted ? 'accepted' : 'declined');
    };

    const onDrawAgreed = (payload: DrawAgreedPayload) => {
      dispatch({ type: 'DRAW_AGREED', payload });
      console.log('[GameState] Draw agreed for round:', payload.roundNumber);
    };

    const onDrawRejected = (payload: DrawRejectedPayload) => {
      dispatch({ type: 'DRAW_REJECTED', payload });
      console.log('[GameState] Draw rejected by:', payload.rejectedByName, 'reason:', payload.reason);
    };

    // Attach listeners
    socket.on('roomCreated', onRoomCreated);
    socket.on('roomJoined', onRoomJoined);
    socket.on('playerJoined', onPlayerJoined);
    socket.on('playerLeft', onPlayerLeft);
    socket.on('playerUpdated', onPlayerUpdated);
    socket.on('settingsUpdated', onSettingsUpdated);
    socket.on('hostChanged', onHostChanged);
    socket.on('gameStarted', onGameStarted);
    socket.on('playerSetupComplete', onPlayerSetupComplete);
    socket.on('allPlayersReady', onAllPlayersReady);
    socket.on('roundStarted', onRoundStarted);
    socket.on('socketError', onError);
    socket.on('stateUpdated', onStateUpdate);
    socket.on('moveRejected', onMoveRejected);
    socket.on('foundationUpdated', onFoundationUpdated);
    socket.on('foundationMoveRejected', onFoundationMoveRejected);
    socket.on('roundScored', onRoundScored);
    socket.on('roundEnded', onRoundEnded);
    socket.on('playerReadyForNextRound', onPlayerReadyForNextRound);
    socket.on('allReadyForNextRound', onAllReadyForNextRound);
    socket.on('gameEnded', onGameEnded);
    socket.on('opponentStateUpdate', onOpponentStateUpdate);
    socket.on('rejoinGameSuccess', onRejoinGameSuccess);
    socket.on('rejoinGameFailed', onRejoinGameFailed);
    socket.on('playerReconnected', onPlayerReconnected);
    socket.on('playerDisconnected', onPlayerDisconnected);
    socket.on('playerInactivityUpdate', onPlayerInactivityUpdate);
    socket.on('drawProposed', onDrawProposed);
    socket.on('drawResponse', onDrawResponse);
    socket.on('drawAgreed', onDrawAgreed);
    socket.on('drawRejected', onDrawRejected);

    // Cleanup
    return () => {
      socket.off('roomCreated', onRoomCreated);
      socket.off('roomJoined', onRoomJoined);
      socket.off('playerJoined', onPlayerJoined);
      socket.off('playerLeft', onPlayerLeft);
      socket.off('playerUpdated', onPlayerUpdated);
      socket.off('settingsUpdated', onSettingsUpdated);
      socket.off('hostChanged', onHostChanged);
      socket.off('gameStarted', onGameStarted);
      socket.off('playerSetupComplete', onPlayerSetupComplete);
      socket.off('allPlayersReady', onAllPlayersReady);
      socket.off('roundStarted', onRoundStarted);
      socket.off('socketError', onError);
      socket.off('stateUpdated', onStateUpdate);
      socket.off('moveRejected', onMoveRejected);
      socket.off('foundationUpdated', onFoundationUpdated);
      socket.off('foundationMoveRejected', onFoundationMoveRejected);
      socket.off('roundScored', onRoundScored);
      socket.off('roundEnded', onRoundEnded);
      socket.off('playerReadyForNextRound', onPlayerReadyForNextRound);
      socket.off('allReadyForNextRound', onAllReadyForNextRound);
      socket.off('gameEnded', onGameEnded);
      socket.off('opponentStateUpdate', onOpponentStateUpdate);
      socket.off('rejoinGameSuccess', onRejoinGameSuccess);
      socket.off('rejoinGameFailed', onRejoinGameFailed);
      socket.off('playerReconnected', onPlayerReconnected);
      socket.off('playerDisconnected', onPlayerDisconnected);
      socket.off('playerInactivityUpdate', onPlayerInactivityUpdate);
      socket.off('drawProposed', onDrawProposed);
      socket.off('drawResponse', onDrawResponse);
      socket.off('drawAgreed', onDrawAgreed);
      socket.off('drawRejected', onDrawRejected);
    };
  }, [socket]);

  // Attempt to rejoin game on socket connect if session exists
  useEffect(() => {
    if (!socket || !isConnected) return;

    const session = loadSession();
    if (!session) return;

    // Don't attempt rejoin if we're already in a room/game
    if (state.room) return;

    console.log('[GameState] Found saved session, attempting to rejoin game:', session.gameId);
    dispatch({ type: 'SET_RECONNECTING', isReconnecting: true });

    socket.emit('rejoinGame', {
      gameId: session.gameId,
      playerId: session.playerId,
      roomCode: session.roomCode,
    });
  }, [socket, isConnected, state.room]);

  // Save session when game starts
  useEffect(() => {
    if (state.gameId && state.playerId && state.room?.code) {
      saveSession(state.gameId, state.playerId, state.room.code);
      console.log('[GameState] Session saved:', state.gameId);
    }
  }, [state.gameId, state.playerId, state.room?.code]);

  // Clear session when game ends or player leaves (but not on initial mount)
  useEffect(() => {
    // Skip on initial mount - don't clear session before rejoin can attempt
    if (!hasHadGameRef.current) return;

    if (state.gamePhase === 'finished' || state.gamePhase === 'lobby') {
      if (state.gameId === null) {
        console.log('[GameState] Clearing session - game ended or left');
        clearSession();
      }
    }
  }, [state.gamePhase, state.gameId]);

  // Handle draw timeout countdown - clear proposal when it expires
  useEffect(() => {
    if (!state.drawProposal) return;

    const timeRemaining = state.drawProposal.timeoutAt - Date.now();
    if (timeRemaining <= 0) {
      // Already expired
      dispatch({ type: 'CLEAR_DRAW_PROPOSAL' });
      return;
    }

    // Set timer to clear when expired
    const timer = setTimeout(() => {
      dispatch({ type: 'CLEAR_DRAW_PROPOSAL' });
      console.log('[GameState] Draw proposal expired on client');
    }, timeRemaining);

    return () => clearTimeout(timer);
  }, [state.drawProposal]);

  // Actions
  const createRoom = useCallback(
    (playerName: string) => {
      if (!socket || !isConnected) {
        dispatch({ type: 'SET_ERROR', error: 'Not connected to server' });
        return;
      }
      socket.emit('createRoom', { playerName });
    },
    [socket, isConnected]
  );

  const joinRoom = useCallback(
    (roomCode: string, playerName: string) => {
      if (!socket || !isConnected) {
        dispatch({ type: 'SET_ERROR', error: 'Not connected to server' });
        return;
      }
      socket.emit('joinRoom', { roomCode, playerName });
    },
    [socket, isConnected]
  );

  const leaveRoom = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('leaveRoom');
    }
    clearSession();
    dispatch({ type: 'LEAVE_ROOM' });
  }, [socket, isConnected]);

  const updateSettings = useCallback(
    (settings: Partial<GameConfig>) => {
      if (!socket || !isConnected || !isHost) {
        return;
      }
      socket.emit('updateSettings', { settings });
    },
    [socket, isConnected, isHost]
  );

  const updatePlayer = useCallback(
    (updates: { name?: string; color?: string; avatar?: string }) => {
      if (!socket || !isConnected) {
        return;
      }
      socket.emit('updatePlayer', updates);
    },
    [socket, isConnected]
  );

  const startGame = useCallback(() => {
    if (!socket || !isConnected || !isHost) {
      return;
    }
    socket.emit('startGame');
  }, [socket, isConnected, isHost]);

  const setupComplete = useCallback(() => {
    if (!socket || !isConnected) {
      return;
    }
    socket.emit('setupComplete');
  }, [socket, isConnected]);

  const startRound = useCallback(() => {
    if (!socket || !isConnected) {
      return;
    }
    socket.emit('startRound');
  }, [socket, isConnected]);

  const makeMove = useCallback(
    (move: Move) => {
      if (!socket || !isConnected) {
        return;
      }
      socket.emit('makeMove', { move });
    },
    [socket, isConnected]
  );

  const callNertz = useCallback(() => {
    if (!socket || !isConnected) {
      return;
    }
    socket.emit('callNertz');
  }, [socket, isConnected]);

  const callDraw = useCallback(() => {
    if (!socket || !isConnected) {
      return;
    }
    socket.emit('callDraw');
  }, [socket, isConnected]);

  const respondToDraw = useCallback(
    (accept: boolean) => {
      if (!socket || !isConnected) {
        return;
      }
      socket.emit('respondToDraw', { accept });
    },
    [socket, isConnected]
  );

  const endGame = useCallback(() => {
    if (!socket || !isConnected || !isHost) {
      return;
    }
    socket.emit('endGame');
  }, [socket, isConnected, isHost]);

  const readyForNextRound = useCallback(() => {
    if (!socket || !isConnected) {
      return;
    }
    socket.emit('readyForNextRound');
  }, [socket, isConnected]);

  const reportState = useCallback(
    (statePayload: ReportStatePayload) => {
      if (!socket || !isConnected) {
        return;
      }
      socket.emit('reportState', statePayload);
    },
    [socket, isConnected]
  );

  const foundationMove = useCallback(
    (card: PlayerGameState['nertzPile'][0], foundationIndex: number, source: MoveSource) => {
      if (!socket || !isConnected) {
        return;
      }
      dispatch({ type: 'INCREMENT_SEQUENCE' });
      socket.emit('foundationMove', {
        card,
        foundationIndex,
        source,
        clientSequence: state.moveSequence + 1,
      });
    },
    [socket, isConnected, state.moveSequence]
  );

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const value: GameStateContextValue = {
    // Room state
    room: state.room,
    playerId: state.playerId,
    isHost,

    // Game state
    gameId: state.gameId,
    gamePhase: state.gamePhase,
    playerState: state.playerState,
    foundations: state.foundations,
    opponents: state.opponents,
    opponentStates: state.opponentStates,
    opponentFullStates: state.opponentFullStates,

    // Scoring
    roundResult: state.roundResult,
    totalScores: state.totalScores,
    gameOver: state.gameOver,
    gameWinner: state.gameWinner,
    playersReadyForNextRound: state.playersReadyForNextRound,

    // Celebration
    nertzCallerId: state.nertzCallerId,

    // Round info
    roundNumber: state.roundNumber,
    currentStarterIndex: state.currentStarterIndex,

    // Connection state
    isReconnecting: state.isReconnecting,
    disconnectedPlayers: state.disconnectedPlayers,

    // Player inactivity
    playerInactivity: state.playerInactivity,

    // Animation state
    lastOpponentFoundationMove: state.lastOpponentFoundationMove,

    // Draw proposal state
    drawProposal: state.drawProposal,

    // Actions
    createRoom,
    joinRoom,
    leaveRoom,
    updateSettings,
    updatePlayer,
    startGame,
    setupComplete,
    startRound,
    makeMove,
    callNertz,
    foundationMove,
    readyForNextRound,
    reportState,
    callDraw,
    respondToDraw,
    endGame,

    // Errors
    error: state.error,
    clearError,
  };

  return (
    <GameStateContext.Provider value={value}>
      {children}
    </GameStateContext.Provider>
  );
}

/* =============================================================================
   HOOK
   ============================================================================= */

/**
 * Hook to access the game state context.
 * Must be used within a GameStateProvider.
 */
export function useGameState(): GameStateContextValue {
  const context = useContext(GameStateContext);
  if (!context) {
    throw new Error('useGameState must be used within a GameStateProvider');
  }
  return context;
}

export default GameStateContext;
