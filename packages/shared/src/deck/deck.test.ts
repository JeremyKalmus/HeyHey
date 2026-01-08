import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createDeck,
  shuffleDeck,
  createShuffledDeck,
  createPlayerDecks,
  getRankName,
  getCardDisplayName,
  isRedCard,
  isBlackCard,
  DECK_SIZE,
  ALL_SUITS,
  ALL_RANKS,
} from './index.js';
import type { Card } from '../types/index.js';

describe('createDeck', () => {
  it('creates a deck with exactly 52 cards', () => {
    const deck = createDeck('player-1');
    expect(deck).toHaveLength(52);
  });

  it('assigns the correct deckId to all cards', () => {
    const deckId = 'player-123';
    const deck = createDeck(deckId);
    expect(deck.every((card) => card.deckId === deckId)).toBe(true);
  });

  it('creates cards with all four suits', () => {
    const deck = createDeck('player-1');
    const suits = new Set(deck.map((card) => card.suit));
    expect(suits).toEqual(new Set(['hearts', 'diamonds', 'clubs', 'spades']));
  });

  it('creates cards with all 13 ranks', () => {
    const deck = createDeck('player-1');
    const ranks = new Set(deck.map((card) => card.rank));
    expect(ranks).toEqual(new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]));
  });

  it('has exactly 13 cards per suit', () => {
    const deck = createDeck('player-1');
    for (const suit of ALL_SUITS) {
      const suitCards = deck.filter((card) => card.suit === suit);
      expect(suitCards).toHaveLength(13);
    }
  });

  it('has no duplicate cards', () => {
    const deck = createDeck('player-1');
    const cardStrings = deck.map((c) => `${c.suit}-${c.rank}`);
    const uniqueCards = new Set(cardStrings);
    expect(uniqueCards.size).toBe(52);
  });
});

describe('shuffleDeck', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the same array (mutates in place)', () => {
    const deck = createDeck('player-1');
    const result = shuffleDeck(deck);
    expect(result).toBe(deck);
  });

  it('maintains all cards after shuffle', () => {
    const deck = createDeck('player-1');
    const originalCards = deck.map((c) => `${c.suit}-${c.rank}-${c.deckId}`);
    shuffleDeck(deck);
    const shuffledCards = deck.map((c) => `${c.suit}-${c.rank}-${c.deckId}`);
    expect(shuffledCards.sort()).toEqual(originalCards.sort());
  });

  it('changes card order (with random Math.random)', () => {
    // Create two identical decks
    const deck1 = createDeck('player-1');
    const deck2 = createDeck('player-1');

    // Get original order
    const original = deck1.map((c) => `${c.suit}-${c.rank}`).join(',');

    // Shuffle one deck
    shuffleDeck(deck2);
    const shuffled = deck2.map((c) => `${c.suit}-${c.rank}`).join(',');

    // Should be different (extremely unlikely to be same with true randomness)
    expect(shuffled).not.toEqual(original);
  });

  it('uses Fisher-Yates algorithm correctly', () => {
    // Mock Math.random to return predictable values
    const randomValues = [0.1, 0.2, 0.3, 0.4, 0.5];
    let callIndex = 0;
    vi.mocked(Math.random).mockImplementation((): number => {
      const value = randomValues[callIndex % randomValues.length]!;
      callIndex++;
      return value;
    });

    const testArray = [1, 2, 3, 4, 5];
    shuffleDeck(testArray);

    // Fisher-Yates should make exactly n-1 swaps (for array of length n)
    expect(Math.random).toHaveBeenCalledTimes(4);
  });

  it('handles empty array', () => {
    const empty: Card[] = [];
    const result = shuffleDeck(empty);
    expect(result).toEqual([]);
    expect(result).toBe(empty);
  });

  it('handles single element array', () => {
    const single: Card[] = [{ suit: 'hearts', rank: 1, deckId: 'test' }];
    const result = shuffleDeck(single);
    expect(result).toEqual([{ suit: 'hearts', rank: 1, deckId: 'test' }]);
  });
});

describe('createShuffledDeck', () => {
  it('creates a shuffled deck with 52 cards', () => {
    const deck = createShuffledDeck('player-1');
    expect(deck).toHaveLength(52);
  });

  it('assigns the correct deckId', () => {
    const deckId = 'player-xyz';
    const deck = createShuffledDeck(deckId);
    expect(deck.every((card) => card.deckId === deckId)).toBe(true);
  });

  it('produces different orderings on subsequent calls', () => {
    const deck1 = createShuffledDeck('player-1');
    const deck2 = createShuffledDeck('player-1');

    const order1 = deck1.map((c) => `${c.suit}-${c.rank}`).join(',');
    const order2 = deck2.map((c) => `${c.suit}-${c.rank}`).join(',');

    // Very unlikely to be the same
    expect(order1).not.toEqual(order2);
  });
});

describe('createPlayerDecks', () => {
  it('creates decks for all players', () => {
    const playerIds = ['alice', 'bob', 'charlie'];
    const decks = createPlayerDecks(playerIds);

    expect(decks.size).toBe(3);
    expect(decks.has('alice')).toBe(true);
    expect(decks.has('bob')).toBe(true);
    expect(decks.has('charlie')).toBe(true);
  });

  it('assigns correct deckId to each player deck', () => {
    const playerIds = ['player-1', 'player-2'];
    const decks = createPlayerDecks(playerIds);

    const player1Deck = decks.get('player-1')!;
    const player2Deck = decks.get('player-2')!;

    expect(player1Deck.every((c) => c.deckId === 'player-1')).toBe(true);
    expect(player2Deck.every((c) => c.deckId === 'player-2')).toBe(true);
  });

  it('each deck has 52 cards', () => {
    const playerIds = ['a', 'b', 'c', 'd'];
    const decks = createPlayerDecks(playerIds);

    for (const playerId of playerIds) {
      expect(decks.get(playerId)).toHaveLength(52);
    }
  });

  it('handles empty player list', () => {
    const decks = createPlayerDecks([]);
    expect(decks.size).toBe(0);
  });

  it('each deck is shuffled independently', () => {
    const decks = createPlayerDecks(['p1', 'p2']);
    const deck1 = decks.get('p1')!;
    const deck2 = decks.get('p2')!;

    // Compare just ranks at each position (suits may differ due to deckId)
    const order1 = deck1.map((c) => `${c.suit}-${c.rank}`).join(',');
    const order2 = deck2.map((c) => `${c.suit}-${c.rank}`).join(',');

    expect(order1).not.toEqual(order2);
  });
});

describe('getRankName', () => {
  it('returns "Ace" for rank 1', () => {
    expect(getRankName(1)).toBe('Ace');
  });

  it('returns "Jack" for rank 11', () => {
    expect(getRankName(11)).toBe('Jack');
  });

  it('returns "Queen" for rank 12', () => {
    expect(getRankName(12)).toBe('Queen');
  });

  it('returns "King" for rank 13', () => {
    expect(getRankName(13)).toBe('King');
  });

  it('returns number string for pip cards', () => {
    expect(getRankName(2)).toBe('2');
    expect(getRankName(5)).toBe('5');
    expect(getRankName(10)).toBe('10');
  });
});

describe('getCardDisplayName', () => {
  it('formats Ace of Hearts correctly', () => {
    const card: Card = { suit: 'hearts', rank: 1, deckId: 'test' };
    expect(getCardDisplayName(card)).toBe('Ace of Hearts');
  });

  it('formats King of Spades correctly', () => {
    const card: Card = { suit: 'spades', rank: 13, deckId: 'test' };
    expect(getCardDisplayName(card)).toBe('King of Spades');
  });

  it('formats pip card correctly', () => {
    const card: Card = { suit: 'diamonds', rank: 7, deckId: 'test' };
    expect(getCardDisplayName(card)).toBe('7 of Diamonds');
  });

  it('capitalizes suit name', () => {
    const card: Card = { suit: 'clubs', rank: 2, deckId: 'test' };
    expect(getCardDisplayName(card)).toBe('2 of Clubs');
  });
});

describe('isRedCard', () => {
  it('returns true for hearts', () => {
    const card: Card = { suit: 'hearts', rank: 5, deckId: 'test' };
    expect(isRedCard(card)).toBe(true);
  });

  it('returns true for diamonds', () => {
    const card: Card = { suit: 'diamonds', rank: 10, deckId: 'test' };
    expect(isRedCard(card)).toBe(true);
  });

  it('returns false for clubs', () => {
    const card: Card = { suit: 'clubs', rank: 1, deckId: 'test' };
    expect(isRedCard(card)).toBe(false);
  });

  it('returns false for spades', () => {
    const card: Card = { suit: 'spades', rank: 13, deckId: 'test' };
    expect(isRedCard(card)).toBe(false);
  });
});

describe('isBlackCard', () => {
  it('returns true for clubs', () => {
    const card: Card = { suit: 'clubs', rank: 3, deckId: 'test' };
    expect(isBlackCard(card)).toBe(true);
  });

  it('returns true for spades', () => {
    const card: Card = { suit: 'spades', rank: 8, deckId: 'test' };
    expect(isBlackCard(card)).toBe(true);
  });

  it('returns false for hearts', () => {
    const card: Card = { suit: 'hearts', rank: 12, deckId: 'test' };
    expect(isBlackCard(card)).toBe(false);
  });

  it('returns false for diamonds', () => {
    const card: Card = { suit: 'diamonds', rank: 4, deckId: 'test' };
    expect(isBlackCard(card)).toBe(false);
  });
});

describe('constants', () => {
  it('DECK_SIZE is 52', () => {
    expect(DECK_SIZE).toBe(52);
  });

  it('ALL_SUITS contains all four suits', () => {
    expect(ALL_SUITS).toEqual(['hearts', 'diamonds', 'clubs', 'spades']);
  });

  it('ALL_RANKS contains 1-13', () => {
    expect(ALL_RANKS).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  });
});
