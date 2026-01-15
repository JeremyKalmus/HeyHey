import { useState } from 'react';
import type { GameConfig } from '@heyhey/shared';
import { Button } from './Button';
import { PlayerList, type LobbyPlayer } from './PlayerList';
import { GameSettings } from './GameSettings';
import { PlayerCustomizationModal } from './PlayerCustomizationModal';
import type { PlayerCustomizationData } from './PlayerCustomization';
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
  playerCustomization,
  onPlayerCustomizationChange,
}: RoomLobbyProps) {
  const [isCustomizationOpen, setIsCustomizationOpen] = useState(false);

  const minPlayers = 2;
  const canStart = isHost && players.length >= minPlayers;

  // Get colors taken by other players (not the current player)
  const disabledColors = players
    .filter((p) => p.id !== currentPlayerId)
    .map((p) => p.color);

  const handlePlayerClick = () => {
    if (playerCustomization && onPlayerCustomizationChange) {
      setIsCustomizationOpen(true);
    }
  };

  const handleCustomizationSave = () => {
    // Changes are saved immediately via onChange, so just close the modal
    setIsCustomizationOpen(false);
  };

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
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>HEYHEY!</h1>
          <p className={styles.subtitle}>
            {players.length >= minPlayers ? 'READY TO PLAY!' : 'WAITING FOR PLAYERS...'}
          </p>
        </div>

        <div className={styles.roomCode}>
          <span className={styles.codeLabel}>◀ ROOM CODE ▶</span>
          <button className={styles.code} onClick={handleCopyCode} title="Click to copy">
            {roomCode}
          </button>
          <span className={styles.copyHint}>CLICK TO COPY</span>
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.leftPanel}>
          <PlayerList
            players={players}
            currentPlayerId={currentPlayerId}
            maxPlayers={8}
            onCurrentPlayerClick={playerCustomization ? handlePlayerClick : undefined}
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

      {/* Player Customization Modal */}
      {playerCustomization && onPlayerCustomizationChange && (
        <PlayerCustomizationModal
          isOpen={isCustomizationOpen}
          onClose={() => setIsCustomizationOpen(false)}
          value={playerCustomization}
          onChange={onPlayerCustomizationChange}
          onSave={handleCustomizationSave}
          disabledColors={disabledColors}
        />
      )}

      <footer className={styles.footer}>
        <Button variant="ghost" onClick={onLeaveRoom}>
          ✕ EXIT
        </Button>

        <div className={styles.footerRight}>
          {isHost && (
            <Button
              variant="primary"
              onClick={onStartGame}
              disabled={!canStart}
              className={canStart ? styles.startButton : undefined}
            >
              {players.length < minPlayers
                ? `NEED ${minPlayers - players.length} MORE`
                : '▶ PLAY'}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
