// FoundationArea - Shared Foundation Piles UI Component
// Displays the 4 foundation piles (one per suit) where players race to build up from Ace to King

import type { Card as CardType } from '@heyhey/shared';
import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';
import { Card } from '../Card';
import {
  Icon,
  SuitHeartIcon,
  SuitDiamondIcon,
  SuitClubIcon,
  SuitSpadeIcon,
} from '../ui/Icon';
import styles from './FoundationArea.module.css';

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

const SUIT_ICONS: Record<Suit, ComponentType<LucideProps>> = {
  hearts: SuitHeartIcon,
  diamonds: SuitDiamondIcon,
  clubs: SuitClubIcon,
  spades: SuitSpadeIcon,
};

export interface FoundationPile {
  suit: Suit;
  cards: CardType[];
}

export interface FoundationAreaProps {
  /** The 4 foundation piles (one per suit) */
  piles: FoundationPile[];
  /** Currently selected card (if any) for placement */
  selectedCard?: CardType | null;
  /** Called when a foundation pile is clicked (to place a card) */
  onPileClick?: (suit: Suit) => void;
  /** Whether placement is currently allowed */
  canPlace?: boolean;
  /** Compact mode for smaller displays */
  compact?: boolean;
}

export function FoundationArea({
  piles,
  selectedCard,
  onPileClick,
  canPlace = false,
  compact = false,
}: FoundationAreaProps) {
  // Create a map for easy lookup
  const pileMap = new Map(piles.map((p) => [p.suit, p]));

  const handlePileClick = (suit: Suit) => {
    if (canPlace && onPileClick) {
      onPileClick(suit);
    }
  };

  const isValidTarget = (suit: Suit): boolean => {
    if (!canPlace || !selectedCard) return false;

    // Card must match the suit
    if (selectedCard.suit !== suit) return false;

    const pile = pileMap.get(suit);
    const topCard = pile?.cards[pile.cards.length - 1];

    if (!topCard) {
      // Empty pile: only Ace (rank 1) can be placed
      return selectedCard.rank === 1;
    }

    // Must be exactly one rank higher
    return selectedCard.rank === topCard.rank + 1;
  };

  return (
    <div className={`${styles.foundationArea} ${compact ? styles.compact : ''}`}>
      <div className={styles.pilesContainer}>
        {SUITS.map((suit) => {
          const pile = pileMap.get(suit);
          const cards = pile?.cards ?? [];
          const topCard = cards[cards.length - 1];
          const cardCount = cards.length;
          const isTarget = isValidTarget(suit);
          const isClickable = canPlace && selectedCard;

          return (
            <div
              key={suit}
              className={`${styles.pileWrapper} ${isClickable ? styles.clickable : ''} ${
                isTarget ? styles.validTarget : ''
              }`}
              onClick={() => handlePileClick(suit)}
              role="button"
              tabIndex={isClickable ? 0 : -1}
              aria-label={`${suit} foundation - ${cardCount} cards${
                topCard ? `, top card: ${topCard.rank}` : ''
              }`}
            >
              <div className={styles.pile}>
                {topCard ? (
                  <Card card={topCard} faceUp={true} />
                ) : (
                  <div className={`${styles.emptySlot} ${styles[suit]}`}>
                    <Icon
                      icon={SUIT_ICONS[suit]}
                      size="xl"
                      strokeWidth={3}
                      className={styles.suitIcon}
                    />
                  </div>
                )}
              </div>
              <span className={styles.cardCount}>{cardCount}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default FoundationArea;
