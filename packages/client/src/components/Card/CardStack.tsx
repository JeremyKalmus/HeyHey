import type { Card as CardType } from '@heyhey/shared';
import { useDraggable } from '@dnd-kit/core';
import { Card } from './Card';
import type { PlayerColor } from './CardBack';
import { createDragId } from '../../hooks/useDragAndDrop';
import styles from './Card.module.css';

export type StackDirection = 'horizontal' | 'vertical' | 'fan';

export interface CardStackProps {
  cards: CardType[];
  direction?: StackDirection;
  offset?: number;
  faceUp?: boolean;
  backColor?: PlayerColor;
  showEmpty?: boolean;
  maxVisible?: number;
  fanAngle?: number;
  onCardClick?: (card: CardType, index: number) => void;
  onCardDoubleClick?: (card: CardType, index: number) => void;
  selectedIndex?: number;
  disabledIndices?: number[];
  /** Enable dragging on the top card */
  draggableTopCard?: boolean;
  /** Pile index for drag ID (required if draggableTopCard is true) */
  pileIndex?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function CardStack({
  cards,
  direction = 'vertical',
  offset = 20,
  faceUp = true,
  backColor = 'blue',
  showEmpty = false,
  maxVisible,
  fanAngle = 5,
  onCardClick,
  onCardDoubleClick,
  selectedIndex,
  disabledIndices = [],
  draggableTopCard = false,
  pileIndex,
  className,
  style,
}: CardStackProps) {
  const visibleCards = maxVisible ? cards.slice(-maxVisible) : cards;
  const topCard = cards[cards.length - 1];
  const topCardIndex = cards.length - 1;

  // Set up draggable for top card (only if enabled)
  const dragId = topCard && draggableTopCard && pileIndex !== undefined
    ? createDragId('work', topCard, pileIndex, topCardIndex)
    : 'stack-not-draggable';
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
    disabled: !draggableTopCard || cards.length === 0,
    data: {
      card: topCard,
      cardCount: 1,
      pileIndex,
      cardIndex: topCardIndex,
    },
  });

  const directionClass =
    direction === 'horizontal'
      ? styles.stackHorizontal
      : direction === 'fan'
      ? styles.stackFan
      : styles.stackVertical;

  const getCardStyle = (index: number): React.CSSProperties => {
    if (direction === 'horizontal') {
      return { left: index * offset };
    } else if (direction === 'vertical') {
      return { top: index * offset };
    } else {
      const midpoint = (visibleCards.length - 1) / 2;
      const rotation = (index - midpoint) * fanAngle;
      const translateX = (index - midpoint) * (offset * 1.5);
      return {
        transform: `translateX(${translateX}px) rotate(${rotation}deg)`,
        transformOrigin: 'bottom center',
      };
    }
  };

  const getStackDimensions = (): React.CSSProperties => {
    const cardWidth = 70;
    const cardHeight = 100;
    const count = visibleCards.length || 1;

    if (direction === 'horizontal') {
      return {
        width: cardWidth + (count - 1) * offset,
        height: cardHeight,
      };
    } else if (direction === 'vertical') {
      return {
        width: cardWidth,
        height: cardHeight + (count - 1) * offset,
      };
    } else {
      const spread = (count - 1) * offset * 1.5 * 2;
      return {
        width: cardWidth + spread,
        height: cardHeight + 20,
      };
    }
  };

  if (cards.length === 0 && showEmpty) {
    return (
      <div
        className={`${styles.cardStack} ${className ?? ''}`}
        style={{ ...getStackDimensions(), ...style }}
      >
        <div className={styles.emptySlot} />
      </div>
    );
  }

  if (cards.length === 0) {
    return null;
  }

  return (
    <div
      className={`${styles.cardStack} ${directionClass} ${className ?? ''}`}
      style={{ ...getStackDimensions(), ...style }}
    >
      {visibleCards.map((card, index) => {
        const originalIndex = maxVisible
          ? cards.length - visibleCards.length + index
          : index;
        const isTopCard = index === visibleCards.length - 1;
        const isDraggableTopCard = isTopCard && draggableTopCard && pileIndex !== undefined;

        return (
          <div
            key={`${card.deckId}-${card.suit}-${card.rank}`}
            ref={isDraggableTopCard ? setNodeRef : undefined}
            className={`${styles.stackedCard} ${isDragging && isDraggableTopCard ? styles.dragging : ''}`}
            style={{
              ...getCardStyle(index),
              zIndex: index,
              opacity: isDragging && isDraggableTopCard ? 0.5 : 1,
            }}
            {...(isDraggableTopCard ? listeners : {})}
            {...(isDraggableTopCard ? attributes : {})}
          >
            <Card
              card={card}
              faceUp={faceUp}
              backColor={backColor}
              selected={selectedIndex === originalIndex}
              disabled={disabledIndices.includes(originalIndex)}
              onClick={
                onCardClick ? () => onCardClick(card, originalIndex) : undefined
              }
              onDoubleClick={
                onCardDoubleClick
                  ? () => onCardDoubleClick(card, originalIndex)
                  : undefined
              }
            />
          </div>
        );
      })}
    </div>
  );
}

export default CardStack;
