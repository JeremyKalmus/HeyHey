// GameScreenConnected - Game phase orchestration
// Renders appropriate UI based on current game phase: setup, playing, scoring

import { useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameState } from '../context/GameStateContext';
import { SetupPhase } from '../components/Game';
import type { PlayerColor } from '../components/Card/CardBack';

export function GameScreenConnected() {
  const { gameId: routeGameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { gameId, gamePhase, room, playerId, setupComplete } = useGameState();

  // Redirect to home if no game
  useEffect(() => {
    if (!gameId && routeGameId) {
      navigate('/');
    }
  }, [gameId, routeGameId, navigate]);

  // Handle setup complete
  const handleSetupComplete = useCallback(() => {
    setupComplete();
  }, [setupComplete]);

  if (!gameId) {
    return null;
  }

  // Get current player info
  const currentPlayer = room?.players.find((p) => p.id === playerId);
  const playerColor = (currentPlayer?.color as PlayerColor) || 'blue';
  const nertzPileSize = room?.settings.nertzPileSize || 13;

  // Render based on game phase
  switch (gamePhase) {
    case 'setup':
      return (
        <div style={{ minHeight: '100vh', background: '#1a1a2e' }}>
          <SetupPhase
            playerColor={playerColor}
            deckId={playerId || 'player-1'}
            config={{ nertzPileSize }}
            onSetupComplete={handleSetupComplete}
          />
        </div>
      );

    case 'playing':
      // Playing phase will be implemented in Phase 3.3
      return (
        <div style={{ padding: '2rem', textAlign: 'center', background: '#1a1a2e', minHeight: '100vh', color: '#fff' }}>
          <h1>Game: {gameId}</h1>
          <p>Phase: {gamePhase}</p>
          <p style={{ color: '#888', marginTop: '1rem' }}>
            Playing phase will be implemented in Phase 3.3
          </p>
        </div>
      );

    case 'scoring':
      // Scoring phase will be implemented in Phase 3.4
      return (
        <div style={{ padding: '2rem', textAlign: 'center', background: '#1a1a2e', minHeight: '100vh', color: '#fff' }}>
          <h1>Round Complete</h1>
          <p>Phase: {gamePhase}</p>
          <p style={{ color: '#888', marginTop: '1rem' }}>
            Scoring phase will be implemented in Phase 3.4
          </p>
        </div>
      );

    case 'finished':
      return (
        <div style={{ padding: '2rem', textAlign: 'center', background: '#1a1a2e', minHeight: '100vh', color: '#fff' }}>
          <h1>Game Over</h1>
          <p style={{ color: '#888', marginTop: '1rem' }}>
            Game finished - winner display will be implemented
          </p>
        </div>
      );

    default:
      // Lobby or unknown state
      return (
        <div style={{ padding: '2rem', textAlign: 'center', background: '#1a1a2e', minHeight: '100vh', color: '#fff' }}>
          <h1>Game: {gameId}</h1>
          <p>Phase: {gamePhase}</p>
        </div>
      );
  }
}

export default GameScreenConnected;
