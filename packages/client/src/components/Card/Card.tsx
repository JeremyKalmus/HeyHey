import type { Card as CardType } from '@heyhey/shared';
import { CardFace } from './CardFace';
import { CardBack, type PlayerColor } from './CardBack';
import styles from './Card.module.css';

export interface CardProps {
  card: CardType;
  faceUp?: boolean;
  backColor?: PlayerColor;
  selected?: boolean;
  disabled?: boolean;
  dragging?: boolean;
  dealing?: boolean;
  flipping?: boolean;
  onClick?: (card: CardType) => void;
  onDoubleClick?: (card: CardType) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function Card({
  card,
  faceUp = true,
  backColor = 'blue',
  selected = false,
  disabled = false,
  dragging = false,
  dealing = false,
  flipping = false,
  onClick,
  onDoubleClick,
  className,
  style,
}: CardProps) {
  const classNames = [
    styles.card,
    selected && styles.selected,
    disabled && styles.disabled,
    dragging && styles.dragging,
    dealing && styles.dealing,
    flipping && styles.flipping,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const handleClick = () => {
    if (!disabled && onClick) {
      onClick(card);
    }
  };

  const handleDoubleClick = () => {
    if (!disabled && onDoubleClick) {
      onDoubleClick(card);
    }
  };

  return (
    <div
      className={classNames}
      style={style}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={
        faceUp
          ? `${getRankName(card.rank)} of ${card.suit}`
          : 'Face-down card'
      }
      aria-disabled={disabled}
    >
      {faceUp ? <CardFace card={card} /> : <CardBack color={backColor} />}
    </div>
  );
}

function getRankName(rank: number): string {
  const names: Record<number, string> = {
    1: 'Ace',
    11: 'Jack',
    12: 'Queen',
    13: 'King',
  };
  return names[rank] ?? String(rank);
}

export default Card;
