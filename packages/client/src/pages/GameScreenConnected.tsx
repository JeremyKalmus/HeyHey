// GameScreenConnected - Game phase orchestration
// Renders appropriate UI based on current game phase

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useGameState } from '../context/GameStateContext';
import { WaitingToStart } from '../components/Game/WaitingToStart';
import { GameBoard } from '../components/Game/GameBoard';
import { MultiFoundationArea, type PlayerFoundationGroup } from '../components/Foundation';
import type { FoundationPile } from '@heyhey/shared';
import type { PlayerColor } from '../components/Card/CardBack';
import type { Card, PlayerGameState, GameState, GameConfig, Move, MoveSource } from '@heyhey/shared';
import { createShuffledDeck } from '@heyhey/shared';
import { useLocalPlayerState } from '../hooks/useLocalPlayerState';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import type { SelectedCard } from '../components/Game/WorkPiles';

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;

// Create initial dealt player state
function createDealtPlayerState(playerId: string, nertzPileSize: number): PlayerGameState {
  const deck = createShuffledDeck(playerId);
  return {
    playerId,
    deckId: playerId,
    nertzPile: deck.slice(0, nertzPileSize),
    workPiles: [
      [deck[nertzPileSize]!],
      [deck[nertzPileSize + 1]!],
      [deck[nertzPileSize + 2]!],
      [deck[nertzPileSize + 3]!],
    ],
    stockPile: deck.slice(nertzPileSize + 4),
    wastePile: [],
  };
}

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

  // Local player state (cards dealt when game starts)
  const [localPlayerState, setLocalPlayerState] = useState<PlayerGameState | null>(null);

  // Foundation piles for all players
  const [playerFoundations, setPlayerFoundations] = useState<Map<string, FoundationPile[]>>(new Map());

  // Initialize state when entering playing phase
  useEffect(() => {
    if (gamePhase === 'playing' && !localPlayerState && playerId && room) {
      const nertzSize = room.settings.nertzPileSize || 13;
      setLocalPlayerState(createDealtPlayerState(playerId, nertzSize));

      // Initialize foundations for all players
      const foundations = new Map<string, FoundationPile[]>();
      room.players.forEach((player) => {
        foundations.set(
          player.id,
          SUITS.map((suit) => ({ suit, cards: [], ownerId: player.id }))
        );
      });
      setPlayerFoundations(foundations);
    }
  }, [gamePhase, localPlayerState, playerId, room]);

  // Reset state when entering waiting phase (new round)
  useEffect(() => {
    if (gamePhase === 'waiting_for_start') {
      setLocalPlayerState(null);
      setPlayerFoundations(new Map());
    }
  }, [gamePhase]);

  // Redirect to home if no game
  useEffect(() => {
    if (!gameId && routeGameId) {
      navigate('/');
    }
  }, [gameId, routeGameId, navigate]);

  // Auto-complete server setup phase
  useEffect(() => {
    if (gamePhase === 'setup') {
      setupComplete();
    }
  }, [gamePhase, setupComplete]);

  // Build game state for hooks
  const gameState: GameState | null = useMemo(() => {
    if (!localPlayerState || !room) return null;
    return {
      gameId: gameId || '',
      phase: 'playing',
      players: [localPlayerState],
      foundations: Array.from(playerFoundations.values()).flat(),
      config: room.settings,
      roundNumber,
      currentStarterIndex,
    };
  }, [localPlayerState, room, gameId, playerFoundations, roundNumber, currentStarterIndex]);

  const config: GameConfig = useMemo(
    () => room?.settings || { nertzPileSize: 13, drawCount: 3, targetScore: 100 },
    [room]
  );

  // Handle local player moves
  const handleMove = useCallback((move: Move) => {
    setLocalPlayerState((prev) => {
      if (!prev) return prev;

      if (move.type === 'draw') {
        const drawCount = config.drawCount;
        const cardsToDraw = prev.stockPile.slice(-drawCount);
        const newStock = prev.stockPile.slice(0, -drawCount);
        const newWaste = [...prev.wastePile, ...cardsToDraw.reverse()];
        return { ...prev, stockPile: newStock, wastePile: newWaste };
      }

      if (move.type === 'flipStock') {
        const newStock = [...prev.wastePile].reverse();
        return { ...prev, stockPile: newStock, wastePile: [] };
      }

      if (move.type === 'card') {
        const { source, destination, cardCount = 1 } = move;
        let movedCards: Card[] = [];
        let newState = { ...prev };

        // Remove from source
        if (source.type === 'nertz') {
          movedCards = prev.nertzPile.slice(-1);
          newState.nertzPile = prev.nertzPile.slice(0, -1);
        } else if (source.type === 'waste') {
          movedCards = prev.wastePile.slice(-1);
          newState.wastePile = prev.wastePile.slice(0, -1);
        } else if (source.type === 'work' && source.pileIndex !== undefined) {
          const pile = prev.workPiles[source.pileIndex] ?? [];
          const startIdx = source.cardIndex ?? (pile.length - cardCount);
          movedCards = pile.slice(startIdx);
          const newPiles = [...prev.workPiles] as [Card[], Card[], Card[], Card[]];
          newPiles[source.pileIndex] = pile.slice(0, startIdx);
          newState.workPiles = newPiles;
        }

        // Add to work pile destination
        if (destination.type === 'work' && destination.pileIndex !== undefined) {
          const newPiles = [...newState.workPiles] as [Card[], Card[], Card[], Card[]];
          newPiles[destination.pileIndex] = [
            ...(newPiles[destination.pileIndex] ?? []),
            ...movedCards,
          ];
          newState.workPiles = newPiles;
        }

        return newState;
      }

      return prev;
    });
  }, [config.drawCount]);

  // Handle foundation moves
  const handleFoundationMove = useCallback(
    (card: Card, foundationIndex: number, source: MoveSource) => {
      if (!playerId) return;

      // Calculate which player/suit this foundation belongs to
      const playerIndex = Math.floor(foundationIndex / 4);
      const suitIndex = foundationIndex % 4;
      const players = room?.players || [];
      const targetPlayerId = players[playerIndex]?.id || playerId;

      // Remove card from source
      setLocalPlayerState((prev) => {
        if (!prev) return prev;
        if (source.type === 'nertz') {
          return { ...prev, nertzPile: prev.nertzPile.slice(0, -1) };
        } else if (source.type === 'waste') {
          return { ...prev, wastePile: prev.wastePile.slice(0, -1) };
        } else if (source.type === 'work' && source.pileIndex !== undefined) {
          const newPiles = [...prev.workPiles] as [Card[], Card[], Card[], Card[]];
          const pile = newPiles[source.pileIndex] ?? [];
          newPiles[source.pileIndex] = pile.slice(0, -1);
          return { ...prev, workPiles: newPiles };
        }
        return prev;
      });

      // Add card to foundation
      setPlayerFoundations((prev) => {
        const newMap = new Map(prev);
        const piles = newMap.get(targetPlayerId);
        if (piles) {
          const newPiles = [...piles];
          newPiles[suitIndex] = {
            ...newPiles[suitIndex]!,
            cards: [...newPiles[suitIndex]!.cards, card],
          };
          newMap.set(targetPlayerId, newPiles);
        }
        return newMap;
      });
    },
    [playerId, room]
  );

  // Drag-drop setup
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  });
  const sensors = useSensors(pointerSensor);

  // Use hooks (only when we have game state)
  const localPlayer = useLocalPlayerState({
    serverState: localPlayerState,
    gameState,
    config,
    playerId: playerId || '',
    onMove: handleMove,
    onFoundationMove: handleFoundationMove,
  });

  const handleDragMove = useCallback(
    (
      source: MoveSource,
      destination: { type: 'work' | 'foundation'; pileIndex?: number; foundationIndex?: number },
      cardCount?: number
    ) => {
      const move: Move = {
        type: 'card',
        playerId: playerId || '',
        source,
        destination:
          destination.type === 'work'
            ? { type: 'work', pileIndex: destination.pileIndex! }
            : { type: 'foundation', foundationIndex: destination.foundationIndex ?? 0 },
        cardCount,
      };
      handleMove(move);
    },
    [handleMove, playerId]
  );

  const dragDrop = useDragAndDrop({
    gameState,
    config,
    playerId: playerId || '',
    onMove: handleDragMove,
    onFoundationMove: handleFoundationMove,
  });

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
      return (
        <div
          style={{
            minHeight: '100vh',
            background: '#1a1a2e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontFamily: 'monospace',
          }}
        >
          <p>Setting up game...</p>
        </div>
      );

    case 'waiting_for_start':
      return (
        <div
          style={{
            minHeight: '100vh',
            background: '#1a1a2e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <WaitingToStart
            isStarter={isStarter}
            starterName={starterName}
            roundNumber={roundNumber}
            onStartRound={startRound}
          />
        </div>
      );

    case 'playing':
      if (!localPlayerState) {
        return (
          <div
            style={{
              minHeight: '100vh',
              background: '#1a1a2e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            <p>Loading game...</p>
          </div>
        );
      }

      // Convert foundations to PlayerFoundationGroup format
      const playerGroups: PlayerFoundationGroup[] = Array.from(playerFoundations.entries()).map(
        ([pid, piles], index) => {
          const player = room?.players.find((p) => p.id === pid);
          return {
            playerId: pid,
            playerName: player?.name || `Player ${index + 1}`,
            playerColor: (player?.color as PlayerColor) || 'blue',
            piles,
          };
        }
      );

      // Convert selection for GameBoard
      const selectedCard: SelectedCard | null = localPlayer.selectedCard
        ? {
            card: localPlayer.selectedCard.card,
            sourceType:
              localPlayer.selectedCard.source.type === 'nertz'
                ? 'nertz'
                : localPlayer.selectedCard.source.type === 'work'
                  ? 'workPile'
                  : 'waste',
            sourcePileIndex:
              localPlayer.selectedCard.source.type === 'work'
                ? localPlayer.selectedCard.source.pileIndex
                : undefined,
            cardIndex:
              localPlayer.selectedCard.source.type === 'work'
                ? (localPlayer.selectedCard.source.cardIndex ?? 0)
                : 0,
          }
        : null;

      const selectedWasteIndex =
        localPlayer.selectedCard?.source.type === 'waste'
          ? localPlayerState.wastePile.length - 1
          : undefined;

      // Combine click and drag destinations
      const dragWorkDestinations = dragDrop.isDragging
        ? dragDrop.validDropTargets.filter((t) => t.type === 'work').map((t) => t.index)
        : [];
      const combinedWorkDestinations = [
        ...new Set([...localPlayer.validWorkPileDestinations, ...dragWorkDestinations]),
      ];

      const dragFoundationTargets = dragDrop.isDragging
        ? dragDrop.validDropTargets.filter((t) => t.type === 'foundation').map((t) => t.index)
        : [];
      const combinedFoundationTargets = [
        ...new Set([...localPlayer.validFoundationDestinations, ...dragFoundationTargets]),
      ];

      // Handle foundation click
      const handleMultiFoundationClick = (_pid: string, _suit: string, globalIndex: number) => {
        localPlayer.handleFoundationClick(globalIndex);
      };

      const canCallHeyHey = localPlayerState.nertzPile.length === 0;

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '8px',
            minHeight: '100vh',
            background: '#0a0a12',
          }}
        >
          <DndContext
            sensors={sensors}
            onDragStart={dragDrop.handleDragStart}
            onDragOver={dragDrop.handleDragOver}
            onDragEnd={dragDrop.handleDragEnd}
            onDragCancel={dragDrop.handleDragCancel}
          >
            {/* Shared Foundations (Multi-player) */}
            <MultiFoundationArea
              playerGroups={playerGroups}
              selectedCard={localPlayer.selectedCard?.card ?? null}
              onPileClick={handleMultiFoundationClick}
              canPlace={combinedFoundationTargets.length > 0}
              showMoveHints={false}
              isDragging={dragDrop.isDragging}
              validDragFoundations={dragFoundationTargets}
            />

            {/* Your Play Area */}
            <GameBoard
              nertzPile={localPlayerState.nertzPile}
              workPiles={localPlayerState.workPiles as [Card[], Card[], Card[], Card[]]}
              stockPile={localPlayerState.stockPile}
              wastePile={localPlayerState.wastePile}
              foundationPiles={[]}
              playerColor={playerColor}
              currentRound={roundNumber}
              selectedCard={selectedCard}
              validWorkDestinations={combinedWorkDestinations}
              selectedWasteIndex={selectedWasteIndex}
              canCallHeyHey={canCallHeyHey}
              canRecycleStock={localPlayerState.stockPile.length === 0}
              onNertzCardClick={localPlayer.handleNertzClick}
              onNertzCardDoubleClick={localPlayer.handleNertzDoubleClick}
              onWorkCardClick={localPlayer.handleWorkPileClick}
              onWorkCardDoubleClick={localPlayer.handleWorkPileDoubleClick}
              onWorkPileClick={localPlayer.handleWorkPileTarget}
              onStockDraw={localPlayer.drawCards}
              onStockRecycle={localPlayer.recycleWaste}
              onWasteCardClick={localPlayer.handleWasteClick}
              onWasteCardDoubleClick={localPlayer.handleWasteDoubleClick}
              onBackgroundClick={localPlayer.clearSelection}
              hideFoundation={true}
              hideTopBar={true}
            />
          </DndContext>
        </div>
      );

    case 'scoring':
      return (
        <div
          style={{
            padding: '2rem',
            textAlign: 'center',
            background: '#1a1a2e',
            minHeight: '100vh',
            color: '#fff',
          }}
        >
          <h1>Round {roundNumber} Complete</h1>
          <p style={{ color: '#888', marginTop: '1rem' }}>Scoring phase will be implemented</p>
        </div>
      );

    case 'finished':
      return (
        <div
          style={{
            padding: '2rem',
            textAlign: 'center',
            background: '#1a1a2e',
            minHeight: '100vh',
            color: '#fff',
          }}
        >
          <h1>Game Over</h1>
          <p style={{ color: '#888', marginTop: '1rem' }}>
            Game finished - winner display will be implemented
          </p>
        </div>
      );

    default:
      return (
        <div
          style={{
            padding: '2rem',
            textAlign: 'center',
            background: '#1a1a2e',
            minHeight: '100vh',
            color: '#fff',
          }}
        >
          <h1>Game: {gameId}</h1>
          <p>Phase: {gamePhase}</p>
        </div>
      );
  }
}

export default GameScreenConnected;
