import type { PlayerColor } from '../Card/CardBack';
import { Input } from './Input';
import { ColorSelector } from './ColorSelector';
import { AvatarSelector, type Avatar } from './AvatarSelector';
import styles from './PlayerCustomization.module.css';

export interface PlayerCustomizationData {
  name: string;
  color: PlayerColor;
  avatar: Avatar;
}

export interface PlayerCustomizationProps {
  value: PlayerCustomizationData;
  onChange: (data: PlayerCustomizationData) => void;
  disabledColors?: PlayerColor[];
  nameError?: string;
  maxNameLength?: number;
}

export function PlayerCustomization({
  value,
  onChange,
  disabledColors = [],
  nameError,
  maxNameLength = 20,
}: PlayerCustomizationProps) {
  const handleNameChange = (name: string) => {
    onChange({ ...value, name });
  };

  const handleColorChange = (color: PlayerColor) => {
    onChange({ ...value, color });
  };

  const handleAvatarChange = (avatar: Avatar) => {
    onChange({ ...value, avatar });
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Customize Your Player</h3>

      <div className={styles.preview}>
        <div
          className={styles.avatarPreview}
          style={{ borderColor: getColorValue(value.color) }}
        >
          <span className={styles.avatarEmoji}>{value.avatar}</span>
        </div>
        <span className={styles.previewName}>
          {value.name || 'Your Name'}
        </span>
      </div>

      <div className={styles.fields}>
        <Input
          label="Player Name"
          value={value.name}
          onChange={handleNameChange}
          placeholder="Enter your name"
          maxLength={maxNameLength}
          error={nameError}
          autoFocus
        />

        <ColorSelector
          value={value.color}
          onChange={handleColorChange}
          disabledColors={disabledColors}
        />

        <AvatarSelector
          value={value.avatar}
          onChange={handleAvatarChange}
        />
      </div>
    </div>
  );
}

function getColorValue(color: PlayerColor): string {
  const colors: Record<PlayerColor, string> = {
    red: '#dc2626',
    blue: '#2563eb',
    green: '#16a34a',
    yellow: '#ca8a04',
    purple: '#9333ea',
    orange: '#ea580c',
    pink: '#db2777',
    teal: '#0891b2',
  };
  return colors[color];
}
