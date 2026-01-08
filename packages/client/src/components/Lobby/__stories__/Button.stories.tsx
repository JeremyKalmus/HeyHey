import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Button } from '../Button';

/**
 * The Button component provides consistent interactive buttons throughout HeyHey!
 * It supports multiple variants (primary, secondary, ghost) and sizes.
 */
const meta: Meta<typeof Button> = {
  title: 'Lobby/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'dark' },
  },
  argTypes: {
    variant: {
      description: 'Visual style of the button',
      control: 'select',
      options: ['primary', 'secondary', 'ghost'],
    },
    size: {
      description: 'Size of the button',
      control: 'select',
      options: ['small', 'medium', 'large'],
    },
    fullWidth: {
      description: 'Whether the button takes full container width',
      control: 'boolean',
    },
    disabled: {
      description: 'Whether the button is disabled',
      control: 'boolean',
    },
  },
  args: {
    onClick: fn(),
    children: 'Button',
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Create Room',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Join Room',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Cancel',
  },
};

export const Small: Story = {
  args: {
    size: 'small',
    children: 'Small Button',
  },
};

export const Large: Story = {
  args: {
    size: 'large',
    children: 'Start Game',
  },
};

export const Disabled: Story = {
  args: {
    variant: 'primary',
    disabled: true,
    children: 'Disabled',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <Button size="small">Small</Button>
      <Button size="medium">Medium</Button>
      <Button size="large">Large</Button>
    </div>
  ),
};
