import type { GameConfig } from '@heyhey/shared';
import { Button } from './Button';
import { PlayerList, type LobbyPlayer } from './PlayerList';
import { GameSettings } from './GameSettings';
import { PlayerCustomization, type PlayerCustomizationData } from './PlayerCustomization';
import styles from './RoomLobby.module.css';

export interface RoomLobbyProps {
  roomCode: string;
  players: LobbyPlayer[];
  currentPlayerId: string;
  isHost: boolean;
  gameConfig: GameConfig;
  onConfigChange: (config: GameConfig) => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
  onToggleReady?: () => void;
  isReady?: boolean;
  playerCustomization?: PlayerCustomizationData;
  onPlayerCustomizationChange?: (data: PlayerCustomizationData) => void;
}

export function RoomLobby({
  roomCode,
  players,
  currentPlayerId,
  isHost,
  gameConfig,
  onConfigChange,
  onStartGame,
  onLeaveRoom,
  onToggleReady,
  isReady = false,
  playerCustomization,
  onPlayerCustomizationChange,
}: RoomLobbyProps) {
  const minPlayers = 2;
  const canStart = isHost && players.length >= minPlayers;
  const allReady = players.every((p) => p.isHost || p.isReady);

  // Get colors taken by other players (not the current player)
  const disabledColors = players
    .filter((p) => p.id !== currentPlayerId)
    .map((p) => p.color);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = roomCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>HeyHey!</h1>
          <p className={styles.subtitle}>Waiting for players...</p>
        </div>

        <div className={styles.roomCode}>
          <span className={styles.codeLabel}>Room Code</span>
          <button className={styles.code} onClick={handleCopyCode} title="Click to copy">
            {roomCode}
          </button>
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.leftPanel}>
          {playerCustomization && onPlayerCustomizationChange && (
            <PlayerCustomization
              value={playerCustomization}
              onChange={onPlayerCustomizationChange}
              disabledColors={disabledColors}
            />
          )}
          <PlayerList
            players={players}
            currentPlayerId={currentPlayerId}
            maxPlayers={8}
          />
        </div>

        <div className={styles.rightPanel}>
          <GameSettings
            config={gameConfig}
            onChange={onConfigChange}
            isHost={isHost}
          />
        </div>
      </div>

      <footer className={styles.footer}>
        <Button variant="ghost" onClick={onLeaveRoom}>
          Leave Room
        </Button>

        <div className={styles.footerRight}>
          {!isHost && onToggleReady && (
            <Button
              variant={isReady ? 'secondary' : 'primary'}
              onClick={onToggleReady}
            >
              {isReady ? 'Not Ready' : 'Ready'}
            </Button>
          )}

          {isHost && (
            <Button
              variant="primary"
              onClick={onStartGame}
              disabled={!canStart || !allReady}
            >
              {players.length < minPlayers
                ? `Need ${minPlayers - players.length} more player${minPlayers - players.length > 1 ? 's' : ''}`
                : !allReady
                  ? 'Waiting for players...'
                  : 'Start Game'}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
