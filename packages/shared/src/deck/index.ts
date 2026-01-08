// HeyHey! Deck Management
// Create, shuffle, and assign 52-card decks to players

import type { Card } from '../types/index.js';

export type Suit = Card['suit'];
export type Rank = Card['rank'];

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

/**
 * Creates a standard 52-card deck for a player.
 * Each card has a unique combination of suit and rank,
 * with the deckId identifying the player who owns this deck.
 *
 * @param deckId - Unique identifier for this deck (player's deck ID)
 * @returns Array of 52 cards belonging to this deck
 */
export function createDeck(deckId: string): Card[] {
  const cards: Card[] = [];

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({ suit, rank, deckId });
    }
  }

  return cards;
}

/**
 * Shuffles an array of cards in-place using the Fisher-Yates algorithm.
 * This provides a truly random, unbiased shuffle.
 *
 * @param cards - Array of cards to shuffle
 * @returns The same array, shuffled in-place
 */
export function shuffleDeck<T>(cards: T[]): T[] {
  // Fisher-Yates shuffle (Knuth shuffle)
  // Work from the end of the array backward
  for (let i = cards.length - 1; i > 0; i--) {
    // Pick a random index from 0 to i (inclusive)
    const j = Math.floor(Math.random() * (i + 1));
    // Swap cards[i] and cards[j]
    const temp = cards[i];
    cards[i] = cards[j] as T;
    cards[j] = temp as T;
  }
  return cards;
}

/**
 * Creates a shuffled deck for a single player.
 * Combines createDeck and shuffleDeck for convenience.
 *
 * @param deckId - Unique identifier for this deck
 * @returns A shuffled 52-card deck
 */
export function createShuffledDeck(deckId: string): Card[] {
  return shuffleDeck(createDeck(deckId));
}

/**
 * Creates shuffled decks for multiple players.
 * Returns a Map from player ID to their shuffled deck.
 *
 * @param playerIds - Array of player IDs
 * @returns Map from player ID to their shuffled deck of cards
 */
export function createPlayerDecks(playerIds: string[]): Map<string, Card[]> {
  const decks = new Map<string, Card[]>();

  for (const playerId of playerIds) {
    decks.set(playerId, createShuffledDeck(playerId));
  }

  return decks;
}

/**
 * Gets the display name for a card rank.
 *
 * @param rank - The card rank (1-13)
 * @returns Human-readable rank name
 */
export function getRankName(rank: Rank): string {
  switch (rank) {
    case 1:
      return 'Ace';
    case 11:
      return 'Jack';
    case 12:
      return 'Queen';
    case 13:
      return 'King';
    default:
      return String(rank);
  }
}

/**
 * Gets a display string for a card (e.g., "Ace of Hearts").
 *
 * @param card - The card to display
 * @returns Human-readable card description
 */
export function getCardDisplayName(card: Card): string {
  const rankName = getRankName(card.rank);
  const suitName = card.suit.charAt(0).toUpperCase() + card.suit.slice(1);
  return `${rankName} of ${suitName}`;
}

/**
 * Checks if a card is red (hearts or diamonds).
 *
 * @param card - The card to check
 * @returns true if the card is red
 */
export function isRedCard(card: Card): boolean {
  return card.suit === 'hearts' || card.suit === 'diamonds';
}

/**
 * Checks if a card is black (clubs or spades).
 *
 * @param card - The card to check
 * @returns true if the card is black
 */
export function isBlackCard(card: Card): boolean {
  return card.suit === 'clubs' || card.suit === 'spades';
}

// Export constants for external use
export const DECK_SIZE = 52;
export const ALL_SUITS = SUITS;
export const ALL_RANKS = RANKS;
