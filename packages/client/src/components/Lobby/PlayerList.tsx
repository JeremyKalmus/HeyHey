import type { PlayerColor } from '../Card/CardBack';
import type { Avatar } from './AvatarSelector';
import styles from './PlayerList.module.css';

export interface LobbyPlayer {
  id: string;
  name: string;
  color: PlayerColor;
  avatar?: Avatar;
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
            <div
              className={`${styles.avatar} ${player.avatar ? styles.avatarEmoji : ''}`}
              style={{ backgroundColor: getColorValue(player.color) }}
            >
              {player.avatar || player.name.charAt(0).toUpperCase()}
            </div>
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

function getColorValue(color: PlayerColor): string {
  const colors: Record<PlayerColor, string> = {
    red: '#dc2626',
    blue: '#2563eb',
    green: '#16a34a',
    yellow: '#ca8a04',
    purple: '#9333ea',
    orange: '#ea580c',
    pink: '#db2777',
    teal: '#0891b2',
  };
  return colors[color];
}
