// TableLayout - Orchestrates opponent play area positioning around the table
// Handles layout for 2 players (top), 3-4 players (around edges), 5+ (scrollable row)
// Manages opponentRefs for card flying animations

import { memo, useRef, useCallback, type ReactNode, type RefObject } from 'react';
import type { Card as CardType } from '@heyhey/shared';
import type { PlayerColor } from '../Card/CardBack';
import type { AvatarString } from '../ui/Avatar';
import { OpponentPlayArea, type OpponentPlayAreaScale } from './OpponentPlayArea';
import styles from './TableLayout.module.css';

/* =============================================================================
   TYPES
   ============================================================================= */

/** Opponent state with full card data for display */
export interface OpponentState {
  playerId: string;
  playerName: string;
  playerAvatar?: AvatarString;
  playerColor: PlayerColor;
  stockCount: number;
  wasteTopCard: CardType | null;
  nertzCount: number;
  nertzTopCard: CardType | null;
  workPiles: CardType[][];
  isActive?: boolean;
}

export interface TableLayoutProps {
  /** List of opponent states to display */
  opponents: OpponentState[];

  /** Content to render in the center (foundations) */
  centerContent?: ReactNode;

  /** Content to render at the bottom (local player area) */
  bottomContent?: ReactNode;

  /** Callback to get refs to opponent play areas (for animation) */
  onOpponentRefsReady?: (refs: Map<string, HTMLDivElement>) => void;

  /** Additional CSS class */
  className?: string;
}

/* =============================================================================
   TABLE LAYOUT COMPONENT
   ============================================================================= */

/**
 * TableLayout orchestrates the positioning of opponent play areas around the table.
 * Layout adapts based on opponent count:
 * - 2 players: Single opponent at top
 * - 3-4 players: Opponents around edges (top, left, right)
 * - 5+ players: Scrollable row at top
 *
 * Manages refs for each opponent's play area to support card flying animations.
 */
export const TableLayout = memo(function TableLayout({
  opponents,
  centerContent,
  bottomContent,
  onOpponentRefsReady,
  className,
}: TableLayoutProps) {
  // Track refs to opponent play areas
  const opponentRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Ref callback to track opponent elements
  const setOpponentRef = useCallback(
    (playerId: string) => (el: HTMLDivElement | null) => {
      if (el) {
        opponentRefs.current.set(playerId, el);
      } else {
        opponentRefs.current.delete(playerId);
      }

      // Notify parent when refs change
      if (onOpponentRefsReady && opponentRefs.current.size === opponents.length) {
        onOpponentRefsReady(new Map(opponentRefs.current));
      }
    },
    [opponents.length, onOpponentRefsReady]
  );

  // Determine layout variant and scale based on opponent count
  const opponentCount = opponents.length;
  const layoutVariant = getLayoutVariant(opponentCount);
  const scale = getOpponentScale(opponentCount);

  // Distribute opponents by position for 3-4 player layout
  const { topOpponents, leftOpponent, rightOpponent } = distributeOpponents(
    opponents,
    layoutVariant
  );

  return (
    <div className={`${styles.tableLayout} ${styles[layoutVariant]} ${className ?? ''}`}>
      {/* Top row - opponents (varies by layout) */}
      {topOpponents.length > 0 && (
        <div className={styles.topRow}>
          {topOpponents.map((opponent) => (
            <OpponentPlayArea
              key={opponent.playerId}
              ref={setOpponentRef(opponent.playerId)}
              playerId={opponent.playerId}
              playerName={opponent.playerName}
              playerAvatar={opponent.playerAvatar}
              playerColor={opponent.playerColor}
              stockCount={opponent.stockCount}
              wasteTopCard={opponent.wasteTopCard}
              nertzCount={opponent.nertzCount}
              nertzTopCard={opponent.nertzTopCard}
              workPiles={opponent.workPiles}
              scale={scale}
              position="top"
              isActive={opponent.isActive}
            />
          ))}
        </div>
      )}

      {/* Middle section: [Left opponent] [Center] [Right opponent] */}
      <div className={styles.middleRow}>
        {/* Left opponent (3-4 players) */}
        {leftOpponent && (
          <div className={styles.leftColumn}>
            <OpponentPlayArea
              ref={setOpponentRef(leftOpponent.playerId)}
              playerId={leftOpponent.playerId}
              playerName={leftOpponent.playerName}
              playerAvatar={leftOpponent.playerAvatar}
              playerColor={leftOpponent.playerColor}
              stockCount={leftOpponent.stockCount}
              wasteTopCard={leftOpponent.wasteTopCard}
              nertzCount={leftOpponent.nertzCount}
              nertzTopCard={leftOpponent.nertzTopCard}
              workPiles={leftOpponent.workPiles}
              scale={scale}
              position="left"
              isActive={leftOpponent.isActive}
            />
          </div>
        )}

        {/* Center content (foundations) */}
        <div className={styles.centerColumn}>{centerContent}</div>

        {/* Right opponent (3-4 players) */}
        {rightOpponent && (
          <div className={styles.rightColumn}>
            <OpponentPlayArea
              ref={setOpponentRef(rightOpponent.playerId)}
              playerId={rightOpponent.playerId}
              playerName={rightOpponent.playerName}
              playerAvatar={rightOpponent.playerAvatar}
              playerColor={rightOpponent.playerColor}
              stockCount={rightOpponent.stockCount}
              wasteTopCard={rightOpponent.wasteTopCard}
              nertzCount={rightOpponent.nertzCount}
              nertzTopCard={rightOpponent.nertzTopCard}
              workPiles={rightOpponent.workPiles}
              scale={scale}
              position="right"
              isActive={rightOpponent.isActive}
            />
          </div>
        )}
      </div>

      {/* Bottom content (local player area) */}
      {bottomContent && <div className={styles.bottomRow}>{bottomContent}</div>}
    </div>
  );
});

/* =============================================================================
   HELPER FUNCTIONS
   ============================================================================= */

type LayoutVariant = 'layout1' | 'layout2' | 'layout3to4' | 'layout5plus';

function getLayoutVariant(opponentCount: number): LayoutVariant {
  if (opponentCount === 0) return 'layout1';
  if (opponentCount === 1) return 'layout2';
  if (opponentCount <= 3) return 'layout3to4';
  return 'layout5plus';
}

function getOpponentScale(opponentCount: number): OpponentPlayAreaScale {
  if (opponentCount <= 1) return 'md';
  if (opponentCount <= 3) return 'sm';
  return 'xs';
}

interface DistributedOpponents {
  topOpponents: OpponentState[];
  leftOpponent: OpponentState | null;
  rightOpponent: OpponentState | null;
}

function distributeOpponents(
  opponents: OpponentState[],
  layout: LayoutVariant
): DistributedOpponents {
  if (layout === 'layout2') {
    // 2 players: single opponent at top
    return {
      topOpponents: opponents,
      leftOpponent: null,
      rightOpponent: null,
    };
  }

  if (layout === 'layout3to4') {
    // 3-4 players: distribute around edges
    // Order: left, top, right (for 3 players: left, top center, right)
    const opp0 = opponents[0];
    const opp1 = opponents[1];
    const opp2 = opponents[2];

    if (opponents.length === 2 && opp0 && opp1) {
      // 3 total players (2 opponents): one top, one left or right
      return {
        topOpponents: [opp0],
        leftOpponent: opp1,
        rightOpponent: null,
      };
    }
    if (opponents.length === 3 && opp0 && opp1 && opp2) {
      // 4 total players (3 opponents): one left, one top, one right
      return {
        topOpponents: [opp1],
        leftOpponent: opp0,
        rightOpponent: opp2,
      };
    }
  }

  // 5+ players or default: all in top row (scrollable)
  return {
    topOpponents: opponents,
    leftOpponent: null,
    rightOpponent: null,
  };
}

/* =============================================================================
   HOOK FOR ANIMATION REFS
   ============================================================================= */

/**
 * Hook to get opponent play area refs for animation purposes.
 * Returns a function to get the DOM element for a specific opponent.
 */
export function useOpponentRefs(): {
  refs: RefObject<Map<string, HTMLDivElement>>;
  setRefs: (newRefs: Map<string, HTMLDivElement>) => void;
  getOpponentElement: (playerId: string) => HTMLDivElement | undefined;
} {
  const refs = useRef<Map<string, HTMLDivElement>>(new Map());

  const setRefs = useCallback((newRefs: Map<string, HTMLDivElement>) => {
    refs.current = newRefs;
  }, []);

  const getOpponentElement = useCallback((playerId: string) => {
    return refs.current.get(playerId);
  }, []);

  return { refs, setRefs, getOpponentElement };
}

export default TableLayout;
