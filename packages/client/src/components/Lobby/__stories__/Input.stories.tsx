import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { useState } from 'react';
import { Input } from '../Input';

/**
 * The Input component provides text input fields for forms throughout HeyHey!
 * It supports labels, placeholders, validation errors, and various input types.
 */
const meta: Meta<typeof Input> = {
  title: 'Lobby/Input',
  component: Input,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'dark' },
  },
  argTypes: {
    label: {
      description: 'Label text displayed above the input',
      control: 'text',
    },
    placeholder: {
      description: 'Placeholder text when empty',
      control: 'text',
    },
    error: {
      description: 'Error message to display',
      control: 'text',
    },
    disabled: {
      description: 'Whether the input is disabled',
      control: 'boolean',
    },
    type: {
      description: 'Input type',
      control: 'select',
      options: ['text', 'number'],
    },
  },
  args: {
    onChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

// Interactive wrapper for stories
function InputWrapper(props: React.ComponentProps<typeof Input>) {
  const [value, setValue] = useState(props.value || '');
  return (
    <div style={{ width: '300px' }}>
      <Input {...props} value={value} onChange={setValue} />
    </div>
  );
}

export const Default: Story = {
  render: () => (
    <InputWrapper
      label="Your Name"
      value=""
      onChange={() => {}}
      placeholder="Enter your name"
    />
  ),
};

export const WithValue: Story = {
  render: () => (
    <InputWrapper
      label="Your Name"
      value="Alice"
      onChange={() => {}}
    />
  ),
};

export const WithError: Story = {
  render: () => (
    <InputWrapper
      label="Your Name"
      value=""
      onChange={() => {}}
      placeholder="Enter your name"
      error="Name is required"
    />
  ),
};

export const Disabled: Story = {
  render: () => (
    <InputWrapper
      label="Room Code"
      value="ABC123"
      onChange={() => {}}
      disabled
    />
  ),
};

export const RoomCode: Story = {
  render: () => (
    <InputWrapper
      label="Room Code"
      value=""
      onChange={() => {}}
      placeholder="ABCD12"
      maxLength={6}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Input configured for entering 6-character room codes.',
      },
    },
  },
};
