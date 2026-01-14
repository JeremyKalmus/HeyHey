// GameBoard - Main game layout with 90s arcade neobrutalist styling
// Displays player area, foundation, opponents, and game controls

import type { Card as CardType } from '@heyhey/shared';
import { NertzPile } from './NertzPile';
import { WorkPiles, type SelectedCard } from './WorkPiles';
import { HeyHeyButton } from './HeyHeyButton';
import { FoundationArea, type FoundationPile } from '../Foundation';
import { StockPile } from '../Player/StockPile';
import { WastePile } from '../Player/WastePile';
import { ScoreDisplay } from '../ui/ScoreDisplay/ScoreDisplay';
import type { PlayerScore } from '../ui/ScoreDisplay/types';
import type { PlayerColor } from '../Card/CardBack';
import styles from './GameBoard.module.css';

/* =============================================================================
   SECTION HEADER - Arcade-style area labels
   ============================================================================= */

interface SectionHeaderProps {
  label: string;
  variant?: 'default' | 'highlight' | 'danger';
}

function SectionHeader({ label, variant = 'default' }: SectionHeaderProps) {
  const classNames = [
    styles.sectionHeader,
    styles[`header-${variant}`],
  ].filter(Boolean).join(' ');

  return (
    <div className={classNames}>
      <span className={styles.headerText}>{label}</span>
    </div>
  );
}

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
  playerName: string;
  playerScore: number;
  playerColor: PlayerColor;

  // All players for scoreboard
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
  playerName,
  playerScore,
  playerColor,
  players = [],
  currentRound = 1,
  totalRounds,
  selectedCard,
  validWorkDestinations = [],
  selectedWasteIndex,
  canCallHeyHey = false,
  canRecycleStock = false,
  disabled = false,
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
  className,
}: GameBoardProps) {
  const isNertzSelected = selectedCard?.sourceType === 'nertz';

  return (
    <div className={`${styles.gameBoard} ${className ?? ''}`}>
      {/* Top Bar - Round Counter and Scoreboard */}
      <div className={styles.topBar}>
        <ScoreDisplay.Round current={currentRound} total={totalRounds} />

        {players.length > 0 && (
          <ScoreDisplay.Scoreboard
            players={players}
            direction="horizontal"
            animate
          />
        )}
      </div>

      {/* Main Game Area */}
      <div className={styles.mainArea}>
        {/* Left Column - Foundation Area */}
        <div className={styles.foundationColumn}>
          <SectionHeader label="Foundations" variant="highlight" />
          <FoundationArea
            piles={foundationPiles}
            selectedCard={foundationSelectedCard}
            onPileClick={onFoundationClick}
            canPlace={canPlaceOnFoundation}
          />
        </div>

        {/* Center Column - Player's Playing Area */}
        <div className={styles.playerColumn}>
          {/* Player Header */}
          <div className={styles.playerHeader}>
            <SectionHeader label={playerName} />
            <ScoreDisplay.Board
              name={playerName}
              score={playerScore}
              color={playerColor === 'blue' ? 'cyan' : playerColor === 'red' ? 'orange' : 'green'}
              isActive
            />
          </div>

          {/* Work Piles Area */}
          <div className={styles.workArea}>
            <SectionHeader label="Work Piles" />
            <WorkPiles
              piles={workPiles}
              backColor={playerColor}
              selectedCard={selectedCard}
              validDestinations={validWorkDestinations}
              onCardClick={onWorkCardClick}
              onCardDoubleClick={onWorkCardDoubleClick}
              onPileClick={onWorkPileClick}
              disabled={disabled}
            />
          </div>

          {/* Bottom Row - Nertz, Stock/Waste, HeyHey */}
          <div className={styles.bottomRow}>
            {/* Nertz Pile */}
            <div className={styles.nertzArea}>
              <SectionHeader label="Nertz" variant="danger" />
              <NertzPile
                cards={nertzPile}
                backColor={playerColor}
                selected={isNertzSelected}
                disabled={disabled}
                onTopCardClick={onNertzCardClick}
                onTopCardDoubleClick={onNertzCardDoubleClick}
              />
            </div>

            {/* Stock and Waste */}
            <div className={styles.stockWasteArea}>
              <SectionHeader label="Draw" />
              <div className={styles.stockWasteRow}>
                <StockPile
                  cards={stockPile}
                  backColor={playerColor}
                  disabled={disabled}
                  canRecycle={canRecycleStock}
                  onDraw={onStockDraw}
                  onRecycle={onStockRecycle}
                  showLabel={false}
                />
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

            {/* HeyHey Button */}
            <div className={styles.heyHeyArea}>
              <HeyHeyButton
                nertzPileEmpty={canCallHeyHey}
                onCallHeyHey={onCallHeyHey ?? (() => {})}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GameBoard;
