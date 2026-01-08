import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { NertzPile } from '../NertzPile';
import type { Card } from '@heyhey/shared';

/**
 * The NertzPile component displays a player's Nertz pile during gameplay.
 *
 * ## Features
 * - Displays a stack with the top card face-up
 * - Click to select the top card
 * - Visual indicator when the pile is empty (game-winning condition!)
 * - Card count badge showing remaining cards
 *
 * ## Game Context
 * In Nertz, each player has a Nertz pile of 13 cards (or 10 in variant rules).
 * The goal is to be the first to empty your Nertz pile by playing cards to
 * foundation piles in the center.
 */
const meta: Meta<typeof NertzPile> = {
  title: 'Components/Game/NertzPile',
  component: NertzPile,
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
        component: 'Displays a player\'s Nertz pile with top card face-up and selection support.',
      },
    },
  },
  argTypes: {
    cards: {
      description: 'Array of card objects in the pile (bottom to top order)',
      control: false,
    },
    backColor: {
      description: 'Player\'s card back color',
      control: 'select',
      options: ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'teal'],
    },
    selected: {
      description: 'Whether the top card is selected',
      control: 'boolean',
    },
    disabled: {
      description: 'Whether the pile is disabled',
      control: 'boolean',
    },
  },
  args: {
    onTopCardClick: fn(),
    onTopCardDoubleClick: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof NertzPile>;

// Helper to create a sequence of cards
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
const createCards = (count: number, startRank: number = 1): Card[] =>
  Array.from({ length: count }, (_, i) => ({
    suit: SUITS[i % 4]!,
    rank: ((startRank + i - 1) % 13) + 1,
    deckId: 'player-1',
  }));

/**
 * Default Nertz pile with 13 cards.
 */
export const Default: Story = {
  args: {
    cards: createCards(13),
    backColor: 'blue',
  },
};

/**
 * Nertz pile with top card selected.
 */
export const Selected: Story = {
  args: {
    cards: createCards(13),
    backColor: 'blue',
    selected: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'When the top card is selected, it shows a visual highlight indicating it\'s ready to be played.',
      },
    },
  },
};

/**
 * Disabled Nertz pile (cannot be clicked).
 */
export const Disabled: Story = {
  args: {
    cards: createCards(13),
    backColor: 'blue',
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'A disabled pile cannot be interacted with. This might be used during animations or opponent turns.',
      },
    },
  },
};

/**
 * Empty Nertz pile - you win!
 */
export const Empty: Story = {
  args: {
    cards: [],
    backColor: 'blue',
  },
  parameters: {
    docs: {
      description: {
        story: 'When the Nertz pile is empty, a pulsing indicator shows that the player has won the round! The goal of Nertz is to empty this pile.',
      },
    },
  },
};

/**
 * Nertz pile with only one card remaining.
 */
export const OneCardLeft: Story = {
  args: {
    cards: createCards(1, 7),
    backColor: 'blue',
  },
  parameters: {
    docs: {
      description: {
        story: 'When only one card remains, there\'s no stack beneath - just the single face-up card.',
      },
    },
  },
};

/**
 * Nertz pile with 3 cards remaining - almost there!
 */
export const AlmostEmpty: Story = {
  args: {
    cards: createCards(3),
    backColor: 'blue',
  },
  parameters: {
    docs: {
      description: {
        story: 'With only a few cards left, the player is close to winning the round.',
      },
    },
  },
};

/**
 * Nertz pile with 10 cards (variant rule).
 */
export const TenCardVariant: Story = {
  args: {
    cards: createCards(10),
    backColor: 'green',
  },
  parameters: {
    docs: {
      description: {
        story: 'Some Nertz variants use a 10-card Nertz pile instead of 13 for faster games.',
      },
    },
  },
};

/**
 * Multiple player Nertz piles with different colors.
 */
export const MultiplePlayerPiles: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
      {(['red', 'blue', 'green', 'yellow'] as const).map((color, i) => (
        <div key={color} style={{ textAlign: 'center' }}>
          <NertzPile
            cards={createCards(13 - i * 3)}
            backColor={color}
          />
          <p style={{ marginTop: '24px', fontSize: '12px', color: 'rgba(255,255,255,0.7)', textTransform: 'capitalize' }}>
            Player {i + 1}
          </p>
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Each player has their own Nertz pile with distinct card back colors. Notice how the card count varies as players make progress.',
      },
    },
  },
};

/**
 * Nertz pile states during a game.
 */
export const GameProgressStates: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '48px', alignItems: 'flex-start' }}>
      <div style={{ textAlign: 'center' }}>
        <NertzPile cards={createCards(13)} backColor="blue" />
        <p style={{ marginTop: '24px', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
          Full (13)
        </p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <NertzPile cards={createCards(7)} backColor="blue" />
        <p style={{ marginTop: '24px', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
          Half (7)
        </p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <NertzPile cards={createCards(2)} backColor="blue" />
        <p style={{ marginTop: '24px', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
          Almost! (2)
        </p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <NertzPile cards={[]} backColor="blue" />
        <p style={{ marginTop: '24px', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
          Empty - WIN!
        </p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Shows the visual progression as a player empties their Nertz pile during a round.',
      },
    },
  },
};

/**
 * Interactive story showing click behavior.
 */
export const Interactive: Story = {
  args: {
    cards: createCards(8),
    backColor: 'purple',
    selected: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Click the top card to see the click handler in action. Check the Actions panel below.',
      },
    },
  },
};
