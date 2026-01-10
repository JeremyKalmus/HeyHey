import type { Meta, StoryObj } from '@storybook/react-vite';
import { OpponentMini } from '../OpponentMini';
import type { PlayerGameState, Card } from '@heyhey/shared';

/**
 * The OpponentMini component displays a compact view of an opponent's game state.
 *
 * ## Features
 * - Shows player avatar and name
 * - Prominent Nertz pile count (most important!)
 * - Secondary pile counts (stock, waste, work piles)
 * - Activity indicator when opponent is making moves
 * - Color-coded border matching player's deck color
 *
 * ## Game Context
 * During multiplayer Nertz, players need to monitor opponents' progress.
 * The Nertz pile count is critical - when an opponent's pile is low,
 * they're close to winning!
 */
const meta: Meta<typeof OpponentMini> = {
  title: 'Components/Game/OpponentMini',
  component: OpponentMini,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#1a1a2e' },
        { name: 'green felt', value: '#1a472a' },
      ],
    },
    docs: {
      description: {
        component: 'Compact display of opponent\'s game state with card counts and activity indicator.',
      },
    },
  },
  argTypes: {
    color: {
      description: 'Player\'s deck color',
      control: 'select',
      options: ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'teal'],
    },
    avatar: {
      description: 'Player avatar emoji',
      control: 'text',
    },
    name: {
      description: 'Player display name',
      control: 'text',
    },
    isActive: {
      description: 'Shows activity indicator when true',
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof OpponentMini>;

// Helper to create cards for testing
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
const createCards = (count: number): Card[] =>
  Array.from({ length: count }, (_, i) => ({
    suit: SUITS[i % 4]!,
    rank: (i % 13) + 1,
    deckId: 'opponent-1',
  }));

// Helper to create player game state
const createPlayerState = (opts: {
  nertz?: number;
  stock?: number;
  waste?: number;
  work?: number[];
}): PlayerGameState => ({
  playerId: 'opp-1',
  deckId: 'deck-1',
  nertzPile: createCards(opts.nertz ?? 13),
  stockPile: createCards(opts.stock ?? 35),
  wastePile: createCards(opts.waste ?? 0),
  workPiles: (opts.work ?? [1, 1, 1, 1]).map(count => createCards(count)),
});

/**
 * Default opponent display with full Nertz pile.
 */
export const Default: Story = {
  args: {
    playerState: createPlayerState({}),
    name: 'Alice',
    avatar: '😎',
    color: 'red',
  },
};

/**
 * Opponent with activity indicator showing recent move.
 */
export const Active: Story = {
  args: {
    playerState: createPlayerState({ nertz: 10 }),
    name: 'Bob',
    avatar: '🤠',
    color: 'blue',
    isActive: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'The pulsing green dot indicates this opponent just made a move.',
      },
    },
  },
};

/**
 * Opponent close to winning - Nertz pile is low!
 */
export const Danger: Story = {
  args: {
    playerState: createPlayerState({ nertz: 3, stock: 20, waste: 3, work: [3, 4, 5, 2] }),
    name: 'Charlie',
    avatar: '🔥',
    color: 'orange',
    isActive: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'When Nertz pile is 3 or fewer, the count pulses orange to warn you!',
      },
    },
  },
};

/**
 * Opponent has called Nertz - they won!
 */
export const Won: Story = {
  args: {
    playerState: createPlayerState({ nertz: 0, stock: 15, waste: 5, work: [5, 6, 4, 5] }),
    name: 'Diana',
    avatar: '🏆',
    color: 'yellow',
  },
  parameters: {
    docs: {
      description: {
        story: 'Nertz pile is empty - this opponent has won the round!',
      },
    },
  },
};

/**
 * Multiple opponents in a 4-player game.
 */
export const MultipleOpponents: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
      <OpponentMini
        playerState={createPlayerState({ nertz: 10 })}
        name="Alice"
        avatar="😀"
        color="red"
      />
      <OpponentMini
        playerState={createPlayerState({ nertz: 7, stock: 25, waste: 5 })}
        name="Bob"
        avatar="😎"
        color="blue"
        isActive={true}
      />
      <OpponentMini
        playerState={createPlayerState({ nertz: 3 })}
        name="Charlie"
        avatar="🤠"
        color="green"
      />
      <OpponentMini
        playerState={createPlayerState({ nertz: 12 })}
        name="Diana"
        avatar="🥳"
        color="purple"
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'In a multiplayer game, you can see all opponents at a glance. Notice Charlie is about to win!',
      },
    },
  },
};

/**
 * All player colors.
 */
export const AllColors: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
      {(['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'teal'] as const).map((color, i) => (
        <OpponentMini
          key={color}
          playerState={createPlayerState({ nertz: 13 - i })}
          name={color.charAt(0).toUpperCase() + color.slice(1)}
          avatar={['😀', '😎', '🤠', '🥳', '😺', '🐶', '🦊', '🐸'][i]}
          color={color}
        />
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All available player colors. Each color subtly tints the border.',
      },
    },
  },
};

/**
 * Long player name handling.
 */
export const LongName: Story = {
  args: {
    playerState: createPlayerState({}),
    name: 'SomeSuperLongPlayerName123',
    avatar: '👽',
    color: 'teal',
  },
  parameters: {
    docs: {
      description: {
        story: 'Long names are truncated with ellipsis to maintain compact layout.',
      },
    },
  },
};
