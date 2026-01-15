import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { AvatarSelector, type AvatarString, DEFAULT_AVATAR } from '../../ui/Avatar';

const meta: Meta<typeof AvatarSelector> = {
  title: 'Lobby/AvatarSelector',
  component: AvatarSelector,
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
type Story = StoryObj<typeof AvatarSelector>;

function AvatarSelectorWithState({
  initialAvatar = DEFAULT_AVATAR,
}: {
  initialAvatar?: AvatarString;
}) {
  const [avatar, setAvatar] = useState<AvatarString>(initialAvatar);
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

export const GhostHexagon: Story = {
  render: () => <AvatarSelectorWithState initialAvatar="ghost:hexagon" />,
};

export const SkullDiamond: Story = {
  render: () => <AvatarSelectorWithState initialAvatar="skull:diamond" />,
};

export const CrownStar: Story = {
  render: () => <AvatarSelectorWithState initialAvatar="crown:star" />,
};

export const BotSquare: Story = {
  render: () => <AvatarSelectorWithState initialAvatar="bot:square" />,
};
