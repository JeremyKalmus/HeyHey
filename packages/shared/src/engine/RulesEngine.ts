// HeyHey! Rules Engine
// Validates moves according to Nertz game rules

import type {
  Card,
  GameState,
  PlayerGameState,
  FoundationPile,
  Move,
  CardMove,
  DrawMove,
  FlipStockMove,
  MoveValidationResult,
  MoveValidationError,
} from '../types/index.js';
import { isRedCard, isBlackCard } from '../deck/index.js';

/**
 * Check if two cards have alternating colors (one red, one black)
 */
export function areAlternatingColors(card1: Card, card2: Card): boolean {
  return (isRedCard(card1) && isBlackCard(card2)) || (isBlackCard(card1) && isRedCard(card2));
}

/**
 * Check if a card can be placed on a work pile
 * Rule: Must be descending rank and alternating colors
 * Empty pile accepts any card (Kings start new piles in standard solitaire,
 * but Nertz allows any card on empty work piles)
 *
 * @param card - The card to place
 * @param topCard - The current top card of the work pile (undefined if empty)
 * @returns true if the placement is valid
 */
export function canPlaceOnWorkPile(card: Card, topCard: Card | undefined): boolean {
  // Empty pile accepts any card
  if (!topCard) {
    return true;
  }

  // Must be alternating colors
  if (!areAlternatingColors(card, topCard)) {
    return false;
  }

  // Must be one rank lower (descending)
  return card.rank === topCard.rank - 1;
}

/**
 * Check if a card can be placed on a foundation pile
 * Rule: Must be same suit and ascending rank (Ace=1 starts, King=13 ends)
 *
 * @param card - The card to place
 * @param foundation - The foundation pile to place on
 * @returns true if the placement is valid
 */
export function canPlaceOnFoundation(card: Card, foundation: FoundationPile): boolean {
  // Must be same suit
  if (card.suit !== foundation.suit) {
    return false;
  }

  const topCard = foundation.cards[foundation.cards.length - 1];

  // Empty foundation accepts Ace only
  if (!topCard) {
    return card.rank === 1;
  }

  // Foundation is complete (has King)
  if (topCard.rank === 13) {
    return false;
  }

  // Must be one rank higher (ascending)
  return card.rank === topCard.rank + 1;
}

/**
 * Get a player's game state from the full game state
 */
export function getPlayerState(state: GameState, playerId: string): PlayerGameState | undefined {
  return state.players.find((p) => p.playerId === playerId);
}

/**
 * Get the top card from a source pile
 */
export function getSourceCard(
  playerState: PlayerGameState,
  source: CardMove['source']
): Card | undefined {
  switch (source.type) {
    case 'nertz':
      return playerState.nertzPile[playerState.nertzPile.length - 1];
    case 'work': {
      const pile = playerState.workPiles[source.pileIndex];
      if (!pile || pile.length === 0) return undefined;
      // If cardIndex specified, get that card; otherwise get top card
      const cardIndex = source.cardIndex ?? pile.length - 1;
      return pile[cardIndex];
    }
    case 'waste':
      return playerState.wastePile[playerState.wastePile.length - 1];
  }
}

/**
 * Get cards from a source (supports multiple cards for work pile moves)
 */
export function getSourceCards(
  playerState: PlayerGameState,
  source: CardMove['source'],
  cardCount: number = 1
): Card[] {
  switch (source.type) {
    case 'nertz':
      // Only top card from Nertz
      const nertzTop = playerState.nertzPile[playerState.nertzPile.length - 1];
      return nertzTop ? [nertzTop] : [];
    case 'work': {
      const pile = playerState.workPiles[source.pileIndex];
      if (!pile || pile.length === 0) return [];
      const startIndex = source.cardIndex ?? pile.length - cardCount;
      return pile.slice(startIndex);
    }
    case 'waste':
      // Only top card from Waste
      const wasteTop = playerState.wastePile[playerState.wastePile.length - 1];
      return wasteTop ? [wasteTop] : [];
  }
}

/**
 * Validate a card move
 */
function validateCardMove(state: GameState, move: CardMove): MoveValidationResult {
  const playerState = getPlayerState(state, move.playerId);
  if (!playerState) {
    return { valid: false, error: 'player_not_found' };
  }

  const cardCount = move.cardCount ?? 1;

  // For work pile moves, validate we can move multiple cards
  if (move.source.type === 'work' && cardCount > 1) {
    const pile = playerState.workPiles[move.source.pileIndex];
    if (!pile) {
      return { valid: false, error: 'invalid_source' };
    }
    const startIndex = move.source.cardIndex ?? pile.length - cardCount;
    if (startIndex < 0 || startIndex + cardCount > pile.length) {
      return { valid: false, error: 'invalid_card_count' };
    }
  }

  // Non-work sources can only move one card
  if (move.source.type !== 'work' && cardCount > 1) {
    return { valid: false, error: 'invalid_card_count' };
  }

  const sourceCards = getSourceCards(playerState, move.source, cardCount);
  if (sourceCards.length === 0) {
    return { valid: false, error: 'empty_source' };
  }

  const cardToPlace = sourceCards[0]!; // The bottom card of the stack being moved (safe due to length check above)

  switch (move.destination.type) {
    case 'work':
      return validateWorkPileMove(state, playerState, cardToPlace, move.destination.pileIndex);
    case 'foundation':
      // Can only move single cards to foundation
      if (cardCount > 1) {
        return { valid: false, error: 'invalid_card_count' };
      }
      return validateFoundationMove(state, cardToPlace, move.destination.foundationIndex);
  }
}

/**
 * Validate placing a card on a work pile
 */
function validateWorkPileMove(
  _state: GameState,
  playerState: PlayerGameState,
  card: Card,
  pileIndex: number
): MoveValidationResult {
  if (pileIndex < 0 || pileIndex >= playerState.workPiles.length) {
    return { valid: false, error: 'invalid_destination' };
  }

  const workPile = playerState.workPiles[pileIndex]!;
  const topCard = workPile[workPile.length - 1];

  // Check empty pile case
  if (!topCard) {
    return { valid: true };
  }

  // Check alternating colors
  if (!areAlternatingColors(card, topCard)) {
    return { valid: false, error: 'wrong_color_for_work' };
  }

  // Check descending rank
  if (card.rank !== topCard.rank - 1) {
    return { valid: false, error: 'wrong_rank_for_work' };
  }

  return { valid: true };
}

/**
 * Validate placing a card on a foundation
 */
function validateFoundationMove(
  state: GameState,
  card: Card,
  foundationIndex: number
): MoveValidationResult {
  if (foundationIndex < 0 || foundationIndex >= state.foundations.length) {
    return { valid: false, error: 'invalid_destination' };
  }

  const foundation = state.foundations[foundationIndex]!;

  // Check suit match
  if (card.suit !== foundation.suit) {
    return { valid: false, error: 'wrong_suit_for_foundation' };
  }

  const topCard = foundation.cards[foundation.cards.length - 1];

  // Empty foundation needs Ace
  if (!topCard) {
    if (card.rank !== 1) {
      return { valid: false, error: 'wrong_rank_for_foundation' };
    }
    return { valid: true };
  }

  // Foundation is complete
  if (topCard.rank === 13) {
    return { valid: false, error: 'foundation_full' };
  }

  // Check ascending rank
  if (card.rank !== topCard.rank + 1) {
    return { valid: false, error: 'wrong_rank_for_foundation' };
  }

  return { valid: true };
}

/**
 * Validate a draw move (draw cards from stock to waste)
 */
function validateDrawMove(state: GameState, move: DrawMove): MoveValidationResult {
  const playerState = getPlayerState(state, move.playerId);
  if (!playerState) {
    return { valid: false, error: 'player_not_found' };
  }

  // Must have cards in stock to draw
  if (playerState.stockPile.length === 0) {
    return { valid: false, error: 'empty_source' };
  }

  return { valid: true };
}

/**
 * Validate a flip stock move (recycle waste back to stock)
 */
function validateFlipStockMove(state: GameState, move: FlipStockMove): MoveValidationResult {
  const playerState = getPlayerState(state, move.playerId);
  if (!playerState) {
    return { valid: false, error: 'player_not_found' };
  }

  // Stock must be empty to flip
  if (playerState.stockPile.length > 0) {
    return { valid: false, error: 'stock_not_empty' };
  }

  // Waste must have cards to flip
  if (playerState.wastePile.length === 0) {
    return { valid: false, error: 'waste_empty' };
  }

  return { valid: true };
}

/**
 * Validate any move against the game state
 *
 * @param state - Current game state
 * @param move - Move to validate
 * @returns Validation result with success or error
 */
export function validateMove(state: GameState, move: Move): MoveValidationResult {
  switch (move.type) {
    case 'card':
      return validateCardMove(state, move);
    case 'draw':
      return validateDrawMove(state, move);
    case 'flipStock':
      return validateFlipStockMove(state, move);
  }
}

/**
 * Find all valid foundation destinations for a card
 */
export function findValidFoundations(state: GameState, card: Card): number[] {
  const validIndices: number[] = [];

  for (let i = 0; i < state.foundations.length; i++) {
    const foundation = state.foundations[i];
    if (foundation && canPlaceOnFoundation(card, foundation)) {
      validIndices.push(i);
    }
  }

  return validIndices;
}

/**
 * Find all valid work pile destinations for a card within a player's area
 */
export function findValidWorkPiles(playerState: PlayerGameState, card: Card): number[] {
  const validIndices: number[] = [];

  for (let i = 0; i < playerState.workPiles.length; i++) {
    const pile = playerState.workPiles[i];
    if (!pile) continue;
    const topCard = pile[pile.length - 1];
    if (canPlaceOnWorkPile(card, topCard)) {
      validIndices.push(i);
    }
  }

  return validIndices;
}

/**
 * Check if a player has won (emptied their Nertz pile)
 */
export function hasPlayerWon(playerState: PlayerGameState): boolean {
  return playerState.nertzPile.length === 0;
}

/**
 * Get a human-readable error message for a validation error
 */
export function getErrorMessage(error: MoveValidationError): string {
  const messages: Record<MoveValidationError, string> = {
    invalid_source: 'Invalid card source',
    invalid_destination: 'Invalid destination',
    empty_source: 'No card to move from that location',
    no_card_selected: 'No card selected',
    wrong_color_for_work: 'Card must be a different color',
    wrong_rank_for_work: 'Card must be one rank lower',
    wrong_suit_for_foundation: 'Card must match foundation suit',
    wrong_rank_for_foundation: 'Card must be next in sequence',
    work_pile_full: 'Work pile cannot accept more cards',
    foundation_full: 'Foundation is complete',
    stock_not_empty: 'Stock pile must be empty to flip',
    waste_empty: 'No cards in waste pile to flip',
    player_not_found: 'Player not found in game',
    invalid_card_count: 'Invalid number of cards to move',
  };
  return messages[error];
}
