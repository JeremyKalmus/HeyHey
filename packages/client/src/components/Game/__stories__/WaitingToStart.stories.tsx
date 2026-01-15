import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { WaitingToStart } from '../WaitingToStart';

/**
 * The WaitingToStart component displays the pre-round waiting screen.
 *
 * ## Features
 * - Shows round number
 * - Starter sees a large GO! button to begin the round
 * - Non-starters see "Get Ready..." with the starter's name
 * - Animated text and button to build anticipation
 *
 * ## Game Context
 * In multiplayer Nertz, each round a different player gets to start.
 * The starter rotates: host starts round 1, player 2 starts round 2, etc.
 */
const meta: Meta<typeof WaitingToStart> = {
  title: 'Components/Game/WaitingToStart',
  component: WaitingToStart,
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
        component: 'Pre-round waiting screen showing GO button for starter or waiting message for others.',
      },
    },
  },
  argTypes: {
    isStarter: {
      description: 'Whether the current player is the one who starts this round',
      control: 'boolean',
    },
    starterName: {
      description: 'Name of the player who can start the round',
      control: 'text',
    },
    roundNumber: {
      description: 'Current round number',
      control: { type: 'number', min: 1 },
    },
    onStartRound: {
      description: 'Callback when starter presses GO',
    },
  },
  args: {
    onStartRound: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof WaitingToStart>;

/**
 * Starter view - this player can press GO to begin the round.
 */
export const StarterView: Story = {
  args: {
    isStarter: true,
    starterName: 'You',
    roundNumber: 1,
  },
  parameters: {
    docs: {
      description: {
        story: 'When you are the starter, you see a large GO button. Press it to begin the round!',
      },
    },
  },
};

/**
 * Waiting view - another player is the starter.
 */
export const WaitingView: Story = {
  args: {
    isStarter: false,
    starterName: 'Alice',
    roundNumber: 1,
  },
  parameters: {
    docs: {
      description: {
        story: 'When another player is the starter, you see "Get Ready..." and wait for them to press GO.',
      },
    },
  },
};

/**
 * Round 2 - showing rotation to a different starter.
 */
export const Round2: Story = {
  args: {
    isStarter: false,
    starterName: 'Bob',
    roundNumber: 2,
  },
  parameters: {
    docs: {
      description: {
        story: 'In round 2, the starter rotates to the next player in order.',
      },
    },
  },
};

/**
 * Comparison of starter vs waiting views.
 */
export const Comparison: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '64px', alignItems: 'flex-start' }}>
      <div style={{ textAlign: 'center' }}>
        <WaitingToStart
          isStarter={true}
          starterName="You"
          roundNumber={1}
          onStartRound={() => alert('GO!')}
        />
        <p style={{ marginTop: '16px', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
          Starter View
        </p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <WaitingToStart
          isStarter={false}
          starterName="Alice"
          roundNumber={1}
          onStartRound={() => {}}
        />
        <p style={{ marginTop: '16px', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
          Waiting View
        </p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Side-by-side comparison showing what the starter sees vs what other players see.',
      },
    },
  },
};
