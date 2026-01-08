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
