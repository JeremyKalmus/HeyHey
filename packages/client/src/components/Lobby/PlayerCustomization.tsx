import type { PlayerColor } from '../Card/CardBack';
import { Input } from './Input';
import { ColorSelector } from './ColorSelector';
import { Avatar, AvatarSelector, type AvatarString, DEFAULT_AVATAR } from '../ui/Avatar';
import styles from './PlayerCustomization.module.css';

export interface PlayerCustomizationData {
  name: string;
  color: PlayerColor;
  avatar: AvatarString;
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

  const handleAvatarChange = (avatar: AvatarString) => {
    onChange({ ...value, avatar });
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>◆ CUSTOMIZE ◆</h3>

      <div className={styles.preview}>
        <div className={styles.previewAvatar}>
          <Avatar
            avatar={value.avatar || DEFAULT_AVATAR}
            color={value.color}
            size="lg"
          />
        </div>
        <div className={styles.previewInfo}>
          <span className={styles.previewLabel}>PLAYER NAME</span>
          <span className={styles.previewName}>
            {value.name?.toUpperCase() || 'ENTER NAME'}
          </span>
        </div>
      </div>

      <div className={styles.fields}>
        <Input
          label="Player Name"
          value={value.name}
          onChange={handleNameChange}
          placeholder="ENTER YOUR NAME"
          maxLength={maxNameLength}
          error={nameError}
          autoFocus
        />

        <div className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>SELECT COLOR</span>
          <ColorSelector
            value={value.color}
            onChange={handleColorChange}
            disabledColors={disabledColors}
          />
        </div>

        <div className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>SELECT AVATAR</span>
          <AvatarSelector
            value={value.avatar || DEFAULT_AVATAR}
            onChange={handleAvatarChange}
            color={value.color}
          />
        </div>
      </div>
    </div>
  );
}
