// SettingsToggle - Quick toggle button for game settings
// Neubrutalist arcade style with clear iconography

import { Icon, LightbulbIcon, LightbulbOffIcon } from '../Icon';
import styles from './SettingsToggle.module.css';

export interface SettingsToggleProps {
  /** Whether move hints are enabled */
  showMoveHints: boolean;
  /** Callback when hints toggle is clicked */
  onToggleHints: () => void;
  /** Optional className */
  className?: string;
}

/**
 * Settings toggle button for Easy Mode (move hints).
 *
 * Uses lightbulb icon to indicate hints on/off:
 * - Lightbulb: hints enabled (Easy Mode)
 * - LightbulbOff: hints disabled (Normal Mode)
 */
export function SettingsToggle({
  showMoveHints,
  onToggleHints,
  className,
}: SettingsToggleProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent background click handler
    onToggleHints();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onToggleHints();
    }
  };

  return (
    <button
      type="button"
      className={`${styles.toggle} ${showMoveHints ? styles.active : ''} ${className ?? ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={showMoveHints ? 'Disable move hints (Easy Mode off)' : 'Enable move hints (Easy Mode on)'}
      aria-pressed={showMoveHints}
      title={showMoveHints ? 'Easy Mode: ON - Click to disable hints' : 'Easy Mode: OFF - Click to enable hints'}
    >
      <Icon
        icon={showMoveHints ? LightbulbIcon : LightbulbOffIcon}
        size="md"
        className={styles.icon}
      />
      <span className={styles.label}>
        {showMoveHints ? 'HINTS' : 'HINTS'}
      </span>
    </button>
  );
}

export default SettingsToggle;
