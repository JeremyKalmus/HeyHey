import { useState } from 'react';
import { Button } from './Button';
import { CreateRoomModal } from './CreateRoomModal';
import { JoinRoomModal } from './JoinRoomModal';
import styles from './HomePage.module.css';

export interface HomePageProps {
  onCreateRoom?: (playerName: string) => void;
  onJoinRoom?: (playerName: string, roomCode: string) => void;
}

export function HomePage({ onCreateRoom, onJoinRoom }: HomePageProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  const handleCreateRoom = (playerName: string) => {
    setShowCreateModal(false);
    onCreateRoom?.(playerName);
  };

  const handleJoinRoom = (playerName: string, roomCode: string) => {
    setShowJoinModal(false);
    onJoinRoom?.(playerName, roomCode);
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.logo}>
          <h1 className={styles.title}>HEYHEY!</h1>
          <div className={styles.titleAccent} />
        </div>
        <p className={styles.subtitle}>ONLINE MULTIPLAYER NERTZ</p>

        <div className={styles.actions}>
          <Button
            variant="primary"
            size="large"
            onClick={() => setShowCreateModal(true)}
            className={styles.createButton}
          >
            ▶ PRESS START
          </Button>
          <Button
            variant="secondary"
            size="large"
            onClick={() => setShowJoinModal(true)}
          >
            JOIN GAME
          </Button>
        </div>

        <div className={styles.footer}>
          <div className={styles.stats}>
            <span className={styles.stat}>2-8 PLAYERS</span>
            <span className={styles.divider}>◆</span>
            <span className={styles.stat}>REAL-TIME</span>
            <span className={styles.divider}>◆</span>
            <span className={styles.stat}>NO TURNS</span>
          </div>
          <p className={styles.insertCoin}>INSERT COIN TO CONTINUE</p>
        </div>
      </div>

      <CreateRoomModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateRoom={handleCreateRoom}
      />

      <JoinRoomModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onJoinRoom={handleJoinRoom}
      />
    </div>
  );
}
