// GameScreenConnected - Game phase orchestration
// Renders appropriate UI based on current game phase: setup, waiting_for_start, playing, scoring

import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameState } from '../context/GameStateContext';
import { WaitingToStart } from '../components/Game/WaitingToStart';
import { SetupPhase } from '../components/Game/SetupPhase';
import { GameBoard } from '../components/Game/GameBoard';
import type { PlayerColor } from '../components/Card/CardBack';
import type { Card as CardType } from '@heyhey/shared';

// Initialize empty work piles tuple
const EMPTY_WORK_PILES: [CardType[], CardType[], CardType[], CardType[]] = [[], [], [], []];

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

  // Track if local player has completed their card dealing
  const [localSetupComplete, setLocalSetupComplete] = useState(false);

  // Store dealt cards from setup phase
  const [localCards, setLocalCards] = useState<{
    nertzPile: CardType[];
    workPiles: [CardType[], CardType[], CardType[], CardType[]];
    stockPile: CardType[];
    wastePile: CardType[];
  } | null>(null);

  // Reset local setup when entering a new round
  useEffect(() => {
    if (gamePhase === 'waiting_for_start') {
      setLocalSetupComplete(false);
      setLocalCards(null);
    }
  }, [gamePhase]);

  // Redirect to home if no game
  useEffect(() => {
    if (!gameId && routeGameId) {
      navigate('/');
    }
  }, [gameId, routeGameId, navigate]);

  // Auto-complete server setup phase immediately
  useEffect(() => {
    if (gamePhase === 'setup') {
      setupComplete();
    }
  }, [gamePhase, setupComplete]);

  // Handle local setup complete (after interactive dealing)
  const handleLocalSetupComplete = useCallback(() => {
    setLocalSetupComplete(true);
    // TODO: Store the dealt cards for the game board
  }, []);

  if (!gameId) {
    return null;
  }

  // Get current player info
  const currentPlayer = room?.players.find((p) => p.id === playerId);
  const playerColor = (currentPlayer?.color as PlayerColor) || 'blue';
  const nertzPileSize = room?.settings.nertzPileSize || 13;

  // Get starter info for WaitingToStart
  const players = room?.players || [];
  const starterPlayer = players[currentStarterIndex];
  const isStarter = starterPlayer?.id === playerId;
  const starterName = starterPlayer?.name || 'Unknown';

  // Render based on game phase
  switch (gamePhase) {
    case 'setup':
      // Show loading while auto-completing server setup
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
      // Show interactive setup if player hasn't dealt their cards yet
      if (!localSetupComplete) {
        return (
          <div style={{ minHeight: '100vh', background: '#1a1a2e' }}>
            <SetupPhase
              playerColor={playerColor}
              deckId={playerId || 'player-1'}
              config={{ nertzPileSize }}
              onSetupComplete={handleLocalSetupComplete}
            />
          </div>
        );
      }

      // Show game board after setup complete
      // For now, show placeholder with dealt cards info
      return (
        <div style={{
          minHeight: '100vh',
          background: '#1a1a2e',
          padding: '1rem',
        }}>
          <GameBoard
            nertzPile={localCards?.nertzPile || []}
            workPiles={localCards?.workPiles || EMPTY_WORK_PILES}
            stockPile={localCards?.stockPile || []}
            wastePile={localCards?.wastePile || []}
            foundationPiles={[
              { suit: 'hearts', cards: [], ownerId: 'system' },
              { suit: 'diamonds', cards: [], ownerId: 'system' },
              { suit: 'clubs', cards: [], ownerId: 'system' },
              { suit: 'spades', cards: [], ownerId: 'system' },
            ]}
            playerColor={playerColor}
            currentRound={roundNumber}
            canCallHeyHey={false}
            canRecycleStock={false}
          />
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
