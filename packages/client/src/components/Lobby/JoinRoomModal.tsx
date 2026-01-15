import { useState } from 'react';
import { isValidRoomCode } from '@heyhey/shared';
import { Modal } from './Modal';
import { Input } from './Input';
import { Button } from './Button';
import styles from './JoinRoomModal.module.css';

export interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinRoom: (playerName: string, roomCode: string) => void;
}

export function JoinRoomModal({
  isOpen,
  onClose,
  onJoinRoom,
}: JoinRoomModalProps) {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [nameError, setNameError] = useState('');
  const [codeError, setCodeError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let hasError = false;
    const trimmedName = playerName.trim();
    const trimmedCode = roomCode.trim().toUpperCase();

    if (!trimmedName) {
      setNameError('Please enter your name');
      hasError = true;
    } else if (trimmedName.length < 2) {
      setNameError('Name must be at least 2 characters');
      hasError = true;
    } else if (trimmedName.length > 20) {
      setNameError('Name must be 20 characters or less');
      hasError = true;
    }

    if (!trimmedCode) {
      setCodeError('Please enter a room code');
      hasError = true;
    } else if (!isValidRoomCode(trimmedCode)) {
      setCodeError('Invalid room code format');
      hasError = true;
    }

    if (hasError) return;

    setNameError('');
    setCodeError('');
    onJoinRoom(trimmedName, trimmedCode);
  };

  const handleClose = () => {
    setPlayerName('');
    setRoomCode('');
    setNameError('');
    setCodeError('');
    onClose();
  };

  const handleCodeChange = (value: string) => {
    // Uppercase and remove non-alphanumeric characters
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setRoomCode(cleaned);
    setCodeError('');
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Join Room" size="small">
      <form onSubmit={handleSubmit} className={styles.form}>
        <Input
          label="Your Name"
          value={playerName}
          onChange={(value) => {
            setPlayerName(value);
            setNameError('');
          }}
          placeholder="Enter your name"
          maxLength={20}
          error={nameError}
          autoFocus
        />

        <Input
          label="Room Code"
          value={roomCode}
          onChange={handleCodeChange}
          placeholder="ABC123"
          maxLength={6}
          error={codeError}
        />

        <p className={styles.hint}>
          Ask the host for the 6-character room code.
        </p>

        <div className={styles.actions}>
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Join Room
          </Button>
        </div>
      </form>
    </Modal>
  );
}
