// PlayerArea - Container component that wires player state to GameBoard
// Uses useLocalPlayerState for optimistic updates and card interactions
// Wrapped with DndContext for drag-and-drop support

import { useMemo, useCallback, useEffect, useRef, memo } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DropAnimation,
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
import { useAudio } from '../../audio';

// Static default for empty foundations to avoid recreating on each render
const DEFAULT_FOUNDATION_PILES: FoundationPile[] = [
  { suit: 'hearts', cards: [], ownerId: 'default' },
  { suit: 'diamonds', cards: [], ownerId: 'default' },
  { suit: 'clubs', cards: [], ownerId: 'default' },
  { suit: 'spades', cards: [], ownerId: 'default' },
];

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
  /** Whether to show valid move destination hints (Easy Mode) */
  showMoveHints?: boolean;
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
  showMoveHints = false,
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
      delay: 300, // 300ms long press for touch (spec requirement)
      tolerance: 5, // 5px movement tolerance during delay
    },
  });
  const sensors = useSensors(pointerSensor, touchSensor);

  // Audio for drag-drop feedback
  const { play: playSound } = useAudio();

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

  // Wrap drag handlers with sound effects
  const handleDragStart = useCallback(
    (event: Parameters<typeof dragDrop.handleDragStart>[0]) => {
      dragDrop.handleDragStart(event);
      playSound('cardSelect');
    },
    [dragDrop.handleDragStart, playSound]
  );

  const handleDragEnd = useCallback(
    (event: Parameters<typeof dragDrop.handleDragEnd>[0]) => {
      // Determine destination type
      const isFoundation = event.over?.id.toString().includes('foundation') ?? false;
      const destType = isFoundation ? 'foundation' : 'work';
      const destIndex = parseInt(event.over?.id.toString().split('-').pop() || '0', 10);

      // Check if drop is valid before calling handler
      const wasValid = event.over && dragDrop.isValidDropTarget({
        type: destType,
        index: destIndex,
      });

      dragDrop.handleDragEnd(event);

      // Play appropriate sound based on destination
      if (wasValid) {
        if (isFoundation) {
          playSound('cardToFoundation');
        } else {
          playSound('cardPlace');
        }
      } else if (event.over) {
        playSound('error');
      }
    },
    [dragDrop.handleDragEnd, dragDrop.isValidDropTarget, playSound]
  );

  const handleDragCancel = useCallback(() => {
    dragDrop.handleDragCancel();
    playSound('error');
  }, [dragDrop.handleDragCancel, playSound]);

  // Drop animation configuration - snap to target with spring effect
  const dropAnimation: DropAnimation = useMemo(() => ({
    sideEffects: ({ dragOverlay }) => {
      // Add visual feedback class during drop animation
      if (dragOverlay.node) {
        dragOverlay.node.style.transition = 'transform 150ms ease-out';
      }
      return () => {
        // Cleanup
        if (dragOverlay.node) {
          dragOverlay.node.style.transition = '';
        }
      };
    },
    duration: 200,
    easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  }), []);

  // Track drag state for pinch-to-zoom prevention
  const containerRef = useRef<HTMLDivElement>(null);

  // Prevent pinch-to-zoom during drag
  useEffect(() => {
    if (!dragDrop.isDragging || !containerRef.current) return;

    const container = containerRef.current;

    const preventGestures = (e: TouchEvent) => {
      // Prevent pinch-to-zoom and other gestures during drag
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    const preventWheel = (e: WheelEvent) => {
      // Prevent scroll-zoom during drag
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };

    container.addEventListener('touchmove', preventGestures, { passive: false });
    container.addEventListener('wheel', preventWheel, { passive: false });

    return () => {
      container.removeEventListener('touchmove', preventGestures);
      container.removeEventListener('wheel', preventWheel);
    };
  }, [dragDrop.isDragging]);

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
      return DEFAULT_FOUNDATION_PILES;
    }

    return gameState.foundations.map((f: SharedFoundationPile) => ({
      suit: f.suit,
      cards: f.cards,
      ownerId: f.ownerId,
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
    <div
      ref={containerRef}
      style={{ touchAction: dragDrop.isDragging ? 'none' : 'auto' }}
    >
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={dragDrop.handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
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
          // Background click to clear selection
          onBackgroundClick={localPlayer.clearSelection}
          // Hints settings
          showMoveHints={showMoveHints}
          className={className}
        />

        {/* Drag overlay - shows dragged card(s) following cursor */}
        <DragOverlay dropAnimation={dropAnimation}>
          {dragDrop.dragSource && (
            <DragPreview
              dragSource={dragDrop.dragSource}
              workPiles={workPiles}
              playerColor={playerColor}
            />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

export default PlayerArea;

/* =============================================================================
   DRAG PREVIEW COMPONENT
   Shows the card(s) being dragged in the overlay
   ============================================================================= */

interface DragPreviewProps {
  dragSource: {
    type: 'nertz' | 'work' | 'waste';
    card: Card;
    pileIndex?: number;
    cardIndex?: number;
    cardCount: number;
  };
  workPiles: [Card[], Card[], Card[], Card[]];
  playerColor: PlayerColor;
}

const DragPreview = memo(function DragPreview({ dragSource, workPiles, playerColor }: DragPreviewProps) {
  // For single card drags, just show the card
  if (dragSource.cardCount === 1) {
    return (
      <CardComponent
        card={dragSource.card}
        faceUp={true}
        backColor={playerColor}
        className="dragging"
      />
    );
  }

  // For multi-card drags from work piles, show the stack
  if (dragSource.type === 'work' && dragSource.pileIndex !== undefined && dragSource.cardIndex !== undefined) {
    const pile = workPiles[dragSource.pileIndex];
    if (!pile) {
      return (
        <CardComponent
          card={dragSource.card}
          faceUp={true}
          backColor={playerColor}
          className="dragging"
        />
      );
    }
    const draggedCards = pile.slice(dragSource.cardIndex);

    return (
      <div style={{ position: 'relative' }}>
        {draggedCards.map((card, index) => (
          <div
            key={`${card.deckId}-${card.suit}-${card.rank}`}
            style={{
              position: index === 0 ? 'relative' : 'absolute',
              top: index * 24,
              left: 0,
              zIndex: index,
            }}
          >
            <CardComponent
              card={card}
              faceUp={true}
              backColor={playerColor}
            />
          </div>
        ))}
      </div>
    );
  }

  // Fallback to single card
  return (
    <CardComponent
      card={dragSource.card}
      faceUp={true}
      backColor={playerColor}
      className="dragging"
    />
  );
});
