// PlayerArea - Container component that wires player state to GameBoard
// Uses useLocalPlayerState for optimistic updates and card interactions
// Wrapped with DndContext for drag-and-drop support

import { useMemo, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type {
  PlayerGameState,
  GameState,
  GameConfig,
  Move,
  Card,
  MoveSource,
  MoveDestination,
  FoundationPile as SharedFoundationPile,
} from '@heyhey/shared';
import { GameBoard } from './GameBoard';
import { Card as CardComponent } from '../Card';
import type { SelectedCard } from './WorkPiles';
import type { FoundationPile } from '../Foundation';
import type { PlayerColor } from '../Card/CardBack';
import type { PlayerScore } from '../ui/ScoreDisplay/types';
import { useLocalPlayerState } from '../../hooks/useLocalPlayerState';
import { useDragAndDrop } from '../../hooks/useDragAndDrop';

export interface PlayerAreaProps {
  /** Player's server-authoritative state */
  serverState: PlayerGameState | null;
  /** Full game state */
  gameState: GameState | null;
  /** Game configuration */
  config: GameConfig;
  /** Player's ID */
  playerId: string;
  /** Player's display name */
  playerName: string;
  /** Player's card color */
  playerColor: PlayerColor;
  /** Player's current score */
  playerScore: number;
  /** All players for scoreboard */
  players?: PlayerScore[];
  /** Current round number */
  currentRound?: number;
  /** Target rounds (if known) */
  totalRounds?: number;
  /** Whether gameplay is disabled */
  disabled?: boolean;
  /** Callback when a move should be sent to server */
  onMove?: (move: Move) => void;
  /** Callback for foundation moves (special handling) */
  onFoundationMove?: (card: Card, foundationIndex: number, source: MoveSource) => void;
  /** Callback when HeyHey is called */
  onCallHeyHey?: () => void;
  /** Optional className */
  className?: string;
}

export function PlayerArea({
  serverState,
  gameState,
  config,
  playerId,
  playerName,
  playerColor,
  playerScore,
  players = [],
  currentRound = 1,
  totalRounds,
  disabled = false,
  onMove,
  onFoundationMove,
  onCallHeyHey,
  className,
}: PlayerAreaProps) {
  // Configure drag sensors - pointer for mouse, touch for mobile
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8, // 8px movement required to start drag (prevents accidental drags)
    },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 150, // 150ms delay for touch to distinguish from tap
      tolerance: 5,
    },
  });
  const sensors = useSensors(pointerSensor, touchSensor);

  // Use local player state hook for optimistic updates and handlers
  const localPlayer = useLocalPlayerState({
    serverState,
    gameState,
    config,
    playerId,
    onMove,
    onFoundationMove,
  });

  // Handle drag-drop move callback
  const handleDragMove = useCallback(
    (source: MoveSource, destination: MoveDestination, cardCount?: number) => {
      // Build and send the move via existing mechanism
      const move: Move = {
        type: 'card',
        playerId,
        source,
        destination,
        cardCount,
      };
      onMove?.(move);
    },
    [playerId, onMove]
  );

  // Use drag-drop hook
  const dragDrop = useDragAndDrop({
    gameState,
    config,
    playerId,
    onMove: handleDragMove,
    onFoundationMove,
  });

  // Convert local state to GameBoard props
  const nertzPile = localPlayer.localState?.nertzPile ?? [];
  const workPiles: [Card[], Card[], Card[], Card[]] = useMemo(() => {
    const piles = localPlayer.localState?.workPiles ?? [[], [], [], []];
    return [piles[0] ?? [], piles[1] ?? [], piles[2] ?? [], piles[3] ?? []];
  }, [localPlayer.localState?.workPiles]);
  const stockPile = localPlayer.localState?.stockPile ?? [];
  const wastePile = localPlayer.localState?.wastePile ?? [];

  // Convert selection state to GameBoard format
  const selectedCard: SelectedCard | null = useMemo(() => {
    if (!localPlayer.selectedCard) return null;

    const { card, source } = localPlayer.selectedCard;

    return {
      card,
      sourceType: source.type === 'nertz' ? 'nertz' : source.type === 'work' ? 'workPile' : 'waste',
      sourcePileIndex: source.type === 'work' ? source.pileIndex : undefined,
      cardIndex: source.type === 'work' ? (source.cardIndex ?? 0) : 0,
    };
  }, [localPlayer.selectedCard]);

  // Calculate selected waste index
  const selectedWasteIndex = useMemo(() => {
    if (localPlayer.selectedCard?.source.type === 'waste') {
      return wastePile.length - 1;
    }
    return undefined;
  }, [localPlayer.selectedCard, wastePile.length]);

  // Convert foundations from game state
  const foundationPiles: FoundationPile[] = useMemo(() => {
    if (!gameState) {
      return [
        { suit: 'hearts', cards: [] },
        { suit: 'diamonds', cards: [] },
        { suit: 'clubs', cards: [] },
        { suit: 'spades', cards: [] },
      ];
    }

    return gameState.foundations.map((f: SharedFoundationPile) => ({
      suit: f.suit,
      cards: f.cards,
    }));
  }, [gameState]);

  // Determine if HeyHey can be called (nertz pile empty)
  const canCallHeyHey = nertzPile.length === 0 && !disabled;

  // Determine if stock can be recycled
  const canRecycleStock = stockPile.length === 0 && wastePile.length > 0;

  // Get the selected card for foundation highlighting
  const foundationSelectedCard = localPlayer.selectedCard?.card ?? null;

  // Check if selected card can be placed on any foundation
  const canPlaceOnFoundation = localPlayer.validFoundationDestinations.length > 0;

  // Foundation click handler - map suit to foundation index
  const handleFoundationClick = useCallback(
    (suit: 'hearts' | 'diamonds' | 'clubs' | 'spades') => {
      const suitOrder: ('hearts' | 'diamonds' | 'clubs' | 'spades')[] = [
        'hearts',
        'diamonds',
        'clubs',
        'spades',
      ];
      const foundationIndex = suitOrder.indexOf(suit);
      if (foundationIndex !== -1) {
        localPlayer.handleFoundationClick(foundationIndex);
      }
    },
    [localPlayer]
  );

  return (
    <DndContext
      sensors={sensors}
      onDragStart={dragDrop.handleDragStart}
      onDragOver={dragDrop.handleDragOver}
      onDragEnd={dragDrop.handleDragEnd}
      onDragCancel={dragDrop.handleDragCancel}
    >
      <GameBoard
        // Player's cards
        nertzPile={nertzPile}
        workPiles={workPiles}
        stockPile={stockPile}
        wastePile={wastePile}
        // Foundation
        foundationPiles={foundationPiles}
        // Player info
        playerName={playerName}
        playerScore={playerScore}
        playerColor={playerColor}
        players={players}
        currentRound={currentRound}
        totalRounds={totalRounds}
        // Selection state
        selectedCard={selectedCard}
        validWorkDestinations={localPlayer.validWorkPileDestinations}
        selectedWasteIndex={selectedWasteIndex}
        // Game state
        canCallHeyHey={canCallHeyHey}
        canRecycleStock={canRecycleStock}
        disabled={disabled}
        // Handlers - wire to localPlayer hook
        onNertzCardClick={localPlayer.handleNertzClick}
        onNertzCardDoubleClick={localPlayer.handleNertzDoubleClick}
        onWorkCardClick={localPlayer.handleWorkPileClick}
        onWorkCardDoubleClick={localPlayer.handleWorkPileDoubleClick}
        onWorkPileClick={localPlayer.handleWorkPileTarget}
        onStockDraw={localPlayer.drawCards}
        onStockRecycle={localPlayer.recycleWaste}
        onWasteCardClick={localPlayer.handleWasteClick}
        onWasteCardDoubleClick={localPlayer.handleWasteDoubleClick}
        onFoundationClick={handleFoundationClick}
        onCallHeyHey={onCallHeyHey}
        // Foundation highlighting
        canPlaceOnFoundation={canPlaceOnFoundation}
        foundationSelectedCard={foundationSelectedCard}
        // Drag-drop state
        isDragging={dragDrop.isDragging}
        dragSource={dragDrop.dragSource}
        validDropTargets={dragDrop.validDropTargets}
        className={className}
      />

      {/* Drag overlay - shows dragged card following cursor */}
      <DragOverlay>
        {dragDrop.dragSource && (
          <CardComponent
            card={dragDrop.dragSource.card}
            faceUp={true}
            backColor={playerColor}
            className="dragging"
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}

export default PlayerArea;
