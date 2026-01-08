import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { PlayerCustomization, type PlayerCustomizationData } from '../PlayerCustomization';
import type { PlayerColor } from '../../Card/CardBack';

const meta: Meta<typeof PlayerCustomization> = {
  title: 'Lobby/PlayerCustomization',
  component: PlayerCustomization,
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'dark' },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 350, padding: 20 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PlayerCustomization>;

function PlayerCustomizationWithState({
  initialData = { name: '', color: 'blue' as PlayerColor, avatar: '😀' },
  disabledColors = [],
}: {
  initialData?: PlayerCustomizationData;
  disabledColors?: PlayerColor[];
}) {
  const [data, setData] = useState<PlayerCustomizationData>(initialData);
  return (
    <PlayerCustomization
      value={data}
      onChange={setData}
      disabledColors={disabledColors}
    />
  );
}

export const Default: Story = {
  render: () => <PlayerCustomizationWithState />,
};

export const WithNameEntered: Story = {
  render: () => (
    <PlayerCustomizationWithState
      initialData={{ name: 'Player1', color: 'purple', avatar: '🤖' }}
    />
  ),
};

export const WithSomeColorsTaken: Story = {
  render: () => (
    <PlayerCustomizationWithState
      initialData={{ name: 'Alice', color: 'green', avatar: '🦊' }}
      disabledColors={['red', 'blue', 'yellow']}
    />
  ),
};

export const FullCustomization: Story = {
  render: () => (
    <PlayerCustomizationWithState
      initialData={{ name: 'CoolPlayer', color: 'teal', avatar: '🐉' }}
    />
  ),
};

export const LongName: Story = {
  render: () => (
    <PlayerCustomizationWithState
      initialData={{ name: 'SuperLongPlayerName', color: 'orange', avatar: '🌟' }}
    />
  ),
};
