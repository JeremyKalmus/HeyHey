import { useState } from 'react';
import { Modal } from './Modal';
import { Input } from './Input';
import { Button } from './Button';
import styles from './CreateRoomModal.module.css';

export interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (playerName: string) => void;
}

export function CreateRoomModal({
  isOpen,
  onClose,
  onCreateRoom,
}: CreateRoomModalProps) {
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = playerName.trim();
    if (!trimmedName) {
      setError('Please enter your name');
      return;
    }
    if (trimmedName.length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    if (trimmedName.length > 20) {
      setError('Name must be 20 characters or less');
      return;
    }

    setError('');
    onCreateRoom(trimmedName);
  };

  const handleClose = () => {
    setPlayerName('');
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Room" size="small">
      <form onSubmit={handleSubmit} className={styles.form}>
        <Input
          label="Your Name"
          value={playerName}
          onChange={(value) => {
            setPlayerName(value);
            setError('');
          }}
          placeholder="Enter your name"
          maxLength={20}
          error={error}
          autoFocus
        />

        <p className={styles.hint}>
          You&apos;ll be the host and can configure game settings.
        </p>

        <div className={styles.actions}>
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Create Room
          </Button>
        </div>
      </form>
    </Modal>
  );
}
