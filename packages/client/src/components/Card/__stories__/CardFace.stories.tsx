import type { Meta, StoryObj } from '@storybook/react-vite';
import { CardFace } from '../CardFace';
import type { Card } from '@heyhey/shared';

/**
 * The CardFace component renders the face of a playing card with
 * the rank and suit displayed in the traditional card layout.
 *
 * ## Features
 * - Displays rank in corners (A, 2-10, J, Q, K)
 * - Shows suit symbol in corners and center
 * - Red coloring for hearts and diamonds
 * - Black coloring for clubs and spades
 */
const meta: Meta<typeof CardFace> = {
  title: 'Components/Card/CardFace',
  component: CardFace,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Renders the face of a playing card with rank and suit symbols. Used internally by the Card component when faceUp is true.',
      },
    },
  },
  argTypes: {
    card: {
      description: 'The card data containing suit and rank',
      control: false,
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '70px', height: '100px', border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CardFace>;

const createCard = (suit: Card['suit'], rank: number): Card => ({
  suit,
  rank,
  deckId: 'player-1',
});

/**
 * Ace of Hearts - red suit with 'A' rank display.
 */
export const AceOfHearts: Story = {
  args: {
    card: createCard('hearts', 1),
  },
};

/**
 * Ace of Spades - black suit with 'A' rank display.
 */
export const AceOfSpades: Story = {
  args: {
    card: createCard('spades', 1),
  },
};

/**
 * Number card (7 of Diamonds) showing numeric rank.
 */
export const SevenOfDiamonds: Story = {
  args: {
    card: createCard('diamonds', 7),
  },
};

/**
 * King of Clubs showing 'K' rank display.
 */
export const KingOfClubs: Story = {
  args: {
    card: createCard('clubs', 13),
  },
};

/**
 * All four suits showing red vs black coloring.
 */
export const RedVsBlack: Story = {
  decorators: [
    () => (
      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>Red Suits</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ width: '70px', height: '100px', border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden' }}>
              <CardFace card={createCard('hearts', 5)} />
            </div>
            <div style={{ width: '70px', height: '100px', border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden' }}>
              <CardFace card={createCard('diamonds', 5)} />
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>Black Suits</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ width: '70px', height: '100px', border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden' }}>
              <CardFace card={createCard('clubs', 5)} />
            </div>
            <div style={{ width: '70px', height: '100px', border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden' }}>
              <CardFace card={createCard('spades', 5)} />
            </div>
          </div>
        </div>
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'Hearts and diamonds are displayed in red, while clubs and spades are displayed in black.',
      },
    },
  },
};

/**
 * All face cards showing J, Q, K rank labels.
 */
export const FaceCardLabels: Story = {
  decorators: [
    () => (
      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={{ width: '70px', height: '100px', border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden' }}>
          <CardFace card={createCard('hearts', 11)} />
        </div>
        <div style={{ width: '70px', height: '100px', border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden' }}>
          <CardFace card={createCard('hearts', 12)} />
        </div>
        <div style={{ width: '70px', height: '100px', border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden' }}>
          <CardFace card={createCard('hearts', 13)} />
        </div>
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'Jack (11) displays as "J", Queen (12) as "Q", and King (13) as "K".',
      },
    },
  },
};

/**
 * Suit symbols reference showing all four suits.
 */
export const SuitSymbols: Story = {
  decorators: [
    () => (
      <div style={{ display: 'flex', gap: '8px' }}>
        {(['hearts', 'diamonds', 'clubs', 'spades'] as const).map((suit) => (
          <div key={suit} style={{ textAlign: 'center' }}>
            <div style={{ width: '70px', height: '100px', border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden' }}>
              <CardFace card={createCard(suit, 1)} />
            </div>
            <p style={{ marginTop: '4px', fontSize: '11px', color: '#666', textTransform: 'capitalize' }}>{suit}</p>
          </div>
        ))}
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'Hearts (♥), Diamonds (♦), Clubs (♣), and Spades (♠) symbol reference.',
      },
    },
  },
};
