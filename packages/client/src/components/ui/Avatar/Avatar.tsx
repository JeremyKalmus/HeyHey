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
  AvatarSize,
  AvatarString,
  PlayerColor,
} from './types';
import { parseAvatar, DEFAULT_AVATAR } from './types';
import styles from './Avatar.module.css';

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

const SIZE_MAP: Record<AvatarSize, { container: number; icon: number }> = {
  sm: { container: 32, icon: 16 },
  md: { container: 48, icon: 24 },
  lg: { container: 64, icon: 32 },
};

export interface AvatarProps {
  /** Avatar configuration string (e.g., "ghost:hexagon") */
  avatar?: AvatarString;
  /** Player color for background */
  color?: PlayerColor;
  /** Size variant */
  size?: AvatarSize;
  /** Additional CSS class */
  className?: string;
}

/**
 * Avatar component displaying an icon within a shaped container.
 *
 * Uses neubrutalist styling with bold borders and player colors.
 *
 * @example
 * ```tsx
 * <Avatar avatar="ghost:hexagon" color="purple" size="lg" />
 * <Avatar avatar="skull:diamond" color="red" />
 * ```
 */
export function Avatar({
  avatar = DEFAULT_AVATAR,
  color = 'blue',
  size = 'md',
  className,
}: AvatarProps) {
  const { icon } = parseAvatar(avatar);
  const IconComponent = ICON_MAP[icon];
  const sizeConfig = SIZE_MAP[size];

  // Always use circle shape
  const classNames = [
    styles.avatar,
    styles['shape-circle'],
    styles[`color-${color}`],
    styles[`size-${size}`],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classNames}
      style={{
        width: sizeConfig.container,
        height: sizeConfig.container,
      }}
      role="img"
      aria-label={`${icon} avatar`}
    >
      <IconComponent
        size={sizeConfig.icon}
        strokeWidth={3}
        className={styles.icon}
      />
    </div>
  );
}

export default Avatar;
