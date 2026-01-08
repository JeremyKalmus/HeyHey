import type { Meta, StoryObj } from '@storybook/react-vite';
import { PlayerList, type LobbyPlayer } from '../PlayerList';

/**
 * The PlayerList component displays players in a room lobby.
 * It shows player names, colors, host status, and ready state.
 */
const meta: Meta<typeof PlayerList> = {
  title: 'Lobby/PlayerList',
  component: PlayerList,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        component:
          'Displays the list of players in a room, their colors, and their ready status.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof PlayerList>;

const samplePlayers: LobbyPlayer[] = [
  { id: '1', name: 'Alice', color: 'blue', isHost: true, isReady: true },
  { id: '2', name: 'Bob', color: 'red', isHost: false, isReady: true },
  { id: '3', name: 'Charlie', color: 'green', isHost: false, isReady: false },
];

export const Default: Story = {
  args: {
    players: samplePlayers,
    currentPlayerId: '1',
    maxPlayers: 8,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '320px' }}>
        <Story />
      </div>
    ),
  ],
};

export const SinglePlayer: Story = {
  args: {
    players: samplePlayers.slice(0, 1),
    currentPlayerId: '1',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '320px' }}>
        <Story />
      </div>
    ),
  ],
};

export const FullRoom: Story = {
  args: {
    players: [
      { id: '1', name: 'Alice', color: 'blue', isHost: true, isReady: true },
      { id: '2', name: 'Bob', color: 'red', isHost: false, isReady: true },
      { id: '3', name: 'Charlie', color: 'green', isHost: false, isReady: true },
      { id: '4', name: 'Diana', color: 'yellow', isHost: false, isReady: true },
      { id: '5', name: 'Eve', color: 'purple', isHost: false, isReady: false },
      { id: '6', name: 'Frank', color: 'orange', isHost: false, isReady: true },
      { id: '7', name: 'Grace', color: 'pink', isHost: false, isReady: false },
      { id: '8', name: 'Henry', color: 'teal', isHost: false, isReady: true },
    ],
    currentPlayerId: '3',
    maxPlayers: 8,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '320px' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'A full room with 8 players using all available colors.',
      },
    },
  },
};

export const AllReady: Story = {
  args: {
    players: [
      { id: '1', name: 'Host', color: 'blue', isHost: true, isReady: true },
      { id: '2', name: 'Player 2', color: 'red', isHost: false, isReady: true },
      { id: '3', name: 'Player 3', color: 'green', isHost: false, isReady: true },
    ],
    currentPlayerId: '2',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '320px' }}>
        <Story />
      </div>
    ),
  ],
};

export const WaitingForPlayers: Story = {
  args: {
    players: [
      { id: '1', name: 'Host', color: 'blue', isHost: true, isReady: true },
    ],
    currentPlayerId: '1',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '320px' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'Shows empty slots when waiting for more players to join.',
      },
    },
  },
};
