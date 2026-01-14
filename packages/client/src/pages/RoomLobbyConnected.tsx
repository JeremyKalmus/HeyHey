// RoomLobbyConnected - Connects RoomLobby to GameStateContext
// Handles navigation on game start

import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { RoomLobby } from '../components/Lobby/RoomLobby';
import { useGameState } from '../context/GameStateContext';
import type { LobbyPlayer } from '../components/Lobby/PlayerList';

// Default player colors for assignment (matches PlayerColor type)
const PLAYER_COLORS: LobbyPlayer['color'][] = ['red', 'blue', 'green', 'purple', 'orange', 'teal', 'pink', 'yellow'];

export function RoomLobbyConnected() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const {
    room,
    playerId,
    isHost,
    gameId,
    leaveRoom,
    updateSettings,
    startGame,
  } = useGameState();

  // Navigate to game when game starts
  useEffect(() => {
    if (gameId) {
      navigate(`/game/${gameId}`);
    }
  }, [gameId, navigate]);

  // Redirect to home if no room
  useEffect(() => {
    if (!room && code) {
      navigate('/');
    }
  }, [room, code, navigate]);

  if (!room || !playerId) {
    return null;
  }

  // Adapt shared LobbyPlayer to component LobbyPlayer (add color and isReady)
  const adaptedPlayers: LobbyPlayer[] = room.players.map((player, index) => ({
    ...player,
    color: PLAYER_COLORS[index % PLAYER_COLORS.length]!,
    isReady: player.isHost, // Host is always ready, others default to false
  }));

  return (
    <RoomLobby
      roomCode={room.code}
      players={adaptedPlayers}
      currentPlayerId={playerId}
      isHost={isHost}
      gameConfig={room.settings}
      onConfigChange={(config) => updateSettings(config)}
      onStartGame={startGame}
      onLeaveRoom={() => {
        leaveRoom();
        navigate('/');
      }}
    />
  );
}

export default RoomLobbyConnected;
