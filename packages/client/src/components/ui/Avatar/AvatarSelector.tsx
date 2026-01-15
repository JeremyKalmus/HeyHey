import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';
import {
  UserIcon,
  SmileIcon,
  GhostIcon,
  SkullIcon,
  CatIcon,
  BotIcon,
  HeartIcon,
  StarIcon,
  ZapIcon,
  FlameIcon,
  SparklesIcon,
  CrownIcon,
} from '../Icon';
import type {
  AvatarIcon,
  AvatarString,
} from './types';
import {
  AVATAR_ICONS,
  parseAvatar,
  serializeAvatar,
  DEFAULT_AVATAR,
} from './types';
import styles from './AvatarSelector.module.css';

const ICON_MAP: Record<AvatarIcon, ComponentType<LucideProps>> = {
  user: UserIcon,
  smile: SmileIcon,
  ghost: GhostIcon,
  skull: SkullIcon,
  cat: CatIcon,
  bot: BotIcon,
  heart: HeartIcon,
  star: StarIcon,
  zap: ZapIcon,
  flame: FlameIcon,
  sparkles: SparklesIcon,
  crown: CrownIcon,
};

const ICON_LABELS: Record<AvatarIcon, string> = {
  user: 'Person',
  smile: 'Smile',
  ghost: 'Ghost',
  skull: 'Skull',
  cat: 'Cat',
  bot: 'Robot',
  heart: 'Heart',
  star: 'Star',
  zap: 'Lightning',
  flame: 'Flame',
  sparkles: 'Sparkles',
  crown: 'Crown',
};


export interface AvatarSelectorProps {
  /** Current avatar value */
  value: AvatarString;
  /** Called when avatar selection changes */
  onChange: (avatar: AvatarString) => void;
  /** Section label */
  label?: string;
}

/**
 * Avatar selector with icon and shape options.
 *
 * Allows users to choose an icon and shape combination
 * for their avatar with live preview.
 *
 * @example
 * ```tsx
 * <AvatarSelector
 *   value="ghost:hexagon"
 *   onChange={setAvatar}
 *   color="purple"
 * />
 * ```
 */
export function AvatarSelector({
  value = DEFAULT_AVATAR,
  onChange,
  label = 'Avatar',
}: AvatarSelectorProps) {
  const { icon: selectedIcon, shape: selectedShape } = parseAvatar(value);

  const handleIconChange = (icon: AvatarIcon) => {
    onChange(serializeAvatar({ icon, shape: selectedShape }));
  };

  return (
    <div className={styles.container}>
      {label && <span className={styles.label}>{label}</span>}

      {/* Icon Selection - compact grid */}
      <div className={styles.iconGrid}>
        {AVATAR_ICONS.map((icon) => {
          const IconComponent = ICON_MAP[icon];
          const isSelected = icon === selectedIcon;

          return (
            <button
              key={icon}
              type="button"
              className={`${styles.iconButton} ${isSelected ? styles.selected : ''}`}
              onClick={() => handleIconChange(icon)}
              aria-label={`Select ${ICON_LABELS[icon]} icon`}
              aria-pressed={isSelected}
              title={ICON_LABELS[icon]}
            >
              <IconComponent size={18} strokeWidth={2.5} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default AvatarSelector;
