import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { useState } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { Input } from '../Input';

/**
 * The Modal component provides overlay dialogs for HeyHey!
 * Used for creating rooms, joining rooms, and other focused interactions.
 */
const meta: Meta<typeof Modal> = {
  title: 'Lobby/Modal',
  component: Modal,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'dark' },
  },
  argTypes: {
    isOpen: {
      description: 'Whether the modal is visible',
      control: 'boolean',
    },
    title: {
      description: 'Modal header title',
      control: 'text',
    },
    size: {
      description: 'Modal width',
      control: 'select',
      options: ['small', 'medium', 'large'],
    },
  },
  args: {
    onClose: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof Modal>;

// Interactive wrapper
function ModalDemo({ size = 'medium' }: { size?: 'small' | 'medium' | 'large' }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div style={{ padding: '2rem' }}>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Example Modal"
        size={size}
      >
        <p style={{ color: '#aaa', marginBottom: '1rem' }}>
          This is the modal content. Press Escape or click outside to close.
        </p>
        <Button onClick={() => setIsOpen(false)}>Close</Button>
      </Modal>
    </div>
  );
}

export const Default: Story = {
  render: () => <ModalDemo />,
};

export const Small: Story = {
  render: () => <ModalDemo size="small" />,
};

export const Large: Story = {
  render: () => <ModalDemo size="large" />,
};

export const WithForm: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(true);
    const [name, setName] = useState('');

    return (
      <div style={{ padding: '2rem' }}>
        <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Create Room"
          size="small"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <Input
              label="Your Name"
              value={name}
              onChange={setName}
              placeholder="Enter your name"
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="ghost" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary">Create</Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  },
};
