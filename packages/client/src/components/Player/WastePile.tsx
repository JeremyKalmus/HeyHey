// WastePile - Face-up discard pile with fanned display
// Shows top 3 cards fanned, click top card to select, drag top card to move
// Neubrutalist arcade style with heavy borders and bold elements

import type { Card as CardType } from '@heyhey/shared';
import { useDraggable } from '@dnd-kit/core';
import { Card } from '../Card';
import type { PlayerColor } from '../Card/CardBack';
import { Icon, SquareIcon } from '../ui/Icon';
import { createDragId } from '../../hooks/useDragAndDrop';
import styles from './Player.module.css';

export interface WastePileProps {
  /** Cards in the waste pile */
  cards: CardType[];
  /** Player's card back color (for consistency) */
  backColor?: PlayerColor;
  /** Index of currently selected card (only top card can be selected) */
  selectedIndex?: number;
  /** Whether selection is disabled */
  disabled?: boolean;
  /** Called when the top card is clicked */
  onTopCardClick?: (card: CardType) => void;
  /** Called when the top card is double-clicked (e.g., to auto-play) */
  onTopCardDoubleClick?: (card: CardType) => void;
  /** Maximum number of cards to show fanned (default 3) */
  maxVisible?: number;
  /** Horizontal offset between fanned cards */
  fanOffset?: number;
  /** Whether to show the section label */
  showLabel?: boolean;
  /** Custom class name */
  className?: string;
}

export function WastePile({
  cards,
  backColor: _backColor = 'blue',
  selectedIndex,
  disabled = false,
  onTopCardClick,
  onTopCardDoubleClick,
  maxVisible = 3,
  fanOffset = 18,
  showLabel = true,
  className,
}: WastePileProps) {
  const isEmpty = cards.length === 0;
  const visibleCards = cards.slice(-maxVisible);
  const topCardIndex = cards.length - 1;
  const topCard = cards[topCardIndex];

  // Set up draggable for top card
  const dragId = topCard ? createDragId('waste', topCard) : 'waste-empty';
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
    disabled: disabled || isEmpty,
    data: {
      card: topCard,
      cardCount: 1,
    },
  });

  const handleTopCardClick = () => {
    if (disabled || isEmpty) return;
    if (topCard && onTopCardClick) {
      onTopCardClick(topCard);
    }
  };

  const handleTopCardDoubleClick = () => {
    if (disabled || isEmpty) return;
    if (topCard && onTopCardDoubleClick) {
      onTopCardDoubleClick(topCard);
    }
  };

  // Calculate stack dimensions
  const cardWidth = 70;
  const cardHeight = 100;
  const stackWidth = cardWidth + (visibleCards.length - 1) * fanOffset;

  return (
    <div className={`${styles.wastePile} ${className ?? ''}`}>
      {showLabel && <span className={styles.sectionLabel}>Waste</span>}
      <div
        className={styles.wasteArea}
        style={{
          width: isEmpty ? cardWidth : stackWidth,
          height: cardHeight,
        }}
      >
        {isEmpty ? (
          <div className={styles.wasteEmpty}>
            <Icon icon={SquareIcon} size="md" className={styles.wasteEmptyIcon} />
          </div>
        ) : (
          <div className={styles.wasteStack}>
            {visibleCards.map((card, visibleIndex) => {
              const isTop = visibleIndex === visibleCards.length - 1;
              const originalIndex = cards.length - visibleCards.length + visibleIndex;
              const isSelected = selectedIndex === originalIndex;

              // Top card is draggable
              if (isTop) {
                return (
                  <div
                    key={`${card.deckId}-${card.suit}-${card.rank}`}
                    ref={setNodeRef}
                    className={`${styles.wasteCard} ${!disabled ? styles.selectable : ''} ${isDragging ? styles.dragging : ''}`}
                    style={{
                      left: visibleIndex * fanOffset,
                      zIndex: visibleIndex,
                      opacity: isDragging ? 0.5 : 1,
                    }}
                    {...listeners}
                    {...attributes}
                  >
                    <Card
                      card={card}
                      faceUp={true}
                      selected={isSelected}
                      disabled={disabled}
                      onClick={handleTopCardClick}
                      onDoubleClick={handleTopCardDoubleClick}
                    />
                  </div>
                );
              }

              return (
                <div
                  key={`${card.deckId}-${card.suit}-${card.rank}`}
                  className={styles.wasteCard}
                  style={{
                    left: visibleIndex * fanOffset,
                    zIndex: visibleIndex,
                  }}
                >
                  <Card
                    card={card}
                    faceUp={true}
                    selected={isSelected}
                    disabled={true}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
      <span className={styles.cardCount}>{cards.length}</span>
    </div>
  );
}

export default WastePile;
