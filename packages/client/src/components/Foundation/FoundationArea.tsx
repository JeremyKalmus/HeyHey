// FoundationArea - Shared Foundation Piles UI Component
// Displays the 4 foundation piles (one per suit) where players race to build up from Ace to King

import type { Card as CardType } from '@heyhey/shared';
import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { Card } from '../Card';
import type { PlayerColor } from '../Card/CardBack';
import {
  Icon,
  SuitHeartIcon,
  SuitDiamondIcon,
  SuitClubIcon,
  SuitSpadeIcon,
} from '../ui/Icon';
import { createDropId } from '../../hooks/useDragAndDrop';
import styles from './FoundationArea.module.css';

/**
 * Map of card keys to owner info
 * Key format: `${suit}-${rank}` (e.g., "hearts-1" for Ace of Hearts)
 */
export type CardOwnershipMap = Map<string, { playerId: string; color: PlayerColor }>;

function makeCardKey(card: CardType): string {
  return `${card.suit}-${card.rank}`;
}

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
  ownerId: string;
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
  /** Map of card ownership for showing who played each card */
  cardOwnership?: CardOwnershipMap;
  /** Whether there are pending unconfirmed moves */
  hasPendingMoves?: boolean;
  /** Error message to display (e.g., move rejected) */
  error?: string | null;
  /** Whether to show valid move destination hints (Easy Mode) */
  showMoveHints?: boolean;
}

export function FoundationArea({
  piles,
  selectedCard,
  onPileClick,
  canPlace = false,
  compact = false,
  cardOwnership,
  hasPendingMoves = false,
  error,
  showMoveHints = false,
}: FoundationAreaProps) {
  // Create a map for easy lookup
  const pileMap = new Map(piles.map((p) => [p.suit, p]));

  const handlePileClick = (suit: Suit) => {
    if (canPlace && onPileClick) {
      onPileClick(suit);
    }
  };

  // Check if foundation is a valid placement target (for functionality)
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

  // Check if foundation should be visually highlighted (only when hints enabled)
  const shouldHighlight = (suit: Suit): boolean => {
    if (!showMoveHints) return false;
    return isValidTarget(suit);
  };

  // Get owner color for a card
  const getOwnerColor = (card: CardType): PlayerColor | undefined => {
    if (!cardOwnership) return undefined;
    const key = makeCardKey(card);
    return cardOwnership.get(key)?.color;
  };

  return (
    <div className={`${styles.foundationArea} ${compact ? styles.compact : ''} ${hasPendingMoves ? styles.pending : ''}`}>
      <div className={styles.header}>
        <span className={styles.areaLabel}>Foundations</span>
        {hasPendingMoves && <span className={styles.syncIndicator}>Syncing...</span>}
      </div>
      {error && <div className={styles.errorMessage}>{error}</div>}
      <div className={styles.pilesContainer}>
        {SUITS.map((suit, suitIndex) => {
          const pile = pileMap.get(suit);
          const cards = pile?.cards ?? [];
          const topCard = cards[cards.length - 1];
          const cardCount = cards.length;
          const isTarget = isValidTarget(suit);
          const isHighlighted = shouldHighlight(suit);
          const isClickable = canPlace && !!selectedCard;

          return (
            <DroppableFoundationPile
              key={suit}
              suit={suit}
              suitIndex={suitIndex}
              topCard={topCard}
              cardCount={cardCount}
              isValidTarget={isTarget}
              isHighlighted={isHighlighted}
              isClickable={isClickable}
              getOwnerColor={getOwnerColor}
              onPileClick={handlePileClick}
            />
          );
        })}
      </div>
    </div>
  );
}

export default FoundationArea;

/* =============================================================================
   DROPPABLE FOUNDATION PILE COMPONENT
   ============================================================================= */

interface DroppableFoundationPileProps {
  suit: Suit;
  suitIndex: number;
  topCard: CardType | undefined;
  cardCount: number;
  /** Whether this foundation is a valid placement target (for functionality) */
  isValidTarget: boolean;
  /** Whether to show visual highlight (controlled by showMoveHints) */
  isHighlighted: boolean;
  isClickable: boolean;
  getOwnerColor: (card: CardType) => PlayerColor | undefined;
  onPileClick: (suit: Suit) => void;
}

function DroppableFoundationPile({
  suit,
  suitIndex,
  topCard,
  cardCount,
  isValidTarget: _isValidTarget,
  isHighlighted,
  isClickable,
  getOwnerColor,
  onPileClick,
}: DroppableFoundationPileProps) {
  // Set up droppable
  const dropId = createDropId('foundation', suitIndex);
  const { setNodeRef, isOver } = useDroppable({
    id: dropId,
  });

  // Visual highlight: show when hints enabled OR when dragging over
  const showHighlight = isHighlighted || isOver;

  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Keyboard works when clickable (regardless of hints setting)
    if (!isClickable) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onPileClick(suit);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`${styles.pileWrapper} ${isClickable ? styles.clickable : ''} ${
        showHighlight ? styles.validTarget : ''
      } ${isOver ? styles.dragOver : ''}`}
      onClick={() => onPileClick(suit)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={isClickable ? 0 : -1}
      aria-label={`${suit} foundation - ${cardCount} cards${
        topCard ? `, top card: ${topCard.rank}` : ''
      }`}
    >
      <div className={styles.pile}>
        {topCard ? (
          <Card
            card={topCard}
            faceUp={true}
            ownerColor={getOwnerColor(topCard)}
          />
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
}
