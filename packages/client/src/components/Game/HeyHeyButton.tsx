// HeyHeyButton - Call HeyHey when Nertz pile is empty
// Large, prominent button with satisfying press animation and sound

import { useCallback, useState } from 'react';
import { useAudio } from '../../audio/useAudio';
import styles from './HeyHeyButton.module.css';

export interface HeyHeyButtonProps {
  /** Whether the Nertz pile is empty (enables the button) */
  nertzPileEmpty: boolean;
  /** Called when the button is pressed */
  onCallHeyHey: () => void;
  /** Additional CSS class */
  className?: string;
}

export function HeyHeyButton({
  nertzPileEmpty,
  onCallHeyHey,
  className,
}: HeyHeyButtonProps) {
  const { play } = useAudio();
  const [isPressed, setIsPressed] = useState(false);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent background click handler from firing
    if (!nertzPileEmpty) return;

    // Play triumphant sound
    play('heyHey');

    // Trigger press animation
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 300);

    // Emit event
    onCallHeyHey();
  }, [nertzPileEmpty, onCallHeyHey, play]);

  const classNames = [
    styles.heyHeyButton,
    nertzPileEmpty && styles.enabled,
    isPressed && styles.pressed,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classNames}
      disabled={!nertzPileEmpty}
      onClick={handleClick}
      aria-label={nertzPileEmpty ? 'Call HeyHey!' : 'Empty your Nertz pile first'}
    >
      <span className={styles.text}>HeyHey!</span>
      <span className={styles.glow} aria-hidden="true" />
    </button>
  );
}

export default HeyHeyButton;
