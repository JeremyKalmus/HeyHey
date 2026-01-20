// OpponentBadge - Scalable badge display of opponent's game state
// Shows card counts (not actual cards) with emphasis on Nertz pile
// Neobrutalist styling with arcade score display
// Supports multiple scale sizes for different layout contexts

import { memo } from 'react';
import type { PlayerGameState, OpponentPlayerState } from '@heyhey/shared';
import type { PlayerColor } from '../Card/CardBack';
import { Avatar, type AvatarString, DEFAULT_AVATAR } from '../ui/Avatar';
import { LayersIcon, InboxIcon, LayoutGridIcon } from '../ui/Icon';
import styles from './OpponentBadge.module.css';

export type OpponentBadgeScale = 'xs' | 'sm' | 'md' | 'lg';

export interface OpponentBadgeProps {
  /** Opponent's game state (full PlayerGameState) */
  playerState?: PlayerGameState;
  /** Opponent's lightweight state (for real-time updates) */
  opponentState?: OpponentPlayerState;
  /** Opponent's display name */
  name: string;
  /** Opponent's avatar */
  avatar?: AvatarString;
  /** Opponent's deck color */
  color: PlayerColor;
  /** Scale/size variant for different layouts */
  scale?: OpponentBadgeScale;
  /** Whether this opponent recently made a move (activity indicator) */
  isActive?: boolean;
  /** Additional CSS class */
  className?: string;
}

/**
 * OpponentBadge displays a compact badge view of an opponent's game state.
 * Supports both full PlayerGameState and lightweight OpponentPlayerState.
 * Uses React.memo to prevent unnecessary re-renders.
 */
export const OpponentBadge = memo(function OpponentBadge({
  playerState,
  opponentState,
  name,
  avatar = DEFAULT_AVATAR,
  color,
  scale = 'md',
  isActive = false,
  className,
}: OpponentBadgeProps) {
  // Extract counts from either state format
  let nertzCount: number;
  let stockCount: number;
  let wasteCount: number;
  let workCount: number;

  if (opponentState) {
    // Use lightweight opponent state
    nertzCount = opponentState.nertzCount;
    stockCount = opponentState.stockCount;
    wasteCount = opponentState.wasteCount;
    workCount = opponentState.workPiles.reduce((sum, pile) => sum + pile.count, 0);
  } else if (playerState) {
    // Fall back to full player state
    nertzCount = playerState.nertzPile.length;
    stockCount = playerState.stockPile.length;
    wasteCount = playerState.wastePile.length;
    workCount = playerState.workPiles.reduce((sum: number, pile: unknown[]) => sum + pile.length, 0);
  } else {
    // No state provided, show zeros
    nertzCount = 0;
    stockCount = 0;
    wasteCount = 0;
    workCount = 0;
  }

  // Nertz pile empty = close to winning!
  const nertzDanger = nertzCount <= 3 && nertzCount > 0;
  const nertzEmpty = nertzCount === 0;

  // Determine avatar size based on scale (Avatar supports: sm, md, lg)
  const avatarSize = scale === 'lg' ? 'md' : 'sm';

  return (
    <div
      className={`${styles.opponentArea} ${styles[color]} ${styles[`scale-${scale}`]} ${className ?? ''}`}
      aria-label={`${name}'s area - ${nertzCount} cards in Nertz pile`}
    >
      {/* Activity indicator */}
      {isActive && <div className={styles.activityPulse} />}

      {/* Player identity */}
      <div className={styles.identity}>
        <Avatar avatar={avatar} color={color} size={avatarSize} />
        <span className={styles.name}>{name}</span>
      </div>

      {/* Nertz pile count - arcade style score display */}
      <div
        className={`${styles.nertzCount} ${nertzDanger ? styles.danger : ''} ${nertzEmpty ? styles.empty : ''}`}
        title="Nertz pile"
      >
        <span className={styles.nertzLabel}>NERTZ</span>
        <span className={styles.nertzNumber}>{nertzCount}</span>
      </div>

      {/* Other pile counts with icons - hide on xs scale */}
      {scale !== 'xs' && (
        <div className={styles.pileCounts}>
          <div className={styles.pileCount} title="Stock pile">
            <LayersIcon size={scale === 'sm' ? 10 : 12} strokeWidth={2.5} />
            <span>{stockCount}</span>
          </div>
          <div className={styles.pileCount} title="Waste pile">
            <InboxIcon size={scale === 'sm' ? 10 : 12} strokeWidth={2.5} />
            <span>{wasteCount}</span>
          </div>
          <div className={styles.pileCount} title="Work piles total">
            <LayoutGridIcon size={scale === 'sm' ? 10 : 12} strokeWidth={2.5} />
            <span>{workCount}</span>
          </div>
        </div>
      )}
    </div>
  );
});

// Re-export old names for backwards compatibility
export { OpponentBadge as OpponentArea, OpponentBadge as OpponentMini };
export type { OpponentBadgeProps as OpponentAreaProps, OpponentBadgeProps as OpponentMiniProps };
export type { OpponentBadgeScale as OpponentAreaScale };

export default OpponentBadge;
