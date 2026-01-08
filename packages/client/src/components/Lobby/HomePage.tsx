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
        <h1 className={styles.title}>HeyHey!</h1>
        <p className={styles.subtitle}>Online multiplayer Nertz</p>

        <div className={styles.actions}>
          <Button
            variant="primary"
            size="large"
            onClick={() => setShowCreateModal(true)}
          >
            Create Room
          </Button>
          <Button
            variant="secondary"
            size="large"
            onClick={() => setShowJoinModal(true)}
          >
            Join Room
          </Button>
        </div>

        <div className={styles.footer}>
          <p>2-8 players • Real-time gameplay • No turns!</p>
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
