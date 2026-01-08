import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { useState } from 'react';
import type { GameConfig } from '@heyhey/shared';
import { RoomLobby } from '../RoomLobby';
import type { LobbyPlayer } from '../PlayerList';

/**
 * The RoomLobby component is the main lobby view where players wait before a game.
 * It shows the room code, player list, game settings, and start/ready controls.
 */
const meta: Meta<typeof RoomLobby> = {
  title: 'Lobby/RoomLobby',
  component: RoomLobby,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        component:
          'The lobby where players gather before starting a game. Host can configure settings and start the game.',
      },
    },
  },
  args: {
    onConfigChange: fn(),
    onStartGame: fn(),
    onLeaveRoom: fn(),
    onToggleReady: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof RoomLobby>;

const defaultConfig: GameConfig = {
  nertzPileSize: 10,
  drawCount: 3,
  targetScore: 100,
};

const samplePlayers: LobbyPlayer[] = [
  { id: '1', name: 'Alice', color: 'blue', isHost: true, isReady: true },
  { id: '2', name: 'Bob', color: 'red', isHost: false, isReady: true },
  { id: '3', name: 'Charlie', color: 'green', isHost: false, isReady: false },
];

// Interactive host lobby
function HostLobbyDemo() {
  const [config, setConfig] = useState<GameConfig>(defaultConfig);
  const players = samplePlayers;

  const handleStart = () => {
    alert('Game starting!');
  };

  const handleLeave = () => {
    alert('Leaving room...');
  };

  return (
    <RoomLobby
      roomCode="ABC123"
      players={players}
      currentPlayerId="1"
      isHost
      gameConfig={config}
      onConfigChange={setConfig}
      onStartGame={handleStart}
      onLeaveRoom={handleLeave}
    />
  );
}

// Interactive player lobby
function PlayerLobbyDemo() {
  const [isReady, setIsReady] = useState(false);

  return (
    <RoomLobby
      roomCode="ABC123"
      players={[
        { id: '1', name: 'Alice', color: 'blue', isHost: true, isReady: true },
        { id: '2', name: 'You', color: 'red', isHost: false, isReady },
      ]}
      currentPlayerId="2"
      isHost={false}
      gameConfig={defaultConfig}
      onConfigChange={() => {}}
      onStartGame={() => {}}
      onLeaveRoom={() => alert('Leaving...')}
      onToggleReady={() => setIsReady(!isReady)}
      isReady={isReady}
    />
  );
}

export const AsHost: Story = {
  render: () => <HostLobbyDemo />,
  parameters: {
    docs: {
      description: {
        story:
          'Host view with ability to change settings and start the game when all players are ready.',
      },
    },
  },
};

export const AsPlayer: Story = {
  render: () => <PlayerLobbyDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Player view with Ready toggle. Cannot modify settings or start game.',
      },
    },
  },
};

export const WaitingForMorePlayers: Story = {
  args: {
    roomCode: 'XYZ789',
    players: [
      { id: '1', name: 'Host', color: 'blue', isHost: true, isReady: true },
    ],
    currentPlayerId: '1',
    isHost: true,
    gameConfig: defaultConfig,
  },
  parameters: {
    docs: {
      description: {
        story: 'Host waiting for at least one more player to join.',
      },
    },
  },
};

export const AllPlayersReady: Story = {
  args: {
    roomCode: 'GAME42',
    players: [
      { id: '1', name: 'Alice', color: 'blue', isHost: true, isReady: true },
      { id: '2', name: 'Bob', color: 'red', isHost: false, isReady: true },
      { id: '3', name: 'Charlie', color: 'green', isHost: false, isReady: true },
      { id: '4', name: 'Diana', color: 'yellow', isHost: false, isReady: true },
    ],
    currentPlayerId: '1',
    isHost: true,
    gameConfig: defaultConfig,
  },
  parameters: {
    docs: {
      description: {
        story: 'All players are ready - host can start the game!',
      },
    },
  },
};

export const FullRoom: Story = {
  args: {
    roomCode: 'FULL00',
    players: [
      { id: '1', name: 'Alice', color: 'blue', isHost: true, isReady: true },
      { id: '2', name: 'Bob', color: 'red', isHost: false, isReady: true },
      { id: '3', name: 'Charlie', color: 'green', isHost: false, isReady: true },
      { id: '4', name: 'Diana', color: 'yellow', isHost: false, isReady: true },
      { id: '5', name: 'Eve', color: 'purple', isHost: false, isReady: true },
      { id: '6', name: 'Frank', color: 'orange', isHost: false, isReady: true },
      { id: '7', name: 'Grace', color: 'pink', isHost: false, isReady: true },
      { id: '8', name: 'Henry', color: 'teal', isHost: false, isReady: true },
    ],
    currentPlayerId: '1',
    isHost: true,
    gameConfig: defaultConfig,
  },
  parameters: {
    docs: {
      description: {
        story: 'Maximum capacity with 8 players, all ready to play.',
      },
    },
  },
};
