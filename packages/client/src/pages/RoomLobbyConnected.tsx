// RoomLobbyConnected - Wires RoomLobby to context and routing
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameState } from '../context';
import { RoomLobby } from '../components/Lobby/RoomLobby';
import type { LobbyPlayer } from '../components/Lobby/PlayerList';
import type { PlayerCustomizationData } from '../components/Lobby/PlayerCustomization';
import type { PlayerColor } from '../components/Card/CardBack';
import type { AvatarString } from '../components/ui/Avatar';
import type { GameConfig } from '@heyhey/shared';

// Default colors assigned to players in order
const PLAYER_COLORS: PlayerColor[] = [
  'red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'teal',
];

const DEFAULT_AVATARS: AvatarString[] = [
  'user:circle', 'smile:square', 'ghost:diamond', 'skull:hexagon',
  'cat:star', 'bot:triangle', 'heart:circle', 'zap:square',
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
    updatePlayer,
    startGame,
    leaveRoom,
    error,
    clearError,
  } = useGameState();

  // Player customization state (local until we add server support)
  const [playerCustomization, setPlayerCustomization] = useState<PlayerCustomizationData | null>(null);

  // Initialize customization from room data when available
  useEffect(() => {
    if (room && playerId && !playerCustomization) {
      const playerIndex = room.players.findIndex(p => p.id === playerId);
      const currentPlayer = room.players.find(p => p.id === playerId);
      if (currentPlayer && playerIndex >= 0) {
        // Use server data if available, otherwise use defaults
        const initialData: PlayerCustomizationData = {
          name: currentPlayer.name,
          color: (currentPlayer.color as PlayerColor) ?? PLAYER_COLORS[playerIndex % PLAYER_COLORS.length]!,
          avatar: (currentPlayer.avatar as AvatarString) ?? DEFAULT_AVATARS[playerIndex % DEFAULT_AVATARS.length]!,
        };
        setPlayerCustomization(initialData);
        // If server doesn't have our customization yet, send it
        if (!currentPlayer.color || !currentPlayer.avatar) {
          updatePlayer({
            name: initialData.name,
            color: initialData.color,
            avatar: initialData.avatar,
          });
        }
      }
    }
  }, [room, playerId, playerCustomization, updatePlayer]);

  const handleCustomizationChange = useCallback((data: PlayerCustomizationData) => {
    setPlayerCustomization(data);
    // Send to server for sync with other players
    updatePlayer({
      name: data.name,
      color: data.color,
      avatar: data.avatar,
    });
  }, [updatePlayer]);

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
    return room.players.map((p, index) => {
      // Use server data with fallback defaults
      return {
        id: p.id,
        name: p.name,
        color: (p.color as PlayerColor) ?? PLAYER_COLORS[index % PLAYER_COLORS.length]!,
        avatar: (p.avatar as AvatarString) ?? DEFAULT_AVATARS[index % DEFAULT_AVATARS.length]!,
        isHost: p.isHost,
        isReady: p.isHost, // Host is always ready
      };
    });
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
        playerCustomization={playerCustomization ?? undefined}
        onPlayerCustomizationChange={handleCustomizationChange}
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
