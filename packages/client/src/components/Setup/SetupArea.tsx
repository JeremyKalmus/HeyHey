// SetupArea - Game Setup UI Component
// Displays the setup phase board: instructions, progress, deck, nertz pile, and work piles

import type { Card as CardType, SetupState, SetupProgress } from '@heyhey/shared';
import { Card, CardStack } from '../Card';
import type { PlayerColor } from '../Card/CardBack';
import styles from './SetupArea.module.css';

export interface SetupReadyState {
  playersReady: number;
  totalPlayers: number;
  isAllReady: boolean;
}

export interface SetupAreaProps {
  /** Current setup state from SetupStateMachine */
  state: SetupState;
  /** Progress tracking */
  progress: SetupProgress;
  /** Cards remaining in deck (source) */
  deckCards: CardType[];
  /** Cards placed in Nertz pile */
  nertzPileCards: CardType[];
  /** Cards placed in work piles (4 arrays) */
  workPileCards: [CardType[], CardType[], CardType[], CardType[]];
  /** Player's card back color */
  backColor?: PlayerColor;
  /** Target nertz pile size (10 or 13) */
  nertzPileSize?: 10 | 13;
  /** Called when deck is clicked (to draw a card) */
  onDeckClick?: () => void;
  /** Called when nertz pile is clicked */
  onNertzPileClick?: () => void;
  /** Called when a work pile slot is clicked */
  onWorkPileClick?: (pileIndex: number) => void;
  /** Multiplayer ready state */
  readyState?: SetupReadyState;
}

const SETUP_INSTRUCTIONS: Record<SetupState, { title: string; description: string }> = {
  idle: {
    title: 'Ready to Set Up',
    description: 'Click the deck to begin dealing your cards.',
  },
  placingNertz: {
    title: 'Deal Nertz Pile',
    description: 'Click the deck to deal cards face-down to your Nertz pile.',
  },
  flipNertz: {
    title: 'Flip Top Card',
    description: 'Click the Nertz pile to flip the top card face-up.',
  },
  placingWork: {
    title: 'Deal Work Piles',
    description: 'Click each work pile to drop a card on it.',
  },
  complete: {
    title: 'Setup Complete',
    description: 'You are ready to play! Waiting for other players...',
  },
};

export function SetupArea({
  state,
  progress,
  deckCards,
  nertzPileCards,
  workPileCards,
  backColor = 'blue',
  nertzPileSize = 13,
  onDeckClick,
  onNertzPileClick,
  onWorkPileClick,
  readyState,
}: SetupAreaProps) {
  const isDeckClickable = state === 'idle' || state === 'placingNertz' || state === 'placingWork';
  const isNertzPileClickable = state === 'flipNertz';
  const isWorkPileClickable = state === 'placingWork';
  const isComplete = state === 'complete';

  // Generate instruction text based on state and multiplayer progress
  const getInstructions = () => {
    if (state !== 'complete') {
      return SETUP_INSTRUCTIONS[state] ?? SETUP_INSTRUCTIONS.idle;
    }

    // Complete state - show multiplayer progress
    if (readyState && readyState.totalPlayers > 0) {
      if (readyState.isAllReady) {
        return {
          title: 'All Players Ready!',
          description: 'Starting game...',
        };
      }
      return {
        title: 'Setup Complete',
        description: `Waiting for players... (${readyState.playersReady}/${readyState.totalPlayers} ready)`,
      };
    }

    return SETUP_INSTRUCTIONS.complete;
  };

  const instructions = getInstructions();

  const handleDeckClick = () => {
    if (isDeckClickable && onDeckClick) {
      onDeckClick();
    }
  };

  const handleNertzPileClick = () => {
    if (isNertzPileClickable && onNertzPileClick) {
      onNertzPileClick();
    }
  };

  const handleWorkPileClick = (index: number) => {
    if (isWorkPileClickable && onWorkPileClick) {
      onWorkPileClick(index);
    }
  };

  return (
    <div className={styles.setupArea}>
      {/* Instructions Overlay */}
      <div className={`${styles.instructions} ${isComplete ? styles.complete : ''}`}>
        <h2 className={styles.instructionTitle}>{instructions.title}</h2>
        <p className={styles.instructionText}>{instructions.description}</p>
      </div>

      {/* Progress Indicator */}
      <div className={styles.progressContainer}>
        <ProgressBar
          label="Nertz Pile"
          current={progress.nertzCardsPlaced}
          total={nertzPileSize}
          active={state === 'placingNertz'}
          complete={progress.nertzCardsPlaced >= nertzPileSize}
        />
        <div className={styles.progressDivider} />
        <ProgressBar
          label="Work Piles"
          current={progress.workPilesPlaced}
          total={4}
          active={state === 'placingWork'}
          complete={progress.workPilesPlaced >= 4}
        />
      </div>

      {/* Game Board Layout */}
      <div className={styles.boardLayout}>
        {/* Stock Area (Deck + Waste) - Left side */}
        <div className={styles.stockArea}>
          {/* Deck (Stock) */}
          <div className={styles.deckSection}>
            <span className={styles.sectionLabel}>Stock</span>
            <div
              className={`${styles.deckArea} ${isDeckClickable ? styles.clickable : ''}`}
              onClick={handleDeckClick}
              role="button"
              tabIndex={isDeckClickable ? 0 : -1}
              aria-label={`Deck - ${deckCards.length} cards remaining`}
            >
              {deckCards.length > 0 ? (
                <CardStack
                  cards={deckCards.slice(-3)}
                  direction="vertical"
                  offset={2}
                  faceUp={false}
                  backColor={backColor}
                  maxVisible={3}
                />
              ) : (
                <div className={styles.emptySlot}>
                  <span className={styles.emptyLabel}>Empty</span>
                </div>
              )}
              <span className={styles.cardCount}>{deckCards.length}</span>
            </div>
          </div>

          {/* Waste Pile placeholder */}
          <div className={styles.wasteSection}>
            <span className={styles.sectionLabel}>Waste</span>
            <div className={styles.wastePile}>
              <div className={styles.emptySlot}>
                <span className={styles.emptyLabel}>—</span>
              </div>
            </div>
          </div>
        </div>

        {/* Play Area (Nertz + Work Piles) - Right side, closer together */}
        <div className={styles.playArea}>
          {/* Nertz Pile */}
          <div className={styles.nertzSection}>
            <span className={styles.sectionLabel}>Nertz Pile</span>
            <div
              className={`${styles.nertzPile} ${isNertzPileClickable ? styles.clickable : ''} ${
                isNertzPileClickable ? styles.highlight : ''
              }`}
              onClick={handleNertzPileClick}
              role="button"
              tabIndex={isNertzPileClickable ? 0 : -1}
              aria-label={`Nertz pile - ${nertzPileCards.length} cards`}
            >
              {nertzPileCards.length > 0 ? (
                <div className={styles.nertzStack}>
                  {/* Show stacked face-down cards */}
                  {nertzPileCards.length > 1 && (
                    <CardStack
                      cards={nertzPileCards.slice(0, -1)}
                      direction="vertical"
                      offset={2}
                      faceUp={false}
                      backColor={backColor}
                      maxVisible={Math.min(nertzPileCards.length - 1, 5)}
                    />
                  )}
                  {/* Top card - may be face up if flipped */}
                  <div
                    className={styles.topCard}
                    style={{
                      top: Math.min((nertzPileCards.length - 1) * 2, 10),
                    }}
                  >
                    <Card
                      card={nertzPileCards[nertzPileCards.length - 1]!}
                      faceUp={progress.nertzFlipped}
                      backColor={backColor}
                    />
                  </div>
                </div>
              ) : (
                <div className={styles.emptySlot}>
                  <span className={styles.emptyLabel}>Nertz</span>
                </div>
              )}
            </div>
          </div>

          {/* Work Piles */}
          <div className={styles.workPilesSection}>
            <span className={styles.sectionLabel}>Work Piles</span>
            <div className={styles.workPiles}>
              {workPileCards.map((pile, index) => (
                <div
                  key={index}
                  className={`${styles.workPile} ${isWorkPileClickable ? styles.clickable : ''} ${
                    isWorkPileClickable && pile.length === 0 ? styles.highlight : ''
                  }`}
                  onClick={() => handleWorkPileClick(index)}
                  role="button"
                  tabIndex={isWorkPileClickable ? 0 : -1}
                  aria-label={`Work pile ${index + 1} - ${pile.length} cards`}
                >
                  {pile.length > 0 ? (
                    <CardStack
                      cards={pile}
                      direction="vertical"
                      offset={20}
                      faceUp={true}
                      backColor={backColor}
                    />
                  ) : (
                    <div className={styles.emptySlot}>
                      <span className={styles.emptyLabel}>{index + 1}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ProgressBarProps {
  label: string;
  current: number;
  total: number;
  active: boolean;
  complete: boolean;
}

function ProgressBar({ label, current, total, active, complete }: ProgressBarProps) {
  const percentage = Math.round((current / total) * 100);

  return (
    <div className={`${styles.progressBar} ${active ? styles.active : ''}`}>
      <div className={styles.progressHeader}>
        <span className={styles.progressLabel}>{label}</span>
        <span className={styles.progressCount}>
          {current}/{total}
        </span>
      </div>
      <div className={styles.progressTrack}>
        <div
          className={`${styles.progressFill} ${complete ? styles.progressComplete : ''}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default SetupArea;
