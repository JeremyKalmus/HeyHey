// NertzPile - Gameplay component for the Nertz pile
// Displays a stack with top card face-up, supports selection and drag
// Neubrutalist arcade style with heavy borders and bold elements

import type { Card as CardType } from '@heyhey/shared';
import { useDraggable } from '@dnd-kit/core';
import { Card, CardStack } from '../Card';
import type { PlayerColor } from '../Card/CardBack';
import { Icon, ZapIcon } from '../ui/Icon';
import { createDragId } from '../../hooks/useDragAndDrop';
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
  /** Whether the top card is face up (default true for gameplay, false during setup) */
  topCardFaceUp?: boolean;
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
  topCardFaceUp = true,
  onTopCardClick,
  onTopCardDoubleClick,
  className,
}: NertzPileProps) {
  const isEmpty = cards.length === 0;
  const topCard = cards[cards.length - 1];
  const bottomCards = cards.slice(0, -1);

  // Set up draggable for top card
  const dragId = topCard ? createDragId('nertz', topCard) : 'nertz-empty';
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
    disabled: disabled || isEmpty,
    data: {
      card: topCard,
      cardCount: 1,
    },
  });

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

      {/* Top card (face-up, clickable, draggable) */}
      <div
        ref={setNodeRef}
        className={`${styles.topCardContainer} ${isDragging ? styles.dragging : ''}`}
        style={{
          top: Math.min(bottomCards.length * 2, 10),
          opacity: isDragging ? 0 : 1,
          pointerEvents: isDragging ? 'none' : 'auto',
        }}
        {...listeners}
        {...attributes}
      >
        <Card
          card={topCard!}
          faceUp={topCardFaceUp}
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
