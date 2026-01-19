import type { ReactNode } from 'react';
import styles from './LoadingOverlay.module.css';

export type LoadingOverlayVariant = 'fullscreen' | 'contained' | 'inline';

export interface LoadingOverlayProps {
  /** Loading message to display */
  message?: string;
  /** Sub-message or hint */
  hint?: string;
  /** Show spinner */
  showSpinner?: boolean;
  /** Variant: fullscreen, contained, or inline */
  variant?: LoadingOverlayVariant;
  /** Whether the overlay is visible */
  visible?: boolean;
  /** Custom content instead of default spinner/message */
  children?: ReactNode;
  /** Additional CSS class */
  className?: string;
}

/**
 * Loading overlay for transition states.
 *
 * @example
 * ```tsx
 * // Fullscreen loading
 * <LoadingOverlay
 *   visible={isLoading}
 *   message="Joining room..."
 *   variant="fullscreen"
 * />
 *
 * // Contained within parent
 * <LoadingOverlay
 *   visible={isLoading}
 *   message="Loading game..."
 *   variant="contained"
 * />
 * ```
 */
export function LoadingOverlay({
  message,
  hint,
  showSpinner = true,
  variant = 'fullscreen',
  visible = true,
  children,
  className,
}: LoadingOverlayProps) {
  if (!visible) return null;

  const classNames = [
    styles.overlay,
    styles[`variant-${variant}`],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames} role="status" aria-live="polite">
      <div className={styles.content}>
        {children ?? (
          <>
            {showSpinner && (
              <div className={styles.spinnerContainer}>
                <div className={styles.spinner}>
                  <div className={styles.spinnerDot} />
                  <div className={styles.spinnerDot} />
                  <div className={styles.spinnerDot} />
                </div>
              </div>
            )}
            {message && <p className={styles.message}>{message}</p>}
            {hint && <p className={styles.hint}>{hint}</p>}
          </>
        )}
      </div>
    </div>
  );
}

/* =============================================================================
   PRESET LOADING STATES
   ============================================================================= */

export interface PresetLoadingProps {
  /** Whether visible */
  visible?: boolean;
  /** Additional CSS class */
  className?: string;
}

/**
 * Joining room loading state.
 */
export function JoiningRoomOverlay({ visible = true, className }: PresetLoadingProps) {
  return (
    <LoadingOverlay
      visible={visible}
      message="Joining room..."
      hint="Connecting to game server"
      variant="fullscreen"
      className={className}
    />
  );
}

/**
 * Starting game loading state.
 */
export function StartingGameOverlay({ visible = true, className }: PresetLoadingProps) {
  return (
    <LoadingOverlay
      visible={visible}
      message="Starting game..."
      hint="Preparing the deck"
      variant="fullscreen"
      className={className}
    />
  );
}

/**
 * Loading round transition.
 */
export function LoadingRoundOverlay({
  visible = true,
  roundNumber,
  className,
}: PresetLoadingProps & { roundNumber?: number }) {
  return (
    <LoadingOverlay
      visible={visible}
      message={roundNumber ? `Loading Round ${roundNumber}...` : 'Loading round...'}
      hint="Shuffling cards"
      variant="fullscreen"
      className={className}
    />
  );
}

/**
 * Reconnecting overlay.
 */
export function ReconnectingOverlay({ visible = true, className }: PresetLoadingProps) {
  return (
    <LoadingOverlay
      visible={visible}
      message="Reconnecting..."
      hint="Restoring your session"
      variant="fullscreen"
      className={className}
    />
  );
}

/* =============================================================================
   COMPOUND COMPONENT NAMESPACE
   ============================================================================= */

const LoadingOverlayWithPresets = Object.assign(LoadingOverlay, {
  JoiningRoom: JoiningRoomOverlay,
  StartingGame: StartingGameOverlay,
  LoadingRound: LoadingRoundOverlay,
  Reconnecting: ReconnectingOverlay,
});

export default LoadingOverlayWithPresets;
