// GameScreenConnected - Game phase orchestration
// Renders appropriate UI based on current game phase

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useGameState } from '../context/GameStateContext';
import { useSocket } from '../context/SocketContext';
import { WaitingToStart } from '../components/Game/WaitingToStart';
import { GameBoard } from '../components/Game/GameBoard';
import { HeyHeyCelebration } from '../components/Game/HeyHeyCelebration';
import { RoundEndScreen } from '../components/Game/RoundEndScreen';
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

// Setup phases for dealing cards
type SetupStep = 'dealing_nertz' | 'flip_nertz' | 'dealing_work' | 'complete';

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
    foundationMove: emitFoundationMove,
    callNertz,
    nertzCallerId,
    roundResult,
    totalScores,
    gameOver,
    gameWinner,
  } = useGameState();
  const { socket } = useSocket();

  // The shuffled deck (created once when round starts)
  const [deck, setDeck] = useState<Card[]>([]);

  // Setup tracking
  const [setupStep, setSetupStep] = useState<SetupStep>('dealing_nertz');
  const [nertzDealt, setNertzDealt] = useState(0);
  const [nertzFlipped, setNertzFlipped] = useState(false);
  const [workDealt, setWorkDealt] = useState(0);

  // Local player state (built incrementally during setup)
  const [localPlayerState, setLocalPlayerState] = useState<PlayerGameState | null>(null);

  // Foundation piles for all players
  const [playerFoundations, setPlayerFoundations] = useState<Map<string, FoundationPile[]>>(new Map());

  // Player settings (hints toggle)
  const { settings, toggleMoveHints } = usePlayerSettings({ playerId: playerId || '' });

  // Get current player info
  const currentPlayer = room?.players.find((p) => p.id === playerId);
  const playerColor = (currentPlayer?.color as PlayerColor) || 'blue';
  const nertzPileSize = room?.settings.nertzPileSize || 13;

  // Initialize deck and foundations when entering playing phase
  useEffect(() => {
    if (gamePhase === 'playing' && deck.length === 0 && playerId && room) {
      // Create the deck that will be used throughout
      const newDeck = createShuffledDeck(playerId);
      setDeck(newDeck);

      // Initialize empty player state
      setLocalPlayerState({
        playerId,
        deckId: playerId,
        nertzPile: [],
        workPiles: [[], [], [], []],
        stockPile: newDeck, // All cards start in stock
        wastePile: [],
      });

      // Initialize foundations for all players
      const foundations = new Map<string, FoundationPile[]>();
      room.players.forEach((player) => {
        foundations.set(
          player.id,
          SUITS.map((suit) => ({ suit, cards: [], ownerId: player.id }))
        );
      });
      setPlayerFoundations(foundations);

      // Reset setup state
      setSetupStep('dealing_nertz');
      setNertzDealt(0);
      setNertzFlipped(false);
      setWorkDealt(0);
    }
  }, [gamePhase, deck.length, playerId, room]);

  // Reset state when entering waiting phase (new round)
  useEffect(() => {
    if (gamePhase === 'waiting_for_start') {
      setDeck([]);
      setLocalPlayerState(null);
      setPlayerFoundations(new Map());
      setSetupStep('dealing_nertz');
      setNertzDealt(0);
      setNertzFlipped(false);
      setWorkDealt(0);
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

  // Listen for foundation updates from other players
  useEffect(() => {
    if (!socket || !room) return;

    const handleFoundationUpdated = (payload: {
      foundationIndex: number;
      card: Card;
      playerId: string;
    }) => {
      // Calculate which player/suit this foundation belongs to
      const playerIndex = Math.floor(payload.foundationIndex / 4);
      const suitIndex = payload.foundationIndex % 4;
      const players = room.players;
      const targetPlayerId = players[playerIndex]?.id;
      if (!targetPlayerId) return;

      // Update the foundation pile
      setPlayerFoundations((prev) => {
        const newMap = new Map(prev);
        const piles = newMap.get(targetPlayerId);
        if (piles) {
          const newPiles = [...piles];
          newPiles[suitIndex] = {
            ...newPiles[suitIndex]!,
            cards: [...newPiles[suitIndex]!.cards, payload.card],
          };
          newMap.set(targetPlayerId, newPiles);
        }
        return newMap;
      });
    };

    socket.on('foundationUpdated', handleFoundationUpdated);
    return () => {
      socket.off('foundationUpdated', handleFoundationUpdated);
    };
  }, [socket, room]);

  // Handle stock click during setup - deals cards
  const handleSetupStockClick = useCallback(() => {
    if (!localPlayerState || setupStep !== 'dealing_nertz') return;
    if (nertzDealt >= nertzPileSize) return;

    // Deal one card from stock to nertz pile
    const card = deck[nertzDealt];
    if (!card) return;

    setLocalPlayerState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        nertzPile: [...prev.nertzPile, card],
        stockPile: deck.slice(nertzDealt + 1),
      };
    });

    const newNertzDealt = nertzDealt + 1;
    setNertzDealt(newNertzDealt);

    // Check if nertz pile is complete
    if (newNertzDealt >= nertzPileSize) {
      setSetupStep('flip_nertz');
    }
  }, [localPlayerState, setupStep, nertzDealt, nertzPileSize, deck]);

  // Handle nertz click during setup - flips top card
  const handleSetupNertzClick = useCallback(() => {
    if (setupStep !== 'flip_nertz' || nertzFlipped) return;

    setNertzFlipped(true);
    setSetupStep('dealing_work');
  }, [setupStep, nertzFlipped]);

  // Handle work pile click during setup - deals card to that pile
  const handleSetupWorkPileClick = useCallback(
    (pileIndex: number) => {
      if (!localPlayerState || setupStep !== 'dealing_work') return;
      const pile = localPlayerState.workPiles[pileIndex];
      if (pile && pile.length > 0) return; // Already has card

      const cardIndex = nertzPileSize + workDealt;
      const card = deck[cardIndex];
      if (!card) return;

      setLocalPlayerState((prev) => {
        if (!prev) return prev;
        const newWorkPiles = [...prev.workPiles] as [Card[], Card[], Card[], Card[]];
        newWorkPiles[pileIndex] = [card];
        return {
          ...prev,
          workPiles: newWorkPiles,
          stockPile: deck.slice(cardIndex + 1),
        };
      });

      const newWorkDealt = workDealt + 1;
      setWorkDealt(newWorkDealt);

      // Check if all work piles have cards
      if (newWorkDealt >= 4) {
        setSetupStep('complete');
      }
    },
    [localPlayerState, setupStep, workDealt, nertzPileSize, deck]
  );

  const isSetupComplete = setupStep === 'complete';

  // Build game state for hooks (only when setup complete)
  const gameState: GameState | null = useMemo(() => {
    if (!localPlayerState || !room || !isSetupComplete) return null;
    return {
      gameId: gameId || '',
      phase: 'playing',
      players: [localPlayerState],
      foundations: Array.from(playerFoundations.values()).flat(),
      config: room.settings,
      roundNumber,
      currentStarterIndex,
    };
  }, [localPlayerState, room, gameId, playerFoundations, roundNumber, currentStarterIndex, isSetupComplete]);

  const config: GameConfig = useMemo(
    () => room?.settings || { nertzPileSize: 13, drawCount: 3, targetScore: 100 },
    [room]
  );

  // Handle local player moves (after setup)
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

      const playerIndex = Math.floor(foundationIndex / 4);
      const suitIndex = foundationIndex % 4;
      const players = room?.players || [];
      const targetPlayerId = players[playerIndex]?.id || playerId;

      // Remove card from local player state (optimistic update)
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

      // Update local foundation state (optimistic update)
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

      // Emit to server for other players
      emitFoundationMove(card, foundationIndex, source);
    },
    [playerId, room, emitFoundationMove]
  );

  // Drag-drop setup
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  });
  const sensors = useSensors(pointerSensor);

  // Use hooks (only when setup complete)
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

      // During setup: determine what's clickable
      const setupStockClickable = setupStep === 'dealing_nertz';
      const setupNertzClickable = setupStep === 'flip_nertz';
      const setupWorkClickable = setupStep === 'dealing_work';

      // Get setup instruction text
      const getSetupInstruction = () => {
        switch (setupStep) {
          case 'dealing_nertz':
            return `Click stock to deal Nertz pile (${nertzDealt}/${nertzPileSize})`;
          case 'flip_nertz':
            return 'Click Nertz pile to flip top card';
          case 'dealing_work':
            return `Click empty work piles to deal (${workDealt}/4)`;
          default:
            return '';
        }
      };

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
                <div key={opp.id} style={{ opacity: 0.7 }} title={opp.name}>
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

          {/* Setup instruction banner */}
          {!isSetupComplete && (
            <div
              style={{
                background: 'linear-gradient(90deg, #FFD23F 0%, #F7931E 100%)',
                color: '#000',
                padding: '8px 16px',
                borderRadius: '8px',
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '0.9rem',
              }}
            >
              {getSetupInstruction()}
            </div>
          )}

          {isSetupComplete ? (
            // Full playable game after setup
            <DndContext
              sensors={sensors}
              onDragStart={dragDrop.handleDragStart}
              onDragOver={dragDrop.handleDragOver}
              onDragEnd={dragDrop.handleDragEnd}
              onDragCancel={dragDrop.handleDragCancel}
            >
              <MultiFoundationArea
                playerGroups={playerGroups}
                selectedCard={localPlayer.selectedCard?.card ?? null}
                onPileClick={(_pid: string, _suit: string, globalIndex: number) => {
                  localPlayer.handleFoundationClick(globalIndex);
                }}
                canPlace={
                  localPlayer.validFoundationDestinations.length > 0 ||
                  dragDrop.validDropTargets.some((t) => t.type === 'foundation')
                }
                showMoveHints={settings.showMoveHints}
                isDragging={dragDrop.isDragging}
                validDragFoundations={dragDrop.validDropTargets
                  .filter((t) => t.type === 'foundation')
                  .map((t) => t.index)}
              />

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
                onCallHeyHey={callNertz}
                canRecycleStock={
                  localPlayerState.stockPile.length === 0 && localPlayerState.wastePile.length > 0
                }
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
            // Setup phase - same GameBoard but with setup click handlers
            <>
              <MultiFoundationArea
                playerGroups={playerGroups}
                selectedCard={null}
                onPileClick={() => {}}
                canPlace={false}
                showMoveHints={false}
                isDragging={false}
                validDragFoundations={[]}
              />

              <GameBoard
                nertzPile={localPlayerState.nertzPile}
                workPiles={localPlayerState.workPiles as [Card[], Card[], Card[], Card[]]}
                stockPile={localPlayerState.stockPile}
                wastePile={localPlayerState.wastePile}
                foundationPiles={[]}
                playerColor={playerColor}
                currentRound={roundNumber}
                selectedCard={null}
                validWorkDestinations={setupWorkClickable ? [0, 1, 2, 3].filter(i => localPlayerState.workPiles[i]?.length === 0) : []}
                canCallHeyHey={false}
                canRecycleStock={false}
                disabled={false}
                nertzTopCardFaceUp={nertzFlipped}
                // Setup handlers
                onNertzCardClick={setupNertzClickable ? () => handleSetupNertzClick() : undefined}
                onWorkPileClick={setupWorkClickable ? handleSetupWorkPileClick : undefined}
                onStockDraw={setupStockClickable ? handleSetupStockClick : undefined}
                hideFoundation={true}
                hideTopBar={true}
                showMoveHints={setupWorkClickable}
                maxPileHeight={280}
              />
            </>
          )}

          {/* HeyHey Celebration Overlay */}
          {nertzCallerId && (
            <HeyHeyCelebration
              callerName={room?.players.find((p) => p.id === nertzCallerId)?.name || 'Player'}
              onComplete={() => {
                // Celebration complete - game will transition to scoring phase via server
              }}
            />
          )}
        </div>
      );
    }

    case 'scoring': {
      if (!roundResult) {
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
            <p>Calculating scores...</p>
          </div>
        );
      }

      const playerNamesMap = new Map(
        room?.players.map((p) => [p.id, p.name]) || []
      );

      const handleContinue = () => {
        if (gameOver) {
          navigate('/');
        } else {
          startRound();
        }
      };

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
          <RoundEndScreen
            roundResult={roundResult}
            totalScores={totalScores}
            playerNames={playerNamesMap}
            gameOver={gameOver}
            winner={gameWinner || undefined}
            currentPlayerId={playerId || ''}
            onContinue={handleContinue}
          />
        </div>
      );
    }

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
