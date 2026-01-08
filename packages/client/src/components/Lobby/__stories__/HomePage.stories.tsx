import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { HomePage } from '../HomePage';

/**
 * The HomePage is the main landing page for HeyHey!
 * It displays the title and provides buttons to create or join a room.
 */
const meta: Meta<typeof HomePage> = {
  title: 'Lobby/HomePage',
  component: HomePage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        component:
          'The main entry point for HeyHey! Players can create a new room or join an existing one.',
      },
    },
  },
  args: {
    onCreateRoom: fn(),
    onJoinRoom: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof HomePage>;

/**
 * Default home page view with Create and Join buttons.
 */
export const Default: Story = {};

/**
 * Interactive demo - click the buttons to see the modals.
 */
export const Interactive: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Click "Create Room" or "Join Room" to see the modals in action.',
      },
    },
  },
};
