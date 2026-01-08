import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { CardStack } from '../CardStack';
import type { Card } from '@heyhey/shared';

/**
 * The CardStack component displays multiple cards in an overlapping arrangement.
 * It supports three layout directions and various configuration options for
 * game pile displays.
 *
 * ## Features
 * - Three stack directions: vertical, horizontal, and fan
 * - Configurable overlap offset
 * - Show/hide empty slot placeholder
 * - Limit visible cards with maxVisible
 * - Selection and disabled states per card
 * - Click handlers with card and index
 *
 * ## Use Cases
 * - Nertz pile (vertical stack)
 * - Work piles (horizontal cascade)
 * - Player hand (fan layout)
 * - Foundation piles
 */
const meta: Meta<typeof CardStack> = {
  title: 'Components/Card/CardStack',
  component: CardStack,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Displays multiple cards in an overlapping stack with support for vertical, horizontal, and fan layouts.',
      },
    },
  },
  argTypes: {
    cards: {
      description: 'Array of card objects to display',
      control: false,
    },
    direction: {
      description: 'Layout direction of the stack',
      control: 'select',
      options: ['vertical', 'horizontal', 'fan'],
    },
    offset: {
      description: 'Pixel offset between cards (default: 20)',
      control: { type: 'range', min: 5, max: 50 },
    },
    faceUp: {
      description: 'Whether all cards are face-up',
      control: 'boolean',
    },
    backColor: {
      description: 'Card back color when face-down',
      control: 'select',
      options: ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'teal'],
    },
    showEmpty: {
      description: 'Show placeholder when stack is empty',
      control: 'boolean',
    },
    maxVisible: {
      description: 'Maximum number of cards to show',
      control: { type: 'number', min: 1, max: 20 },
    },
    fanAngle: {
      description: 'Angle between cards in fan layout (degrees)',
      control: { type: 'range', min: 1, max: 15 },
    },
    selectedIndex: {
      description: 'Index of currently selected card',
      control: { type: 'number', min: -1, max: 10 },
    },
  },
  args: {
    onCardClick: fn(),
    onCardDoubleClick: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof CardStack>;

// Helper to create a sequence of cards
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
const createCards = (count: number, startRank: number = 1): Card[] =>
  Array.from({ length: count }, (_, i) => ({
    suit: SUITS[i % 4]!,
    rank: ((startRank + i - 1) % 13) + 1,
    deckId: 'player-1',
  }));

/**
 * Default vertical stack showing 5 cards.
 */
export const Default: Story = {
  args: {
    cards: createCards(5),
    direction: 'vertical',
    faceUp: true,
  },
};

/**
 * Horizontal stack layout.
 */
export const Horizontal: Story = {
  args: {
    cards: createCards(5),
    direction: 'horizontal',
    faceUp: true,
  },
};

/**
 * Fan layout for player hands.
 */
export const Fan: Story = {
  args: {
    cards: createCards(7),
    direction: 'fan',
    faceUp: true,
    fanAngle: 5,
  },
};

/**
 * All three stack directions compared.
 */
export const AllDirections: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '48px', alignItems: 'flex-start' }}>
      <div style={{ textAlign: 'center' }}>
        <CardStack cards={createCards(5)} direction="vertical" faceUp />
        <p style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>Vertical</p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <CardStack cards={createCards(5)} direction="horizontal" faceUp />
        <p style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>Horizontal</p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <CardStack cards={createCards(5)} direction="fan" faceUp fanAngle={5} />
        <p style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>Fan</p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Comparison of all three layout directions: vertical (cascade down), horizontal (cascade right), and fan (spread with rotation).',
      },
    },
  },
};

/**
 * Face-down stack showing card backs.
 */
export const FaceDown: Story = {
  args: {
    cards: createCards(5),
    direction: 'vertical',
    faceUp: false,
    backColor: 'blue',
  },
};

/**
 * Empty stack with placeholder visible.
 */
export const EmptyWithPlaceholder: Story = {
  args: {
    cards: [],
    direction: 'vertical',
    showEmpty: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'When showEmpty is true, an empty slot placeholder is displayed. Useful for drop targets.',
      },
    },
  },
};

/**
 * Stack with maxVisible limiting display.
 */
export const LimitedVisibility: Story = {
  args: {
    cards: createCards(10),
    direction: 'vertical',
    faceUp: true,
    maxVisible: 4,
  },
  parameters: {
    docs: {
      description: {
        story: 'Only the last 4 cards are shown from a stack of 10. The top cards are hidden.',
      },
    },
  },
};

/**
 * Stack with a selected card.
 */
export const WithSelection: Story = {
  args: {
    cards: createCards(5),
    direction: 'vertical',
    faceUp: true,
    selectedIndex: 3,
  },
};

/**
 * Stack with disabled cards.
 */
export const WithDisabledCards: Story = {
  args: {
    cards: createCards(5),
    direction: 'vertical',
    faceUp: true,
    disabledIndices: [0, 1, 2],
  },
  parameters: {
    docs: {
      description: {
        story: 'Cards at indices 0, 1, and 2 are disabled (only the top cards are interactive).',
      },
    },
  },
};

/**
 * Different offset values compared.
 */
export const OffsetComparison: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '48px', alignItems: 'flex-start' }}>
      <div style={{ textAlign: 'center' }}>
        <CardStack cards={createCards(5)} direction="vertical" faceUp offset={10} />
        <p style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>offset: 10</p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <CardStack cards={createCards(5)} direction="vertical" faceUp offset={20} />
        <p style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>offset: 20</p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <CardStack cards={createCards(5)} direction="vertical" faceUp offset={35} />
        <p style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>offset: 35</p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Different offset values control how much each card is revealed. Smaller offsets create tighter stacks.',
      },
    },
  },
};

/**
 * Fan angle comparison.
 */
export const FanAngleComparison: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', alignItems: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <CardStack cards={createCards(7)} direction="fan" faceUp fanAngle={3} />
        <p style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>fanAngle: 3°</p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <CardStack cards={createCards(7)} direction="fan" faceUp fanAngle={7} />
        <p style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>fanAngle: 7°</p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <CardStack cards={createCards(7)} direction="fan" faceUp fanAngle={12} />
        <p style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>fanAngle: 12°</p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'The fanAngle prop controls the rotation between cards in fan layout. Larger angles create wider spreads.',
      },
    },
  },
};

/**
 * Typical Nertz pile setup (face-down with top card face-up).
 */
export const NertzPileExample: Story = {
  render: () => {
    const nertzCards = createCards(10);
    return (
      <div style={{ textAlign: 'center' }}>
        <p style={{ marginBottom: '16px', fontSize: '14px', color: '#666' }}>
          Nertz Pile - 10 cards (only top visible)
        </p>
        <CardStack
          cards={nertzCards}
          direction="vertical"
          faceUp={false}
          backColor="red"
          maxVisible={1}
        />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'A typical Nertz pile showing only the top card. In gameplay, cards are drawn from this pile.',
      },
    },
  },
};

/**
 * Work pile cascade example.
 */
export const WorkPileExample: Story = {
  render: () => (
    <div style={{ textAlign: 'center' }}>
      <p style={{ marginBottom: '16px', fontSize: '14px', color: '#666' }}>
        Work Pile - Cascading face-up cards
      </p>
      <CardStack
        cards={createCards(6, 8)}
        direction="vertical"
        faceUp
        offset={25}
        disabledIndices={[0, 1, 2, 3, 4]}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'A work pile showing cascading face-up cards. Only the bottom card is interactive.',
      },
    },
  },
};

/**
 * Player hand in fan layout.
 */
export const PlayerHandExample: Story = {
  render: () => (
    <div style={{ textAlign: 'center' }}>
      <p style={{ marginBottom: '16px', fontSize: '14px', color: '#666' }}>
        Player Hand - 9 cards fanned out
      </p>
      <CardStack
        cards={createCards(9)}
        direction="fan"
        faceUp
        fanAngle={6}
        offset={15}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "A player's hand displayed in a fan layout, making it easy to see all cards at once.",
      },
    },
  },
};

/**
 * Multiple player back colors in stacks.
 */
export const MultiplePlayerStacks: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '24px' }}>
      {(['red', 'blue', 'green', 'yellow'] as const).map((color, i) => (
        <div key={color} style={{ textAlign: 'center' }}>
          <CardStack
            cards={createCards(5)}
            direction="vertical"
            faceUp={false}
            backColor={color}
          />
          <p style={{ marginTop: '8px', fontSize: '12px', color: '#666', textTransform: 'capitalize' }}>
            Player {i + 1}
          </p>
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Multiple player stacks distinguished by their back colors.',
      },
    },
  },
};
