import { forwardRef } from 'react';
import type { LucideProps } from 'lucide-react';

/**
 * Custom Club suit icon with wider, more distinct round lobes.
 *
 * The default Lucide Club icon is hard to distinguish from the Spade icon
 * at small sizes (10-12px) when both are rendered as solid black fills.
 * This custom version has three clearly circular lobes arranged in a
 * wider trefoil pattern, making the club silhouette distinct from the
 * pointed spade shape even at small sizes.
 *
 * Drop-in replacement for Lucide's Club icon (accepts LucideProps).
 */
export const SuitClubIcon = forwardRef<SVGSVGElement, LucideProps>(
  (
    {
      color = 'currentColor',
      size = 24,
      strokeWidth = 2,
      fill,
      className,
      ...props
    },
    ref,
  ) => {
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={fill ?? 'none'}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        {...props}
      >
        {/* Top lobe - clearly circular */}
        <circle cx="12" cy="6" r="4.5" />
        {/* Bottom-left lobe */}
        <circle cx="6.5" cy="13.5" r="4.5" />
        {/* Bottom-right lobe */}
        <circle cx="17.5" cy="13.5" r="4.5" />
        {/* Stem - tapered trapezoid */}
        <path d="M10.5 16 L13.5 16 L13 22 L11 22 Z" />
      </svg>
    );
  },
);

SuitClubIcon.displayName = 'SuitClubIcon';
