import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { StockPile } from '../StockPile';
import type { Card } from '@heyhey/shared';

/**
 * The StockPile component displays the face-down draw pile.
 * Click to draw cards to the waste pile.
 *
 * ## Features
 * - Face-down card display with stacking effect
 * - Click to draw (triggers onDraw callback)
 * - Empty state with recycle indicator
 * - Card count display
 * - Multiple player back colors
 *
 * ## Interactions
 * - Click when cards available → draw cards
 * - Click when empty + canRecycle → recycle waste pile
 */
const meta: Meta<typeof StockPile> = {
  title: 'Components/Player/StockPile',
  component: StockPile,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        component: 'Face-down draw pile. Click to draw cards to waste.',
      },
    },
  },
  argTypes: {
    cards: {
      description: 'Array of cards in the stock pile',
      control: false,
    },
    backColor: {
      description: 'Card back color for this player',
      control: 'select',
      options: ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'teal'],
    },
    disabled: {
      description: 'Whether clicking is disabled',
      control: 'boolean',
    },
    canRecycle: {
      description: 'Whether waste can be recycled (when stock empty)',
      control: 'boolean',
    },
    showLabel: {
      description: 'Show "Stock" label above the pile',
      control: 'boolean',
    },
  },
  args: {
    onDraw: fn(),
    onRecycle: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof StockPile>;

// Helper to create a sequence of cards
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
const createCards = (count: number, startRank: number = 1): Card[] =>
  Array.from({ length: count }, (_, i) => ({
    suit: SUITS[i % 4]!,
    rank: ((startRank + i - 1) % 13) + 1,
    deckId: 'player-1',
  }));

/**
 * Default stock pile with cards.
 */
export const Default: Story = {
  args: {
    cards: createCards(24),
    backColor: 'blue',
  },
};

/**
 * Stock pile with different card counts.
 */
export const CardCounts: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
      {[24, 12, 5, 1].map((count) => (
        <StockPile
          key={count}
          cards={createCards(count)}
          backColor="blue"
        />
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Stock piles with varying card counts. The stack effect shows 3 cards maximum.',
      },
    },
  },
};

/**
 * Empty stock pile - cannot recycle.
 */
export const Empty: Story = {
  args: {
    cards: [],
    backColor: 'blue',
    canRecycle: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Empty stock pile when waste cannot be recycled yet.',
      },
    },
  },
};

/**
 * Empty stock pile - can recycle waste.
 */
export const EmptyCanRecycle: Story = {
  args: {
    cards: [],
    backColor: 'blue',
    canRecycle: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Empty stock pile with recycle indicator. Click to recycle waste back to stock.',
      },
    },
  },
};

/**
 * Disabled stock pile.
 */
export const Disabled: Story = {
  args: {
    cards: createCards(15),
    backColor: 'blue',
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Stock pile in disabled state. Cannot click to draw.',
      },
    },
  },
};

/**
 * Different player back colors.
 */
export const PlayerColors: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
      {(['red', 'blue', 'green', 'yellow', 'purple', 'teal'] as const).map((color) => (
        <StockPile
          key={color}
          cards={createCards(20)}
          backColor={color}
        />
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Stock piles with different player back colors.',
      },
    },
  },
};

/**
 * Without label.
 */
export const NoLabel: Story = {
  args: {
    cards: createCards(18),
    backColor: 'blue',
    showLabel: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Stock pile without the "Stock" label.',
      },
    },
  },
};

/**
 * Interactive example with state.
 */
export const Interactive: Story = {
  render: function InteractiveStock() {
    const [cards, setCards] = React.useState(createCards(24));
    const [waste, setWaste] = React.useState<Card[]>([]);

    const handleDraw = () => {
      if (cards.length === 0) return;
      const drawCount = Math.min(3, cards.length);
      const drawn = cards.slice(-drawCount);
      setCards(cards.slice(0, -drawCount));
      setWaste([...waste, ...drawn]);
    };

    const handleRecycle = () => {
      setCards([...waste].reverse());
      setWaste([]);
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
        <StockPile
          cards={cards}
          backColor="blue"
          canRecycle={cards.length === 0 && waste.length > 0}
          onDraw={handleDraw}
          onRecycle={handleRecycle}
        />
        <p style={{ color: '#999', fontSize: '12px' }}>
          Waste: {waste.length} cards
        </p>
        <button
          onClick={() => {
            setCards(createCards(24));
            setWaste([]);
          }}
          style={{ padding: '8px 16px', cursor: 'pointer' }}
        >
          Reset
        </button>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive demo. Click to draw 3 cards. When empty, click to recycle waste.',
      },
    },
  },
};

// Import React for the interactive story
import * as React from 'react';
