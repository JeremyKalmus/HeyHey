// NertzPile - Gameplay component for the Nertz pile
// Displays a stack with top card face-up, supports selection
// Neubrutalist arcade style with heavy borders and bold elements

import type { Card as CardType } from '@heyhey/shared';
import { Card, CardStack } from '../Card';
import type { PlayerColor } from '../Card/CardBack';
import { Icon, ZapIcon } from '../ui/Icon';
import styles from './NertzPile.module.css';

export interface NertzPileProps {
  /** Cards in the Nertz pile (bottom to top order) */
  cards: CardType[];
  /** Player's card back color */
  backColor?: PlayerColor;
  /** Whether the top card is currently selected */
  selected?: boolean;
  /** Whether the pile is disabled (can't be clicked) */
  disabled?: boolean;
  /** Called when the top card is clicked */
  onTopCardClick?: (card: CardType) => void;
  /** Called when the top card is double-clicked */
  onTopCardDoubleClick?: (card: CardType) => void;
  /** Additional CSS class */
  className?: string;
}

export function NertzPile({
  cards,
  backColor = 'blue',
  selected = false,
  disabled = false,
  onTopCardClick,
  onTopCardDoubleClick,
  className,
}: NertzPileProps) {
  const isEmpty = cards.length === 0;
  const topCard = cards[cards.length - 1];
  const bottomCards = cards.slice(0, -1);

  const handleTopCardClick = () => {
    if (!disabled && topCard && onTopCardClick) {
      onTopCardClick(topCard);
    }
  };

  const handleTopCardDoubleClick = () => {
    if (!disabled && topCard && onTopCardDoubleClick) {
      onTopCardDoubleClick(topCard);
    }
  };

  // Empty state - neubrutalist celebration for clearing the pile
  if (isEmpty) {
    return (
      <div className={`${styles.nertzPile} ${styles.empty} ${className ?? ''}`}>
        <div className={styles.emptySlot}>
          <span className={styles.emptyLabel}>NERTZ!</span>
          <Icon icon={ZapIcon} size="xl" className={styles.emptyIcon} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${styles.nertzPile} ${className ?? ''}`}
      aria-label={`Nertz pile - ${cards.length} cards remaining`}
    >
      {/* Bottom cards (face-down stack) */}
      {bottomCards.length > 0 && (
        <div className={styles.bottomStack}>
          <CardStack
            cards={bottomCards}
            direction="vertical"
            offset={2}
            faceUp={false}
            backColor={backColor}
            maxVisible={Math.min(bottomCards.length, 5)}
          />
        </div>
      )}

      {/* Top card (face-up, clickable) */}
      <div
        className={styles.topCardContainer}
        style={{
          top: Math.min(bottomCards.length * 2, 10),
        }}
      >
        <Card
          card={topCard!}
          faceUp={true}
          backColor={backColor}
          selected={selected}
          disabled={disabled}
          onClick={handleTopCardClick}
          onDoubleClick={handleTopCardDoubleClick}
        />
      </div>

      {/* Card count badge */}
      <div className={styles.countBadge}>{cards.length}</div>
    </div>
  );
}

export default NertzPile;
