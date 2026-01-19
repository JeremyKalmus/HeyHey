import type { CSSProperties, HTMLAttributes } from 'react';
import styles from './Skeleton.module.css';

export type SkeletonVariant = 'text' | 'rectangular' | 'circular' | 'rounded';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Skeleton variant/shape */
  variant?: SkeletonVariant;
  /** Width (CSS value) */
  width?: string | number;
  /** Height (CSS value) */
  height?: string | number;
  /** Enable animation (default: true) */
  animation?: boolean;
  /** Additional CSS class */
  className?: string;
}

/**
 * Skeleton component for loading placeholders with shimmer animation.
 *
 * @example
 * ```tsx
 * // Text placeholder
 * <Skeleton variant="text" width="80%" />
 *
 * // Card placeholder
 * <Skeleton variant="rounded" width={200} height={120} />
 *
 * // Avatar placeholder
 * <Skeleton variant="circular" width={40} height={40} />
 * ```
 */
export function Skeleton({
  variant = 'text',
  width,
  height,
  animation = true,
  className,
  style,
  ...props
}: SkeletonProps) {
  const classNames = [
    styles.skeleton,
    styles[`variant-${variant}`],
    animation && styles.animated,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const computedStyle: CSSProperties = {
    ...style,
    ...(width !== undefined && { width: typeof width === 'number' ? `${width}px` : width }),
    ...(height !== undefined && { height: typeof height === 'number' ? `${height}px` : height }),
  };

  return <div className={classNames} style={computedStyle} {...props} />;
}

/* =============================================================================
   SKELETON.TEXT - Text line placeholder
   ============================================================================= */

export interface SkeletonTextProps {
  /** Number of lines */
  lines?: number;
  /** Width of last line (percentage or CSS value) */
  lastLineWidth?: string;
  /** Additional CSS class */
  className?: string;
}

/**
 * Multiple text line skeleton.
 *
 * @example
 * ```tsx
 * <Skeleton.Text lines={3} lastLineWidth="60%" />
 * ```
 */
export function SkeletonText({ lines = 1, lastLineWidth = '80%', className }: SkeletonTextProps) {
  const containerClass = [styles.textContainer, className].filter(Boolean).join(' ');

  return (
    <div className={containerClass}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          width={i === lines - 1 && lines > 1 ? lastLineWidth : '100%'}
        />
      ))}
    </div>
  );
}

/* =============================================================================
   SKELETON.CARD - Card placeholder
   ============================================================================= */

export interface SkeletonCardProps {
  /** Show image area */
  showImage?: boolean;
  /** Image height */
  imageHeight?: number;
  /** Number of text lines */
  textLines?: number;
  /** Additional CSS class */
  className?: string;
}

/**
 * Card skeleton with optional image and text placeholders.
 *
 * @example
 * ```tsx
 * <Skeleton.Card showImage imageHeight={120} textLines={2} />
 * ```
 */
export function SkeletonCard({
  showImage = true,
  imageHeight = 100,
  textLines = 2,
  className,
}: SkeletonCardProps) {
  const containerClass = [styles.card, className].filter(Boolean).join(' ');

  return (
    <div className={containerClass}>
      {showImage && <Skeleton variant="rectangular" width="100%" height={imageHeight} />}
      <div className={styles.cardContent}>
        <SkeletonText lines={textLines} />
      </div>
    </div>
  );
}

/* =============================================================================
   SKELETON.GAMEBOARD - Game board skeleton
   ============================================================================= */

export interface SkeletonGameBoardProps {
  /** Additional CSS class */
  className?: string;
}

/**
 * Game board skeleton for loading state.
 *
 * @example
 * ```tsx
 * <Skeleton.GameBoard />
 * ```
 */
export function SkeletonGameBoard({ className }: SkeletonGameBoardProps) {
  const containerClass = [styles.gameBoard, className].filter(Boolean).join(' ');

  return (
    <div className={containerClass}>
      {/* Foundation area placeholder */}
      <div className={styles.foundationArea}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" width={60} height={84} />
        ))}
      </div>

      {/* Work piles placeholder */}
      <div className={styles.workPilesArea}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" width={60} height={120} />
        ))}
      </div>

      {/* Bottom area: nertz, stock, waste */}
      <div className={styles.bottomArea}>
        <Skeleton variant="rounded" width={60} height={84} />
        <Skeleton variant="rounded" width={60} height={84} />
        <Skeleton variant="rounded" width={60} height={84} />
      </div>
    </div>
  );
}

/* =============================================================================
   SKELETON.LOBBY - Lobby skeleton
   ============================================================================= */

export interface SkeletonLobbyProps {
  /** Additional CSS class */
  className?: string;
}

/**
 * Lobby skeleton for loading state.
 *
 * @example
 * ```tsx
 * <Skeleton.Lobby />
 * ```
 */
export function SkeletonLobby({ className }: SkeletonLobbyProps) {
  const containerClass = [styles.lobby, className].filter(Boolean).join(' ');

  return (
    <div className={containerClass}>
      {/* Room code area */}
      <Skeleton variant="rounded" width={200} height={60} />

      {/* Player list */}
      <div className={styles.playerList}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={styles.playerItem}>
            <Skeleton variant="circular" width={40} height={40} />
            <Skeleton variant="text" width={120} />
          </div>
        ))}
      </div>

      {/* Settings area */}
      <Skeleton variant="rounded" width="100%" height={100} />
    </div>
  );
}

/* =============================================================================
   COMPOUND COMPONENT NAMESPACE
   ============================================================================= */

/**
 * Skeleton compound component for loading placeholders.
 *
 * @example
 * ```tsx
 * <Skeleton variant="rounded" width={200} height={100} />
 * <Skeleton.Text lines={3} />
 * <Skeleton.Card showImage textLines={2} />
 * <Skeleton.GameBoard />
 * ```
 */
const SkeletonWithCompound = Object.assign(Skeleton, {
  Text: SkeletonText,
  Card: SkeletonCard,
  GameBoard: SkeletonGameBoard,
  Lobby: SkeletonLobby,
});

export default SkeletonWithCompound;
