// HomePageConnected - Connects HomePage to GameStateContext
// Handles navigation on room creation/join

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HomePage } from '../components/Lobby/HomePage';
import { useGameState } from '../context/GameStateContext';

export function HomePageConnected() {
  const navigate = useNavigate();
  const { createRoom, joinRoom, room } = useGameState();

  // Navigate to room when room is created/joined
  useEffect(() => {
    if (room) {
      navigate(`/room/${room.code}`);
    }
  }, [room, navigate]);

  return (
    <HomePage
      onCreateRoom={createRoom}
      onJoinRoom={(playerName, roomCode) => joinRoom(roomCode, playerName)}
    />
  );
}

export default HomePageConnected;
