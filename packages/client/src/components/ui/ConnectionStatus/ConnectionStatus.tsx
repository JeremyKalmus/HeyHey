// ConnectionStatus - Displays socket connection state
// Shows banner when disconnected, minimal indicator when connected

import { useSocket } from '../../../context/SocketContext';
import { Icon, WifiIcon, WifiOffIcon, RefreshIcon, LoaderIcon } from '../Icon';
import styles from './ConnectionStatus.module.css';

export interface ConnectionStatusProps {
  /** Show a minimal dot indicator when connected (default: false) */
  showConnectedIndicator?: boolean;
  /** Additional CSS class */
  className?: string;
}

/**
 * ConnectionStatus displays the current socket connection state.
 *
 * When disconnected or error:
 * - Shows a fixed banner at the top of the screen
 * - Includes reconnect button
 *
 * When connected (optional):
 * - Shows a small green indicator dot
 */
export function ConnectionStatus({
  showConnectedIndicator = false,
  className,
}: ConnectionStatusProps) {
  const { isConnected, connectionError, reconnect, socket } = useSocket();

  // Check if currently reconnecting
  const isReconnecting = socket?.io?.engine?.transport?.name === 'polling' && !isConnected;

  // Connected state - optionally show indicator
  if (isConnected) {
    if (!showConnectedIndicator) {
      return null;
    }
    return (
      <div className={`${styles.connectedIndicator} ${className ?? ''}`}>
        <Icon icon={WifiIcon} size="xs" />
      </div>
    );
  }

  // Disconnected or error state - show banner
  return (
    <div className={`${styles.disconnectedBanner} ${className ?? ''}`}>
      <div className={styles.bannerContent}>
        <Icon icon={WifiOffIcon} size="sm" className={styles.wifiIcon} />
        <div className={styles.message}>
          {connectionError ? (
            <>
              <span className={styles.title}>Connection Error</span>
              <span className={styles.detail}>{connectionError}</span>
            </>
          ) : (
            <>
              <span className={styles.title}>Disconnected</span>
              <span className={styles.detail}>Attempting to reconnect...</span>
            </>
          )}
        </div>
        <button
          className={styles.reconnectButton}
          onClick={reconnect}
          disabled={isReconnecting}
          aria-label="Reconnect to server"
        >
          {isReconnecting ? (
            <Icon icon={LoaderIcon} size="sm" className={styles.spinIcon} />
          ) : (
            <Icon icon={RefreshIcon} size="sm" />
          )}
          <span>{isReconnecting ? 'Reconnecting...' : 'Reconnect'}</span>
        </button>
      </div>
    </div>
  );
}

export default ConnectionStatus;
