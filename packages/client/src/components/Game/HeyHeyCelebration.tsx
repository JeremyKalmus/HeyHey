// HeyHeyCelebration - Full-screen celebration overlay when player calls HeyHey
// Shows animated text, confetti, and caller's name

import { useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import styles from './HeyHeyCelebration.module.css';

export interface HeyHeyCelebrationProps {
  /** Name of the player who called HeyHey */
  callerName: string;
  /** Called when the celebration is complete (after auto-dismiss) */
  onComplete: () => void;
  /** Duration of the celebration in milliseconds (default: 4000) */
  duration?: number;
}

export function HeyHeyCelebration({
  callerName,
  onComplete,
  duration = 4000,
}: HeyHeyCelebrationProps) {
  // Fire confetti effect
  const fireConfetti = useCallback(() => {
    // Initial burst from center
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });

    // Side bursts with delay
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
      });
    }, 250);

    // Second wave
    setTimeout(() => {
      confetti({
        particleCount: 75,
        spread: 100,
        origin: { y: 0.5, x: 0.5 },
      });
    }, 500);
  }, []);

  // Fire confetti on mount and set up auto-dismiss
  useEffect(() => {
    fireConfetti();

    const timer = setTimeout(() => {
      onComplete();
    }, duration);

    return () => clearTimeout(timer);
  }, [fireConfetti, onComplete, duration]);

  return (
    <div className={styles.overlay} role="dialog" aria-label="HeyHey celebration">
      <div className={styles.content}>
        <h1 className={styles.title}>HEYHEY!</h1>
        <p className={styles.caller}>Called by {callerName}!</p>
      </div>
    </div>
  );
}

export default HeyHeyCelebration;
