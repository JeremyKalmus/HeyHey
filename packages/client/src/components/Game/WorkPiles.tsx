// WorkPiles - Game Phase Work Piles Component
// Displays 4 cascading columns with stacked card display for gameplay
// Neubrutalist arcade style with heavy borders and bold elements

import type { Card as CardType } from '@heyhey/shared';
import { useDroppable } from '@dnd-kit/core';
import { CardStack } from '../Card';
import type { PlayerColor } from '../Card/CardBack';
import { Icon, LayersIcon } from '../ui/Icon';
import { createDropId } from '../../hooks/useDragAndDrop';
import styles from './WorkPiles.module.css';

export interface SelectedCard {
  card: CardType;
  sourceType: 'workPile' | 'nertz' | 'waste';
  sourcePileIndex?: number; // For workPile source
  cardIndex: number; // Index within the source pile
}

export interface WorkPilesProps {
  /** Cards in each work pile (4 arrays) */
  piles: [CardType[], CardType[], CardType[], CardType[]];
  /** Player's card back color */
  backColor?: PlayerColor;
  /** Currently selected card info */
  selectedCard?: SelectedCard | null;
  /** Pile indices that are valid destinations for the selected card */
  validDestinations?: number[];
  /** Called when a card in a pile is clicked */
  onCardClick?: (card: CardType, pileIndex: number, cardIndex: number) => void;
  /** Called when a card is double-clicked (for auto-move to foundation) */
  onCardDoubleClick?: (card: CardType, pileIndex: number, cardIndex: number) => void;
  /** Called when an empty pile or pile base is clicked (to place a card) */
  onPileClick?: (pileIndex: number) => void;
  /** Whether interaction is disabled (e.g., game not started) */
  disabled?: boolean;
  /** Whether to show valid move destination hints (Easy Mode) */
  showMoveHints?: boolean;
  /** Whether a drag is currently in progress */
  isDragging?: boolean;
  /** Max height for work pile stacks - compresses cards to fit */
  maxPileHeight?: number;
  /** Optional className for additional styling */
  className?: string;
}

export function WorkPiles({
  piles,
  backColor = 'blue',
  selectedCard,
  validDestinations = [],
  onCardClick,
  onCardDoubleClick,
  onPileClick,
  disabled = false,
  showMoveHints = false,
  isDragging = false,
  maxPileHeight,
  className,
}: WorkPilesProps) {
  const handleCardClick = (card: CardType, pileIndex: number, cardIndex: number) => {
    if (disabled) return;

    // If clicking on a valid destination pile with a selected card, treat as pile click
    if (selectedCard && validDestinations.includes(pileIndex)) {
      onPileClick?.(pileIndex);
      return;
    }

    onCardClick?.(card, pileIndex, cardIndex);
  };

  const handleCardDoubleClick = (card: CardType, pileIndex: number, cardIndex: number) => {
    if (disabled) return;
    onCardDoubleClick?.(card, pileIndex, cardIndex);
  };

  const handlePileClick = (pileIndex: number) => {
    if (disabled) return;
    onPileClick?.(pileIndex);
  };

  // Check if pile is a valid placement target (for functionality)
  const isValidPlacement = (pileIndex: number): boolean => {
    // Valid if we have a selected card OR we're dragging, and this pile is a valid destination
    const hasActiveCard = (selectedCard !== null && selectedCard !== undefined) || isDragging;
    return hasActiveCard && validDestinations.includes(pileIndex);
  };

  // Check if pile should be visually highlighted (only when hints enabled)
  const shouldHighlight = (pileIndex: number): boolean => {
    if (!showMoveHints) return false;
    return isValidPlacement(pileIndex);
  };

  // Get indices of cards that can be selected/dragged
  // For multi-card drag, all face-up cards are selectable
  const getSelectableIndices = (pile: CardType[]): number[] => {
    if (disabled) return [];

    // All cards in the pile are face-up and selectable for multi-card drag
    return Array.from({ length: pile.length }, (_, i) => i);
  };

  return (
    <div className={`${styles.workPiles} ${className ?? ''}`}>
      {piles.map((pile, pileIndex) => {
        const isValidTarget = isValidPlacement(pileIndex);
        const isHighlighted = shouldHighlight(pileIndex);
        const selectableIndices = getSelectableIndices(pile);

        // Find the selected card index in this pile for highlighting cascade
        const selectedIndexInPile =
          selectedCard?.sourceType === 'workPile' && selectedCard.sourcePileIndex === pileIndex
            ? selectedCard.cardIndex
            : -1;

        return (
          <DroppableWorkPile
            key={pileIndex}
            pileIndex={pileIndex}
            pile={pile}
            backColor={backColor}
            isValidTarget={isValidTarget}
            isHighlighted={isHighlighted}
            selectedIndexInPile={selectedIndexInPile}
            selectableIndices={selectableIndices}
            disabled={disabled}
            maxPileHeight={maxPileHeight}
            onCardClick={handleCardClick}
            onCardDoubleClick={handleCardDoubleClick}
            onPileClick={handlePileClick}
          />
        );
      })}
    </div>
  );
}

/* =============================================================================
   DROPPABLE WORK PILE COMPONENT
   ============================================================================= */

interface DroppableWorkPileProps {
  pileIndex: number;
  pile: CardType[];
  backColor: PlayerColor;
  /** Whether this pile is a valid placement target (for functionality) */
  isValidTarget: boolean;
  /** Whether to show visual highlight (controlled by showMoveHints) */
  isHighlighted: boolean;
  selectedIndexInPile: number;
  selectableIndices: number[];
  disabled: boolean;
  maxPileHeight?: number;
  onCardClick: (card: CardType, pileIndex: number, cardIndex: number) => void;
  onCardDoubleClick: (card: CardType, pileIndex: number, cardIndex: number) => void;
  onPileClick: (pileIndex: number) => void;
}

function DroppableWorkPile({
  pileIndex,
  pile,
  backColor,
  isValidTarget,
  isHighlighted,
  selectedIndexInPile,
  selectableIndices,
  disabled,
  maxPileHeight,
  onCardClick,
  onCardDoubleClick,
  onPileClick,
}: DroppableWorkPileProps) {
  // Set up droppable
  const dropId = createDropId('work', pileIndex);
  const { setNodeRef, isOver } = useDroppable({
    id: dropId,
    disabled,
  });

  // Visual highlight: show when hints enabled OR when dragging over
  const showHighlight = isHighlighted || isOver;

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;
    if ((event.key === 'Enter' || event.key === ' ') && isValidTarget) {
      event.preventDefault();
      onPileClick(pileIndex);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`${styles.pileContainer} ${showHighlight ? styles.validDestination : ''} ${isOver ? styles.dragOver : ''}`}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={`Work pile ${pileIndex + 1} - ${pile.length} cards${isHighlighted ? ' - valid destination' : ''}`}
    >
      {pile.length > 0 ? (
        <CardStack
          cards={pile}
          direction="vertical"
          offset={24}
          faceUp={true}
          backColor={backColor}
          selectedIndex={selectedIndexInPile}
          disabledIndices={
            disabled
              ? Array.from({ length: pile.length }, (_, i) => i)
              : pile
                  .map((_, i) => i)
                  .filter((i) => !selectableIndices.includes(i))
          }
          onCardClick={(card, index) => onCardClick(card, pileIndex, index)}
          onCardDoubleClick={(card, index) => onCardDoubleClick(card, pileIndex, index)}
          draggableAllCards={!disabled}
          pileIndex={pileIndex}
          maxHeight={maxPileHeight}
        />
      ) : (
        <div
          className={`${styles.emptyPile} ${isHighlighted ? styles.emptyHighlight : ''}`}
          onClick={() => onPileClick(pileIndex)}
        >
          <Icon icon={LayersIcon} size="md" className={styles.emptyIcon} />
          <span className={styles.emptyLabel}>{pileIndex + 1}</span>
        </div>
      )}
    </div>
  );
}

export default WorkPiles;
