// StockPile - Face-down draw pile component
// Click to draw cards to waste pile, recycle waste when empty

import type { Card as CardType } from '@heyhey/shared';
import { CardStack } from '../Card';
import type { PlayerColor } from '../Card/CardBack';
import styles from './Player.module.css';

export interface StockPileProps {
  /** Cards in the stock pile */
  cards: CardType[];
  /** Player's card back color */
  backColor?: PlayerColor;
  /** Whether the stock is clickable */
  disabled?: boolean;
  /** Whether waste can be recycled (when stock is empty and waste has cards) */
  canRecycle?: boolean;
  /** Called when stock is clicked to draw cards */
  onDraw?: () => void;
  /** Called when empty stock is clicked to recycle waste */
  onRecycle?: () => void;
  /** Whether to show the section label */
  showLabel?: boolean;
  /** Custom class name */
  className?: string;
}

export function StockPile({
  cards,
  backColor = 'blue',
  disabled = false,
  canRecycle = false,
  onDraw,
  onRecycle,
  showLabel = true,
  className,
}: StockPileProps) {
  const isEmpty = cards.length === 0;
  const isClickable = !disabled && ((!isEmpty && onDraw) || (isEmpty && canRecycle && onRecycle));

  const handleClick = () => {
    if (disabled) return;

    if (!isEmpty && onDraw) {
      onDraw();
    } else if (isEmpty && canRecycle && onRecycle) {
      onRecycle();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div className={`${styles.stockPile} ${className ?? ''}`}>
      {showLabel && <span className={styles.sectionLabel}>Stock</span>}
      <div
        className={`${styles.stockArea} ${isClickable ? styles.clickable : ''}`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={isClickable ? 0 : -1}
        aria-label={
          isEmpty
            ? canRecycle
              ? 'Click to recycle waste pile'
              : 'Stock pile empty'
            : `Stock pile - ${cards.length} cards. Click to draw`
        }
        aria-disabled={disabled}
      >
        {isEmpty ? (
          <div className={`${styles.stockEmpty} ${canRecycle ? styles.canRecycle : ''}`}>
            <span className={styles.recycleIcon}>{canRecycle ? '♻' : ''}</span>
          </div>
        ) : (
          <CardStack
            cards={cards.slice(-3)}
            direction="vertical"
            offset={2}
            faceUp={false}
            backColor={backColor}
            maxVisible={3}
          />
        )}
      </div>
      <span className={styles.cardCount}>{cards.length}</span>
    </div>
  );
}

export default StockPile;
