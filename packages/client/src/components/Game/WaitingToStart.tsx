// WaitingToStart - Displayed while waiting for starter to press Go
// Shows GO button for starter, "Get Ready" for others

import { Button } from '../Lobby/Button';
import styles from './WaitingToStart.module.css';

export interface WaitingToStartProps {
  /** Whether the current player is the starter */
  isStarter: boolean;
  /** Name of the player who can start the round */
  starterName: string;
  /** Current round number */
  roundNumber: number;
  /** Called when starter presses GO */
  onStartRound: () => void;
  /** Additional CSS class */
  className?: string;
}

export function WaitingToStart({
  isStarter,
  starterName,
  roundNumber,
  onStartRound,
  className,
}: WaitingToStartProps) {
  const classNames = [styles.container, className].filter(Boolean).join(' ');

  return (
    <div className={classNames}>
      <div className={styles.roundInfo}>Round {roundNumber}</div>

      {isStarter ? (
        <div className={styles.starterView}>
          <div className={styles.yourTurn}>Your turn to start!</div>
          <Button
            variant="primary"
            size="large"
            onClick={onStartRound}
            className={styles.goButton}
          >
            GO!
          </Button>
        </div>
      ) : (
        <div className={styles.waitingView}>
          <div className={styles.getReady}>Get Ready...</div>
          <div className={styles.waitingFor}>
            Waiting for <span className={styles.starterName}>{starterName}</span> to start
          </div>
        </div>
      )}
    </div>
  );
}

export default WaitingToStart;
