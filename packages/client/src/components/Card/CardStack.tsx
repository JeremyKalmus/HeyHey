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
  /** Enable dragging on the top card only (legacy) */
  draggableTopCard?: boolean;
  /** Enable dragging on all cards (multi-card stack drag) */
  draggableAllCards?: boolean;
  /** Pile index for drag ID (required if draggable is true) */
  pileIndex?: number;
  /** Index of the card currently being dragged (to fade cards below) */
  draggingFromIndex?: number;
  /** Max height for vertical stacks - compresses offset to fit (e.g., 300) */
  maxHeight?: number;
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
  draggableAllCards = false,
  pileIndex,
  draggingFromIndex,
  maxHeight,
  className,
  style,
}: CardStackProps) {
  const visibleCards = maxVisible ? cards.slice(-maxVisible) : cards;

  // Calculate effective offset - compress if stack would exceed maxHeight
  const cardHeight = 100;
  const count = visibleCards.length || 1;
  let effectiveOffset = offset;

  if (direction === 'vertical' && maxHeight && count > 1) {
    // Stack height = cardHeight + (count - 1) * offset
    // Solve for offset: offset = (maxHeight - cardHeight) / (count - 1)
    const maxOffset = (maxHeight - cardHeight) / (count - 1);
    effectiveOffset = Math.min(offset, Math.max(maxOffset, 12)); // Min 12px to stay readable
  }

  const directionClass =
    direction === 'horizontal'
      ? styles.stackHorizontal
      : direction === 'fan'
      ? styles.stackFan
      : styles.stackVertical;

  const getCardStyle = (index: number): React.CSSProperties => {
    if (direction === 'horizontal') {
      return { left: index * effectiveOffset };
    } else if (direction === 'vertical') {
      return { top: index * effectiveOffset };
    } else {
      const midpoint = (visibleCards.length - 1) / 2;
      const rotation = (index - midpoint) * fanAngle;
      const translateX = (index - midpoint) * (effectiveOffset * 1.5);
      return {
        transform: `translateX(${translateX}px) rotate(${rotation}deg)`,
        transformOrigin: 'bottom center',
      };
    }
  };

  const getStackDimensions = (): React.CSSProperties => {
    const cardWidth = 70;

    if (direction === 'horizontal') {
      return {
        width: cardWidth + (count - 1) * effectiveOffset,
        height: cardHeight,
      };
    } else if (direction === 'vertical') {
      return {
        width: cardWidth,
        height: cardHeight + (count - 1) * effectiveOffset,
      };
    } else {
      const spread = (count - 1) * effectiveOffset * 1.5 * 2;
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
        const isDraggable = pileIndex !== undefined && (
          draggableAllCards || (isTopCard && draggableTopCard)
        );
        // Calculate how many cards would be dragged (this card + all below)
        const cardCount = cards.length - originalIndex;
        // Check if this card is part of a currently dragged stack
        const isBeingDragged = draggingFromIndex !== undefined && originalIndex >= draggingFromIndex;

        if (isDraggable) {
          return (
            <DraggableStackCard
              key={`${card.deckId}-${card.suit}-${card.rank}`}
              card={card}
              cardIndex={originalIndex}
              pileIndex={pileIndex}
              cardCount={cardCount}
              visibleIndex={index}
              faceUp={faceUp}
              backColor={backColor}
              selected={selectedIndex === originalIndex}
              disabled={disabledIndices.includes(originalIndex)}
              isBeingDragged={isBeingDragged}
              cardStyle={getCardStyle(index)}
              onClick={onCardClick ? () => onCardClick(card, originalIndex) : undefined}
              onDoubleClick={onCardDoubleClick ? () => onCardDoubleClick(card, originalIndex) : undefined}
            />
          );
        }

        return (
          <div
            key={`${card.deckId}-${card.suit}-${card.rank}`}
            className={styles.stackedCard}
            style={{
              ...getCardStyle(index),
              zIndex: index,
            }}
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

/* =============================================================================
   DRAGGABLE STACK CARD COMPONENT
   Allows each card in a work pile to be draggable with proper cardCount
   ============================================================================= */

interface DraggableStackCardProps {
  card: CardType;
  cardIndex: number;
  pileIndex: number;
  cardCount: number;
  visibleIndex: number;
  faceUp: boolean;
  backColor: PlayerColor;
  selected: boolean;
  disabled: boolean;
  isBeingDragged: boolean;
  cardStyle: React.CSSProperties;
  onClick?: () => void;
  onDoubleClick?: () => void;
}

function DraggableStackCard({
  card,
  cardIndex,
  pileIndex,
  cardCount,
  visibleIndex,
  faceUp,
  backColor,
  selected,
  disabled,
  isBeingDragged,
  cardStyle,
  onClick,
  onDoubleClick,
}: DraggableStackCardProps) {
  const dragId = createDragId('work', card, pileIndex, cardIndex);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
    disabled,
    data: {
      card,
      cardCount,
      pileIndex,
      cardIndex,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`${styles.stackedCard} ${isDragging || isBeingDragged ? styles.dragging : ''}`}
      style={{
        ...cardStyle,
        zIndex: visibleIndex,
        opacity: isDragging || isBeingDragged ? 0.5 : 1,
      }}
      {...listeners}
      {...attributes}
    >
      <Card
        card={card}
        faceUp={faceUp}
        backColor={backColor}
        selected={selected}
        disabled={disabled}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      />
    </div>
  );
}
