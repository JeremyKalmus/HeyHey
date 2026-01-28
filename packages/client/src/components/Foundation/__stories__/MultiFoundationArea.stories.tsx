import type { Meta, StoryObj } from '@storybook/react';
import type { Card as CardType, FoundationPile } from '@heyhey/shared';
import { MultiFoundationArea, type PlayerFoundationGroup } from '../MultiFoundationArea';
import type { PlayerColor } from '../../Card/CardBack';

/**
 * MultiFoundationArea displays N×4 foundation piles for multiplayer games.
 *
 * Layout rules:
 * - 2 players: 1 row × 2 columns, normal card size
 * - 3-4 players: 2 rows × 2 columns
 * - 5-6 players: 2 rows × 3 columns, scaled down
 * - 7-8 players: 2 rows × 4 columns, scaled down more
 *
 * The foundation area should NEVER scroll - cards scale to fit.
 */
const meta: Meta<typeof MultiFoundationArea> = {
  title: 'Game/MultiFoundationArea',
  component: MultiFoundationArea,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'dark',
      values: [{ name: 'dark', value: '#1a1a2e' }],
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '100%', maxWidth: '800px', padding: '20px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MultiFoundationArea>;

// Helper to create cards
function createCard(suit: 'hearts' | 'diamonds' | 'clubs' | 'spades', rank: number, deckId = 'p1'): CardType {
  return { suit, rank, deckId };
}

// Helper to create foundation piles for a player
function createPiles(ownerId: string, hearts = 0, diamonds = 0, clubs = 0, spades = 0): FoundationPile[] {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
  const ranks = [hearts, diamonds, clubs, spades];

  return suits.map((suit, i) => ({
    suit,
    ownerId,
    cards: Array.from({ length: ranks[i] }, (_, j) => createCard(suit, j + 1, ownerId)),
  }));
}

// Helper to create a player foundation group
function createPlayerGroup(
  id: string,
  name: string,
  color: PlayerColor,
  hearts = 0,
  diamonds = 0,
  clubs = 0,
  spades = 0
): PlayerFoundationGroup {
  return {
    playerId: id,
    playerName: name,
    playerColor: color,
    piles: createPiles(id, hearts, diamonds, clubs, spades),
  };
}

const COLORS: PlayerColor[] = ['blue', 'red', 'green', 'orange', 'purple', 'pink', 'teal', 'yellow'];
const NAMES = ['You', 'Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace'];

// Generate N player groups
function generatePlayers(count: number): PlayerFoundationGroup[] {
  return Array.from({ length: count }, (_, i) =>
    createPlayerGroup(`p${i + 1}`, NAMES[i] ?? `Player ${i + 1}`, COLORS[i] ?? 'blue',
      Math.floor(Math.random() * 6),
      Math.floor(Math.random() * 6),
      Math.floor(Math.random() * 6),
      Math.floor(Math.random() * 6)
    )
  );
}

/**
 * 2 Players - 1 row × 2 columns, normal card size
 */
export const TwoPlayers: Story = {
  args: {
    playerGroups: generatePlayers(2),
  },
};

/**
 * 3 Players - 2 rows × 2 columns
 */
export const ThreePlayers: Story = {
  args: {
    playerGroups: generatePlayers(3),
  },
};

/**
 * 4 Players - 2 rows × 2 columns
 */
export const FourPlayers: Story = {
  args: {
    playerGroups: generatePlayers(4),
  },
};

/**
 * 5 Players - 2 rows × 3 columns, scaled down
 */
export const FivePlayers: Story = {
  args: {
    playerGroups: generatePlayers(5),
  },
};

/**
 * 6 Players - 2 rows × 3 columns, scaled down
 */
export const SixPlayers: Story = {
  args: {
    playerGroups: generatePlayers(6),
  },
};

/**
 * 7 Players - 2 rows × 4 columns, scaled down more
 */
export const SevenPlayers: Story = {
  args: {
    playerGroups: generatePlayers(7),
  },
};

/**
 * 8 Players - 2 rows × 4 columns, scaled down more
 * Maximum supported player count.
 */
export const EightPlayers: Story = {
  args: {
    playerGroups: generatePlayers(8),
  },
};

/**
 * Side-by-side comparison of all layout sizes
 */
export const AllSizesComparison: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', alignItems: 'center' }}>
      <div>
        <h3 style={{ color: '#FFD23F', marginBottom: '8px' }}>2 Players (1×2)</h3>
        <MultiFoundationArea playerGroups={generatePlayers(2)} />
      </div>
      <div>
        <h3 style={{ color: '#FFD23F', marginBottom: '8px' }}>4 Players (2×2)</h3>
        <MultiFoundationArea playerGroups={generatePlayers(4)} />
      </div>
      <div>
        <h3 style={{ color: '#FFD23F', marginBottom: '8px' }}>6 Players (2×3 scaled)</h3>
        <MultiFoundationArea playerGroups={generatePlayers(6)} />
      </div>
      <div>
        <h3 style={{ color: '#FFD23F', marginBottom: '8px' }}>8 Players (2×4 scaled)</h3>
        <MultiFoundationArea playerGroups={generatePlayers(8)} />
      </div>
    </div>
  ),
};

/**
 * Constrained width - tests that foundations scale properly
 * in a narrow container (like on mobile or when work piles are long)
 */
export const ConstrainedWidth: Story = {
  render: () => (
    <div style={{ width: '400px', border: '2px dashed #666', padding: '8px' }}>
      <p style={{ color: '#888', fontSize: '12px', marginBottom: '8px' }}>400px container</p>
      <MultiFoundationArea playerGroups={generatePlayers(6)} />
    </div>
  ),
};
