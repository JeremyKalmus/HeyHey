// Lobby Socket Event Handlers
import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  CreateRoomPayload,
  JoinRoomPayload,
  UpdateSettingsPayload,
} from '@heyhey/shared';
import { LobbyManager } from './LobbyManager.js';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

const lobbyManager = new LobbyManager();

function generateGameId(): string {
  return `game-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function registerLobbyEvents(io: TypedServer): void {
  io.on('connection', (socket: TypedSocket) => {
    console.log(`Client connected: ${socket.id}`);

    // Create Room
    socket.on('createRoom', (payload: CreateRoomPayload) => {
      const result = lobbyManager.createRoom(socket.id, payload.playerName);

      if (!result.success) {
        socket.emit('error', {
          code: result.error,
          message: `Failed to create room: ${result.error}`,
        });
        return;
      }

      // Join socket.io room for broadcasts
      socket.join(result.room.code);

      socket.emit('roomCreated', {
        room: result.room,
        playerId: result.playerId,
      });

      console.log(`Room created: ${result.room.code} by ${payload.playerName}`);
    });

    // Join Room
    socket.on('joinRoom', (payload: JoinRoomPayload) => {
      const result = lobbyManager.joinRoom(
        socket.id,
        payload.roomCode,
        payload.playerName
      );

      if (!result.success) {
        socket.emit('error', {
          code: result.error,
          message: getJoinErrorMessage(result.error),
        });
        return;
      }

      // Join socket.io room for broadcasts
      socket.join(result.room.code);

      // Send room state to joining player
      socket.emit('roomJoined', {
        room: result.room,
        playerId: result.playerId,
      });

      // Broadcast new player to others in room
      socket.to(result.room.code).emit('playerJoined', {
        player: result.newPlayer,
      });

      console.log(
        `${payload.playerName} joined room ${result.room.code}`
      );
    });

    // Leave Room
    socket.on('leaveRoom', () => {
      handleLeaveRoom(io, socket);
    });

    // Update Settings
    socket.on('updateSettings', (payload: UpdateSettingsPayload) => {
      const result = lobbyManager.updateSettings(socket.id, payload.settings);

      if (!result.success) {
        socket.emit('error', {
          code: result.error,
          message: getSettingsErrorMessage(result.error),
        });
        return;
      }

      // Broadcast to all players in room (including sender)
      io.to(result.roomCode).emit('settingsUpdated', {
        settings: result.settings,
      });

      console.log(`Settings updated in room ${result.roomCode}`);
    });

    // Start Game
    socket.on('startGame', () => {
      const result = lobbyManager.startGame(socket.id);

      if (!result.success) {
        socket.emit('error', {
          code: result.error,
          message: getStartGameErrorMessage(result.error),
        });
        return;
      }

      const gameId = generateGameId();

      // Broadcast game start to all players
      io.to(result.roomCode).emit('gameStarted', { gameId });

      console.log(`Game started in room ${result.roomCode}: ${gameId}`);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      handleLeaveRoom(io, socket);
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
}

function handleLeaveRoom(io: TypedServer, socket: TypedSocket): void {
  const result = lobbyManager.leaveRoom(socket.id);

  if (!result.success || !result.roomCode) {
    return;
  }

  // Leave socket.io room
  socket.leave(result.roomCode);

  if (result.roomClosed) {
    console.log(`Room ${result.roomCode} closed (empty)`);
    return;
  }

  // Notify remaining players
  io.to(result.roomCode).emit('playerLeft', {
    playerId: socket.id,
  });

  // If host changed, notify room
  if (result.newHostId) {
    io.to(result.roomCode).emit('hostChanged', {
      newHostId: result.newHostId,
    });
    console.log(`New host in room ${result.roomCode}: ${result.newHostId}`);
  }

  console.log(`Player ${socket.id} left room ${result.roomCode}`);
}

function getJoinErrorMessage(error: string): string {
  switch (error) {
    case 'room_not_found':
      return 'Room not found. Check the room code and try again.';
    case 'invalid_code':
      return 'Invalid room code format.';
    case 'already_in_room':
      return 'You are already in this room.';
    default:
      return 'Failed to join room.';
  }
}

function getSettingsErrorMessage(error: string): string {
  switch (error) {
    case 'not_in_room':
      return 'You are not in a room.';
    case 'room_not_found':
      return 'Room not found.';
    case 'not_host':
      return 'Only the host can change settings.';
    case 'invalid_nertz_pile_size':
      return 'Nertz pile size must be 10 or 13.';
    case 'invalid_draw_count':
      return 'Draw count must be 1 or 3.';
    case 'invalid_target_score':
      return 'Target score must be between 1 and 1000.';
    default:
      return 'Failed to update settings.';
  }
}

function getStartGameErrorMessage(error: string): string {
  switch (error) {
    case 'not_in_room':
      return 'You are not in a room.';
    case 'room_not_found':
      return 'Room not found.';
    case 'not_host':
      return 'Only the host can start the game.';
    case 'not_enough_players':
      return 'Need at least 2 players to start.';
    default:
      return 'Failed to start game.';
  }
}

// Export lobby manager for testing
export { lobbyManager };
