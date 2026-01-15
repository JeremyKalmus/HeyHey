// HeyHey! State Manager
// Manages game state transitions and generates delta updates

import type {
  GameState,
  PlayerGameState,
  Move,
  CardMove,
  DrawMove,
  FlipStockMove,
  StateDelta,
  StateUpdate,
  Card,
  GameConfig,
} from '../types/index.js';
import { validateMove, getSourceCards, getPlayerState } from './RulesEngine.js';

export type ApplyMoveResult =
  | { success: true; delta: StateDelta; newState: GameState }
  | { success: false; error: string };

/**
 * Manages game state and generates delta updates for synchronization
 */
export class StateManager {
  private sequence: number = 0;
  private state: GameState;

  constructor(initialState: GameState) {
    this.state = initialState;
  }

  /**
   * Get current game state
   */
  getState(): GameState {
    return this.state;
  }

  /**
   * Get current sequence number
   */
  getSequence(): number {
    return this.sequence;
  }

  /**
   * Create a state update with the next sequence number
   */
  createUpdate(delta: StateDelta): StateUpdate {
    this.sequence++;
    return {
      sequence: this.sequence,
      timestamp: Date.now(),
      delta,
      gameId: this.state.gameId,
    };
  }

  /**
   * Apply a move to the game state
   * Returns the delta if successful, or an error if the move is invalid
   */
  applyMove(move: Move): ApplyMoveResult {
    // Validate the move
    const validation = validateMove(this.state, move);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Apply the move and generate delta
    switch (move.type) {
      case 'card':
        return this.applyCardMove(move);
      case 'draw':
        return this.applyDrawMove(move);
      case 'flipStock':
        return this.applyFlipStockMove(move);
    }
  }

  /**
   * Apply a card move (nertz, work pile, waste -> work pile or foundation)
   */
  private applyCardMove(move: CardMove): ApplyMoveResult {
    const playerState = getPlayerState(this.state, move.playerId);
    if (!playerState) {
      return { success: false, error: 'player_not_found' };
    }

    const cardCount = move.cardCount ?? 1;
    const cards = getSourceCards(playerState, move.source, cardCount);

    if (cards.length === 0) {
      return { success: false, error: 'empty_source' };
    }

    // Remove cards from source
    this.removeCardsFromSource(playerState, move.source, cardCount);

    // Add cards to destination
    this.addCardsToDestination(playerState, move.destination, cards);

    const delta: StateDelta = {
      type: 'cardMoved',
      playerId: move.playerId,
      source: move.source,
      destination: move.destination,
      cards,
    };

    return { success: true, delta, newState: this.state };
  }

  /**
   * Apply a draw move (stock -> waste)
   */
  private applyDrawMove(move: DrawMove): ApplyMoveResult {
    const playerState = getPlayerState(this.state, move.playerId);
    if (!playerState) {
      return { success: false, error: 'player_not_found' };
    }

    const drawCount = this.state.config.drawCount;
    const actualDrawCount = Math.min(drawCount, playerState.stockPile.length);

    // Take cards from stock
    const drawnCards: Card[] = [];
    for (let i = 0; i < actualDrawCount; i++) {
      const card = playerState.stockPile.pop();
      if (card) {
        drawnCards.push(card);
      }
    }

    // Add to waste (in draw order, so first drawn is at bottom of visible area)
    playerState.wastePile.push(...drawnCards);

    const delta: StateDelta = {
      type: 'cardsDrawn',
      playerId: move.playerId,
      cards: drawnCards,
    };

    return { success: true, delta, newState: this.state };
  }

  /**
   * Apply a flip stock move (waste -> stock)
   */
  private applyFlipStockMove(move: FlipStockMove): ApplyMoveResult {
    const playerState = getPlayerState(this.state, move.playerId);
    if (!playerState) {
      return { success: false, error: 'player_not_found' };
    }

    // Move all waste cards back to stock (reversed)
    playerState.stockPile = playerState.wastePile.reverse();
    playerState.wastePile = [];

    const delta: StateDelta = {
      type: 'stockFlipped',
      playerId: move.playerId,
    };

    return { success: true, delta, newState: this.state };
  }

  /**
   * Handle Nertz call
   */
  callNertz(playerId: string): ApplyMoveResult {
    const playerState = getPlayerState(this.state, playerId);
    if (!playerState) {
      return { success: false, error: 'player_not_found' };
    }

    // Player must have emptied their nertz pile
    if (playerState.nertzPile.length > 0) {
      return { success: false, error: 'nertz_pile_not_empty' };
    }

    this.state.calledBy = playerId;
    this.state.phase = 'scoring';

    const delta: StateDelta = {
      type: 'nertzCalled',
      playerId,
    };

    return { success: true, delta, newState: this.state };
  }

  /**
   * Remove cards from a source pile
   */
  private removeCardsFromSource(
    playerState: PlayerGameState,
    source: CardMove['source'],
    count: number
  ): void {
    switch (source.type) {
      case 'nertz':
        playerState.nertzPile.pop();
        break;
      case 'work': {
        const pile = playerState.workPiles[source.pileIndex];
        if (pile) {
          pile.splice(pile.length - count, count);
        }
        break;
      }
      case 'waste':
        playerState.wastePile.pop();
        break;
    }
  }

  /**
   * Add cards to a destination pile
   */
  private addCardsToDestination(
    playerState: PlayerGameState,
    destination: CardMove['destination'],
    cards: Card[]
  ): void {
    switch (destination.type) {
      case 'work': {
        const pile = playerState.workPiles[destination.pileIndex];
        if (pile) {
          pile.push(...cards);
        }
        break;
      }
      case 'foundation': {
        const foundation = this.state.foundations[destination.foundationIndex];
        if (foundation) {
          foundation.cards.push(...cards);
        }
        break;
      }
    }
  }
}

/**
 * Create initial game state for a new game
 */
export function createInitialGameState(
  gameId: string,
  players: { playerId: string; deckId: string; nertzPile: Card[]; workPiles: Card[][]; stockPile: Card[] }[],
  config: GameConfig
): GameState {
  const playerStates: PlayerGameState[] = players.map(p => ({
    playerId: p.playerId,
    deckId: p.deckId,
    nertzPile: p.nertzPile,
    workPiles: p.workPiles,
    stockPile: p.stockPile,
    wastePile: [],
  }));

  // Initialize 4 foundation piles per suit
  const suits: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const foundations = suits.map(suit => ({
    suit,
    cards: [] as Card[],
    ownerId: 'system',
  }));

  return {
    gameId,
    phase: 'waiting_for_start',
    players: playerStates,
    foundations,
    config,
    roundNumber: 1,
    currentStarterIndex: 0, // Host (first player) starts round 1
  };
}
