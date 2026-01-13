import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { PlayerCustomization, type PlayerCustomizationData } from '../PlayerCustomization';
import type { PlayerColor } from '../../Card/CardBack';
import { DEFAULT_AVATAR } from '../../ui/Avatar';

const meta: Meta<typeof PlayerCustomization> = {
  title: 'Lobby/PlayerCustomization',
  component: PlayerCustomization,
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'dark' },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 400, padding: 20 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PlayerCustomization>;

function PlayerCustomizationWithState({
  initialData = { name: '', color: 'blue' as PlayerColor, avatar: DEFAULT_AVATAR },
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
      initialData={{ name: 'Player1', color: 'purple', avatar: 'bot:hexagon' }}
    />
  ),
};

export const WithSomeColorsTaken: Story = {
  render: () => (
    <PlayerCustomizationWithState
      initialData={{ name: 'Alice', color: 'green', avatar: 'cat:circle' }}
      disabledColors={['red', 'blue', 'yellow']}
    />
  ),
};

export const FullCustomization: Story = {
  render: () => (
    <PlayerCustomizationWithState
      initialData={{ name: 'CoolPlayer', color: 'teal', avatar: 'skull:diamond' }}
    />
  ),
};

export const LongName: Story = {
  render: () => (
    <PlayerCustomizationWithState
      initialData={{ name: 'SuperLongPlayerName', color: 'orange', avatar: 'crown:star' }}
    />
  ),
};
