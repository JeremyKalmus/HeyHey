// HomePageConnected - Wires HomePage to context and routing
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameState } from '../context';
import { HomePage } from '../components/Lobby/HomePage';

export function HomePageConnected() {
  const navigate = useNavigate();
  const { room, createRoom, joinRoom, error, clearError } = useGameState();

  // Navigate to room when successfully joined/created
  useEffect(() => {
    if (room) {
      navigate(`/room/${room.code}`);
    }
  }, [room, navigate]);

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
