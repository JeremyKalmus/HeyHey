import type { Card } from '@heyhey/shared';
import styles from './Card.module.css';

export interface CardFaceProps {
  card: Card;
  className?: string;
}

const SUIT_SYMBOLS: Record<Card['suit'], string> = {
  hearts: '\u2665',
  diamonds: '\u2666',
  clubs: '\u2663',
  spades: '\u2660',
};

const RANK_LABELS: Record<number, string> = {
  1: 'A',
  11: 'J',
  12: 'Q',
  13: 'K',
};

function getRankLabel(rank: number): string {
  return RANK_LABELS[rank] ?? String(rank);
}

function isRedSuit(suit: Card['suit']): boolean {
  return suit === 'hearts' || suit === 'diamonds';
}

export function CardFace({ card, className }: CardFaceProps) {
  const suitSymbol = SUIT_SYMBOLS[card.suit];
  const rankLabel = getRankLabel(card.rank);
  const colorClass = isRedSuit(card.suit) ? styles.red : styles.black;

  return (
    <div className={`${styles.cardFace} ${className ?? ''}`}>
      <div className={styles.cardFaceContent}>
        <div className={`${styles.cornerLabel} ${styles.cornerLabelTop} ${colorClass}`}>
          <span className={styles.rank}>{rankLabel}</span>
          <span className={styles.suitSmall}>{suitSymbol}</span>
        </div>

        <div className={`${styles.centerSuit} ${colorClass}`}>
          {suitSymbol}
        </div>

        <div className={`${styles.cornerLabel} ${styles.cornerLabelBottom} ${colorClass}`}>
          <span className={styles.rank}>{rankLabel}</span>
          <span className={styles.suitSmall}>{suitSymbol}</span>
        </div>
      </div>
    </div>
  );
}

export default CardFace;
