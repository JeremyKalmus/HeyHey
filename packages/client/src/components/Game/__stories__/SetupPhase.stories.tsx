import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { SetupPhase } from '../SetupPhase';

/**
 * The SetupPhase component handles the interactive game setup where players
 * click through dealing their cards in order.
 *
 * ## Setup Steps (must complete in order)
 * 1. **Deal Nertz Pile**: Click deck to deal face-down cards (10 or 13 based on config)
 * 2. **Flip Nertz Top**: Click nertz pile once to flip top card face-up
 * 3. **Deal Work Piles**: Click each of 4 work pile positions once to deal one face-up card each
 *
 * ## Visual Cues
 * - Highlighted borders show the next clickable area
 * - Progress indicator shows current step
 * - "CLICK" hints guide the player
 * - Completion overlay shows when done
 */
const meta: Meta<typeof SetupPhase> = {
  title: 'Components/Game/SetupPhase',
  component: SetupPhase,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#1a1a2e' },
        { name: 'green felt', value: '#1a472a' },
      ],
    },
    docs: {
      description: {
        component: 'Interactive setup phase where players deal their initial cards through click interactions.',
      },
    },
  },
  argTypes: {
    playerColor: {
      description: "Player's card back color",
      control: 'select',
      options: ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'teal'],
    },
    config: {
      description: 'Game configuration (nertzPileSize)',
      control: 'object',
    },
  },
  args: {
    onSetupComplete: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ minHeight: '100vh', background: '#1a1a2e', padding: '2rem' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SetupPhase>;

/**
 * Default setup phase with standard 13-card Nertz pile.
 * Click the deck to deal cards to the Nertz pile.
 */
export const Default: Story = {
  args: {
    playerColor: 'blue',
    deckId: 'player-1',
    config: { nertzPileSize: 13 },
  },
};

/**
 * Setup with 10-card Nertz pile (variant rules).
 * Faster setup for quicker games.
 */
export const TenCardVariant: Story = {
  args: {
    playerColor: 'green',
    deckId: 'player-1',
    config: { nertzPileSize: 10 },
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
 * Multiple player colors showcase.
 */
export const PlayerColors: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
      {(['red', 'blue', 'green', 'yellow'] as const).map((color) => (
        <div key={color} style={{ flex: '1 1 300px', minWidth: '300px' }}>
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <span style={{
              color: '#fff',
              fontFamily: 'monospace',
              textTransform: 'uppercase',
              fontWeight: 'bold',
            }}>
              Player: {color}
            </span>
          </div>
          <SetupPhase
            playerColor={color}
            deckId={`player-${color}`}
            config={{ nertzPileSize: 13 }}
          />
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Each player has their own card back color to identify their cards.',
      },
    },
  },
};

/**
 * Interactive story - click through the setup process.
 */
export const Interactive: Story = {
  args: {
    playerColor: 'purple',
    deckId: 'interactive-player',
    config: { nertzPileSize: 13 },
  },
  parameters: {
    docs: {
      description: {
        story: 'Click through the entire setup process:\n\n' +
          '1. Click the DECK 13 times to deal the Nertz pile\n' +
          '2. Click the NERTZ pile to flip the top card\n' +
          '3. Click each WORK PILE slot to deal a card\n\n' +
          'Watch the progress indicator and highlighted areas guide you through each step!',
      },
    },
  },
};

/**
 * Teal color with 10-card variant.
 */
export const TealQuickGame: Story = {
  args: {
    playerColor: 'teal',
    deckId: 'teal-player',
    config: { nertzPileSize: 10 },
  },
  parameters: {
    docs: {
      description: {
        story: 'Teal player with 10-card Nertz pile for a faster game variant.',
      },
    },
  },
};
