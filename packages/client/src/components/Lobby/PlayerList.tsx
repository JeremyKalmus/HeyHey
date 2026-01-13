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
}

export function PlayerList({
  players,
  currentPlayerId,
  maxPlayers = 8,
}: PlayerListProps) {
  const emptySlots = Math.max(0, 2 - players.length); // Show at least 2 slots

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Players</h3>
        <span className={styles.count}>
          {players.length}/{maxPlayers}
        </span>
      </div>

      <ul className={styles.list}>
        {players.map((player) => (
          <li key={player.id} className={styles.player}>
            <Avatar
              avatar={player.avatar || DEFAULT_AVATAR}
              color={player.color}
              size="sm"
            />
            <div className={styles.info}>
              <span className={styles.name}>
                {player.name}
                {player.id === currentPlayerId && (
                  <span className={styles.youBadge}>(You)</span>
                )}
              </span>
              <span className={styles.status}>
                {player.isHost ? (
                  <span className={styles.hostBadge}>Host</span>
                ) : player.isReady ? (
                  <span className={styles.readyBadge}>Ready</span>
                ) : (
                  <span className={styles.waitingBadge}>Waiting</span>
                )}
              </span>
            </div>
          </li>
        ))}

        {Array.from({ length: emptySlots }).map((_, i) => (
          <li key={`empty-${i}`} className={`${styles.player} ${styles.empty}`}>
            <div className={styles.emptyAvatar}>?</div>
            <span className={styles.emptyText}>Waiting for player...</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
