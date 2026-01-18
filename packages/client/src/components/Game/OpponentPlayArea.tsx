// OpponentPlayArea - Miniaturized view of opponent's play area with actual cards
// Shows stock (back+count), waste (top card), nertz (top card+count), work piles (stacked cards)
// Scaled to 50-60% for opponent visualization
// Uses React.memo for performance

import { memo, forwardRef } from 'react';
import type { Card as CardType } from '@heyhey/shared';
import { Card, CardStack } from '../Card';
import type { PlayerColor } from '../Card/CardBack';
import { Avatar, type AvatarString, DEFAULT_AVATAR } from '../ui/Avatar';
import styles from './OpponentPlayArea.module.css';

export type OpponentPlayAreaScale = 'xs' | 'sm' | 'md';
export type OpponentPlayAreaPosition = 'top' | 'left' | 'right';

export interface OpponentPlayAreaProps {
  /** Opponent's player ID */
  playerId: string;
  /** Opponent's display name */
  playerName: string;
  /** Opponent's avatar */
  playerAvatar?: AvatarString;
  /** Opponent's deck color */
  playerColor: PlayerColor;

  /** Number of cards in stock pile (face-down) */
  stockCount: number;
  /** Top card of waste pile (null if empty) */
  wasteTopCard: CardType | null;
  /** Number of cards in nertz pile */
  nertzCount: number;
  /** Top card of nertz pile (null if empty) */
  nertzTopCard: CardType | null;
  /** Full work piles - all cards visible (all face-up) */
  workPiles: CardType[][];

  /** Scale variant: xs=40%, sm=50%, md=60% */
  scale?: OpponentPlayAreaScale;
  /** Position around table (affects visual orientation) */
  position?: OpponentPlayAreaPosition;
  /** Whether this opponent is currently active (recent move indicator) */
  isActive?: boolean;
  /** Additional CSS class */
  className?: string;
}

/**
 * OpponentPlayArea displays a miniaturized version of an opponent's actual play area.
 * Unlike the summary badge view, this shows real cards: waste top, nertz top, and all work pile cards.
 * Use forwardRef to support animation ref tracking from parent components.
 */
export const OpponentPlayArea = memo(forwardRef<HTMLDivElement, OpponentPlayAreaProps>(
  function OpponentPlayArea(
    {
      playerId: _playerId,
      playerName,
      playerAvatar = DEFAULT_AVATAR,
      playerColor,
      stockCount,
      wasteTopCard,
      nertzCount,
      nertzTopCard,
      workPiles,
      scale = 'sm',
      position = 'top',
      isActive = false,
      className,
    },
    ref
  ) {
    // Determine if nertz is close to empty (danger zone)
    const nertzDanger = nertzCount <= 3 && nertzCount > 0;
    const nertzEmpty = nertzCount === 0;

    // Avatar size based on scale (Avatar only supports 'sm' | 'md' | 'lg')
    const avatarSize = 'sm' as const;

    // Work pile offset based on scale - compressed for mini view
    const workPileOffset = scale === 'xs' ? 6 : scale === 'sm' ? 8 : 10;

    return (
      <div
        ref={ref}
        className={`
          ${styles.opponentPlayArea}
          ${styles[`scale-${scale}`]}
          ${styles[`position-${position}`]}
          ${styles[playerColor]}
          ${isActive ? styles.active : ''}
          ${className ?? ''}
        `}
        aria-label={`${playerName}'s play area - ${nertzCount} cards in Nertz pile`}
      >
        {/* Activity indicator pulse */}
        {isActive && <div className={styles.activityPulse} />}

        {/* Player identity badge */}
        <div className={styles.identity}>
          <Avatar avatar={playerAvatar} color={playerColor} size={avatarSize} />
          <span className={styles.name}>{playerName}</span>
        </div>

        {/* Mini play area with actual cards */}
        <div className={styles.playArea}>
          {/* Stock and Waste section */}
          <div className={styles.stockWasteSection}>
            {/* Stock pile - card back with count */}
            <div className={styles.pileContainer}>
              {stockCount > 0 ? (
                <div className={styles.stockPile}>
                  <Card
                    card={{ suit: 'spades', rank: 1, deckId: 'opponent' }}
                    faceUp={false}
                    backColor={playerColor}
                    disabled
                  />
                  <div className={styles.countBadge}>{stockCount}</div>
                </div>
              ) : (
                <div className={styles.emptySlot} />
              )}
            </div>

            {/* Waste pile - top card only */}
            <div className={styles.pileContainer}>
              {wasteTopCard ? (
                <Card
                  card={wasteTopCard}
                  faceUp={true}
                  backColor={playerColor}
                  disabled
                />
              ) : (
                <div className={styles.emptySlot} />
              )}
            </div>
          </div>

          {/* Nertz pile - with danger/empty state */}
          <div className={styles.nertzSection}>
            <div
              className={`
                ${styles.pileContainer}
                ${styles.nertzPile}
                ${nertzDanger ? styles.danger : ''}
                ${nertzEmpty ? styles.nertzEmpty : ''}
              `}
            >
              {nertzTopCard ? (
                <>
                  <Card
                    card={nertzTopCard}
                    faceUp={true}
                    backColor={playerColor}
                    disabled
                  />
                  <div className={`${styles.countBadge} ${styles.nertzBadge}`}>
                    {nertzCount}
                  </div>
                </>
              ) : nertzEmpty ? (
                <div className={styles.nertzEmptySlot}>
                  <span className={styles.nertzLabel}>NERTZ!</span>
                </div>
              ) : (
                <div className={styles.emptySlot} />
              )}
            </div>
          </div>

          {/* Work piles - full stacked cards */}
          <div className={styles.workPilesSection}>
            {workPiles.map((pile, pileIndex) => (
              <div key={pileIndex} className={styles.pileContainer}>
                {pile.length > 0 ? (
                  <CardStack
                    cards={pile}
                    direction="vertical"
                    offset={workPileOffset}
                    faceUp={true}
                    backColor={playerColor}
                    maxVisible={6}
                  />
                ) : (
                  <div className={styles.emptySlot} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
));

export default OpponentPlayArea;
