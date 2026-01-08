import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { AvatarSelector, type Avatar } from '../AvatarSelector';

const meta: Meta<typeof AvatarSelector> = {
  title: 'Lobby/AvatarSelector',
  component: AvatarSelector,
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
type Story = StoryObj<typeof AvatarSelector>;

function AvatarSelectorWithState({
  initialAvatar = '😀',
}: {
  initialAvatar?: Avatar;
}) {
  const [avatar, setAvatar] = useState<Avatar>(initialAvatar);
  return (
    <AvatarSelector
      value={avatar}
      onChange={setAvatar}
    />
  );
}

export const Default: Story = {
  render: () => <AvatarSelectorWithState />,
};

export const RobotSelected: Story = {
  render: () => <AvatarSelectorWithState initialAvatar="🤖" />,
};

export const UnicornSelected: Story = {
  render: () => <AvatarSelectorWithState initialAvatar="🦄" />,
};

export const GhostSelected: Story = {
  render: () => <AvatarSelectorWithState initialAvatar="👻" />,
};
