// useSetupController - Hook for managing game setup interactions
// Connects SetupArea UI to SetupStateMachine with card state management

import { useState, useCallback, useRef, useMemo } from 'react';
import {
  SetupStateMachine,
  createShuffledDeck,
  type Card,
  type SetupState,
  type SetupProgress,
  type SetupConfig,
} from '@heyhey/shared';

/** Sound effect types that can be triggered during setup */
export type SetupSoundType = 'cardSelect' | 'cardPlace' | 'cardFlip' | 'error';

export interface UseSetupControllerOptions {
  /** Player's deck ID for card identification */
  deckId: string;
  /** Nertz pile size (10 or 13), defaults to 13 */
  nertzPileSize?: 10 | 13;
  /** Delay in ms between interactions (0 for fast/frantic feel) */
  interactionDelay?: number;
  /** Callback when setup is complete */
  onSetupComplete?: () => void;
  /** Callback to play sound effects */
  onSound?: (sound: SetupSoundType) => void;
}

export interface SetupControllerState {
  /** Current setup state from state machine */
  state: SetupState;
  /** Progress tracking */
  progress: SetupProgress;
  /** Cards remaining in the deck */
  deckCards: Card[];
  /** Cards in the Nertz pile */
  nertzPileCards: Card[];
  /** Cards in work piles (4 arrays) */
  workPileCards: [Card[], Card[], Card[], Card[]];
  /** Whether interactions are currently disabled */
  isInteractionDisabled: boolean;
}

export interface SetupControllerActions {
  /** Handle deck click - places card on nertz pile or work pile based on state */
  handleDeckClick: () => void;
  /** Handle nertz pile click - flips top card */
  handleNertzPileClick: () => void;
  /** Handle work pile click - not used in auto-flow but provided for flexibility */
  handleWorkPileClick: (index: number) => void;
  /** Reset the setup to initial state */
  reset: () => void;
}

export type UseSetupControllerReturn = SetupControllerState & SetupControllerActions;

/**
 * Hook for managing game setup interactions.
 * Integrates SetupStateMachine with card state management.
 *
 * Flow (fast and frantic!):
 * 1. idle -> placingNertz: Click deck to start
 * 2. placingNertz: Click deck 10x or 13x to fill nertz pile, auto-transitions to flipNertz
 * 3. flipNertz: Click nertz pile to flip top card face-up, transitions to placingWork
 * 4. placingWork: Click each work pile to drop a card on it (4 clicks total)
 * 5. complete: Setup finished, waiting for other players
 */
export function useSetupController(options: UseSetupControllerOptions): UseSetupControllerReturn {
  const {
    deckId,
    nertzPileSize = 13,
    interactionDelay = 0,
    onSetupComplete,
    onSound,
  } = options;

  // Create state machine with config
  const stateMachine = useRef<SetupStateMachine>(
    new SetupStateMachine({ nertzPileSize, workPileCount: 4 } as SetupConfig)
  );

  // Initialize deck
  const initialDeck = useMemo(() => createShuffledDeck(deckId), [deckId]);

  // Card state
  const [deckCards, setDeckCards] = useState<Card[]>(initialDeck);
  const [nertzPileCards, setNertzPileCards] = useState<Card[]>([]);
  const [workPileCards, setWorkPileCards] = useState<[Card[], Card[], Card[], Card[]]>([[], [], [], []]);

  // State machine state (tracked separately to trigger re-renders)
  const [state, setState] = useState<SetupState>('idle');
  const [progress, setProgress] = useState<SetupProgress>({
    nertzCardsPlaced: 0,
    nertzFlipped: false,
    workPilesPlaced: 0,
  });

  // Interaction lock to prevent rapid clicking
  const [isInteractionDisabled, setIsInteractionDisabled] = useState(false);
  const interactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to sync state from machine
  const syncState = useCallback(() => {
    setState(stateMachine.current.state);
    setProgress({ ...stateMachine.current.progress });
  }, []);

  // Helper to temporarily disable interactions
  const disableInteractionsTemporarily = useCallback(() => {
    setIsInteractionDisabled(true);
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }
    interactionTimeoutRef.current = setTimeout(() => {
      setIsInteractionDisabled(false);
    }, interactionDelay);
  }, [interactionDelay]);

  // Track which work piles have been filled
  const [filledWorkPiles, setFilledWorkPiles] = useState<Set<number>>(new Set());

  /**
   * Handle deck click:
   * - In idle: Start setup (transition to placingNertz)
   * - In placingNertz: Move top card from deck to nertz pile
   */
  const handleDeckClick = useCallback(() => {
    if (isInteractionDisabled) return;

    const machine = stateMachine.current;
    const currentState = machine.state;

    // Handle idle -> start
    if (currentState === 'idle') {
      const result = machine.start();
      if (result.success) {
        onSound?.('cardSelect');
        if (interactionDelay > 0) disableInteractionsTemporarily();
        syncState();
      }
      return;
    }

    // Handle placingNertz - move card to nertz pile
    if (currentState === 'placingNertz') {
      if (deckCards.length === 0) return;

      const placed = machine.placeNertzCard();
      if (!placed) return;

      onSound?.('cardPlace');
      if (interactionDelay > 0) disableInteractionsTemporarily();

      // Move card from deck to nertz pile
      setDeckCards(prev => {
        const newDeck = [...prev];
        const card = newDeck.pop();
        if (card) {
          setNertzPileCards(prevNertz => [...prevNertz, card]);
        }
        return newDeck;
      });

      syncState();

      // Check if nertz pile is complete, auto-transition
      if (machine.progress.nertzCardsPlaced >= nertzPileSize) {
        const transitionResult = machine.completeNertzPile();
        if (transitionResult.success) {
          syncState();
        }
      }
      return;
    }
  }, [
    isInteractionDisabled,
    deckCards.length,
    nertzPileSize,
    interactionDelay,
    disableInteractionsTemporarily,
    syncState,
    onSound,
  ]);

  /**
   * Handle nertz pile click:
   * - In flipNertz: Flip the top card and transition to placingWork
   */
  const handleNertzPileClick = useCallback(() => {
    if (isInteractionDisabled) return;

    const machine = stateMachine.current;
    const currentState = machine.state;

    if (currentState !== 'flipNertz') return;

    const result = machine.flipNertz();
    if (result.success) {
      onSound?.('cardFlip');
      if (interactionDelay > 0) disableInteractionsTemporarily();
      syncState();
    }
  }, [isInteractionDisabled, interactionDelay, disableInteractionsTemporarily, syncState, onSound]);

  /**
   * Handle work pile click:
   * - In placingWork: Drop a card from deck onto the clicked pile
   */
  const handleWorkPileClick = useCallback((index: number) => {
    if (isInteractionDisabled) return;

    const machine = stateMachine.current;
    const currentState = machine.state;

    if (currentState !== 'placingWork') return;
    if (deckCards.length === 0) return;
    if (filledWorkPiles.has(index)) return; // Already has a card

    const placed = machine.placeWorkPile();
    if (!placed) return;

    onSound?.('cardPlace');
    if (interactionDelay > 0) disableInteractionsTemporarily();

    // Mark this pile as filled
    setFilledWorkPiles(prev => new Set(prev).add(index));

    // Move card from deck to this work pile
    setDeckCards(prev => {
      const newDeck = [...prev];
      const card = newDeck.pop();
      if (card) {
        setWorkPileCards(prevPiles => {
          const newPiles = [...prevPiles] as [Card[], Card[], Card[], Card[]];
          const existingPile = newPiles[index] ?? [];
          newPiles[index] = [...existingPile, card];
          return newPiles;
        });
      }
      return newDeck;
    });

    syncState();

    // Check if all work piles placed, auto-complete
    if (machine.progress.workPilesPlaced >= 4) {
      const completeResult = machine.completeSetup();
      if (completeResult.success) {
        syncState();
        onSetupComplete?.();
      }
    }
  }, [
    isInteractionDisabled,
    deckCards.length,
    filledWorkPiles,
    interactionDelay,
    disableInteractionsTemporarily,
    syncState,
    onSetupComplete,
    onSound,
  ]);

  /**
   * Reset the setup to initial state
   */
  const reset = useCallback(() => {
    // Clear any pending interaction timeout
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }

    // Reset state machine
    stateMachine.current.reset();

    // Reset card state
    const newDeck = createShuffledDeck(deckId);
    setDeckCards(newDeck);
    setNertzPileCards([]);
    setWorkPileCards([[], [], [], []]);

    // Reset filled work piles tracking
    setFilledWorkPiles(new Set());

    // Reset interaction state
    setIsInteractionDisabled(false);

    // Sync state
    syncState();
  }, [deckId, syncState]);

  return {
    state,
    progress,
    deckCards,
    nertzPileCards,
    workPileCards,
    isInteractionDisabled,
    handleDeckClick,
    handleNertzPileClick,
    handleWorkPileClick,
    reset,
  };
}

export default useSetupController;
