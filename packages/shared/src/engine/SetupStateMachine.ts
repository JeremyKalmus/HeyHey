// Setup State Machine for HeyHey! (Nertz)
// Manages the game setup phase: placing Nertz pile, flipping, and placing work piles

/**
 * Setup states for a player's board
 * idle -> placingNertz -> flipNertz -> placingWork -> complete
 */
export type SetupState =
  | 'idle'
  | 'placingNertz'
  | 'flipNertz'
  | 'placingWork'
  | 'complete';

/**
 * Valid transitions between setup states
 */
const VALID_TRANSITIONS: Record<SetupState, SetupState[]> = {
  idle: ['placingNertz'],
  placingNertz: ['flipNertz'],
  flipNertz: ['placingWork'],
  placingWork: ['complete'],
  complete: [],
};

/**
 * Progress tracking for setup phase
 */
export interface SetupProgress {
  /** Cards placed in Nertz pile (target: 10 or 13) */
  nertzCardsPlaced: number;
  /** Whether Nertz top card has been flipped */
  nertzFlipped: boolean;
  /** Work piles placed (target: 4) */
  workPilesPlaced: number;
}

/**
 * Result of a state transition attempt
 */
export type TransitionResult =
  | { success: true; previousState: SetupState; newState: SetupState }
  | { success: false; error: SetupTransitionError };

export type SetupTransitionError =
  | 'invalid_transition'
  | 'already_complete'
  | 'nertz_incomplete'
  | 'nertz_not_flipped'
  | 'work_incomplete';

/**
 * Configuration for setup requirements
 */
export interface SetupConfig {
  /** Number of cards in Nertz pile (10 or 13) */
  nertzPileSize: 10 | 13;
  /** Number of work piles to place */
  workPileCount: 4;
}

const DEFAULT_CONFIG: SetupConfig = {
  nertzPileSize: 13,
  workPileCount: 4,
};

/**
 * Setup State Machine for a single player
 * Tracks and validates the setup phase of a Nertz game
 */
export class SetupStateMachine {
  private _state: SetupState = 'idle';
  private _progress: SetupProgress;
  private readonly config: SetupConfig;

  constructor(config: Partial<SetupConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this._progress = {
      nertzCardsPlaced: 0,
      nertzFlipped: false,
      workPilesPlaced: 0,
    };
  }

  /**
   * Current setup state
   */
  get state(): SetupState {
    return this._state;
  }

  /**
   * Current progress towards completion
   */
  get progress(): Readonly<SetupProgress> {
    return { ...this._progress };
  }

  /**
   * Check if setup is complete
   */
  get isComplete(): boolean {
    return this._state === 'complete';
  }

  /**
   * Get valid transitions from current state
   */
  getValidTransitions(): SetupState[] {
    return [...VALID_TRANSITIONS[this._state]];
  }

  /**
   * Check if a transition to the target state is valid
   */
  canTransitionTo(targetState: SetupState): boolean {
    return VALID_TRANSITIONS[this._state].includes(targetState);
  }

  /**
   * Start the setup process (idle -> placingNertz)
   */
  start(): TransitionResult {
    return this.transitionTo('placingNertz');
  }

  /**
   * Record placing a card in the Nertz pile
   * @returns true if card was recorded, false if Nertz pile is full
   */
  placeNertzCard(): boolean {
    if (this._state !== 'placingNertz') {
      return false;
    }
    if (this._progress.nertzCardsPlaced >= this.config.nertzPileSize) {
      return false;
    }
    this._progress.nertzCardsPlaced++;
    return true;
  }

  /**
   * Complete Nertz pile placement and transition to flip state
   */
  completeNertzPile(): TransitionResult {
    if (this._progress.nertzCardsPlaced < this.config.nertzPileSize) {
      return { success: false, error: 'nertz_incomplete' };
    }
    return this.transitionTo('flipNertz');
  }

  /**
   * Flip the top card of the Nertz pile
   */
  flipNertz(): TransitionResult {
    if (this._state !== 'flipNertz') {
      return { success: false, error: 'invalid_transition' };
    }
    this._progress.nertzFlipped = true;
    return this.transitionTo('placingWork');
  }

  /**
   * Record placing a work pile
   * @returns true if work pile was recorded, false if all piles placed
   */
  placeWorkPile(): boolean {
    if (this._state !== 'placingWork') {
      return false;
    }
    if (this._progress.workPilesPlaced >= this.config.workPileCount) {
      return false;
    }
    this._progress.workPilesPlaced++;
    return true;
  }

  /**
   * Complete work pile placement and finish setup
   */
  completeSetup(): TransitionResult {
    if (!this._progress.nertzFlipped) {
      return { success: false, error: 'nertz_not_flipped' };
    }
    if (this._progress.workPilesPlaced < this.config.workPileCount) {
      return { success: false, error: 'work_incomplete' };
    }
    return this.transitionTo('complete');
  }

  /**
   * Attempt to transition to a new state
   */
  transitionTo(targetState: SetupState): TransitionResult {
    if (this._state === 'complete') {
      return { success: false, error: 'already_complete' };
    }

    if (!this.canTransitionTo(targetState)) {
      return { success: false, error: 'invalid_transition' };
    }

    const previousState = this._state;
    this._state = targetState;
    return { success: true, previousState, newState: targetState };
  }

  /**
   * Reset the state machine to initial state
   */
  reset(): void {
    this._state = 'idle';
    this._progress = {
      nertzCardsPlaced: 0,
      nertzFlipped: false,
      workPilesPlaced: 0,
    };
  }

  /**
   * Get a summary of setup status
   */
  getSummary(): {
    state: SetupState;
    progress: SetupProgress;
    isComplete: boolean;
    nertzProgress: string;
    workProgress: string;
  } {
    return {
      state: this._state,
      progress: this.progress,
      isComplete: this.isComplete,
      nertzProgress: `${this._progress.nertzCardsPlaced}/${this.config.nertzPileSize}`,
      workProgress: `${this._progress.workPilesPlaced}/${this.config.workPileCount}`,
    };
  }
}
