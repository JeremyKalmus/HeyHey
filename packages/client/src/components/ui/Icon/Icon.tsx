import type { LucideProps } from 'lucide-react';
import type { ComponentType } from 'react';

/**
 * Neubrutalist icon sizes
 * - sm: 16px - inline text, badges
 * - md: 20px - buttons, form elements
 * - lg: 24px - default, standalone icons
 * - xl: 32px - large emphasis
 */
export type IconSize = 'sm' | 'md' | 'lg' | 'xl';

const sizeMap: Record<IconSize, number> = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

export interface IconProps extends Omit<LucideProps, 'size'> {
  /** Lucide icon component to render */
  icon: ComponentType<LucideProps>;
  /** Predefined size or custom number in pixels */
  size?: IconSize | number;
  /** Override default stroke width (default: 3 for neubrutalist style) */
  strokeWidth?: number;
}

/**
 * Icon wrapper component with neubrutalist defaults.
 *
 * Features:
 * - Default strokeWidth of 3 for bold, heavy lines
 * - Predefined size variants (sm, md, lg, xl)
 * - Inherits currentColor by default
 *
 * @example
 * ```tsx
 * import { Icon, CheckIcon, XIcon } from '@/components/ui/Icon';
 *
 * // Using wrapper
 * <Icon icon={CheckIcon} size="lg" />
 *
 * // With custom props
 * <Icon icon={XIcon} size={28} strokeWidth={4} color="red" />
 * ```
 */
export function Icon({
  icon: IconComponent,
  size = 'lg',
  strokeWidth = 3,
  ...props
}: IconProps) {
  const pixelSize = typeof size === 'number' ? size : sizeMap[size];

  return (
    <IconComponent
      size={pixelSize}
      strokeWidth={strokeWidth}
      {...props}
    />
  );
}

export default Icon;
