// GameScreenConnected - Game phase orchestration
// Renders appropriate UI based on current game phase

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useGameState } from '../context/GameStateContext';
import { WaitingToStart } from '../components/Game/WaitingToStart';
import { SetupPhase } from '../components/Game/SetupPhase';
import { GameBoard } from '../components/Game/GameBoard';
import { Card as CardComponent } from '../components/Card';
import { MultiFoundationArea, type PlayerFoundationGroup } from '../components/Foundation';
import { Avatar } from '../components/ui/Avatar';
import { SettingsToggle } from '../components/ui/SettingsToggle';
import type { FoundationPile } from '@heyhey/shared';
import type { PlayerColor } from '../components/Card/CardBack';
import type { AvatarString } from '../components/ui/Avatar';
import type { Card, PlayerGameState, GameState, GameConfig, Move, MoveSource } from '@heyhey/shared';
import { createShuffledDeck } from '@heyhey/shared';
import { useLocalPlayerState } from '../hooks/useLocalPlayerState';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import { usePlayerSettings } from '../hooks/usePlayerSettings';

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

  // Local setup state - tracks if player has completed their card dealing
  const [localSetupDone, setLocalSetupDone] = useState(false);

  // Local player state (cards dealt when local setup completes)
  const [localPlayerState, setLocalPlayerState] = useState<PlayerGameState | null>(null);

  // Foundation piles for all players
  const [playerFoundations, setPlayerFoundations] = useState<Map<string, FoundationPile[]>>(new Map());

  // Player settings (hints toggle)
  const { settings, toggleMoveHints } = usePlayerSettings({ playerId: playerId || '' });

  // Get current player info
  const currentPlayer = room?.players.find((p) => p.id === playerId);
  const playerColor = (currentPlayer?.color as PlayerColor) || 'blue';

  // Initialize foundations when entering playing phase (but NOT cards yet)
  useEffect(() => {
    if (gamePhase === 'playing' && playerFoundations.size === 0 && room) {
      const foundations = new Map<string, FoundationPile[]>();
      room.players.forEach((player) => {
        foundations.set(
          player.id,
          SUITS.map((suit) => ({ suit, cards: [], ownerId: player.id }))
        );
      });
      setPlayerFoundations(foundations);
    }
  }, [gamePhase, playerFoundations.size, room]);

  // Handle local setup complete - deal cards
  const handleLocalSetupComplete = useCallback(() => {
    if (!playerId || !room) return;
    const nertzSize = room.settings.nertzPileSize || 13;
    setLocalPlayerState(createDealtPlayerState(playerId, nertzSize));
    setLocalSetupDone(true);
  }, [playerId, room]);

  // Reset state when entering waiting phase (new round)
  useEffect(() => {
    if (gamePhase === 'waiting_for_start') {
      setLocalPlayerState(null);
      setLocalSetupDone(false);
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

  // Get other players for opponent display
  const opponents = room?.players.filter((p) => p.id !== playerId) || [];

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

    case 'playing': {
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
          {/* Header bar with opponents and settings */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '4px 8px',
            }}
          >
            {/* Opponents - just avatars */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {opponents.map((opp) => (
                <div
                  key={opp.id}
                  style={{ opacity: 0.7 }}
                  title={opp.name}
                >
                  <Avatar
                    avatar={(opp.avatar as AvatarString) || 'user:circle'}
                    color={(opp.color as PlayerColor) || 'blue'}
                    size="sm"
                  />
                </div>
              ))}
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <SettingsToggle
                showMoveHints={settings.showMoveHints}
                onToggleHints={toggleMoveHints}
              />
            </div>
          </div>

          {/* Show SetupPhase or GameBoard depending on local setup state */}
          {!localSetupDone ? (
            <>
              {/* Shared Foundations (empty during setup) */}
              <MultiFoundationArea
                playerGroups={playerGroups}
                selectedCard={null}
                onPileClick={() => {}}
                canPlace={false}
                showMoveHints={false}
                isDragging={false}
                validDragFoundations={[]}
              />

              {/* Setup Phase in player area */}
              <SetupPhase
                playerColor={playerColor}
                deckId={playerId || 'player-1'}
                config={{ nertzPileSize: config.nertzPileSize }}
                onSetupComplete={handleLocalSetupComplete}
              />
            </>
          ) : localPlayerState ? (
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
                onPileClick={(_pid: string, _suit: string, globalIndex: number) => {
                  localPlayer.handleFoundationClick(globalIndex);
                }}
                canPlace={localPlayer.validFoundationDestinations.length > 0 || dragDrop.validDropTargets.some((t) => t.type === 'foundation')}
                showMoveHints={settings.showMoveHints}
                isDragging={dragDrop.isDragging}
                validDragFoundations={dragDrop.validDropTargets.filter((t) => t.type === 'foundation').map((t) => t.index)}
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
                selectedCard={
                  localPlayer.selectedCard
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
                    : null
                }
                validWorkDestinations={[
                  ...new Set([
                    ...localPlayer.validWorkPileDestinations,
                    ...(dragDrop.isDragging
                      ? dragDrop.validDropTargets.filter((t) => t.type === 'work').map((t) => t.index)
                      : []),
                  ]),
                ]}
                selectedWasteIndex={
                  localPlayer.selectedCard?.source.type === 'waste'
                    ? localPlayerState.wastePile.length - 1
                    : undefined
                }
                canCallHeyHey={localPlayerState.nertzPile.length === 0}
                canRecycleStock={localPlayerState.stockPile.length === 0 && localPlayerState.wastePile.length > 0}
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
                showMoveHints={settings.showMoveHints}
                isDragging={dragDrop.isDragging}
                dragSource={dragDrop.dragSource}
                validDropTargets={dragDrop.validDropTargets}
                maxPileHeight={280}
              />

              <DragOverlay>
                {dragDrop.dragSource && (
                  <CardComponent
                    card={dragDrop.dragSource.card}
                    faceUp={true}
                    backColor={playerColor}
                  />
                )}
              </DragOverlay>
            </DndContext>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                flex: 1,
              }}
            >
              <p>Loading game...</p>
            </div>
          )}
        </div>
      );
    }

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
