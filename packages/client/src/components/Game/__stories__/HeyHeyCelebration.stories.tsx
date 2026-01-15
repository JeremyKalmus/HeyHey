import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { HeyHeyCelebration } from '../HeyHeyCelebration';

/**
 * Full-screen celebration overlay shown when a player calls HeyHey.
 *
 * ## Features
 * - Giant animated "HEYHEY!" text with scale/fade entrance
 * - Confetti animation using canvas-confetti
 * - Displays the caller's name
 * - Auto-dismisses after ~4 seconds
 *
 * ## Game Context
 * When a player empties their Nertz pile and clicks the HeyHey button,
 * all players see this celebration overlay simultaneously. The game
 * pauses during the celebration before transitioning to scoring.
 */
const meta: Meta<typeof HeyHeyCelebration> = {
  title: 'Components/Game/HeyHeyCelebration',
  component: HeyHeyCelebration,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'game',
      values: [
        { name: 'game', value: '#1a1a2e' },
      ],
    },
    docs: {
      description: {
        component: 'Full-screen celebration overlay shown when a player calls HeyHey to end the round.',
      },
    },
  },
  argTypes: {
    callerName: {
      description: 'Name of the player who called HeyHey',
      control: 'text',
    },
    duration: {
      description: 'Duration of the celebration in milliseconds',
      control: { type: 'number', min: 1000, max: 10000, step: 500 },
    },
    onComplete: {
      description: 'Callback when the celebration auto-dismisses',
    },
  },
  args: {
    callerName: 'Player 1',
    onComplete: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof HeyHeyCelebration>;

/**
 * Default celebration with a player name.
 */
export const Default: Story = {
  args: {
    callerName: 'Alice',
  },
  parameters: {
    docs: {
      description: {
        story: 'The celebration overlay appears with animated text and confetti. It auto-dismisses after 4 seconds.',
      },
    },
  },
};

/**
 * Short celebration for testing purposes.
 */
export const ShortDuration: Story = {
  args: {
    callerName: 'Bob',
    duration: 2000,
  },
  parameters: {
    docs: {
      description: {
        story: 'A shorter celebration (2 seconds) for quick testing.',
      },
    },
  },
};

/**
 * Celebration with a long player name.
 */
export const LongName: Story = {
  args: {
    callerName: 'Sir Reginald von Cardsworth III',
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows how the component handles longer player names.',
      },
    },
  },
};

/**
 * Extended celebration for dramatic effect.
 */
export const ExtendedCelebration: Story = {
  args: {
    callerName: 'Champion',
    duration: 8000,
  },
  parameters: {
    docs: {
      description: {
        story: 'A longer celebration (8 seconds) for extra dramatic effect.',
      },
    },
  },
};
