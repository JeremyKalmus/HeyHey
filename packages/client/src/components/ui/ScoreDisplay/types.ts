/** Size variants for ScoreDisplay */
export type ScoreSize = 'sm' | 'md' | 'lg' | 'xl';

/** Player color variants */
export type ScoreColor =
  | 'green'
  | 'orange'
  | 'cyan'
  | 'yellow'
  | 'pink'
  | 'purple';

/** Score display configuration */
export interface ScoreValue {
  /** The numeric value to display */
  value: number;
  /** Optional label above the score */
  label?: string;
  /** Whether to animate value changes */
  animate?: boolean;
}

/** Player score board data */
export interface PlayerScore {
  /** Player name or ID */
  name: string;
  /** Current score */
  score: number;
  /** Player's color theme */
  color?: ScoreColor;
  /** Whether this player is highlighted (current turn, winner, etc.) */
  isActive?: boolean;
}

/** Round counter display data */
export interface RoundInfo {
  /** Current round number */
  current: number;
  /** Total rounds (optional) */
  total?: number;
}
