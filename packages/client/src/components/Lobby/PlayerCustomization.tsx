import { useRef, useEffect } from 'react';
import type { PlayerColor } from '../Card/CardBack';
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
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus the name input when component mounts
    nameInputRef.current?.focus();
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...value, name: e.target.value });
  };

  const handleColorChange = (color: PlayerColor) => {
    onChange({ ...value, color });
  };

  const handleAvatarChange = (avatar: AvatarString) => {
    onChange({ ...value, avatar });
  };

  return (
    <div className={styles.container}>
      {/* Compact preview with editable name */}
      <div className={styles.preview}>
        <div className={styles.previewAvatar}>
          <Avatar
            avatar={value.avatar || DEFAULT_AVATAR}
            color={value.color}
            size="lg"
          />
        </div>
        <input
          ref={nameInputRef}
          type="text"
          className={`${styles.nameInput} ${nameError ? styles.nameInputError : ''}`}
          value={value.name}
          onChange={handleNameChange}
          placeholder="ENTER NAME"
          maxLength={maxNameLength}
        />
      </div>
      {nameError && <span className={styles.errorText}>{nameError}</span>}

      <div className={styles.fields}>
        <ColorSelector
          value={value.color}
          onChange={handleColorChange}
          disabledColors={disabledColors}
          label="Select Color"
        />

        <AvatarSelector
          value={value.avatar || DEFAULT_AVATAR}
          onChange={handleAvatarChange}
          label="Select Avatar"
        />
      </div>
    </div>
  );
}
