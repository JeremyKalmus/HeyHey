// Game Socket Event Handlers
// Handles real-time game play events with state synchronization

import type { Server, Socket } from 'socket.io';
import type {
  AllClientToServerEvents,
  AllServerToClientEvents,
  MakeMovePayload,
  StateUpdate,
  MoveRejection,
} from '@heyhey/shared';
import { GameManager } from './GameManager.js';

type TypedServer = Server<AllClientToServerEvents, AllServerToClientEvents>;
type TypedSocket = Socket<AllClientToServerEvents, AllServerToClientEvents>;

// Broadcast function for state updates
function createBroadcastFn(io: TypedServer) {
  return (roomCode: string, update: StateUpdate) => {
    io.to(roomCode).emit('stateUpdate', update);
  };
}

// Create a singleton GameManager
let gameManager: GameManager | null = null;

export function getGameManager(io: TypedServer): GameManager {
  if (!gameManager) {
    gameManager = new GameManager(
      createBroadcastFn(io),
      // Reject function is handled per-socket below
      () => {}
    );
  }
  return gameManager;
}

/**
 * Register game socket events for a specific socket
 */
export function registerGameEvents(io: TypedServer, socket: TypedSocket): void {
  const manager = getGameManager(io);

  // Make Move
  socket.on('makeMove', (payload: MakeMovePayload) => {
    const result = manager.processMove(socket.id, payload.move);

    if (!result.success) {
      console.log(`Move rejected for socket ${socket.id}`);
    }
  });

  // Call Nertz
  socket.on('callNertz', () => {
    const result = manager.processNertzCall(socket.id);

    if (result.success) {
      console.log(`Nertz called by socket ${socket.id}`);
    }
  });

  // Start Round (only starter can call this)
  socket.on('startRound', () => {
    // Get room code from socket rooms (excluding socket.id room)
    const rooms = [...socket.rooms].filter(r => r !== socket.id);
    const roomCode = rooms[0];

    if (!roomCode) {
      socket.emit('error', { code: 'not_in_room', message: 'Not in a game room' });
      return;
    }

    // Get player ID (in our setup, socketId = playerId)
    const playerId = socket.id;

    const result = manager.processStartRound(roomCode, playerId);

    if (!result.success) {
      socket.emit('error', { code: result.error, message: `Cannot start round: ${result.error}` });
      return;
    }

    // Broadcast roundStarting to all players
    io.to(roomCode).emit('roundStarting', {
      starterId: result.starterId,
      starterName: result.starterName,
      roundNumber: result.roundNumber,
    });

    // Transition to playing phase
    manager.transitionToPlaying(roomCode);

    // Broadcast roundStarted to all players
    io.to(roomCode).emit('roundStarted', {
      timestamp: Date.now(),
      roundNumber: result.roundNumber,
    });

    console.log(`Round ${result.roundNumber} started by ${result.starterName} in room ${roomCode}`);
  });
}

/**
 * Create and initialize a game manager with proper broadcast/reject functions
 */
export function createGameManagerForServer(io: TypedServer): GameManager {
  const broadcast = (roomCode: string, update: StateUpdate) => {
    io.to(roomCode).emit('stateUpdate', update);
  };

  // The reject function needs to find the socket and emit
  const reject = (socketId: string, rejection: MoveRejection) => {
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      socket.emit('moveRejected', rejection);
    }
  };

  return new GameManager(broadcast, reject);
}

// Export for testing
export { gameManager };
