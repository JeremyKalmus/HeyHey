// DrawModal - Displays active draw proposal with countdown and responses
// Shows Accept/Reject buttons for non-proposers, waiting state for proposer

import { useEffect, useState, useRef } from 'react';
import type { DrawProposalState, DrawResponseState } from '../../context/GameStateContext';
import { Button } from '../Lobby/Button';
import { useAudio } from '../../audio';
import styles from './DrawModal.module.css';

export interface DrawModalProps {
  /** The active draw proposal state */
  drawProposal: DrawProposalState;
  /** Current player's ID */
  currentPlayerId: string;
  /** Player ID to name mapping */
  playerNames: Map<string, string>;
  /** Total number of players in the game */
  totalPlayers: number;
  /** Called when player accepts the draw */
  onAccept: () => void;
  /** Called when player rejects the draw */
  onReject: () => void;
  /** Additional CSS class */
  className?: string;
}

export function DrawModal({
  drawProposal,
  currentPlayerId,
  playerNames,
  totalPlayers,
  onAccept,
  onReject,
  className,
}: DrawModalProps) {
  const { play } = useAudio();
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const hasPlayedSound = useRef(false);
  const hasRespondedRef = useRef(false);

  // Calculate time remaining
  useEffect(() => {
    const updateTime = () => {
      const remaining = Math.max(0, drawProposal.timeoutAt - Date.now());
      setTimeRemaining(remaining);
    };

    updateTime();
    const interval = setInterval(updateTime, 100);

    return () => clearInterval(interval);
  }, [drawProposal.timeoutAt]);

  // Play sound when modal appears
  useEffect(() => {
    if (!hasPlayedSound.current) {
      play('cardSelect');
      hasPlayedSound.current = true;
    }
  }, [play]);

  // Reset responded ref when draw proposal changes
  useEffect(() => {
    hasRespondedRef.current = drawProposal.responses.has(currentPlayerId);
  }, [drawProposal, currentPlayerId]);

  const isProposer = drawProposal.proposerId === currentPlayerId;
  const hasResponded = drawProposal.responses.has(currentPlayerId);
  const responses = Array.from(drawProposal.responses.values());

  // Get player name helper
  const getPlayerName = (playerId: string): string => {
    return playerNames.get(playerId) ?? playerId;
  };

  // Handle accept
  const handleAccept = () => {
    if (hasRespondedRef.current) return;
    hasRespondedRef.current = true;
    play('cardPlace');
    onAccept();
  };

  // Handle reject
  const handleReject = () => {
    if (hasRespondedRef.current) return;
    hasRespondedRef.current = true;
    play('error');
    onReject();
  };

  // Format time remaining
  const formatTime = (ms: number): string => {
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
  };

  // Calculate progress percentage for timer
  const TIMEOUT_MS = 30000; // Default timeout
  const progress = Math.max(0, Math.min(100, (timeRemaining / TIMEOUT_MS) * 100));

  const classNames = [styles.container, className].filter(Boolean).join(' ');

  return (
    <div className={classNames}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Draw Proposed</h2>
          <div className={styles.proposer}>
            <span className={styles.proposerName}>{drawProposal.proposerName}</span>
            {' proposed a draw'}
          </div>
        </div>

        {/* Timer */}
        <div className={styles.timerSection}>
          <div className={styles.timerBar}>
            <div
              className={styles.timerProgress}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className={styles.timerText}>{formatTime(timeRemaining)}</div>
        </div>

        {/* Responses */}
        <div className={styles.responsesSection}>
          <h3 className={styles.responsesTitle}>Responses</h3>
          <div className={styles.responsesList}>
            {responses.length === 0 ? (
              <div className={styles.noResponses}>Waiting for responses...</div>
            ) : (
              responses.map((response: DrawResponseState) => (
                <div
                  key={response.playerId}
                  className={`${styles.responseItem} ${
                    response.accepted ? styles.accepted : styles.rejected
                  }`}
                >
                  <span className={styles.responderName}>
                    {getPlayerName(response.playerId)}
                  </span>
                  <span className={styles.responseStatus}>
                    {response.accepted ? 'Accepted' : 'Rejected'}
                  </span>
                </div>
              ))
            )}
          </div>
          <div className={styles.responseCount}>
            {responses.length} / {totalPlayers - 1} responded
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          {isProposer ? (
            <div className={styles.waitingMessage}>
              Waiting for other players to respond...
            </div>
          ) : hasResponded ? (
            <div className={styles.respondedMessage}>
              You have responded to this draw proposal
            </div>
          ) : (
            <div className={styles.buttonGroup}>
              <Button
                variant="secondary"
                size="medium"
                onClick={handleReject}
                aria-label="Reject draw proposal"
              >
                Reject
              </Button>
              <Button
                variant="primary"
                size="medium"
                onClick={handleAccept}
                aria-label="Accept draw proposal"
              >
                Accept
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DrawModal;
