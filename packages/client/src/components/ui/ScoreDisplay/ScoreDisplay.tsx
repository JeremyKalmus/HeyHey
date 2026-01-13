import { useEffect, useRef, useState } from 'react';
import type { ScoreSize, ScoreColor, PlayerScore } from './types';
import styles from './ScoreDisplay.module.css';

/* =============================================================================
   SCORE VALUE - Single score with optional label
   ============================================================================= */

export interface ScoreValueProps {
  /** The numeric value to display */
  value: number;
  /** Optional label above the score */
  label?: string;
  /** Size variant */
  size?: ScoreSize;
  /** Whether to animate value changes */
  animate?: boolean;
  /** Additional CSS class */
  className?: string;
}

/**
 * Displays a single score value with arcade styling.
 *
 * Features JetBrains Mono font, arcade green glow, and optional pop animation.
 *
 * @example
 * ```tsx
 * <ScoreValue value={1250} label="SCORE" size="lg" animate />
 * ```
 */
export function ScoreValue({
  value,
  label,
  size = 'md',
  animate = true,
  className,
}: ScoreValueProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValue = useRef(value);

  useEffect(() => {
    if (animate && prevValue.current !== value) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      prevValue.current = value;
      return () => clearTimeout(timer);
    }
  }, [value, animate]);

  const classNames = [
    styles.scoreValue,
    styles[`size-${size}`],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const numberClassNames = [
    styles.scoreNumber,
    isAnimating && styles.animate,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames}>
      {label && <span className={styles.scoreLabel}>{label}</span>}
      <span className={numberClassNames}>{value.toLocaleString()}</span>
    </div>
  );
}

/* =============================================================================
   PLAYER BOARD - Score display for a single player
   ============================================================================= */

export interface PlayerBoardProps {
  /** Player name */
  name: string;
  /** Player's current score */
  score: number;
  /** Color theme for the score */
  color?: ScoreColor;
  /** Whether this player is active/highlighted */
  isActive?: boolean;
  /** Whether to animate score changes */
  animate?: boolean;
  /** Additional CSS class */
  className?: string;
}

/**
 * Displays a single player's score with their name.
 *
 * @example
 * ```tsx
 * <PlayerBoard name="PLAYER 1" score={2500} color="cyan" isActive />
 * ```
 */
export function PlayerBoard({
  name,
  score,
  color = 'green',
  isActive = false,
  animate = true,
  className,
}: PlayerBoardProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const prevScore = useRef(score);

  useEffect(() => {
    if (animate && prevScore.current !== score) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      prevScore.current = score;
      return () => clearTimeout(timer);
    }
  }, [score, animate]);

  const classNames = [
    styles.playerBoard,
    styles[`color-${color}`],
    isActive && styles.isActive,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const scoreClassNames = [
    styles.playerScore,
    isAnimating && styles.animate,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames}>
      <span className={styles.playerName}>{name}</span>
      <span className={scoreClassNames}>{score.toLocaleString()}</span>
    </div>
  );
}

/* =============================================================================
   SCOREBOARD - Multiple player scores
   ============================================================================= */

export interface ScoreboardProps {
  /** Array of player scores */
  players: PlayerScore[];
  /** Layout direction */
  direction?: 'horizontal' | 'vertical';
  /** Whether to animate score changes */
  animate?: boolean;
  /** Additional CSS class */
  className?: string;
}

/**
 * Displays multiple player scores in a row or column.
 *
 * @example
 * ```tsx
 * <Scoreboard
 *   players={[
 *     { name: 'P1', score: 1000, color: 'cyan', isActive: true },
 *     { name: 'P2', score: 850, color: 'orange' },
 *   ]}
 *   direction="horizontal"
 * />
 * ```
 */
export function Scoreboard({
  players,
  direction = 'horizontal',
  animate = true,
  className,
}: ScoreboardProps) {
  const classNames = [
    styles.scoreboard,
    styles[direction],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames}>
      {players.map((player) => (
        <PlayerBoard
          key={player.name}
          name={player.name}
          score={player.score}
          color={player.color}
          isActive={player.isActive}
          animate={animate}
        />
      ))}
    </div>
  );
}

/* =============================================================================
   ROUND COUNTER - Current round / total rounds
   ============================================================================= */

export interface RoundCounterProps {
  /** Current round number */
  current: number;
  /** Total number of rounds (optional) */
  total?: number;
  /** Additional CSS class */
  className?: string;
}

/**
 * Displays the current round with optional total.
 *
 * @example
 * ```tsx
 * <RoundCounter current={3} total={10} />
 * <RoundCounter current={5} />
 * ```
 */
export function RoundCounter({
  current,
  total,
  className,
}: RoundCounterProps) {
  const classNames = [styles.roundCounter, className].filter(Boolean).join(' ');

  return (
    <div className={classNames}>
      <span className={styles.roundLabel}>Round</span>
      <span className={styles.roundNumber}>{current}</span>
      {total !== undefined && (
        <>
          <span className={styles.roundSeparator}>/</span>
          <span className={styles.roundTotal}>{total}</span>
        </>
      )}
    </div>
  );
}

/* =============================================================================
   STAT ROW - Label and value inline
   ============================================================================= */

export interface StatRowProps {
  /** Label for the stat */
  label: string;
  /** Value to display */
  value: number | string;
  /** Whether to animate value changes */
  animate?: boolean;
  /** Additional CSS class */
  className?: string;
}

/**
 * Displays a stat label and value inline.
 *
 * @example
 * ```tsx
 * <StatRow label="LIVES" value={3} />
 * <StatRow label="TIME" value="02:30" />
 * ```
 */
export function StatRow({
  label,
  value,
  animate = true,
  className,
}: StatRowProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValue = useRef(value);

  useEffect(() => {
    if (animate && typeof value === 'number' && prevValue.current !== value) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      prevValue.current = value;
      return () => clearTimeout(timer);
    }
  }, [value, animate]);

  const classNames = [styles.statRow, className].filter(Boolean).join(' ');

  const valueClassNames = [
    styles.statValue,
    isAnimating && styles.animate,
  ]
    .filter(Boolean)
    .join(' ');

  const displayValue =
    typeof value === 'number' ? value.toLocaleString() : value;

  return (
    <div className={classNames}>
      <span className={styles.statLabel}>{label}</span>
      <span className={valueClassNames}>{displayValue}</span>
    </div>
  );
}

/* =============================================================================
   SCORE DISPLAY - Compound component namespace
   ============================================================================= */

/**
 * ScoreDisplay compound component for 90s arcade-style score displays.
 *
 * @example
 * ```tsx
 * // Single score
 * <ScoreDisplay.Value value={9999} label="HIGH SCORE" size="xl" />
 *
 * // Player scores
 * <ScoreDisplay.Board name="P1" score={2500} color="cyan" isActive />
 *
 * // Multiple players
 * <ScoreDisplay.Scoreboard players={players} direction="horizontal" />
 *
 * // Round counter
 * <ScoreDisplay.Round current={3} total={10} />
 *
 * // Stat row
 * <ScoreDisplay.Stat label="COMBO" value={5} />
 * ```
 */
export const ScoreDisplay = {
  Value: ScoreValue,
  Board: PlayerBoard,
  Scoreboard,
  Round: RoundCounter,
  Stat: StatRow,
};

export default ScoreDisplay;
