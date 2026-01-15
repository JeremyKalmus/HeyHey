import type { PlayerColor } from '../Card/CardBack';
import { Avatar, type AvatarString, DEFAULT_AVATAR } from '../ui/Avatar';
import styles from './PlayerList.module.css';

export interface LobbyPlayer {
  id: string;
  name: string;
  color: PlayerColor;
  avatar?: AvatarString;
  isHost: boolean;
  isReady: boolean;
}

export interface PlayerListProps {
  players: LobbyPlayer[];
  currentPlayerId?: string;
  maxPlayers?: number;
  /** Called when the current player clicks on themselves */
  onCurrentPlayerClick?: () => void;
}

export function PlayerList({
  players,
  currentPlayerId,
  maxPlayers = 8,
  onCurrentPlayerClick,
}: PlayerListProps) {
  const emptySlots = Math.max(0, 2 - players.length); // Show at least 2 slots

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>◆ PLAYERS ◆</h3>
        <span className={styles.count}>
          {players.length}/{maxPlayers}
        </span>
      </div>

      <ul className={styles.list}>
        {players.map((player, index) => {
          const isCurrentPlayer = player.id === currentPlayerId;
          const isClickable = isCurrentPlayer && onCurrentPlayerClick;

          return (
            <li
              key={player.id}
              className={`${styles.player} ${isClickable ? styles.clickable : ''}`}
              onClick={isClickable ? onCurrentPlayerClick : undefined}
              role={isClickable ? 'button' : undefined}
              tabIndex={isClickable ? 0 : undefined}
              onKeyDown={isClickable ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onCurrentPlayerClick?.();
                }
              } : undefined}
            >
              <span className={styles.playerNumber}>P{index + 1}</span>
              <Avatar
                avatar={player.avatar || DEFAULT_AVATAR}
                color={player.color}
                size="sm"
              />
              <div className={styles.info}>
                <span className={styles.name}>
                  {player.name.toUpperCase()}
                  {isCurrentPlayer && (
                    <span className={styles.youBadge}>◀ YOU</span>
                  )}
                </span>
                <span className={styles.status}>
                  {player.isHost ? (
                    <span className={styles.hostBadge}>★ HOST</span>
                  ) : player.isReady ? (
                    <span className={styles.readyBadge}>✓ READY</span>
                  ) : (
                    <span className={styles.waitingBadge}>...</span>
                  )}
                </span>
              </div>
              {isClickable && <span className={styles.editHint}>✎</span>}
            </li>
          );
        })}

        {Array.from({ length: emptySlots }).map((_, i) => (
          <li key={`empty-${i}`} className={`${styles.player} ${styles.empty}`}>
            <span className={styles.playerNumber}>P{players.length + i + 1}</span>
            <div className={styles.emptyAvatar}>?</div>
            <span className={styles.emptyText}>WAITING...</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
