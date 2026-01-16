// GameStateContext - Game state management and socket event handling
// Manages room, players, game phase, local player state

import { createContext, useContext, useCallback, useReducer, useEffect, type ReactNode } from 'react';
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
} from '@heyhey/shared';

/* =============================================================================
   TYPES
   ============================================================================= */

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

  // Round/Scoring state
  roundResult: RoundResult | null;
  totalScores: { playerId: string; total: number }[];
  roundNumber: number;
  currentStarterIndex: number;
  gameOver: boolean;
  gameWinner: string | null;

  // Celebration state
  nertzCallerId: string | null;

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
  roundResult: RoundResult | null;
  totalScores: { playerId: string; total: number }[];
  nertzCallerId: string | null;
  error: string | null;
  moveSequence: number;
  roundNumber: number;
  currentStarterIndex: number;
  gameOver: boolean;
  gameWinner: string | null;
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
  | { type: 'GAME_ENDED'; winner: string }
  | { type: 'ROUND_STARTED'; roundNumber: number }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'LEAVE_ROOM' }
  | { type: 'INCREMENT_SEQUENCE' };

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
  roundResult: null,
  totalScores: [],
  nertzCallerId: null,
  error: null,
  moveSequence: 0,
  roundNumber: 1,
  currentStarterIndex: 0,
  gameOver: false,
  gameWinner: null,
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

    case 'GAME_STARTED':
      return {
        ...state,
        gameId: action.gameId,
        gamePhase: 'setup',
        // Initialize empty foundations (4 piles, one per suit)
        foundations: [
          { suit: 'hearts', cards: [], ownerId: 'system' },
          { suit: 'diamonds', cards: [], ownerId: 'system' },
          { suit: 'clubs', cards: [], ownerId: 'system' },
          { suit: 'spades', cards: [], ownerId: 'system' },
        ],
      };

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
      if (newFoundations[foundationIndex]) {
        newFoundations[foundationIndex] = {
          ...newFoundations[foundationIndex],
          cards: [...newFoundations[foundationIndex].cards, action.card],
        };
      }
      return {
        ...state,
        foundations: newFoundations,
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
      };

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

    default:
      return state;
  }
}

// Apply state delta from server
function applyStateUpdate(state: GameState, update: StateUpdate): GameState {
  const { delta } = update;

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

    case 'cardMoved':
      // Update player state based on move
      // For now, just return state - real implementation would update piles
      return state;

    case 'cardsDrawn':
    case 'stockFlipped':
      // Update player's stock/waste
      return state;

    case 'playerJoinedGame':
      return {
        ...state,
        opponents: [...state.opponents, delta.player],
      };

    case 'playerLeftGame':
      return {
        ...state,
        opponents: state.opponents.filter((p) => p.playerId !== delta.playerId),
      };

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

    const onGameEnded = (payload: { winner: string }) => {
      dispatch({ type: 'GAME_ENDED', winner: payload.winner });
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
    socket.on('error', onError);
    socket.on('stateUpdate', onStateUpdate);
    socket.on('moveRejected', onMoveRejected);
    socket.on('foundationUpdated', onFoundationUpdated);
    socket.on('foundationMoveRejected', onFoundationMoveRejected);
    socket.on('roundScored', onRoundScored);
    socket.on('roundEnded', onRoundEnded);
    socket.on('gameEnded', onGameEnded);

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
      socket.off('error', onError);
      socket.off('stateUpdate', onStateUpdate);
      socket.off('moveRejected', onMoveRejected);
      socket.off('foundationUpdated', onFoundationUpdated);
      socket.off('foundationMoveRejected', onFoundationMoveRejected);
      socket.off('roundScored', onRoundScored);
      socket.off('roundEnded', onRoundEnded);
      socket.off('gameEnded', onGameEnded);
    };
  }, [socket]);

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

    // Scoring
    roundResult: state.roundResult,
    totalScores: state.totalScores,
    gameOver: state.gameOver,
    gameWinner: state.gameWinner,

    // Celebration
    nertzCallerId: state.nertzCallerId,

    // Round info
    roundNumber: state.roundNumber,
    currentStarterIndex: state.currentStarterIndex,

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
