// SetupPhase - Interactive dealing where players click through setup steps
// Implements Phase 3.2: Interactive Setup Phase

import { useState, useCallback, useEffect } from 'react';
import type { Card as CardType, GameConfig } from '@heyhey/shared';
import { createShuffledDeck } from '@heyhey/shared';
import { Card, CardStack } from '../Card';
import type { PlayerColor } from '../Card/CardBack';
import styles from './SetupPhase.module.css';

/* =============================================================================
   TYPES
   ============================================================================= */

export type SetupStep = 'dealingNertz' | 'flippingNertz' | 'dealingWork';

export interface SetupPhaseProps {
  /** Player's card back color */
  playerColor?: PlayerColor;
  /** Player's deck ID for creating cards */
  deckId?: string;
  /** Game configuration (nertzPileSize) */
  config?: Pick<GameConfig, 'nertzPileSize'>;
  /** Called when setup is complete */
  onSetupComplete?: () => void;
  /** Optional class name */
  className?: string;
}

interface SetupState {
  step: SetupStep;
  nertzCardsDealt: number;
  workPilesDealt: number;
  nertzFlipped: boolean;
}

interface AnimatingCard {
  card: CardType;
  destination: 'nertz' | 'work';
  workPileIndex?: number;
}

/* =============================================================================
   CONSTANTS
   ============================================================================= */

const WORK_PILE_COUNT = 4;
const ANIMATION_DURATION = 200; // ms

/* =============================================================================
   SETUP PHASE COMPONENT
   ============================================================================= */

export function SetupPhase({
  playerColor = 'blue',
  deckId = 'player-1',
  config = { nertzPileSize: 13 },
  onSetupComplete,
  className,
}: SetupPhaseProps) {
  // Initialize deck (only created once on mount)
  const [deck] = useState<CardType[]>(() => createShuffledDeck(deckId));

  // Setup state
  const [state, setState] = useState<SetupState>({
    step: 'dealingNertz',
    nertzCardsDealt: 0,
    workPilesDealt: 0,
    nertzFlipped: false,
  });

  // Card piles
  const [nertzPile, setNertzPile] = useState<CardType[]>([]);
  const [workPiles, setWorkPiles] = useState<[CardType[], CardType[], CardType[], CardType[]]>([[], [], [], []]);

  // Animation state
  const [animatingCard, setAnimatingCard] = useState<AnimatingCard | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Get nertz pile size from config
  const nertzPileSize = config.nertzPileSize;

  // Calculate remaining stock (cards not yet dealt)
  const stockCards = deck.slice(nertzPileSize + WORK_PILE_COUNT);

  // Check if setup is complete
  const isComplete = state.step === 'dealingWork' && state.workPilesDealt === WORK_PILE_COUNT;

  // Handle setup complete
  useEffect(() => {
    if (isComplete) {
      onSetupComplete?.();
    }
  }, [isComplete, onSetupComplete]);

  // Get progress text
  const getProgressText = (): string => {
    switch (state.step) {
      case 'dealingNertz':
        return `Deal to Nertz (${state.nertzCardsDealt}/${nertzPileSize})`;
      case 'flippingNertz':
        return 'Flip Nertz top card';
      case 'dealingWork':
        return `Deal Work Piles (${state.workPilesDealt}/${WORK_PILE_COUNT})`;
    }
  };

  // Handle deck click - deal to nertz pile
  const handleDeckClick = useCallback(() => {
    if (isAnimating || state.step !== 'dealingNertz') return;
    if (state.nertzCardsDealt >= nertzPileSize) return;

    const cardIndex = state.nertzCardsDealt;
    const card = deck[cardIndex];
    if (!card) return;

    // Start animation
    setIsAnimating(true);
    setAnimatingCard({ card, destination: 'nertz' });

    // After animation, update state
    setTimeout(() => {
      setNertzPile(prev => [...prev, card]);
      const newDealt = state.nertzCardsDealt + 1;

      setState(prev => ({
        ...prev,
        nertzCardsDealt: newDealt,
        step: newDealt >= nertzPileSize ? 'flippingNertz' : 'dealingNertz',
      }));

      setAnimatingCard(null);
      setIsAnimating(false);
    }, ANIMATION_DURATION);
  }, [isAnimating, state, deck, nertzPileSize]);

  // Handle nertz pile click - flip top card
  const handleNertzClick = useCallback(() => {
    if (isAnimating || state.step !== 'flippingNertz') return;
    if (state.nertzFlipped) return;

    setState(prev => ({
      ...prev,
      nertzFlipped: true,
      step: 'dealingWork',
    }));
  }, [isAnimating, state]);

  // Handle work pile click - deal card to work pile
  const handleWorkPileClick = useCallback((pileIndex: number) => {
    if (isAnimating || state.step !== 'dealingWork') return;
    const pile = workPiles[pileIndex];
    if (pile && pile.length > 0) return; // Already has a card

    const cardIndex = nertzPileSize + state.workPilesDealt;
    const card = deck[cardIndex];
    if (!card) return;

    // Start animation
    setIsAnimating(true);
    setAnimatingCard({ card, destination: 'work', workPileIndex: pileIndex });

    // After animation, update state
    setTimeout(() => {
      setWorkPiles(prev => {
        const newPiles = [...prev] as [CardType[], CardType[], CardType[], CardType[]];
        newPiles[pileIndex] = [card];
        return newPiles;
      });

      setState(prev => ({
        ...prev,
        workPilesDealt: prev.workPilesDealt + 1,
      }));

      setAnimatingCard(null);
      setIsAnimating(false);
    }, ANIMATION_DURATION);
  }, [isAnimating, state, deck, workPiles, nertzPileSize]);

  // Determine what's clickable
  const isDeckClickable = state.step === 'dealingNertz' && !isAnimating;
  const isNertzClickable = state.step === 'flippingNertz' && !isAnimating;
  const isWorkClickable = (index: number) =>
    state.step === 'dealingWork' &&
    !isAnimating &&
    workPiles[index]?.length === 0;

  // Get remaining deck cards for display
  const displayDeckCards = deck.slice(
    state.nertzCardsDealt + state.workPilesDealt,
    Math.min(state.nertzCardsDealt + state.workPilesDealt + 5, deck.length)
  );

  return (
    <div className={`${styles.setupPhase} ${className ?? ''}`}>
      {/* Progress indicator */}
      <div className={styles.progressBar}>
        <span className={styles.progressText}>{getProgressText()}</span>
        <div className={styles.progressDots}>
          <span className={`${styles.dot} ${state.step === 'dealingNertz' ? styles.active : state.nertzCardsDealt >= nertzPileSize ? styles.complete : ''}`} />
          <span className={`${styles.dot} ${state.step === 'flippingNertz' ? styles.active : state.nertzFlipped ? styles.complete : ''}`} />
          <span className={`${styles.dot} ${state.step === 'dealingWork' ? styles.active : isComplete ? styles.complete : ''}`} />
        </div>
      </div>

      {/* Main setup area */}
      <div className={styles.setupArea}>
        {/* Deck (draw pile) */}
        <div
          className={`${styles.deckArea} ${isDeckClickable ? styles.clickable : ''} ${isDeckClickable ? styles.highlighted : ''}`}
          onClick={handleDeckClick}
          role="button"
          tabIndex={isDeckClickable ? 0 : -1}
          aria-label={isDeckClickable ? 'Click to deal card to Nertz pile' : 'Deck'}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && isDeckClickable) {
              e.preventDefault();
              handleDeckClick();
            }
          }}
        >
          <span className={styles.areaLabel}>DECK</span>
          {displayDeckCards.length > 0 ? (
            <CardStack
              cards={displayDeckCards}
              direction="vertical"
              offset={2}
              faceUp={false}
              backColor={playerColor}
              maxVisible={3}
            />
          ) : (
            <div className={styles.emptySlot}>
              <span className={styles.emptyLabel}>EMPTY</span>
            </div>
          )}
          {isDeckClickable && (
            <span className={styles.clickHint}>CLICK</span>
          )}
        </div>

        {/* Nertz Pile */}
        <div
          className={`${styles.nertzArea} ${isNertzClickable ? styles.clickable : ''} ${isNertzClickable ? styles.highlighted : ''}`}
          onClick={handleNertzClick}
          role="button"
          tabIndex={isNertzClickable ? 0 : -1}
          aria-label={isNertzClickable ? 'Click to flip top card' : `Nertz pile - ${nertzPile.length} cards`}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && isNertzClickable) {
              e.preventDefault();
              handleNertzClick();
            }
          }}
        >
          <span className={styles.areaLabel}>NERTZ</span>
          {nertzPile.length > 0 ? (
            <div className={styles.nertzStack}>
              {/* Bottom cards (always face-down) */}
              {nertzPile.length > 1 && (
                <CardStack
                  cards={nertzPile.slice(0, -1)}
                  direction="vertical"
                  offset={2}
                  faceUp={false}
                  backColor={playerColor}
                  maxVisible={5}
                />
              )}
              {/* Top card */}
              <div
                className={styles.nertzTopCard}
                style={{ top: Math.min((nertzPile.length - 1) * 2, 10) }}
              >
                <Card
                  card={nertzPile[nertzPile.length - 1]!}
                  faceUp={state.nertzFlipped}
                  backColor={playerColor}
                  flipping={state.step === 'flippingNertz' && !state.nertzFlipped}
                />
              </div>
            </div>
          ) : (
            <div className={styles.emptySlot}>
              <span className={styles.emptyLabel}>{state.nertzCardsDealt}/{nertzPileSize}</span>
            </div>
          )}
          {isNertzClickable && (
            <span className={styles.clickHint}>FLIP</span>
          )}
          {nertzPile.length > 0 && (
            <div className={styles.countBadge}>{nertzPile.length}</div>
          )}
        </div>

        {/* Work Piles */}
        <div className={styles.workPilesArea}>
          <span className={styles.areaLabel}>WORK PILES</span>
          <div className={styles.workPilesRow}>
            {[0, 1, 2, 3].map((index) => {
              const pile = workPiles[index] ?? [];
              const clickable = isWorkClickable(index);

              return (
                <div
                  key={index}
                  className={`${styles.workPile} ${clickable ? styles.clickable : ''} ${clickable ? styles.highlighted : ''}`}
                  onClick={() => clickable && handleWorkPileClick(index)}
                  role="button"
                  tabIndex={clickable ? 0 : -1}
                  aria-label={clickable ? `Click to deal card to work pile ${index + 1}` : `Work pile ${index + 1}`}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && clickable) {
                      e.preventDefault();
                      handleWorkPileClick(index);
                    }
                  }}
                >
                  {pile.length > 0 ? (
                    <Card
                      card={pile[0]!}
                      faceUp={true}
                      backColor={playerColor}
                    />
                  ) : (
                    <div className={`${styles.emptyWorkSlot} ${clickable ? styles.emptyHighlight : ''}`}>
                      <span className={styles.workPileNumber}>{index + 1}</span>
                    </div>
                  )}
                  {clickable && (
                    <span className={styles.clickHint}>CLICK</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stock pile preview (cards remaining after setup) */}
      <div className={styles.stockPreview}>
        <span className={styles.previewLabel}>
          Stock: {stockCards.length} cards remaining
        </span>
      </div>

      {/* Animating card overlay */}
      {animatingCard && (
        <div
          className={`${styles.animatingCard} ${styles[`animateTo${animatingCard.destination === 'nertz' ? 'Nertz' : `Work${animatingCard.workPileIndex}`}`]}`}
        >
          <Card
            card={animatingCard.card}
            faceUp={false}
            backColor={playerColor}
          />
        </div>
      )}

      {/* Complete overlay */}
      {isComplete && (
        <div className={styles.completeOverlay}>
          <div className={styles.completeMessage}>
            <span className={styles.completeIcon}>✓</span>
            <span className={styles.completeText}>SETUP COMPLETE</span>
            <span className={styles.waitingText}>Waiting for other players...</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default SetupPhase;
