import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { HeyHeyButton } from '../HeyHeyButton';

/**
 * The HeyHeyButton is the victory call button in HeyHey!
 *
 * ## Features
 * - Large, prominent button for calling HeyHey
 * - Disabled until the Nertz pile is empty
 * - Satisfying press animation and sound effect
 * - Pulsing glow when enabled to draw attention
 *
 * ## Game Context
 * In Nertz (HeyHey!), when a player empties their Nertz pile, they call "Nertz!"
 * to end the round. This button provides a satisfying way to make that call.
 */
const meta: Meta<typeof HeyHeyButton> = {
  title: 'Components/Game/HeyHeyButton',
  component: HeyHeyButton,
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
        component: 'Victory call button that becomes active when the Nertz pile is empty.',
      },
    },
  },
  argTypes: {
    nertzPileEmpty: {
      description: 'Whether the Nertz pile is empty (enables the button)',
      control: 'boolean',
    },
    onCallHeyHey: {
      description: 'Callback when the button is pressed',
    },
  },
  args: {
    onCallHeyHey: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof HeyHeyButton>;

/**
 * Default disabled state - Nertz pile is not empty yet.
 */
export const Disabled: Story = {
  args: {
    nertzPileEmpty: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'The button is disabled when the Nertz pile still has cards. Players cannot call HeyHey until they empty their pile.',
      },
    },
  },
};

/**
 * Enabled state - Nertz pile is empty, ready to call HeyHey!
 */
export const Enabled: Story = {
  args: {
    nertzPileEmpty: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'When the Nertz pile is empty, the button glows and pulses to draw the player\'s attention. Click it to hear the triumphant sound!',
      },
    },
  },
};

/**
 * Interactive demo - click to see the animation and hear the sound.
 */
export const Interactive: Story = {
  args: {
    nertzPileEmpty: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Click the button to see the satisfying press animation and hear the triumphant fanfare. Check the Actions panel to see the callback fired.',
      },
    },
  },
};

/**
 * Comparison of enabled vs disabled states.
 */
export const Comparison: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <HeyHeyButton nertzPileEmpty={false} onCallHeyHey={() => {}} />
        <p style={{ marginTop: '16px', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
          Nertz pile has cards
        </p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <HeyHeyButton nertzPileEmpty={true} onCallHeyHey={() => alert('HeyHey!')} />
        <p style={{ marginTop: '16px', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
          Nertz pile empty
        </p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Side-by-side comparison showing the visual difference between disabled and enabled states.',
      },
    },
  },
};
