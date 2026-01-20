// DrawButton - Call for a draw when the game is stuck
// Smaller, secondary button compared to HeyHey button

import { useCallback, useState } from 'react';
import { useAudio } from '../../audio/useAudio';
import styles from './DrawButton.module.css';

export interface DrawButtonProps {
  /** Whether the button is enabled */
  enabled: boolean;
  /** Called when the button is pressed */
  onCallDraw: () => void;
  /** Whether a draw is already proposed */
  drawInProgress?: boolean;
  /** Additional CSS class */
  className?: string;
}

export function DrawButton({
  enabled,
  onCallDraw,
  drawInProgress = false,
  className,
}: DrawButtonProps) {
  const { play } = useAudio();
  const [isPressed, setIsPressed] = useState(false);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent background click handler from firing
    if (!enabled || drawInProgress) return;

    // Play sound
    play('cardSelect');

    // Trigger press animation
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 300);

    // Emit event
    onCallDraw();
  }, [enabled, drawInProgress, onCallDraw, play]);

  const classNames = [
    styles.drawButton,
    enabled && !drawInProgress && styles.enabled,
    isPressed && styles.pressed,
    drawInProgress && styles.inProgress,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const getAriaLabel = () => {
    if (drawInProgress) return 'Draw in progress';
    if (!enabled) return 'Cannot call draw now';
    return 'Call for a draw';
  };

  return (
    <button
      type="button"
      className={classNames}
      disabled={!enabled || drawInProgress}
      onClick={handleClick}
      aria-label={getAriaLabel()}
    >
      <span className={styles.text}>
        {drawInProgress ? 'Draw...' : 'Draw'}
      </span>
    </button>
  );
}

export default DrawButton;
