// GameScreenConnected - Game phase orchestration
// Renders appropriate UI based on current game phase: setup, waiting_for_start, playing, scoring

import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameState } from '../context/GameStateContext';
import { WaitingToStart } from '../components/Game/WaitingToStart';
import type { PlayerColor } from '../components/Card/CardBack';

export function GameScreenConnected() {
  const { gameId: routeGameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const {
    gameId,
    gamePhase,
    room,
    playerId,
    setupComplete,
    startRound,
    roundNumber,
    currentStarterIndex,
  } = useGameState();

  // Redirect to home if no game
  useEffect(() => {
    if (!gameId && routeGameId) {
      navigate('/');
    }
  }, [gameId, routeGameId, navigate]);

  // Auto-complete setup phase immediately (skip interactive dealing)
  useEffect(() => {
    if (gamePhase === 'setup') {
      setupComplete();
    }
  }, [gamePhase, setupComplete]);

  if (!gameId) {
    return null;
  }

  // Get current player info
  const currentPlayer = room?.players.find((p) => p.id === playerId);
  const playerColor = (currentPlayer?.color as PlayerColor) || 'blue';

  // Get starter info for WaitingToStart
  const players = room?.players || [];
  const starterPlayer = players[currentStarterIndex];
  const isStarter = starterPlayer?.id === playerId;
  const starterName = starterPlayer?.name || 'Unknown';

  // Render based on game phase
  switch (gamePhase) {
    case 'setup':
      // Show loading while auto-completing setup
      return (
        <div style={{
          minHeight: '100vh',
          background: '#1a1a2e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontFamily: 'monospace',
        }}>
          <p>Setting up game...</p>
        </div>
      );

    case 'waiting_for_start':
      return (
        <div style={{
          minHeight: '100vh',
          background: '#1a1a2e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <WaitingToStart
            isStarter={isStarter}
            starterName={starterName}
            roundNumber={roundNumber}
            onStartRound={startRound}
          />
        </div>
      );

    case 'playing':
      // Playing phase - show game board
      return (
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          background: '#1a1a2e',
          minHeight: '100vh',
          color: '#fff'
        }}>
          <h1>Game: {gameId}</h1>
          <p>Round: {roundNumber}</p>
          <p>Player Color: {playerColor}</p>
          <p style={{ color: '#888', marginTop: '1rem' }}>
            Game board coming soon - cards will appear here!
          </p>
        </div>
      );

    case 'scoring':
      return (
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          background: '#1a1a2e',
          minHeight: '100vh',
          color: '#fff'
        }}>
          <h1>Round {roundNumber} Complete</h1>
          <p style={{ color: '#888', marginTop: '1rem' }}>
            Scoring phase will be implemented
          </p>
        </div>
      );

    case 'finished':
      return (
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          background: '#1a1a2e',
          minHeight: '100vh',
          color: '#fff'
        }}>
          <h1>Game Over</h1>
          <p style={{ color: '#888', marginTop: '1rem' }}>
            Game finished - winner display will be implemented
          </p>
        </div>
      );

    default:
      // Lobby or unknown state
      return (
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          background: '#1a1a2e',
          minHeight: '100vh',
          color: '#fff'
        }}>
          <h1>Game: {gameId}</h1>
          <p>Phase: {gamePhase}</p>
        </div>
      );
  }
}

export default GameScreenConnected;
