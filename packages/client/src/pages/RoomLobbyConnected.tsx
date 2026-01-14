// RoomLobbyConnected - Wires RoomLobby to context and routing
import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameState } from '../context';
import { RoomLobby } from '../components/Lobby/RoomLobby';
import type { LobbyPlayer } from '../components/Lobby/PlayerList';
import type { PlayerColor } from '../components/Card/CardBack';
import type { GameConfig } from '@heyhey/shared';

// Default colors assigned to players in order
const PLAYER_COLORS: PlayerColor[] = [
  'red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'teal',
];

export function RoomLobbyConnected() {
  const navigate = useNavigate();
  const { code } = useParams<{ code: string }>();
  const {
    room,
    playerId,
    isHost,
    gameId,
    gamePhase,
    updateSettings,
    startGame,
    leaveRoom,
    error,
    clearError,
  } = useGameState();

  // Redirect to home if no room
  useEffect(() => {
    if (!room) {
      navigate('/');
    }
  }, [room, navigate]);

  // Navigate to game when game starts
  useEffect(() => {
    if (gameId && (gamePhase === 'setup' || gamePhase === 'playing')) {
      navigate(`/game/${gameId}`);
    }
  }, [gameId, gamePhase, navigate]);

  // Map server LobbyPlayer to client LobbyPlayer with colors
  const clientPlayers: LobbyPlayer[] = useMemo(() => {
    if (!room) return [];
    return room.players.map((p, index) => ({
      id: p.id,
      name: p.name,
      color: PLAYER_COLORS[index % PLAYER_COLORS.length]!,
      isHost: p.isHost,
      isReady: p.isHost, // Host is always ready
    }));
  }, [room]);

  const handleConfigChange = (config: GameConfig) => {
    updateSettings(config);
  };

  const handleStartGame = () => {
    startGame();
  };

  const handleLeaveRoom = () => {
    leaveRoom();
    navigate('/');
  };

  // Don't render if no room
  if (!room || !playerId) {
    return null;
  }

  // Validate room code matches URL
  if (code && room.code !== code) {
    return null;
  }

  return (
    <>
      <RoomLobby
        roomCode={room.code}
        players={clientPlayers}
        currentPlayerId={playerId}
        isHost={isHost}
        gameConfig={room.settings}
        onConfigChange={handleConfigChange}
        onStartGame={handleStartGame}
        onLeaveRoom={handleLeaveRoom}
      />
      {error && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#ff4444',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          fontFamily: 'monospace',
          zIndex: 1000,
          cursor: 'pointer',
        }} onClick={clearError}>
          {error}
        </div>
      )}
    </>
  );
}
