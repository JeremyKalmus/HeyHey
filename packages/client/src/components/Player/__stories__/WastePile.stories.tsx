import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { WastePile } from '../WastePile';
import type { Card } from '@heyhey/shared';

/**
 * The WastePile component displays face-up cards in a fanned arrangement.
 * Only the top card is clickable/selectable.
 *
 * ## Features
 * - Displays top cards fanned horizontally
 * - Only top card is interactive
 * - Selection state for the top card
 * - Configurable fan offset and max visible cards
 * - Card count display
 *
 * ## Interactions
 * - Click top card → select it for play
 * - Double-click top card → auto-play (e.g., to foundation)
 */
const meta: Meta<typeof WastePile> = {
  title: 'Components/Player/WastePile',
  component: WastePile,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        component: 'Face-up waste pile with fanned display. Click top card to select.',
      },
    },
  },
  argTypes: {
    cards: {
      description: 'Array of cards in the waste pile',
      control: false,
    },
    selectedIndex: {
      description: 'Index of selected card (only top card can be selected)',
      control: { type: 'number', min: -1 },
    },
    disabled: {
      description: 'Whether clicking is disabled',
      control: 'boolean',
    },
    maxVisible: {
      description: 'Maximum cards to show fanned (default: 3)',
      control: { type: 'number', min: 1, max: 5 },
    },
    fanOffset: {
      description: 'Horizontal spacing between fanned cards',
      control: { type: 'range', min: 10, max: 30 },
    },
    showLabel: {
      description: 'Show "Waste" label above the pile',
      control: 'boolean',
    },
  },
  args: {
    onTopCardClick: fn(),
    onTopCardDoubleClick: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof WastePile>;

// Helper to create a sequence of cards
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
const createCards = (count: number, startRank: number = 1): Card[] =>
  Array.from({ length: count }, (_, i) => ({
    suit: SUITS[i % 4]!,
    rank: ((startRank + i - 1) % 13) + 1,
    deckId: 'player-1',
  }));

/**
 * Default waste pile with 3 visible cards.
 */
export const Default: Story = {
  args: {
    cards: createCards(6),
  },
};

/**
 * Waste pile showing different card counts.
 */
export const CardCounts: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '48px', alignItems: 'flex-start' }}>
      {[1, 2, 3, 6, 12].map((count) => (
        <div key={count} style={{ textAlign: 'center' }}>
          <WastePile cards={createCards(count)} />
          <p style={{ marginTop: '8px', fontSize: '11px', color: '#666' }}>
            {count} card{count !== 1 ? 's' : ''}
          </p>
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Waste piles with varying card counts. Only the top 3 are visible.',
      },
    },
  },
};

/**
 * Empty waste pile.
 */
export const Empty: Story = {
  args: {
    cards: [],
  },
  parameters: {
    docs: {
      description: {
        story: 'Empty waste pile showing placeholder.',
      },
    },
  },
};

/**
 * Single card in waste.
 */
export const SingleCard: Story = {
  args: {
    cards: createCards(1, 1),
  },
  parameters: {
    docs: {
      description: {
        story: 'Waste pile with just one card.',
      },
    },
  },
};

/**
 * Two cards fanned.
 */
export const TwoCards: Story = {
  args: {
    cards: createCards(2, 7),
  },
  parameters: {
    docs: {
      description: {
        story: 'Waste pile with two cards fanned.',
      },
    },
  },
};

/**
 * Top card selected.
 */
export const WithSelection: Story = {
  args: {
    cards: createCards(5),
    selectedIndex: 4, // Top card (index = length - 1)
  },
  parameters: {
    docs: {
      description: {
        story: 'Waste pile with the top card selected (highlighted).',
      },
    },
  },
};

/**
 * Disabled waste pile.
 */
export const Disabled: Story = {
  args: {
    cards: createCards(6),
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Waste pile in disabled state. Top card cannot be clicked.',
      },
    },
  },
};

/**
 * Different fan offsets.
 */
export const FanOffsets: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '48px', alignItems: 'flex-start' }}>
      {[12, 18, 24].map((offset) => (
        <div key={offset} style={{ textAlign: 'center' }}>
          <WastePile cards={createCards(5)} fanOffset={offset} />
          <p style={{ marginTop: '8px', fontSize: '11px', color: '#666' }}>
            offset: {offset}px
          </p>
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Different fan offset values control horizontal spacing.',
      },
    },
  },
};

/**
 * Different max visible settings.
 */
export const MaxVisible: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '48px', alignItems: 'flex-start' }}>
      {[1, 2, 3, 4].map((maxVisible) => (
        <div key={maxVisible} style={{ textAlign: 'center' }}>
          <WastePile cards={createCards(8)} maxVisible={maxVisible} />
          <p style={{ marginTop: '8px', fontSize: '11px', color: '#666' }}>
            maxVisible: {maxVisible}
          </p>
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Control how many cards are visible in the fan.',
      },
    },
  },
};

/**
 * Without label.
 */
export const NoLabel: Story = {
  args: {
    cards: createCards(6),
    showLabel: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Waste pile without the "Waste" label.',
      },
    },
  },
};

/**
 * Interactive example with selection state.
 */
export const Interactive: Story = {
  render: function InteractiveWaste() {
    const [cards] = React.useState(createCards(9));
    const [selectedIndex, setSelectedIndex] = React.useState<number | undefined>(undefined);

    const handleTopCardClick = () => {
      const topIndex = cards.length - 1;
      setSelectedIndex(selectedIndex === topIndex ? undefined : topIndex);
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
        <WastePile
          cards={cards}
          selectedIndex={selectedIndex}
          onTopCardClick={handleTopCardClick}
        />
        <p style={{ color: '#999', fontSize: '12px' }}>
          {selectedIndex !== undefined ? 'Top card selected - click again to deselect' : 'Click top card to select'}
        </p>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive demo. Click the top card to select/deselect it.',
      },
    },
  },
};

// Import React for the interactive story
import * as React from 'react';
