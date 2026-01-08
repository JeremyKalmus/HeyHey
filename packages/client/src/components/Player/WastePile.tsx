// WastePile - Face-up discard pile with fanned display
// Shows top 3 cards fanned, click top card to select

import type { Card as CardType } from '@heyhey/shared';
import { Card } from '../Card';
import type { PlayerColor } from '../Card/CardBack';
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

  const handleTopCardClick = () => {
    if (disabled || isEmpty) return;
    const topCard = cards[topCardIndex];
    if (topCard && onTopCardClick) {
      onTopCardClick(topCard);
    }
  };

  const handleTopCardDoubleClick = () => {
    if (disabled || isEmpty) return;
    const topCard = cards[topCardIndex];
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
            <span className={styles.wasteEmptyLabel}>Waste</span>
          </div>
        ) : (
          <div className={styles.wasteStack}>
            {visibleCards.map((card, visibleIndex) => {
              const isTop = visibleIndex === visibleCards.length - 1;
              const originalIndex = cards.length - visibleCards.length + visibleIndex;
              const isSelected = selectedIndex === originalIndex;

              return (
                <div
                  key={`${card.deckId}-${card.suit}-${card.rank}`}
                  className={`${styles.wasteCard} ${isTop && !disabled ? styles.selectable : ''}`}
                  style={{
                    left: visibleIndex * fanOffset,
                    zIndex: visibleIndex,
                  }}
                >
                  <Card
                    card={card}
                    faceUp={true}
                    selected={isSelected}
                    disabled={disabled || !isTop}
                    onClick={isTop ? handleTopCardClick : undefined}
                    onDoubleClick={isTop ? handleTopCardDoubleClick : undefined}
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
