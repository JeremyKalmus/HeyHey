import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Card } from '../Card';
import type { Card as CardType } from '@heyhey/shared';

/**
 * The Card component is the primary card display component for HeyHey!
 * It renders either a face-up card showing the rank and suit, or a
 * face-down card showing the player's color pattern.
 *
 * ## Neubrutalist Style
 * - 4px black border on all cards
 * - Hard offset shadow (4px 4px 0 black)
 * - Selected state: 5px border + cyan glow shadow
 * - Flat player colors on card backs (no gradients)
 * - Snappy 100ms transitions
 * - Card deal and flip animations
 *
 * ## Features
 * - Face-up/face-down states
 * - 8 customizable back colors for player identification
 * - Selection, disabled, and dragging visual states
 * - Deal and flip animations
 * - Click and double-click interaction handlers
 * - Accessible with proper ARIA labels
 */
const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A playing card component with face-up and face-down states, supporting multiple player back colors and interactive states.',
      },
    },
  },
  argTypes: {
    card: {
      description: 'The card data object containing suit, rank, and deckId',
      control: false,
    },
    faceUp: {
      description: 'Whether the card is face-up (showing rank/suit) or face-down (showing back)',
      control: 'boolean',
    },
    backColor: {
      description: 'The color of the card back, used to identify different players',
      control: 'select',
      options: ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'teal'],
    },
    selected: {
      description: 'Whether the card is currently selected',
      control: 'boolean',
    },
    disabled: {
      description: 'Whether the card is disabled and non-interactive',
      control: 'boolean',
    },
    dragging: {
      description: 'Whether the card is currently being dragged',
      control: 'boolean',
    },
    dealing: {
      description: 'Whether to play the deal animation',
      control: 'boolean',
    },
    flipping: {
      description: 'Whether to play the flip animation',
      control: 'boolean',
    },
    onClick: {
      description: 'Callback when the card is clicked',
    },
    onDoubleClick: {
      description: 'Callback when the card is double-clicked',
    },
  },
  args: {
    onClick: fn(),
    onDoubleClick: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

// Helper to create card data
const createCard = (suit: CardType['suit'], rank: number): CardType => ({
  suit,
  rank,
  deckId: 'player-1',
});

/**
 * Default face-up card showing the Ace of Spades.
 */
export const Default: Story = {
  args: {
    card: createCard('spades', 1),
    faceUp: true,
    backColor: 'blue',
  },
};

/**
 * A face-down card showing the back pattern in blue.
 */
export const FaceDown: Story = {
  args: {
    card: createCard('hearts', 5),
    faceUp: false,
    backColor: 'blue',
  },
};

/**
 * A selected card with visual highlight.
 */
export const Selected: Story = {
  args: {
    card: createCard('diamonds', 12),
    faceUp: true,
    selected: true,
  },
};

/**
 * A disabled card that cannot be interacted with.
 */
export const Disabled: Story = {
  args: {
    card: createCard('clubs', 7),
    faceUp: true,
    disabled: true,
  },
};

/**
 * A card in the dragging state.
 */
export const Dragging: Story = {
  args: {
    card: createCard('hearts', 13),
    faceUp: true,
    dragging: true,
  },
};

/**
 * All four suits displayed as face-up cards.
 */
export const AllSuits: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px' }}>
      <Card card={createCard('hearts', 1)} faceUp />
      <Card card={createCard('diamonds', 1)} faceUp />
      <Card card={createCard('clubs', 1)} faceUp />
      <Card card={createCard('spades', 1)} faceUp />
    </div>
  ),
};

/**
 * Face cards (Jack, Queen, King) for all suits.
 */
export const FaceCards: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '16px' }}>
        <Card card={createCard('hearts', 11)} faceUp />
        <Card card={createCard('hearts', 12)} faceUp />
        <Card card={createCard('hearts', 13)} faceUp />
      </div>
      <div style={{ display: 'flex', gap: '16px' }}>
        <Card card={createCard('spades', 11)} faceUp />
        <Card card={createCard('spades', 12)} faceUp />
        <Card card={createCard('spades', 13)} faceUp />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Jacks, Queens, and Kings displayed with their special rank labels (J, Q, K).',
      },
    },
  },
};

/**
 * All available player back colors.
 */
export const AllBackColors: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
      <Card card={createCard('hearts', 1)} faceUp={false} backColor="red" />
      <Card card={createCard('hearts', 1)} faceUp={false} backColor="blue" />
      <Card card={createCard('hearts', 1)} faceUp={false} backColor="green" />
      <Card card={createCard('hearts', 1)} faceUp={false} backColor="yellow" />
      <Card card={createCard('hearts', 1)} faceUp={false} backColor="purple" />
      <Card card={createCard('hearts', 1)} faceUp={false} backColor="orange" />
      <Card card={createCard('hearts', 1)} faceUp={false} backColor="pink" />
      <Card card={createCard('hearts', 1)} faceUp={false} backColor="teal" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All 8 player colors available for card backs: red, blue, green, yellow, purple, orange, pink, and teal.',
      },
    },
  },
};

/**
 * All ranks in a single suit (Hearts).
 */
export const AllRanks: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', maxWidth: '600px' }}>
      {Array.from({ length: 13 }, (_, i) => (
        <Card key={i + 1} card={createCard('hearts', i + 1)} faceUp />
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'A complete suit from Ace through King, demonstrating all rank displays.',
      },
    },
  },
};

/**
 * Interactive states comparison showing default, selected, and disabled cards side by side.
 */
export const InteractiveStates: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '24px' }}>
      <div style={{ textAlign: 'center' }}>
        <Card card={createCard('spades', 10)} faceUp />
        <p style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>Default</p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <Card card={createCard('spades', 10)} faceUp selected />
        <p style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>Selected</p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <Card card={createCard('spades', 10)} faceUp disabled />
        <p style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>Disabled</p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <Card card={createCard('spades', 10)} faceUp dragging />
        <p style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>Dragging</p>
      </div>
    </div>
  ),
};

/**
 * Card being dealt with animation.
 */
export const DealAnimation: Story = {
  args: {
    card: createCard('hearts', 1),
    faceUp: true,
    dealing: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Card with the deal animation playing. The animation drops the card in with a slight rotation and bounce effect.',
      },
    },
  },
};

/**
 * Card flip animation.
 */
export const FlipAnimation: Story = {
  args: {
    card: createCard('diamonds', 13),
    faceUp: true,
    flipping: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Card with the flip animation playing.',
      },
    },
  },
};
