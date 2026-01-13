import type { PlayerColor } from '../../Card/CardBack';

/**
 * Avatar shape options using CSS clip-path
 */
export type AvatarShape =
  | 'circle'
  | 'square'
  | 'diamond'
  | 'hexagon'
  | 'star'
  | 'triangle';

/**
 * Available avatar icons (Lucide icon names)
 */
export type AvatarIcon =
  | 'user'
  | 'smile'
  | 'ghost'
  | 'skull'
  | 'cat'
  | 'bot'
  | 'heart'
  | 'star'
  | 'zap'
  | 'flame'
  | 'sparkles'
  | 'crown';

/**
 * Avatar size variants
 */
export type AvatarSize = 'sm' | 'md' | 'lg';

/**
 * Complete avatar configuration
 */
export interface AvatarConfig {
  icon: AvatarIcon;
  shape: AvatarShape;
}

/**
 * Serialized avatar string format: "icon:shape"
 * e.g., "ghost:hexagon", "skull:diamond"
 */
export type AvatarString = `${AvatarIcon}:${AvatarShape}`;

/**
 * Parse avatar string to config
 */
export function parseAvatar(avatar: AvatarString): AvatarConfig {
  const [icon, shape] = avatar.split(':') as [AvatarIcon, AvatarShape];
  return { icon, shape };
}

/**
 * Serialize avatar config to string
 */
export function serializeAvatar(config: AvatarConfig): AvatarString {
  return `${config.icon}:${config.shape}`;
}

/**
 * Default avatar configuration
 */
export const DEFAULT_AVATAR: AvatarString = 'user:circle';

/**
 * All available icons for avatar selection
 */
export const AVATAR_ICONS: AvatarIcon[] = [
  'user',
  'smile',
  'ghost',
  'skull',
  'cat',
  'bot',
  'heart',
  'star',
  'zap',
  'flame',
  'sparkles',
  'crown',
];

/**
 * All available shapes for avatar selection
 */
export const AVATAR_SHAPES: AvatarShape[] = [
  'circle',
  'square',
  'diamond',
  'hexagon',
  'star',
  'triangle',
];

export type { PlayerColor };
