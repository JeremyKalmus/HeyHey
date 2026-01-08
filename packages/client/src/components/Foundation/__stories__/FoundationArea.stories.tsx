import type { Meta, StoryObj } from '@storybook/react';
import type { Card as CardType } from '@heyhey/shared';
import { FoundationArea, type FoundationPile, type Suit } from '../FoundationArea';

const meta: Meta<typeof FoundationArea> = {
  title: 'Game/FoundationArea',
  component: FoundationArea,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'dark',
      values: [{ name: 'dark', value: '#1a1a2e' }],
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof FoundationArea>;

// Helper to create a card
function createCard(suit: Suit, rank: number, deckId = 'player-1'): CardType {
  return { suit, rank, deckId };
}

// Helper to create foundation piles with given top ranks (0 = empty)
function createPiles(hearts: number, diamonds: number, clubs: number, spades: number): FoundationPile[] {
  const makePile = (suit: Suit, topRank: number): FoundationPile => {
    const cards: CardType[] = [];
    for (let rank = 1; rank <= topRank; rank++) {
      cards.push(createCard(suit, rank));
    }
    return { suit, cards };
  };

  return [
    makePile('hearts', hearts),
    makePile('diamonds', diamonds),
    makePile('clubs', clubs),
    makePile('spades', spades),
  ];
}

// Empty foundations - game start
export const Empty: Story = {
  args: {
    piles: createPiles(0, 0, 0, 0),
  },
};

// Some cards played
export const PartiallyFilled: Story = {
  args: {
    piles: createPiles(3, 1, 5, 0),
  },
};

// Various progress on each pile
export const MixedProgress: Story = {
  args: {
    piles: createPiles(7, 2, 10, 4),
  },
};

// All piles have aces
export const AllAces: Story = {
  args: {
    piles: createPiles(1, 1, 1, 1),
  },
};

// Near complete game
export const NearComplete: Story = {
  args: {
    piles: createPiles(13, 11, 12, 10),
  },
};

// All piles complete (Kings)
export const AllComplete: Story = {
  args: {
    piles: createPiles(13, 13, 13, 13),
  },
};

// With selected card - showing valid target
export const WithSelectedCardValidTarget: Story = {
  args: {
    piles: createPiles(3, 0, 2, 5),
    selectedCard: createCard('diamonds', 1), // Ace of diamonds - valid for empty pile
    canPlace: true,
    onPileClick: (suit) => console.log(`Clicked ${suit} pile!`),
  },
};

// With selected card - can build on existing
export const WithSelectedCardBuildUp: Story = {
  args: {
    piles: createPiles(3, 2, 5, 1),
    selectedCard: createCard('hearts', 4), // 4 of hearts - valid for hearts (has 3)
    canPlace: true,
    onPileClick: (suit) => console.log(`Clicked ${suit} pile!`),
  },
};

// With selected card - no valid targets
export const WithSelectedCardNoValidTargets: Story = {
  args: {
    piles: createPiles(3, 2, 5, 1),
    selectedCard: createCard('clubs', 8), // 8 of clubs - clubs has 5, need 6
    canPlace: true,
    onPileClick: (suit) => console.log(`Clicked ${suit} pile!`),
  },
};

// Compact mode
export const Compact: Story = {
  args: {
    piles: createPiles(5, 3, 8, 2),
    compact: true,
  },
};

// Interactive story with action handlers
export const Interactive: Story = {
  args: {
    piles: createPiles(2, 0, 4, 1),
    selectedCard: createCard('diamonds', 1),
    canPlace: true,
    onPileClick: (suit) => alert(`Placing card on ${suit} foundation!`),
  },
};
