// GameBoard - Main game layout with 90s arcade neobrutalist styling
// Displays player area, foundation, and game controls

import type { Card as CardType } from '@heyhey/shared';
import { NertzPile } from './NertzPile';
import { WorkPiles, type SelectedCard } from './WorkPiles';
import { HeyHeyButton } from './HeyHeyButton';
import { FoundationArea, type FoundationPile } from '../Foundation';
import { StockPile } from '../Player/StockPile';
import { WastePile } from '../Player/WastePile';
import { ScoreDisplay } from '../ui/ScoreDisplay/ScoreDisplay';
import type { PlayerColor } from '../Card/CardBack';
import type { PlayerScore } from '../ui/ScoreDisplay/types';
import type { DragSource, DropTarget } from '../../hooks/useDragAndDrop';
import styles from './GameBoard.module.css';

/* =============================================================================
   GAME BOARD PROPS
   ============================================================================= */

export interface GameBoardProps {
  // Player's cards
  nertzPile: CardType[];
  workPiles: [CardType[], CardType[], CardType[], CardType[]];
  stockPile: CardType[];
  wastePile: CardType[];

  // Foundation (shared)
  foundationPiles: FoundationPile[];

  // Player info
  playerColor: PlayerColor;
  playerName?: string;
  playerScore?: number;
  players?: PlayerScore[];

  // Round info
  currentRound?: number;
  totalRounds?: number;

  // Selection state
  selectedCard?: SelectedCard | null;
  validWorkDestinations?: number[];
  selectedWasteIndex?: number;

  // Game state
  canCallHeyHey?: boolean;
  canRecycleStock?: boolean;
  disabled?: boolean;

  /** Whether nertz top card is face up (default true, false during setup before flip) */
  nertzTopCardFaceUp?: boolean;

  // Handlers
  onNertzCardClick?: (card: CardType) => void;
  onNertzCardDoubleClick?: (card: CardType) => void;
  onWorkCardClick?: (card: CardType, pileIndex: number, cardIndex: number) => void;
  onWorkCardDoubleClick?: (card: CardType, pileIndex: number, cardIndex: number) => void;
  onWorkPileClick?: (pileIndex: number) => void;
  onStockDraw?: () => void;
  onStockRecycle?: () => void;
  onWasteCardClick?: (card: CardType) => void;
  onWasteCardDoubleClick?: (card: CardType) => void;
  onFoundationClick?: (suit: 'hearts' | 'diamonds' | 'clubs' | 'spades') => void;
  onCallHeyHey?: () => void;

  // Can place on foundation
  canPlaceOnFoundation?: boolean;
  foundationSelectedCard?: CardType | null;

  // Drag-drop state
  isDragging?: boolean;
  dragSource?: DragSource | null;
  validDropTargets?: DropTarget[];

  // Background click (for clearing selection)
  onBackgroundClick?: () => void;

  // Hints settings
  /** Whether to show valid move destination hints (Easy Mode) */
  showMoveHints?: boolean;

  /** Hide the foundation area (when using MultiFoundationArea externally) */
  hideFoundation?: boolean;

  /** Hide the top bar (round counter) */
  hideTopBar?: boolean;

  /** Max height for work piles - compresses cards when they get long */
  maxPileHeight?: number;

  // Optional class
  className?: string;
}

/* =============================================================================
   GAME BOARD COMPONENT
   ============================================================================= */

export function GameBoard({
  nertzPile,
  workPiles,
  stockPile,
  wastePile,
  foundationPiles,
  playerColor,
  playerName: _playerName,
  playerScore: _playerScore,
  players: _players,
  currentRound = 1,
  totalRounds,
  selectedCard,
  validWorkDestinations = [],
  selectedWasteIndex,
  canCallHeyHey = false,
  canRecycleStock = false,
  disabled = false,
  nertzTopCardFaceUp = true,
  onNertzCardClick,
  onNertzCardDoubleClick,
  onWorkCardClick,
  onWorkCardDoubleClick,
  onWorkPileClick,
  onStockDraw,
  onStockRecycle,
  onWasteCardClick,
  onWasteCardDoubleClick,
  onFoundationClick,
  onCallHeyHey,
  canPlaceOnFoundation = false,
  foundationSelectedCard,
  isDragging = false,
  dragSource: _dragSource,
  validDropTargets = [],
  onBackgroundClick,
  showMoveHints = false,
  hideFoundation = false,
  hideTopBar = false,
  maxPileHeight,
  className,
}: GameBoardProps) {
  const isNertzSelected = selectedCard?.sourceType === 'nertz';

  // Handle background clicks to clear selection
  // Cards/interactive elements should call e.stopPropagation() to prevent this
  const handleBackgroundClick = () => {
    onBackgroundClick?.();
  };

  // Combine click-selection destinations with drag destinations for highlighting
  const dragWorkDestinations = isDragging
    ? validDropTargets.filter(t => t.type === 'work').map(t => t.index)
    : [];
  const combinedWorkDestinations = [...new Set([...validWorkDestinations, ...dragWorkDestinations])];

  // Check if any foundation is a valid drag target
  const dragFoundationTargets = isDragging
    ? validDropTargets.filter(t => t.type === 'foundation').map(t => t.index)
    : [];
  const canPlaceOnFoundationDrag = dragFoundationTargets.length > 0;

  return (
    <div
      className={`${styles.gameBoard} ${className ?? ''}`}
      onClick={handleBackgroundClick}
    >
      {/* Top Bar - Round Counter only (hidden in multiplayer mode) */}
      {!hideTopBar && (
        <div className={styles.topBar}>
          <ScoreDisplay.Round current={currentRound} total={totalRounds} />
        </div>
      )}

      {/* Foundation Area - CENTER FOCUS (hidden when using MultiFoundationArea externally) */}
      {!hideFoundation && (
        <div className={styles.foundationArea}>
          <FoundationArea
            piles={foundationPiles}
            selectedCard={foundationSelectedCard}
            onPileClick={onFoundationClick}
            canPlace={canPlaceOnFoundation || canPlaceOnFoundationDrag}
            showMoveHints={showMoveHints}
            isDragging={isDragging}
            validDragFoundations={dragFoundationTargets}
          />
        </div>
      )}

      {/* Player Area - Bottom Row: Stock/Waste | Nertz | Work Piles */}
      <div className={styles.playerArea}>
        {/* Stock and Waste - Left */}
        <div className={styles.stockWasteArea}>
          <div className={styles.stockContainer}>
            <StockPile
              cards={stockPile}
              backColor={playerColor}
              disabled={disabled}
              canRecycle={canRecycleStock}
              onDraw={onStockDraw}
              onRecycle={onStockRecycle}
              showLabel={false}
            />
          </div>
          <div className={styles.wasteContainer}>
            <WastePile
              cards={wastePile}
              backColor={playerColor}
              selectedIndex={selectedWasteIndex}
              disabled={disabled}
              onTopCardClick={onWasteCardClick}
              onTopCardDoubleClick={onWasteCardDoubleClick}
              showLabel={false}
            />
          </div>
        </div>

        {/* Play Area - Nertz + Work Piles (right side, grouped) */}
        <div className={styles.playArea}>
          {/* Nertz Pile */}
          <div className={styles.nertzArea}>
            <NertzPile
              cards={nertzPile}
              backColor={playerColor}
              selected={isNertzSelected}
              disabled={disabled}
              topCardFaceUp={nertzTopCardFaceUp}
              onTopCardClick={onNertzCardClick}
              onTopCardDoubleClick={onNertzCardDoubleClick}
            />
          </div>

          {/* Work Piles */}
          <div className={styles.workArea}>
            <WorkPiles
              piles={workPiles}
              backColor={playerColor}
              selectedCard={selectedCard}
              validDestinations={combinedWorkDestinations}
              onCardClick={onWorkCardClick}
              onCardDoubleClick={onWorkCardDoubleClick}
              onPileClick={onWorkPileClick}
              disabled={disabled}
              showMoveHints={showMoveHints}
              isDragging={isDragging}
              maxPileHeight={maxPileHeight}
            />
          </div>
        </div>
      </div>

      {/* HeyHey Button - Only visible when Nertz is empty */}
      <div className={`${styles.heyHeyArea} ${!canCallHeyHey ? styles.hidden : ''}`}>
        <HeyHeyButton
          nertzPileEmpty={canCallHeyHey}
          onCallHeyHey={onCallHeyHey ?? (() => {})}
        />
      </div>
    </div>
  );
}

export default GameBoard;
