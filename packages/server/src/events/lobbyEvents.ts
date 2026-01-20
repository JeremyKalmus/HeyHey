// Lobby Socket Event Handlers
import type { Server, Socket } from 'socket.io';
import type {
  AllClientToServerEvents,
  AllServerToClientEvents,
  CreateRoomPayload,
  JoinRoomPayload,
  UpdateSettingsPayload,
  UpdatePlayerPayload,
  MakeMovePayload,
  StateUpdate,
  MoveRejection,
  FoundationMovePayload,
  OpponentStateUpdatePayload,
  RejoinGamePayload,
  ReportStatePayload,
  RespondToDrawPayload,
} from '@heyhey/shared';
import { LobbyManager } from './LobbyManager.js';
import { SetupManager } from './SetupManager.js';
import { GameManager } from './GameManager.js';
import { SocketRegistry } from '../services/SocketRegistry.js';

type TypedServer = Server<AllClientToServerEvents, AllServerToClientEvents>;
type TypedSocket = Socket<AllClientToServerEvents, AllServerToClientEvents>;

// Shared SocketRegistry ensures consistent socket-to-room mappings
// across both LobbyManager and GameManager
const sharedSocketRegistry = new SocketRegistry();
const lobbyManager = new LobbyManager(sharedSocketRegistry);
const setupManager = new SetupManager();
let gameManager: GameManager | null = null;

function generateGameId(): string {
  return `game-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function getOrCreateGameManager(io: TypedServer): GameManager {
  if (!gameManager) {
    // Broadcast function: send state updates to all players in a room
    const broadcast = (roomCode: string, update: StateUpdate) => {
      io.to(roomCode).emit('stateUpdated', update);
    };

    // Reject function: send rejection to individual player
    const reject = (socketId: string, rejection: MoveRejection) => {
      const socket = io.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit('moveRejected', rejection);
      }
    };

    // Broadcast opponent state to all players except the one who made the move (ADR-009)
    const broadcastOpponentState = (
      roomCode: string,
      payload: OpponentStateUpdatePayload,
      excludePlayerId: string
    ) => {
      // Get all sockets in the room and emit to each except the excluded player
      const room = io.sockets.adapter.rooms.get(roomCode);
      if (room) {
        for (const socketId of room) {
          if (socketId !== excludePlayerId) {
            const socket = io.sockets.sockets.get(socketId);
            if (socket) {
              socket.emit('opponentStateUpdate', payload);
            }
          }
        }
      }
    };

    // Broadcast draw rejected (for timeout or decline)
    const broadcastDrawRejected = (
      roomCode: string,
      rejectedBy: string,
      rejectedByName: string,
      reason: 'declined' | 'timeout'
    ) => {
      io.to(roomCode).emit('drawRejected', {
        rejectedBy,
        rejectedByName,
        reason,
      });
    };

    // Pass shared SocketRegistry for consistent socket-to-room mappings
    gameManager = new GameManager(broadcast, reject, broadcastOpponentState, undefined, sharedSocketRegistry, broadcastDrawRejected);
  }
  return gameManager;
}

export function registerLobbyEvents(io: TypedServer): void {
  io.on('connection', (socket: TypedSocket) => {
    console.log(`Client connected: ${socket.id}`);

    // Create Room
    socket.on('createRoom', (payload: CreateRoomPayload) => {
      const result = lobbyManager.createRoom(socket.id, payload.playerName);

      if (!result.success) {
        socket.emit('socketError', {
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
        socket.emit('socketError', {
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
        socket.emit('socketError', {
          code: result.error,
          message: getSettingsErrorMessage(result.error),
        });
        return;
      }

      // Update room activity
      lobbyManager.updateRoomActivity(result.roomCode);

      // Broadcast to all players in room (including sender)
      io.to(result.roomCode).emit('settingsUpdated', {
        settings: result.settings,
      });

      console.log(`Settings updated in room ${result.roomCode}`);
    });

    // Update Player (name, color, avatar)
    socket.on('updatePlayer', (payload: UpdatePlayerPayload) => {
      const result = lobbyManager.updatePlayer(socket.id, payload);

      if (!result.success) {
        socket.emit('socketError', {
          code: result.error,
          message: `Failed to update player: ${result.error}`,
        });
        return;
      }

      // Update room activity
      lobbyManager.updateRoomActivity(result.roomCode);

      // Broadcast to all players in room (including sender)
      io.to(result.roomCode).emit('playerUpdated', {
        player: result.player,
      });

      console.log(`Player ${result.player.name} updated in room ${result.roomCode}`);
    });

    // Start Game
    socket.on('startGame', () => {
      const result = lobbyManager.startGame(socket.id);

      if (!result.success) {
        socket.emit('socketError', {
          code: result.error,
          message: getStartGameErrorMessage(result.error),
        });
        return;
      }

      const gameId = generateGameId();

      // Initialize setup tracking for this room
      const playerIds = lobbyManager.getSocketsInRoom(result.roomCode);
      setupManager.initializeRoom(result.roomCode, gameId, playerIds);

      // Mark room as having an active game (prevents lobby cleanup)
      lobbyManager.markRoomHasGame(result.roomCode, true);

      // Broadcast game start to all players
      io.to(result.roomCode).emit('gameStarted', { gameId });

      console.log(`Game started in room ${result.roomCode}: ${gameId}`);
    });

    // Setup Complete
    socket.on('setupComplete', () => {
      const roomCode = lobbyManager.getRoomCode(socket.id);

      if (!roomCode) {
        socket.emit('socketError', {
          code: 'not_in_room',
          message: 'You are not in a room.',
        });
        return;
      }

      const result = setupManager.markPlayerComplete(roomCode, socket.id);

      if (!result.success) {
        socket.emit('socketError', {
          code: result.error,
          message: getSetupErrorMessage(result.error),
        });
        return;
      }

      // Broadcast setup progress to all players in room
      io.to(roomCode).emit('playerSetupComplete', {
        playerId: socket.id,
        playersReady: result.playersReady,
        totalPlayers: result.totalPlayers,
      });

      console.log(
        `Player ${socket.id} completed setup in room ${roomCode} (${result.playersReady}/${result.totalPlayers})`
      );

      // Check if all players are ready
      if (result.allReady) {
        // Clean up setup state
        setupManager.cleanupRoom(roomCode);

        // Initialize game state with shared foundations
        const playerIds = lobbyManager.getSocketsInRoom(roomCode);
        const manager = getOrCreateGameManager(io);
        manager.initializeGame(roomCode, result.gameId, playerIds);

        // Broadcast that all players are ready to start playing
        io.to(roomCode).emit('allPlayersReady', { gameId: result.gameId });

        console.log(`All players ready in room ${roomCode}, transitioning to play phase`);
      }
    });

    // === Game Play Events ===

    // Make Move
    socket.on('makeMove', (payload: MakeMovePayload) => {
      const roomCode = lobbyManager.getRoomCode(socket.id);
      const manager = getOrCreateGameManager(io);
      const result = manager.processMove(socket.id, payload.move);

      if (!result.success) {
        console.log(`Move rejected for socket ${socket.id}`);
      } else if (roomCode) {
        // Broadcast opponent state update after successful move (ADR-009)
        manager.broadcastOpponentState(roomCode, payload.move.playerId);
      }
    });

    // Call Nertz
    socket.on('callNertz', () => {
      const roomCode = lobbyManager.getRoomCode(socket.id);
      if (!roomCode) {
        socket.emit('socketError', {
          code: 'not_in_room',
          message: 'You are not in a room.',
        });
        return;
      }

      const manager = getOrCreateGameManager(io);
      const result = manager.processNertzCall(socket.id);

      if (result.success) {
        console.log(`Nertz called by socket ${socket.id}`);

        // Process round end and emit scoring
        const roundEndResult = manager.processRoundEnd(roomCode);

        if (roundEndResult.success) {
          io.to(roomCode).emit('roundEnded', {
            roundResult: roundEndResult.roundResult,
            totalScores: roundEndResult.totalScores,
            gameOver: roundEndResult.gameOver,
            winner: roundEndResult.winner,
          });

          console.log(
            `Round ${roundEndResult.roundResult.roundNumber} ended. ` +
            `Game over: ${roundEndResult.gameOver}${roundEndResult.winner ? `, winner: ${roundEndResult.winner}` : ''}`
          );
        }
      }
    });

    // Call Draw - Player proposes a draw (stalemate resolution)
    socket.on('callDraw', () => {
      const roomCode = lobbyManager.getRoomCode(socket.id);
      if (!roomCode) {
        socket.emit('socketError', {
          code: 'not_in_room',
          message: 'You are not in a room.',
        });
        return;
      }

      const manager = getOrCreateGameManager(io);
      const result = manager.processCallDraw(socket.id);

      if (result.success) {
        // Broadcast drawProposed to all players in the room
        io.to(roomCode).emit('drawProposed', {
          proposerId: result.proposerId,
          proposerName: result.proposerName,
          timeout: result.timeout,
        });

        console.log(`Draw proposed by ${result.proposerName} in room ${roomCode}`);
      } else {
        socket.emit('socketError', {
          code: result.error,
          message: getCallDrawErrorMessage(result.error),
        });
      }
    });

    // Respond to Draw - Player accepts or rejects a draw proposal
    socket.on('respondToDraw', (payload: RespondToDrawPayload) => {
      const roomCode = lobbyManager.getRoomCode(socket.id);
      if (!roomCode) {
        socket.emit('socketError', {
          code: 'not_in_room',
          message: 'You are not in a room.',
        });
        return;
      }

      const manager = getOrCreateGameManager(io);
      const result = manager.processRespondToDraw(socket.id, payload.accept);

      if (!result.success) {
        socket.emit('socketError', {
          code: result.error,
          message: getRespondToDrawErrorMessage(result.error),
        });
        return;
      }

      if (result.rejected) {
        // Draw was rejected - broadcast to all players
        io.to(roomCode).emit('drawRejected', {
          rejectedBy: result.rejectedBy!,
          rejectedByName: result.rejectedByName!,
          reason: 'declined',
        });

        console.log(`Draw rejected by ${result.rejectedByName} in room ${roomCode}`);
      } else {
        // Broadcast the response to all players
        io.to(roomCode).emit('drawResponse', {
          responderId: result.responderId,
          responderName: result.responderName,
          accepted: result.accepted,
        });

        console.log(`Draw ${result.accepted ? 'accepted' : 'rejected'} by ${result.responderName} in room ${roomCode}`);

        if (result.allAccepted) {
          // All players accepted - process round end as draw
          const drawState = manager.getDrawState(roomCode);
          const proposerId = drawState?.proposerId ?? result.responderId;

          const roundEndResult = manager.processDrawRoundEnd(roomCode, proposerId);

          if (roundEndResult.success) {
            // Broadcast drawAgreed
            io.to(roomCode).emit('drawAgreed', {
              roundNumber: roundEndResult.roundResult.roundNumber,
            });

            // Broadcast roundEnded with scoring
            io.to(roomCode).emit('roundEnded', {
              roundResult: roundEndResult.roundResult,
              totalScores: roundEndResult.totalScores,
              gameOver: roundEndResult.gameOver,
              winner: roundEndResult.winner,
            });

            console.log(
              `Draw agreed in room ${roomCode}. Round ${roundEndResult.roundResult.roundNumber} ended. ` +
              `Game over: ${roundEndResult.gameOver}${roundEndResult.winner ? `, winner: ${roundEndResult.winner}` : ''}`
            );
          }
        }
      }
    });

    // Foundation Move - handle shared foundation plays with conflict resolution
    socket.on('foundationMove', (payload: FoundationMovePayload) => {
      const roomCode = lobbyManager.getRoomCode(socket.id);

      if (!roomCode) {
        socket.emit('socketError', {
          code: 'not_in_room',
          message: 'You are not in a room.',
        });
        return;
      }

      const manager = getOrCreateGameManager(io);
      // Look up the original playerId from socket.id (handles reconnection case)
      const originalPlayerId = manager.getPlayerIdForSocket(roomCode, socket.id) || socket.id;
      const result = manager.processFoundationMove(roomCode, originalPlayerId, payload);

      if (result.success) {
        // Broadcast foundation update to ALL players in room (including sender)
        io.to(roomCode).emit('foundationUpdated', {
          foundationIndex: result.foundationIndex,
          card: result.card,
          playerId: result.playerId,
          sequence: result.sequence,
        });

        // Broadcast opponent state update after successful foundation move (ADR-009)
        manager.broadcastOpponentState(roomCode, socket.id);

        console.log(
          `Foundation move: ${result.card.rank} of ${result.card.suit} to pile ${result.foundationIndex} by ${socket.id} (seq: ${result.sequence})`
        );
      } else {
        // Send rejection to individual player only
        socket.emit('foundationMoveRejected', {
          reason: result.error,
          clientSequence: result.clientSequence,
          currentState: result.currentState,
        });

        console.log(
          `Foundation move rejected for ${socket.id}: ${result.error}`
        );
      }
    });

    // Report State - client reports its visible state for relay to opponents
    socket.on('reportState', (payload: ReportStatePayload) => {
      const roomCode = lobbyManager.getRoomCode(socket.id);

      if (!roomCode) {
        return; // Silently ignore if not in a room
      }

      // Get the original playerId for this socket (handles reconnection case)
      const manager = getOrCreateGameManager(io);
      const originalPlayerId = manager.getPlayerIdForSocket(roomCode, socket.id);
      const playerId = originalPlayerId || socket.id;

      // Store the nertz count for scoring (cards are dealt client-side)
      manager.updatePlayerNertzCount(roomCode, playerId, payload.nertzCount);

      // Store full player state for reconnection recovery (ADR-010)
      if (payload.playerState) {
        manager.storePlayerState(roomCode, playerId, payload.playerState);
      }

      // Build opponent state update payload
      const opponentPayload: OpponentStateUpdatePayload = {
        playerId, // Use original playerId if found, else socket.id
        stockCount: payload.stockCount,
        wasteTopCard: payload.wasteTopCard,
        nertzCount: payload.nertzCount,
        nertzTopCard: payload.nertzTopCard,
        workPiles: payload.workPiles,
      };

      // Broadcast to all other players in the room (not to self)
      socket.to(roomCode).emit('opponentStateUpdate', opponentPayload);
    });

    // Start Round (only the designated starter can call this)
    socket.on('startRound', () => {
      const roomCode = lobbyManager.getRoomCode(socket.id);

      if (!roomCode) {
        socket.emit('socketError', {
          code: 'not_in_room',
          message: 'You are not in a room.',
        });
        return;
      }

      const manager = getOrCreateGameManager(io);
      const result = manager.processStartRound(roomCode, socket.id);

      if (!result.success) {
        socket.emit('socketError', {
          code: result.error,
          message: getStartRoundErrorMessage(result.error),
        });
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

      // Broadcast initial opponent states so all players can see each other's cards (ADR-009)
      manager.broadcastAllOpponentStates(roomCode);

      console.log(
        `Round ${result.roundNumber} started by ${result.starterName} in room ${roomCode}`
      );
    });

    // Ready for Next Round
    socket.on('readyForNextRound', () => {
      const roomCode = lobbyManager.getRoomCode(socket.id);

      if (!roomCode) {
        socket.emit('socketError', {
          code: 'not_in_room',
          message: 'You are not in a room.',
        });
        return;
      }

      const manager = getOrCreateGameManager(io);
      const result = manager.processPlayerReady(roomCode, socket.id);

      if (!result.success) {
        socket.emit('socketError', {
          code: result.error,
          message: getReadyErrorMessage(result.error),
        });
        return;
      }

      // Broadcast that this player is ready
      io.to(roomCode).emit('playerReadyForNextRound', {
        playerId: result.playerId,
      });

      console.log(`Player ${socket.id} ready for next round in room ${roomCode}`);

      // If all players are ready, transition to next round
      if (result.allReady && result.nextRoundNumber && result.nextStarterId) {
        // Prepare the game state for next round
        manager.prepareNextRound(roomCode);

        // Broadcast all ready event
        io.to(roomCode).emit('allReadyForNextRound', {
          nextRoundNumber: result.nextRoundNumber,
          nextStarterId: result.nextStarterId,
        });

        console.log(
          `All players ready in room ${roomCode}. Next round: ${result.nextRoundNumber}, starter: ${result.nextStarterId}`
        );
      }
    });

    // Rejoin Game - reconnect to an active game after disconnect
    socket.on('rejoinGame', (payload: RejoinGamePayload) => {
      const manager = getOrCreateGameManager(io);
      const result = manager.rejoinGame(
        socket.id,
        payload.gameId,
        payload.playerId,
        payload.roomCode
      );

      if (!result.success) {
        socket.emit('rejoinGameFailed', {
          reason: result.reason,
          message: getRejoinErrorMessage(result.reason),
        });
        return;
      }

      // Join socket.io room for broadcasts
      socket.join(payload.roomCode);

      // Re-register with lobby manager (update socket mapping)
      lobbyManager.registerReconnectedPlayer(
        socket.id,
        payload.roomCode,
        result.playerName
      );

      // Send success with current game state including opponent states
      // Use the original playerId (from session) for consistency with game state
      socket.emit('rejoinGameSuccess', {
        room: result.room,
        playerId: payload.playerId, // Use original playerId, not new socket.id
        gameId: payload.gameId, // Include gameId for navigation
        gamePhase: result.gamePhase,
        roundNumber: result.roundNumber,
        currentStarterIndex: result.currentStarterIndex,
        foundations: result.foundations,
        opponentStates: result.opponentStates, // Include opponent states for immediate visibility
        playerState: result.playerState, // Include stored player state for reconnection recovery (ADR-010)
      });

      // Notify other players that this player has reconnected
      // Use original playerId so other clients can match it to their opponent lists
      socket.to(payload.roomCode).emit('playerReconnected', {
        playerId: payload.playerId, // Use original playerId
        playerName: result.playerName,
      });

      // Request all other players to broadcast their current state
      // This ensures the reconnecting player gets up-to-date opponent info
      socket.to(payload.roomCode).emit('requestStateReport');

      console.log(`Player ${result.playerName} (${socket.id}) rejoined game ${payload.gameId}`);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      const roomCode = lobbyManager.getRoomCode(socket.id);
      const playerInfo = lobbyManager.getPlayerInfo(socket.id);

      // Handle game disconnect
      const manager = getOrCreateGameManager(io);
      const disconnectResult = manager.handleDisconnect(socket.id);

      // If player was in an active game, notify others they disconnected but can reconnect
      // DON'T remove them from lobby - they need to be able to rejoin
      if (disconnectResult.inActiveGame && roomCode && playerInfo) {
        io.to(roomCode).emit('playerDisconnected', {
          playerId: socket.id,
          playerName: playerInfo.playerName,
          canReconnect: true,
        });
        console.log(`Client disconnected from active game: ${socket.id} (can reconnect)`);
        return; // Don't call handleLeaveRoom - player can rejoin
      }

      // Only remove from lobby if NOT in an active game
      handleLeaveRoom(io, socket);
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
}

function handleLeaveRoom(io: TypedServer, socket: TypedSocket): void {
  const roomCode = lobbyManager.getRoomCode(socket.id);
  const result = lobbyManager.leaveRoom(socket.id);

  if (!result.success || !result.roomCode) {
    return;
  }

  // Clean up game state for this player
  if (roomCode && gameManager) {
    gameManager.handlePlayerLeave(roomCode, socket.id);
  }

  // Leave socket.io room
  socket.leave(result.roomCode);

  if (result.roomClosed) {
    // Clean up game state when room closes
    if (roomCode && gameManager) {
      gameManager.cleanupGame(roomCode);
    }
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

function getSetupErrorMessage(error: string): string {
  switch (error) {
    case 'setup_not_initialized':
      return 'Game setup has not been initialized.';
    case 'already_complete':
      return 'Setup has already been completed.';
    default:
      return 'Failed to complete setup.';
  }
}

function getStartRoundErrorMessage(error: string): string {
  switch (error) {
    case 'game_not_found':
      return 'Game not found.';
    case 'not_in_waiting_phase':
      return 'Round cannot be started now.';
    case 'not_starter':
      return 'Only the designated starter can start this round.';
    default:
      return 'Failed to start round.';
  }
}

function getReadyErrorMessage(error: string): string {
  switch (error) {
    case 'game_not_found':
      return 'Game not found.';
    case 'player_not_in_game':
      return 'You are not in this game.';
    default:
      return 'Failed to mark ready.';
  }
}

function getRejoinErrorMessage(reason: string): string {
  switch (reason) {
    case 'game_not_found':
      return 'Game not found or has ended.';
    case 'player_not_found':
      return 'You were not a player in this game.';
    case 'game_ended':
      return 'The game has already ended.';
    case 'invalid_credentials':
      return 'Invalid reconnection credentials.';
    default:
      return 'Failed to rejoin game.';
  }
}

function getCallDrawErrorMessage(error: string): string {
  switch (error) {
    case 'not_in_room':
      return 'You are not in a room.';
    case 'game_not_found':
      return 'Game not found.';
    case 'player_not_in_game':
      return 'You are not in this game.';
    case 'not_in_playing_phase':
      return 'Draw can only be called during play.';
    case 'draw_already_proposed':
      return 'A draw has already been proposed.';
    default:
      return 'Failed to call draw.';
  }
}

function getRespondToDrawErrorMessage(error: string): string {
  switch (error) {
    case 'not_in_room':
      return 'You are not in a room.';
    case 'game_not_found':
      return 'Game not found.';
    case 'player_not_in_game':
      return 'You are not in this game.';
    case 'no_active_draw':
      return 'No active draw proposal to respond to.';
    case 'already_responded':
      return 'You have already responded to this draw proposal.';
    default:
      return 'Failed to respond to draw.';
  }
}

/** Cleanup interval in milliseconds (5 minutes) */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Start periodic cleanup for rooms and games
 * Should be called once after server starts
 */
export function startCleanupInterval(io: TypedServer): NodeJS.Timeout {
  console.log('[Cleanup] Starting periodic cleanup interval (every 5 minutes)');

  return setInterval(() => {
    console.log('[Cleanup] Running periodic cleanup sweep...');

    // Clean up expired lobby rooms
    const expiredRooms = lobbyManager.cleanupExpiredRooms();

    // Notify players in expired rooms
    for (const expired of expiredRooms) {
      for (const socketId of expired.socketIds) {
        const socket = io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit('roomExpired', {
            roomCode: expired.roomCode,
            reason: expired.reason,
          });
          socket.leave(expired.roomCode);
        }
      }
    }

    // Clean up abandoned games
    if (gameManager) {
      const abandonedGames = gameManager.cleanupAbandonedGames();

      // Mark rooms as no longer having active games and notify players
      for (const abandoned of abandonedGames) {
        // Mark room as no longer having a game
        lobbyManager.markRoomHasGame(abandoned.roomCode, false);

        // Notify any connected sockets in the room
        io.to(abandoned.roomCode).emit('roomExpired', {
          roomCode: abandoned.roomCode,
          reason: 'game_abandoned',
        });
      }
    }

    // Log stats for monitoring
    const roomStats = lobbyManager.getRoomStats();
    const gameStats = gameManager?.getGameStats();

    console.log(`[Cleanup] Stats - Rooms: ${roomStats.totalRooms} (${roomStats.roomsWithGames} with games, ${roomStats.emptyRooms} empty)` +
      (gameStats ? `, Games: ${gameStats.totalGames} (${gameStats.totalConnectedPlayers} connected, ${gameStats.totalDisconnectedPlayers} disconnected)` : ''));
  }, CLEANUP_INTERVAL_MS);
}

// Export managers for testing
export { lobbyManager, setupManager, gameManager };
