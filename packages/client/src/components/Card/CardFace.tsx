import type { Card } from '@heyhey/shared';
import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';
import {
  SuitHeartIcon,
  SuitDiamondIcon,
  SuitClubIcon,
  SuitSpadeIcon,
} from '../ui/Icon';
import styles from './Card.module.css';

export interface CardFaceProps {
  card: Card;
  className?: string;
}

const SUIT_ICONS: Record<Card['suit'], ComponentType<LucideProps>> = {
  hearts: SuitHeartIcon,
  diamonds: SuitDiamondIcon,
  clubs: SuitClubIcon,
  spades: SuitSpadeIcon,
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
  const SuitIcon = SUIT_ICONS[card.suit];
  const rankLabel = getRankLabel(card.rank);
  const colorClass = isRedSuit(card.suit) ? styles.red : styles.black;
  // Clubs rendered slightly larger for better distinction from spades
  const cornerSize = card.suit === 'clubs' ? 11 : 10;
  const centerSize = card.suit === 'clubs' ? 30 : 28;

  return (
    <div className={`${styles.cardFace} ${className ?? ''}`}>
      <div className={styles.cardFaceContent}>
        <div className={`${styles.cornerLabel} ${styles.cornerLabelTop} ${colorClass}`}>
          <span className={styles.rank}>{rankLabel}</span>
          <span className={styles.suitSmall}>
            <SuitIcon size={cornerSize} strokeWidth={2.5} fill="currentColor" />
          </span>
        </div>

        <div className={`${styles.centerSuit} ${colorClass}`}>
          <SuitIcon size={centerSize} strokeWidth={2} fill="currentColor" />
        </div>

        <div className={`${styles.cornerLabel} ${styles.cornerLabelBottom} ${colorClass}`}>
          <span className={styles.rank}>{rankLabel}</span>
          <span className={styles.suitSmall}>
            <SuitIcon size={cornerSize} strokeWidth={2.5} fill="currentColor" />
          </span>
        </div>
      </div>
    </div>
  );
}

export default CardFace;
