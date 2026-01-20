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
import { TableLayout, useOpponentRefs, type OpponentState } from '../components/Game/TableLayout';
import { SettingsToggle } from '../components/ui/SettingsToggle';
import { SoundToggle } from '../components/ui/SoundToggle';
import { LoadingOverlay, Skeleton } from '../components/ui';
import type { FoundationPile } from '@heyhey/shared';
import type { PlayerColor } from '../components/Card/CardBack';
import type { Card, PlayerGameState, GameState, GameConfig, Move, MoveSource } from '@heyhey/shared';
import { createShuffledDeck } from '@heyhey/shared';
import { useLocalPlayerState } from '../hooks/useLocalPlayerState';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import { usePlayerSettings } from '../hooks/usePlayerSettings';
import { soundManager } from '../audio';
import { hasValidSession } from '../utils/sessionStorage';

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
    playersReadyForNextRound,
    readyForNextRound,
    opponentFullStates,
    isReconnecting,
    reportState,
    lastOpponentFoundationMove: _lastOpponentFoundationMove,
    foundations: contextFoundations,
  } = useGameState();
  const { socket } = useSocket();

  // Opponent refs for flying card animation (ADR-009)
  const { refs: opponentRefs, setRefs: setOpponentRefs } = useOpponentRefs();

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

  // Local animation state - triggers immediately for ALL foundation moves (local and remote)
  const [lastFoundationMove, setLastFoundationMove] = useState<{
    playerId: string;
    foundationIndex: number;
    suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
    rank: number;
    timestamp: number;
  } | null>(null);

  // Player settings (hints and sound toggles)
  const { settings, toggleMoveHints, toggleSound } = usePlayerSettings({ playerId: playerId || '' });

  // Sync sound settings with audio system
  useEffect(() => {
    soundManager.setEnabled(settings.soundEnabled);
    soundManager.setVolume(settings.soundVolume);
  }, [settings.soundEnabled, settings.soundVolume]);

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

      // Initialize foundations - use context foundations if available (from rejoin)
      // or initialize empty ones for new game
      const hasExistingFoundations = contextFoundations && contextFoundations.length > 0 &&
        contextFoundations.some(f => f.cards.length > 0);

      const foundations = new Map<string, FoundationPile[]>();
      if (hasExistingFoundations) {
        // Rejoin case: use server foundation state
        // Foundations are stored as flat array: 4 piles per player
        console.log('[GameScreen] Using existing foundations from server (rejoin):', contextFoundations.length);
        room.players.forEach((player, playerIndex) => {
          const playerPiles = contextFoundations.slice(playerIndex * 4, (playerIndex + 1) * 4);
          if (playerPiles.length === 4) {
            foundations.set(player.id, playerPiles);
          } else {
            // Fallback: create empty piles
            foundations.set(
              player.id,
              SUITS.map((suit) => ({ suit, cards: [], ownerId: player.id }))
            );
          }
        });
      } else {
        // New game: initialize empty foundations
        room.players.forEach((player) => {
          foundations.set(
            player.id,
            SUITS.map((suit) => ({ suit, cards: [], ownerId: player.id }))
          );
        });
      }
      setPlayerFoundations(foundations);

      // Reset setup state
      setSetupStep('dealing_nertz');
      setNertzDealt(0);
      setNertzFlipped(false);
      setWorkDealt(0);
    }
  }, [gamePhase, deck.length, playerId, room, contextFoundations]);

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

  // Redirect to home if no game (but wait for reconnection to complete)
  useEffect(() => {
    // Don't redirect if we're still trying to reconnect
    if (isReconnecting) return;

    // Don't redirect if there's a valid session that might be rejoined
    // (session exists but rejoin hasn't started yet - waiting for socket connect)
    if (hasValidSession()) return;

    // Only redirect if there's no game ID in context and no session to rejoin
    if (!gameId && routeGameId) {
      navigate('/');
    }
  }, [gameId, routeGameId, navigate, isReconnecting]);

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
      const suits: Array<'hearts' | 'diamonds' | 'clubs' | 'spades'> = ['hearts', 'diamonds', 'clubs', 'spades'];
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

      // Trigger animation for REMOTE moves only (local moves animate immediately in handleFoundationMove)
      if (payload.playerId !== playerId) {
        setLastFoundationMove({
          playerId: payload.playerId,
          foundationIndex: payload.foundationIndex,
          suit: suits[suitIndex] ?? 'hearts',
          rank: payload.card.rank,
          timestamp: Date.now(),
        });
      }
    };

    socket.on('foundationUpdated', handleFoundationUpdated);
    return () => {
      socket.off('foundationUpdated', handleFoundationUpdated);
    };
  }, [socket, room, playerId]);

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

  // Helper to report current state to server for opponent visibility
  const reportCurrentState = useCallback(() => {
    if (!localPlayerState) return;
    reportState({
      stockCount: localPlayerState.stockPile.length,
      wasteTopCard: localPlayerState.wastePile.length > 0
        ? localPlayerState.wastePile[localPlayerState.wastePile.length - 1]
        : undefined,
      nertzCount: localPlayerState.nertzPile.length,
      nertzTopCard: localPlayerState.nertzPile.length > 0
        ? localPlayerState.nertzPile[localPlayerState.nertzPile.length - 1]
        : undefined,
      workPiles: localPlayerState.workPiles,
    });
  }, [localPlayerState, reportState]);

  // Report state to server when setup completes and after each state change during play
  useEffect(() => {
    if (isSetupComplete && localPlayerState && gamePhase === 'playing') {
      reportCurrentState();
    }
  }, [isSetupComplete, localPlayerState, reportCurrentState, gamePhase]);

  // Listen for state report requests (when another player reconnects)
  useEffect(() => {
    if (!socket || !localPlayerState || !isSetupComplete) return;

    const handleRequestStateReport = () => {
      console.log('[GameScreen] Received request to report state for reconnecting player');
      reportCurrentState();
    };

    socket.on('requestStateReport', handleRequestStateReport);
    return () => {
      socket.off('requestStateReport', handleRequestStateReport);
    };
  }, [socket, localPlayerState, isSetupComplete, reportCurrentState]);

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

      // Trigger animation immediately for local moves
      const suits: Array<'hearts' | 'diamonds' | 'clubs' | 'spades'> = ['hearts', 'diamonds', 'clubs', 'spades'];
      setLastFoundationMove({
        playerId,
        foundationIndex,
        suit: suits[suitIndex] ?? 'hearts',
        rank: card.rank,
        timestamp: Date.now(),
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

  // Convert opponentFullStates to OpponentState[] for TableLayout (ADR-009)
  // NOTE: This useMemo MUST be before any early returns to satisfy React's Rules of Hooks
  const opponentStatesForLayout: OpponentState[] = useMemo(() => {
    const otherPlayers = room?.players.filter((p) => p.id !== playerId) || [];
    return otherPlayers.map((p) => {
      const fullState = opponentFullStates.get(p.id);
      return {
        playerId: p.id,
        playerName: p.name,
        playerColor: (p.color as PlayerColor) || 'blue',
        stockCount: fullState?.stockCount ?? 0,
        wasteTopCard: fullState?.wasteTopCard ?? null,
        nertzCount: fullState?.nertzCount ?? 0,
        nertzTopCard: fullState?.nertzTopCard ?? null,
        workPiles: fullState?.workPiles ?? [[], [], [], []],
      };
    });
  }, [room?.players, playerId, opponentFullStates]);

  // Early return if no game (must be after all hooks)
  if (!gameId) {
    return null;
  }

  // Get starter info for WaitingToStart
  const players = room?.players || [];
  const starterPlayer = players[currentStarterIndex];
  const isStarter = starterPlayer?.id === playerId;
  const starterName = starterPlayer?.name || 'Unknown';

  // Show reconnecting overlay if needed (or if waiting for socket to connect with valid session)
  if (isReconnecting || (!gameId && hasValidSession())) {
    return <LoadingOverlay.Reconnecting />;
  }

  // Render based on game phase
  switch (gamePhase) {
    case 'setup':
      return <LoadingOverlay.StartingGame />;

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
              background: '#0a0a12',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '24px',
            }}
          >
            <Skeleton.GameBoard />
            <LoadingOverlay
              message="Loading game..."
              hint="Preparing your cards"
              variant="inline"
              showSpinner={true}
            />
          </div>
        );
      }

      // Convert foundations to PlayerFoundationGroup format
      // IMPORTANT: Must iterate in room.players order to match server's foundation indexing
      // Server sends foundationIndex as: playerIndex * 4 + suitIndex
      const playerGroups: PlayerFoundationGroup[] = (room?.players || []).map(
        (player, index) => {
          const piles = playerFoundations.get(player.id) || [];
          return {
            playerId: player.id,
            playerName: player.name || `Player ${index + 1}`,
            playerColor: (player.color as PlayerColor) || 'blue',
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
            height: '100vh',
            maxHeight: '100vh',
            overflow: 'hidden',
            background: '#0a0a12',
            boxSizing: 'border-box',
          }}
        >
          {/* Header bar with settings */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              padding: '4px 8px',
            }}
          >
            {/* Controls */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <SoundToggle
                soundEnabled={settings.soundEnabled}
                onToggleSound={toggleSound}
              />
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
              <TableLayout
                opponents={opponentStatesForLayout}
                onOpponentRefsReady={setOpponentRefs}
                centerContent={
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
                    opponentRefs={opponentRefs.current}
                    lastOpponentMove={lastFoundationMove}
                  />
                }
                bottomContent={
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
                }
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
            <TableLayout
              opponents={opponentStatesForLayout}
              onOpponentRefsReady={setOpponentRefs}
              centerContent={
                <MultiFoundationArea
                  playerGroups={playerGroups}
                  selectedCard={null}
                  onPileClick={() => {}}
                  canPlace={false}
                  showMoveHints={false}
                  isDragging={false}
                  validDragFoundations={[]}
                  opponentRefs={opponentRefs.current}
                  lastOpponentMove={lastFoundationMove}
                />
              }
              bottomContent={
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
              }
            />
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
          <LoadingOverlay
            message="Calculating scores..."
            hint="Tallying up the results"
            variant="fullscreen"
          />
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
            playersReady={playersReadyForNextRound}
            onReadyClick={readyForNextRound}
            onContinue={handleContinue}
          />
        </div>
      );
    }

    case 'finished':
      return (
        <LoadingOverlay
          message="Game Over"
          hint="Winner display coming soon"
          variant="fullscreen"
          showSpinner={false}
        />
      );

    default:
      return (
        <LoadingOverlay
          message={`Game: ${gameId}`}
          hint={`Phase: ${gamePhase}`}
          variant="fullscreen"
        />
      );
  }
}

export default GameScreenConnected;
