import styles from './AvatarSelector.module.css';

export type Avatar = string; // emoji string

export interface AvatarSelectorProps {
  value: Avatar;
  onChange: (avatar: Avatar) => void;
  label?: string;
}

const AVATARS: Avatar[] = [
  '😀', '😎', '🤠', '🥳',
  '😺', '🐶', '🦊', '🐸',
  '🤖', '👽', '👻', '🎃',
  '🦄', '🐉', '🦋', '🌟',
];

export function AvatarSelector({
  value,
  onChange,
  label = 'Avatar',
}: AvatarSelectorProps) {
  return (
    <div className={styles.container}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={styles.grid}>
        {AVATARS.map((avatar) => {
          const isSelected = value === avatar;

          return (
            <button
              key={avatar}
              type="button"
              className={`${styles.avatar} ${isSelected ? styles.selected : ''}`}
              onClick={() => onChange(avatar)}
              aria-label={`Select ${avatar} avatar`}
              aria-pressed={isSelected}
            >
              <span className={styles.emoji}>{avatar}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
