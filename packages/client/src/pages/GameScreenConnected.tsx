// GameScreenConnected - Placeholder for Phase 3
// Will orchestrate game phases: setup, playing, scoring

import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameState } from '../context/GameStateContext';

export function GameScreenConnected() {
  const { gameId: routeGameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { gameId, gamePhase } = useGameState();

  // Redirect to home if no game
  useEffect(() => {
    if (!gameId && routeGameId) {
      navigate('/');
    }
  }, [gameId, routeGameId, navigate]);

  if (!gameId) {
    return null;
  }

  // Placeholder UI - Phase 3 will implement full game phase orchestration
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Game: {gameId}</h1>
      <p>Phase: {gamePhase}</p>
      <p style={{ color: '#666', marginTop: '1rem' }}>
        Game screen will be implemented in Phase 3
      </p>
    </div>
  );
}

export default GameScreenConnected;
