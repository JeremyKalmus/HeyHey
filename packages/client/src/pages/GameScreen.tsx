// GameScreen - Orchestrates setup/playing/scoring phases
import { useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameState } from '../context';
import { SetupArea } from '../components/Setup/SetupArea';
import { GameBoard } from '../components/Game/GameBoard';
import { useSetupController } from '../hooks/useSetupController';
import { useLocalPlayerState } from '../hooks/useLocalPlayerState';
import type { PlayerColor } from '../components/Card/CardBack';
import type { FoundationPile } from '../components/Foundation';
import type { Card, MoveSource } from '@heyhey/shared';

// Default player colors
const PLAYER_COLORS: PlayerColor[] = [
  'red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'teal',
];

export function GameScreen() {
  const navigate = useNavigate();
  const { gameId: urlGameId } = useParams<{ gameId: string }>();
  const {
    room,
    playerId,
    gameId,
    gamePhase,
    foundations,
    setupComplete,
    makeMove,
    callNertz,
    foundationMove,
    error,
    clearError,
  } = useGameState();

  // Redirect to home if no room or game
  useEffect(() => {
    if (!room || !gameId) {
      navigate('/');
    }
  }, [room, gameId, navigate]);

  // Validate game ID matches URL
  useEffect(() => {
    if (urlGameId && gameId && urlGameId !== gameId) {
      navigate('/');
    }
  }, [urlGameId, gameId, navigate]);

  // Get player index for color
  const playerIndex = useMemo(() => {
    if (!room || !playerId) return 0;
    return room.players.findIndex((p) => p.id === playerId);
  }, [room, playerId]);

  const playerColor = PLAYER_COLORS[playerIndex % PLAYER_COLORS.length]!;

  // Wrap foundationMove to fix type mismatch
  const handleFoundationMove = useCallback(
    (card: Card, foundationIndex: number, source: MoveSource) => {
      foundationMove(card, foundationIndex, source);
    },
    [foundationMove]
  );

  // Setup controller for setup phase
  const setupController = useSetupController({
    deckId: playerId ?? 'default',
    nertzPileSize: room?.settings.nertzPileSize ?? 13,
    onSetupComplete: () => {
      setupComplete();
    },
  });

  // Local player state for playing phase
  const localPlayerState = useLocalPlayerState({
    serverState: null, // TODO: Wire to server state when available
    gameState: null, // TODO: Wire to server game state when available
    config: room?.settings ?? { nertzPileSize: 13, drawCount: 3, targetScore: 100 },
    playerId: playerId ?? '',
    onMove: makeMove,
    onFoundationMove: handleFoundationMove,
  });

  // Don't render if no room or player
  if (!room || !playerId || !gameId) {
    return null;
  }

  // Map foundations to the expected format
  const foundationPiles: FoundationPile[] = useMemo(() => {
    return foundations.map((f) => ({
      suit: f.suit,
      cards: f.cards,
    }));
  }, [foundations]);

  // Setup Phase
  if (gamePhase === 'setup') {
    return (
      <div style={{ width: '100vw', height: '100vh', background: '#1a1a2e' }}>
        <SetupArea
          state={setupController.state}
          progress={setupController.progress}
          deckCards={setupController.deckCards}
          nertzPileCards={setupController.nertzPileCards}
          workPileCards={setupController.workPileCards}
          backColor={playerColor}
          nertzPileSize={room.settings.nertzPileSize}
          onDeckClick={setupController.handleDeckClick}
          onNertzPileClick={setupController.handleNertzPileClick}
          onWorkPileClick={setupController.handleWorkPileClick}
        />
        {error && (
          <ErrorToast message={error} onClick={clearError} />
        )}
      </div>
    );
  }

  // Playing Phase
  if (gamePhase === 'playing') {
    // Use setup controller cards as initial state for playing phase
    // In a full implementation, this would come from server state
    const nertzPile = setupController.nertzPileCards;
    const workPiles = setupController.workPileCards;
    const stockPile = setupController.deckCards;
    const wastePile: typeof stockPile = [];

    // Check if nertz pile is empty (can call HeyHey)
    const canCallHeyHey = nertzPile.length === 0;
    // Can recycle stock when stock is empty and waste has cards
    const canRecycleStock = stockPile.length === 0 && wastePile.length > 0;

    return (
      <div style={{ width: '100vw', height: '100vh', background: '#1a1a2e' }}>
        <GameBoard
          nertzPile={nertzPile}
          workPiles={workPiles}
          stockPile={stockPile}
          wastePile={wastePile}
          foundationPiles={foundationPiles}
          playerColor={playerColor}
          canCallHeyHey={canCallHeyHey}
          canRecycleStock={canRecycleStock}
          onNertzCardClick={localPlayerState.handleNertzClick}
          onNertzCardDoubleClick={localPlayerState.handleNertzDoubleClick}
          onWorkCardClick={localPlayerState.handleWorkPileClick}
          onWorkCardDoubleClick={localPlayerState.handleWorkPileDoubleClick}
          onWorkPileClick={localPlayerState.handleWorkPileTarget}
          onStockDraw={localPlayerState.handleStockClick}
          onStockRecycle={localPlayerState.handleStockClick}
          onWasteCardClick={localPlayerState.handleWasteClick}
          onWasteCardDoubleClick={localPlayerState.handleWasteDoubleClick}
          onFoundationClick={(suit) => {
            const index = ['hearts', 'diamonds', 'clubs', 'spades'].indexOf(suit);
            if (index >= 0) {
              localPlayerState.handleFoundationClick(index);
            }
          }}
          onCallHeyHey={callNertz}
          selectedCard={localPlayerState.selectedCard ? {
            card: localPlayerState.selectedCard.card,
            sourceType: localPlayerState.selectedCard.source.type === 'work' ? 'workPile' : localPlayerState.selectedCard.source.type,
            sourcePileIndex: 'pileIndex' in localPlayerState.selectedCard.source
              ? localPlayerState.selectedCard.source.pileIndex
              : undefined,
            cardIndex: 'cardIndex' in localPlayerState.selectedCard.source
              ? localPlayerState.selectedCard.source.cardIndex ?? 0
              : 0,
          } : null}
          validWorkDestinations={localPlayerState.validWorkPileDestinations}
        />
        {error && (
          <ErrorToast message={error} onClick={clearError} />
        )}
      </div>
    );
  }

  // Scoring Phase
  if (gamePhase === 'scoring') {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: '#1a1a2e',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: 'monospace',
      }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>ROUND COMPLETE!</h1>
        <p style={{ fontSize: '1.5rem', opacity: 0.8 }}>Calculating scores...</p>
        {/* TODO: Show round results from context */}
      </div>
    );
  }

  // Finished Phase
  if (gamePhase === 'finished') {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: '#1a1a2e',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: 'monospace',
      }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>GAME OVER!</h1>
        <button
          onClick={() => navigate('/')}
          style={{
            marginTop: '2rem',
            padding: '1rem 2rem',
            fontSize: '1.25rem',
            background: '#4ecdc4',
            color: '#1a1a2e',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontWeight: 'bold',
          }}
        >
          PLAY AGAIN
        </button>
      </div>
    );
  }

  // Lobby phase shouldn't reach here
  return null;
}

// Error toast component
function ErrorToast({ message, onClick }: { message: string; onClick: () => void }) {
  return (
    <div
      style={{
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
      }}
      onClick={onClick}
    >
      {message}
    </div>
  );
}
