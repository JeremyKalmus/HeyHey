import type { Meta, StoryObj } from '@storybook/react';
import type { Card as CardType, SetupState } from '@heyhey/shared';
import { SetupArea } from '../SetupArea';

const meta: Meta<typeof SetupArea> = {
  title: 'Game/SetupArea',
  component: SetupArea,
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
type Story = StoryObj<typeof SetupArea>;

// Helper to create a deck of cards
function createDeck(deckId: string): CardType[] {
  const suits: CardType['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const cards: CardType[] = [];
  for (const suit of suits) {
    for (let rank = 1; rank <= 13; rank++) {
      cards.push({ suit, rank, deckId });
    }
  }
  return cards;
}

// Get a slice of cards from a full deck
function getCards(deck: CardType[], start: number, count: number): CardType[] {
  return deck.slice(start, start + count);
}

const fullDeck = createDeck('player-1');

// Initial state - before setup starts
export const IdleState: Story = {
  args: {
    state: 'idle' as SetupState,
    progress: {
      nertzCardsPlaced: 0,
      nertzFlipped: false,
      workPilesPlaced: 0,
    },
    deckCards: fullDeck,
    nertzPileCards: [],
    workPileCards: [[], [], [], []],
    backColor: 'blue',
    nertzPileSize: 13,
  },
};

// Placing Nertz cards - partially complete
export const PlacingNertzPartial: Story = {
  args: {
    state: 'placingNertz' as SetupState,
    progress: {
      nertzCardsPlaced: 7,
      nertzFlipped: false,
      workPilesPlaced: 0,
    },
    deckCards: getCards(fullDeck, 7, 45),
    nertzPileCards: getCards(fullDeck, 0, 7),
    workPileCards: [[], [], [], []],
    backColor: 'blue',
    nertzPileSize: 13,
  },
};

// Nertz pile complete, ready to flip
export const FlipNertzState: Story = {
  args: {
    state: 'flipNertz' as SetupState,
    progress: {
      nertzCardsPlaced: 13,
      nertzFlipped: false,
      workPilesPlaced: 0,
    },
    deckCards: getCards(fullDeck, 13, 39),
    nertzPileCards: getCards(fullDeck, 0, 13),
    workPileCards: [[], [], [], []],
    backColor: 'blue',
    nertzPileSize: 13,
  },
};

// Placing work piles - some placed
export const PlacingWorkPartial: Story = {
  args: {
    state: 'placingWork' as SetupState,
    progress: {
      nertzCardsPlaced: 13,
      nertzFlipped: true,
      workPilesPlaced: 2,
    },
    deckCards: getCards(fullDeck, 15, 37),
    nertzPileCards: getCards(fullDeck, 0, 13),
    workPileCards: [
      [fullDeck[13]!],
      [fullDeck[14]!],
      [],
      [],
    ],
    backColor: 'blue',
    nertzPileSize: 13,
  },
};

// Setup complete
export const CompleteState: Story = {
  args: {
    state: 'complete' as SetupState,
    progress: {
      nertzCardsPlaced: 13,
      nertzFlipped: true,
      workPilesPlaced: 4,
    },
    deckCards: getCards(fullDeck, 17, 35),
    nertzPileCards: getCards(fullDeck, 0, 13),
    workPileCards: [
      [fullDeck[13]!],
      [fullDeck[14]!],
      [fullDeck[15]!],
      [fullDeck[16]!],
    ],
    backColor: 'blue',
    nertzPileSize: 13,
  },
};

// Different player colors
export const DifferentColors: Story = {
  args: {
    state: 'placingWork' as SetupState,
    progress: {
      nertzCardsPlaced: 13,
      nertzFlipped: true,
      workPilesPlaced: 2,
    },
    deckCards: getCards(fullDeck, 15, 37),
    nertzPileCards: getCards(fullDeck, 0, 13),
    workPileCards: [
      [fullDeck[13]!],
      [fullDeck[14]!],
      [],
      [],
    ],
    backColor: 'purple',
    nertzPileSize: 13,
  },
};

// 10-card Nertz variant
export const TenCardNertz: Story = {
  args: {
    state: 'placingNertz' as SetupState,
    progress: {
      nertzCardsPlaced: 5,
      nertzFlipped: false,
      workPilesPlaced: 0,
    },
    deckCards: getCards(fullDeck, 5, 47),
    nertzPileCards: getCards(fullDeck, 0, 5),
    workPileCards: [[], [], [], []],
    backColor: 'green',
    nertzPileSize: 10,
  },
};

// Interactive story with action handlers
export const Interactive: Story = {
  args: {
    state: 'placingNertz' as SetupState,
    progress: {
      nertzCardsPlaced: 3,
      nertzFlipped: false,
      workPilesPlaced: 0,
    },
    deckCards: getCards(fullDeck, 3, 49),
    nertzPileCards: getCards(fullDeck, 0, 3),
    workPileCards: [[], [], [], []],
    backColor: 'teal',
    nertzPileSize: 13,
    onDeckClick: () => console.log('Deck clicked!'),
    onNertzPileClick: () => console.log('Nertz pile clicked!'),
    onWorkPileClick: (index) => console.log(`Work pile ${index + 1} clicked!`),
  },
};
