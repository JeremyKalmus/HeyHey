// RoundEndScreen - Displays round scoring summary
// Shows after HeyHey is called and round ends

import { useEffect, useRef } from 'react';
import type { RoundResult, PlayerRoundScore } from '@heyhey/shared';
import { Button } from '../Lobby/Button';
import { useAudio } from '../../audio';
import styles from './RoundEndScreen.module.css';

export interface RoundEndScreenProps {
  /** The round result with per-player scores */
  roundResult: RoundResult;
  /** Accumulated total scores for all players */
  totalScores: { playerId: string; total: number }[];
  /** Player ID to name mapping */
  playerNames: Map<string, string>;
  /** Whether the game is over (someone reached target score) */
  gameOver: boolean;
  /** The winner's player ID (if game is over) */
  winner?: string;
  /** Current player's ID (to highlight their row) */
  currentPlayerId: string;
  /** Players who are ready for next round */
  playersReady?: string[];
  /** Called when player clicks ready button */
  onReadyClick?: () => void;
  /** Called when game is over and returning to lobby */
  onContinue: () => void;
  /** Whether the current player is the host */
  isHost?: boolean;
  /** Called when host clicks end game button */
  onEndGame?: () => void;
  /** Additional CSS class */
  className?: string;
}

export function RoundEndScreen({
  roundResult,
  totalScores,
  playerNames,
  gameOver,
  winner,
  currentPlayerId,
  playersReady = [],
  onReadyClick,
  onContinue,
  isHost = false,
  onEndGame,
  className,
}: RoundEndScreenProps) {
  const { play } = useAudio();
  const hasPlayedSound = useRef(false);

  // Play round complete sound when screen appears
  useEffect(() => {
    if (!hasPlayedSound.current) {
      play('roundComplete');
      hasPlayedSound.current = true;
    }
  }, [play]);

  const classNames = [styles.container, className].filter(Boolean).join(' ');

  // Get player name helper
  const getPlayerName = (playerId: string): string => {
    return playerNames.get(playerId) ?? playerId;
  };

  // Sort players by round score (highest first) for display
  const sortedScores = [...roundResult.playerScores].sort(
    (a, b) => b.roundScore - a.roundScore
  );

  // Sort total scores (highest first)
  const sortedTotals = [...totalScores].sort((a, b) => b.total - a.total);

  // Find caller name
  const callerName = getPlayerName(roundResult.calledBy);

  return (
    <div className={classNames}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.roundComplete}>
          Round {roundResult.roundNumber} Complete!
        </div>
        <div className={styles.calledBy}>
          {roundResult.isDraw ? (
            <span className={styles.callerName}>Draw Agreed</span>
          ) : (
            <>
              Called by <span className={styles.callerName}>{callerName}</span>
            </>
          )}
        </div>
      </div>

      {/* Round Breakdown Table */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Round Breakdown</h3>
        <table className={styles.scoreTable}>
          <thead>
            <tr>
              <th className={styles.playerColumn}>Player</th>
              <th className={styles.numberColumn}>Foundation</th>
              <th className={styles.numberColumn}>Nertz Penalty</th>
              <th className={styles.numberColumn}>Round Score</th>
            </tr>
          </thead>
          <tbody>
            {sortedScores.map((score) => (
              <ScoreRow
                key={score.playerId}
                score={score}
                playerName={getPlayerName(score.playerId)}
                isCurrentPlayer={score.playerId === currentPlayerId}
                isCaller={!roundResult.isDraw && score.playerId === roundResult.calledBy}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Total Scores */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Total Scores</h3>
        <div className={styles.totalsList}>
          {sortedTotals.map((entry, index) => {
            const isReady = playersReady.includes(entry.playerId);
            return (
              <div
                key={entry.playerId}
                className={`${styles.totalRow} ${
                  entry.playerId === currentPlayerId ? styles.currentPlayer : ''
                } ${entry.playerId === winner ? styles.winner : ''}`}
              >
                <span className={styles.rank}>#{index + 1}</span>
                <span className={styles.playerName}>
                  {getPlayerName(entry.playerId)}
                  {!gameOver && isReady && (
                    <span className={styles.readyBadge}>Ready</span>
                  )}
                </span>
                <span className={styles.totalScore}>{entry.total}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Game Over / Ready for Next Round */}
      {gameOver && winner ? (
        <div className={styles.gameOver}>
          <div className={styles.winnerAnnouncement}>
            {getPlayerName(winner)} Wins!
          </div>
          <Button variant="primary" size="large" onClick={onContinue}>
            Back to Lobby
          </Button>
        </div>
      ) : (
        <div className={styles.continueSection}>
          {onReadyClick ? (
            <>
              <Button
                variant="primary"
                size="large"
                onClick={onReadyClick}
                disabled={playersReady.includes(currentPlayerId)}
              >
                {playersReady.includes(currentPlayerId)
                  ? 'Waiting for others...'
                  : 'Ready for Next Round'}
              </Button>
              <div className={styles.readyCount}>
                {playersReady.length} / {totalScores.length} ready
              </div>
              {isHost && onEndGame && (
                <Button variant="ghost" size="large" onClick={onEndGame}>
                  End Game
                </Button>
              )}
            </>
          ) : (
            <Button variant="primary" size="large" onClick={onContinue}>
              Next Round
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/* =============================================================================
   SCORE ROW COMPONENT
   ============================================================================= */

interface ScoreRowProps {
  score: PlayerRoundScore;
  playerName: string;
  isCurrentPlayer: boolean;
  isCaller: boolean;
}

function ScoreRow({ score, playerName, isCurrentPlayer, isCaller }: ScoreRowProps) {
  const rowClasses = [
    styles.scoreRow,
    isCurrentPlayer ? styles.currentPlayer : '',
    isCaller ? styles.caller : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <tr className={rowClasses}>
      <td className={styles.playerColumn}>
        {playerName}
        {isCaller && <span className={styles.callerBadge}>Called</span>}
      </td>
      <td className={styles.numberColumn}>
        <span className={styles.positive}>+{score.foundationCards}</span>
      </td>
      <td className={styles.numberColumn}>
        {score.nertzPenalty > 0 ? (
          <span className={styles.negative}>-{score.nertzPenalty}</span>
        ) : (
          <span className={styles.zero}>0</span>
        )}
      </td>
      <td className={styles.numberColumn}>
        <span
          className={
            score.roundScore > 0
              ? styles.positive
              : score.roundScore < 0
              ? styles.negative
              : styles.zero
          }
        >
          {score.roundScore > 0 ? '+' : ''}
          {score.roundScore}
        </span>
      </td>
    </tr>
  );
}

export default RoundEndScreen;
