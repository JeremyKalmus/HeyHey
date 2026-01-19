// SoundToggle - Quick toggle button for sound on/off
// Neubrutalist arcade style matching SettingsToggle

import { Icon, VolumeIcon, VolumeOffIcon } from '../Icon';
import styles from './SoundToggle.module.css';

export interface SoundToggleProps {
  /** Whether sound is enabled */
  soundEnabled: boolean;
  /** Callback when sound toggle is clicked */
  onToggleSound: () => void;
  /** Optional className */
  className?: string;
}

/**
 * Sound toggle button for mute/unmute.
 *
 * Uses volume icon to indicate sound on/off:
 * - Volume: sound enabled
 * - VolumeOff: sound muted
 */
export function SoundToggle({
  soundEnabled,
  onToggleSound,
  className,
}: SoundToggleProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent background click handler
    onToggleSound();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onToggleSound();
    }
  };

  return (
    <button
      type="button"
      className={`${styles.toggle} ${soundEnabled ? styles.active : ''} ${className ?? ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={soundEnabled ? 'Mute sound' : 'Unmute sound'}
      aria-pressed={soundEnabled}
      title={soundEnabled ? 'Sound: ON - Click to mute' : 'Sound: OFF - Click to unmute'}
    >
      <Icon
        icon={soundEnabled ? VolumeIcon : VolumeOffIcon}
        size="md"
        className={styles.icon}
      />
      <span className={styles.label}>
        {soundEnabled ? 'SOUND' : 'MUTED'}
      </span>
    </button>
  );
}

export default SoundToggle;
