import type { GameConfig } from '@heyhey/shared';
import { Button } from './Button';
import styles from './GameSettings.module.css';

export interface GameSettingsProps {
  config: GameConfig;
  onChange: (config: GameConfig) => void;
  isHost: boolean;
  disabled?: boolean;
}

export function GameSettings({
  config,
  onChange,
  isHost,
  disabled = false,
}: GameSettingsProps) {
  const handleNertzPileSizeChange = (size: 10 | 13) => {
    onChange({ ...config, nertzPileSize: size });
  };

  const handleDrawCountChange = (count: 1 | 3) => {
    onChange({ ...config, drawCount: count });
  };

  const handleTargetScoreChange = (score: number) => {
    onChange({ ...config, targetScore: score });
  };

  const canEdit = isHost && !disabled;

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Game Settings</h3>

      <div className={styles.setting}>
        <label className={styles.label}>Nertz Pile Size</label>
        <p className={styles.description}>
          Number of cards in each player&apos;s Nertz pile
        </p>
        <div className={styles.options}>
          <Button
            variant={config.nertzPileSize === 10 ? 'primary' : 'secondary'}
            size="small"
            onClick={() => handleNertzPileSizeChange(10)}
            disabled={!canEdit}
          >
            10 cards
          </Button>
          <Button
            variant={config.nertzPileSize === 13 ? 'primary' : 'secondary'}
            size="small"
            onClick={() => handleNertzPileSizeChange(13)}
            disabled={!canEdit}
          >
            13 cards
          </Button>
        </div>
      </div>

      <div className={styles.setting}>
        <label className={styles.label}>Draw Count</label>
        <p className={styles.description}>
          Cards drawn from stock pile at a time
        </p>
        <div className={styles.options}>
          <Button
            variant={config.drawCount === 1 ? 'primary' : 'secondary'}
            size="small"
            onClick={() => handleDrawCountChange(1)}
            disabled={!canEdit}
          >
            1 card (easy)
          </Button>
          <Button
            variant={config.drawCount === 3 ? 'primary' : 'secondary'}
            size="small"
            onClick={() => handleDrawCountChange(3)}
            disabled={!canEdit}
          >
            3 cards
          </Button>
        </div>
      </div>

      <div className={styles.setting}>
        <label className={styles.label}>Target Score</label>
        <p className={styles.description}>First player to reach this wins</p>
        <div className={styles.options}>
          {[50, 100, 150, 200].map((score) => (
            <Button
              key={score}
              variant={config.targetScore === score ? 'primary' : 'secondary'}
              size="small"
              onClick={() => handleTargetScoreChange(score)}
              disabled={!canEdit}
            >
              {score}
            </Button>
          ))}
        </div>
      </div>

      {!isHost && (
        <p className={styles.hint}>Only the host can change settings</p>
      )}
    </div>
  );
}
