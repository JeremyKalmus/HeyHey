import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { useState } from 'react';
import type { GameConfig } from '@heyhey/shared';
import { GameSettings } from '../GameSettings';

/**
 * The GameSettings component allows the host to configure game rules.
 * Non-host players see the settings in a read-only state.
 */
const meta: Meta<typeof GameSettings> = {
  title: 'Lobby/GameSettings',
  component: GameSettings,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        component:
          'Configures house rules: Nertz pile size, draw count, and target score.',
      },
    },
  },
  args: {
    onChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof GameSettings>;

const defaultConfig: GameConfig = {
  nertzPileSize: 10,
  drawCount: 3,
  targetScore: 100,
};

// Interactive wrapper for host
function HostSettings() {
  const [config, setConfig] = useState<GameConfig>(defaultConfig);
  return (
    <div style={{ width: '360px' }}>
      <GameSettings config={config} onChange={setConfig} isHost />
    </div>
  );
}

export const AsHost: Story = {
  render: () => <HostSettings />,
  parameters: {
    docs: {
      description: {
        story: 'The host can modify all game settings.',
      },
    },
  },
};

export const AsPlayer: Story = {
  args: {
    config: defaultConfig,
    isHost: false,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '360px' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'Non-host players see the settings but cannot change them.',
      },
    },
  },
};

export const TraditionalRules: Story = {
  args: {
    config: {
      nertzPileSize: 13,
      drawCount: 3,
      targetScore: 100,
    },
    isHost: true,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '360px' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'Traditional Nertz rules with 13-card pile and 3-card draw.',
      },
    },
  },
};

export const EasyMode: Story = {
  args: {
    config: {
      nertzPileSize: 10,
      drawCount: 1,
      targetScore: 50,
    },
    isHost: true,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '360px' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'Easy mode with smaller pile, 1-card draw, and lower target score.',
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    config: defaultConfig,
    isHost: true,
    disabled: true,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '360px' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'Settings disabled (e.g., when game is starting).',
      },
    },
  },
};
