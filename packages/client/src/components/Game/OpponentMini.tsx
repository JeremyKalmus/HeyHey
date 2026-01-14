// OpponentMini - Compact display of opponent's game state
// Shows card counts (not actual cards) with emphasis on Nertz pile
// Neobrutalist styling with arcade score display

import type { PlayerGameState } from '@heyhey/shared';
import type { PlayerColor } from '../Card/CardBack';
import { Avatar, type AvatarString, DEFAULT_AVATAR } from '../ui/Avatar';
import { LayersIcon, InboxIcon, LayoutGridIcon } from '../ui/Icon';
import styles from './OpponentMini.module.css';

export interface OpponentMiniProps {
  /** Opponent's game state */
  playerState: PlayerGameState;
  /** Opponent's display name */
  name: string;
  /** Opponent's avatar */
  avatar?: AvatarString;
  /** Opponent's deck color */
  color: PlayerColor;
  /** Whether this opponent recently made a move (activity indicator) */
  isActive?: boolean;
  /** Additional CSS class */
  className?: string;
}

export function OpponentMini({
  playerState,
  name,
  avatar = DEFAULT_AVATAR,
  color,
  isActive = false,
  className,
}: OpponentMiniProps) {
  const nertzCount = playerState.nertzPile.length;
  const stockCount = playerState.stockPile.length;
  const wasteCount = playerState.wastePile.length;
  const workCount = playerState.workPiles.reduce((sum: number, pile: unknown[]) => sum + pile.length, 0);

  // Nertz pile empty = close to winning!
  const nertzDanger = nertzCount <= 3 && nertzCount > 0;
  const nertzEmpty = nertzCount === 0;

  return (
    <div
      className={`${styles.opponentMini} ${styles[color]} ${className ?? ''}`}
      aria-label={`${name}'s area - ${nertzCount} cards in Nertz pile`}
    >
      {/* Activity indicator */}
      {isActive && <div className={styles.activityPulse} />}

      {/* Player identity */}
      <div className={styles.identity}>
        <Avatar avatar={avatar} color={color} size="sm" />
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

      {/* Other pile counts with icons */}
      <div className={styles.pileCounts}>
        <div className={styles.pileCount} title="Stock pile">
          <LayersIcon size={12} strokeWidth={2.5} />
          <span>{stockCount}</span>
        </div>
        <div className={styles.pileCount} title="Waste pile">
          <InboxIcon size={12} strokeWidth={2.5} />
          <span>{wasteCount}</span>
        </div>
        <div className={styles.pileCount} title="Work piles total">
          <LayoutGridIcon size={12} strokeWidth={2.5} />
          <span>{workCount}</span>
        </div>
      </div>
    </div>
  );
}

export default OpponentMini;
