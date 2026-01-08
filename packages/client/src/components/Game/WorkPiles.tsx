// WorkPiles - Game Phase Work Piles Component
// Displays 4 cascading columns with stacked card display for gameplay

import type { Card as CardType } from '@heyhey/shared';
import { CardStack } from '../Card';
import type { PlayerColor } from '../Card/CardBack';
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

  const isValidDestination = (pileIndex: number): boolean => {
    return selectedCard !== null && selectedCard !== undefined && validDestinations.includes(pileIndex);
  };

  // Get indices of cards that can be selected (only top card and cards below selected)
  const getSelectableIndices = (pile: CardType[], pileIndex: number): number[] => {
    if (disabled) return [];

    // If this pile has the selected card, allow selecting any card at or below selection
    if (selectedCard?.sourceType === 'workPile' && selectedCard.sourcePileIndex === pileIndex) {
      return Array.from({ length: pile.length }, (_, i) => i);
    }

    // Otherwise, only the top card is selectable
    if (pile.length > 0) {
      return [pile.length - 1];
    }

    return [];
  };

  return (
    <div className={`${styles.workPiles} ${className ?? ''}`}>
      {piles.map((pile, pileIndex) => {
        const isDestination = isValidDestination(pileIndex);
        const selectableIndices = getSelectableIndices(pile, pileIndex);

        // Find the selected card index in this pile for highlighting cascade
        const selectedIndexInPile =
          selectedCard?.sourceType === 'workPile' && selectedCard.sourcePileIndex === pileIndex
            ? selectedCard.cardIndex
            : -1;

        return (
          <div
            key={pileIndex}
            className={`${styles.pileContainer} ${isDestination ? styles.validDestination : ''}`}
            onClick={() => pile.length === 0 && handlePileClick(pileIndex)}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-label={`Work pile ${pileIndex + 1} - ${pile.length} cards${isDestination ? ' - valid destination' : ''}`}
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
                onCardClick={(card, index) => handleCardClick(card, pileIndex, index)}
                onCardDoubleClick={(card, index) => handleCardDoubleClick(card, pileIndex, index)}
              />
            ) : (
              <div
                className={`${styles.emptyPile} ${isDestination ? styles.emptyHighlight : ''}`}
                onClick={() => handlePileClick(pileIndex)}
              >
                <span className={styles.emptyLabel}>{pileIndex + 1}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default WorkPiles;
