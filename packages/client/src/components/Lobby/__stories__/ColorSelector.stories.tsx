import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ColorSelector } from '../ColorSelector';
import type { PlayerColor } from '../../Card/CardBack';

const meta: Meta<typeof ColorSelector> = {
  title: 'Lobby/ColorSelector',
  component: ColorSelector,
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'dark' },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 300, padding: 20 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ColorSelector>;

function ColorSelectorWithState({
  initialColor = 'blue',
  disabledColors = [],
}: {
  initialColor?: PlayerColor;
  disabledColors?: PlayerColor[];
}) {
  const [color, setColor] = useState<PlayerColor>(initialColor);
  return (
    <ColorSelector
      value={color}
      onChange={setColor}
      disabledColors={disabledColors}
    />
  );
}

export const Default: Story = {
  render: () => <ColorSelectorWithState />,
};

export const RedSelected: Story = {
  render: () => <ColorSelectorWithState initialColor="red" />,
};

export const WithDisabledColors: Story = {
  render: () => (
    <ColorSelectorWithState
      initialColor="green"
      disabledColors={['red', 'blue', 'purple']}
    />
  ),
};

export const MostColorsTaken: Story = {
  render: () => (
    <ColorSelectorWithState
      initialColor="teal"
      disabledColors={['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink']}
    />
  ),
};
