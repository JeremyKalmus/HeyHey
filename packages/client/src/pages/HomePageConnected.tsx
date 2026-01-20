// HomePageConnected - Wires HomePage to context and routing
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameState } from '../context';
import { HomePage } from '../components/Lobby/HomePage';

export function HomePageConnected() {
  const navigate = useNavigate();
  const { room, gameId, gamePhase, isReconnecting, createRoom, joinRoom, error, clearError } = useGameState();

  // Navigate based on game state
  useEffect(() => {
    // If actively reconnecting, wait for result
    if (isReconnecting) return;

    // If we have a gameId and are beyond lobby phase, go to game
    if (gameId && gamePhase !== 'lobby') {
      navigate(`/game/${gameId}`, { replace: true });
      return;
    }

    // If we have a room, go to lobby
    if (room) {
      navigate(`/room/${room.code}`, { replace: true });
    }
  }, [room, gameId, gamePhase, isReconnecting, navigate]);

  // Clear error on unmount
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const handleCreateRoom = (playerName: string) => {
    clearError();
    createRoom(playerName);
  };

  const handleJoinRoom = (playerName: string, roomCode: string) => {
    clearError();
    joinRoom(roomCode.toUpperCase(), playerName);
  };

  // Show loading state while reconnecting
  if (isReconnecting) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '16px',
        fontFamily: 'monospace',
        color: '#666',
      }}>
        <div style={{ fontSize: '24px' }}>Reconnecting to game...</div>
        <div style={{ fontSize: '14px' }}>Please wait</div>
      </div>
    );
  }

  return (
    <>
      <HomePage
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
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
        }}>
          {error}
        </div>
      )}
    </>
  );
}
