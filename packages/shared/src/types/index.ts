// HeyHey! Type Definitions
// Placeholder - will be expanded in HEYHEY-003

export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: number; // 1-13 (Ace=1, King=13)
  deckId: string; // Unique identifier for the player's deck
}

export interface Player {
  id: string;
  name: string;
  deckId: string;
}

export interface GameConfig {
  nertzPileSize: 10 | 13;
  drawCount: 1 | 3;
  targetScore: number;
}

export type GamePhase = 'lobby' | 'setup' | 'playing' | 'scoring' | 'finished';
