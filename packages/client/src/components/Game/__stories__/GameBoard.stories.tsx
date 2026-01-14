import type { Meta, StoryObj } from '@storybook/react';
import { GameBoard } from '../GameBoard';
import type { Card as CardType } from '@heyhey/shared';
import type { FoundationPile } from '../../Foundation';

// Helper to create cards
function createCard(suit: CardType['suit'], rank: number, deckId = 'deck-1'): CardType {
  return { suit, rank, deckId };
}

// Sample cards for the story
const sampleNertzPile: CardType[] = [
  createCard('hearts', 5),
  createCard('clubs', 8),
  createCard('diamonds', 3),
  createCard('spades', 11),
  createCard('hearts', 7),
  createCard('clubs', 2),
  createCard('diamonds', 9),
  createCard('spades', 4),
  createCard('hearts', 12),
  createCard('clubs', 6),
  createCard('diamonds', 1),
  createCard('spades', 10),
  createCard('hearts', 3),
];

const sampleWorkPiles: [CardType[], CardType[], CardType[], CardType[]] = [
  [createCard('spades', 13), createCard('hearts', 12), createCard('clubs', 11)],
  [createCard('diamonds', 10), createCard('spades', 9)],
  [createCard('hearts', 8), createCard('clubs', 7), createCard('diamonds', 6), createCard('spades', 5)],
  [createCard('clubs', 4)],
];

const sampleStockPile: CardType[] = [
  createCard('hearts', 1),
  createCard('diamonds', 2),
  createCard('clubs', 3),
  createCard('spades', 4),
  createCard('hearts', 5),
  createCard('diamonds', 6),
  createCard('clubs', 7),
  createCard('spades', 8),
  createCard('hearts', 9),
  createCard('diamonds', 10),
];

const sampleWastePile: CardType[] = [
  createCard('clubs', 11),
  createCard('spades', 12),
  createCard('hearts', 13),
];

const sampleFoundationPiles: FoundationPile[] = [
  { suit: 'hearts', cards: [createCard('hearts', 1), createCard('hearts', 2), createCard('hearts', 3)] },
  { suit: 'diamonds', cards: [createCard('diamonds', 1)] },
  { suit: 'clubs', cards: [] },
  { suit: 'spades', cards: [createCard('spades', 1), createCard('spades', 2)] },
];

const samplePlayers = [
  { name: 'PLAYER 1', score: 2500, color: 'cyan' as const, isActive: true },
  { name: 'PLAYER 2', score: 1800, color: 'orange' as const },
  { name: 'PLAYER 3', score: 2100, color: 'green' as const },
  { name: 'PLAYER 4', score: 950, color: 'pink' as const },
];

const meta: Meta<typeof GameBoard> = {
  title: 'Game/GameBoard',
  component: GameBoard,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ minHeight: '100vh', background: '#0a0a12' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof GameBoard>;

export const Default: Story = {
  args: {
    nertzPile: sampleNertzPile,
    workPiles: sampleWorkPiles,
    stockPile: sampleStockPile,
    wastePile: sampleWastePile,
    foundationPiles: sampleFoundationPiles,
    playerName: 'PLAYER 1',
    playerScore: 2500,
    playerColor: 'blue',
    players: samplePlayers,
    currentRound: 3,
    totalRounds: 10,
  },
};

export const NertzEmpty: Story = {
  args: {
    ...Default.args,
    nertzPile: [],
    canCallHeyHey: true,
  },
};

export const GameInProgress: Story = {
  args: {
    ...Default.args,
    selectedCard: {
      card: sampleWorkPiles[2][3]!,
      sourceType: 'workPile',
      sourcePileIndex: 2,
      cardIndex: 3,
    },
    validWorkDestinations: [0, 3],
  },
};

export const EmptyStock: Story = {
  args: {
    ...Default.args,
    stockPile: [],
    canRecycleStock: true,
  },
};

export const SinglePlayer: Story = {
  args: {
    ...Default.args,
    players: [],
  },
};

export const HighScore: Story = {
  args: {
    ...Default.args,
    playerScore: 99999,
    players: [
      { name: 'CHAMPION', score: 99999, color: 'green' as const, isActive: true },
      { name: 'PLAYER 2', score: 45000, color: 'cyan' as const },
    ],
    currentRound: 10,
    totalRounds: 10,
  },
};
