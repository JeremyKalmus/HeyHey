import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { RoundEndScreen } from '../RoundEndScreen';
import type { RoundResult } from '@heyhey/shared';

/**
 * The RoundEndScreen component displays the scoring summary after a round ends.
 *
 * ## Features
 * - Shows round number and who called HeyHey
 * - Per-player breakdown: foundation cards, nertz penalty, round score
 * - Running total scores with rankings
 * - Winner announcement if game is over
 *
 * ## Game Context
 * After someone calls HeyHey (empties their nertz pile), the round ends and
 * scores are calculated. Each card in the foundation is +1 point, each card
 * remaining in nertz pile is -2 points.
 */
const meta: Meta<typeof RoundEndScreen> = {
  title: 'Components/Game/RoundEndScreen',
  component: RoundEndScreen,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#1a1a2e' },
        { name: 'green felt', value: '#1a472a' },
      ],
    },
    docs: {
      description: {
        component: 'Round scoring summary screen shown after HeyHey is called.',
      },
    },
  },
  argTypes: {
    roundResult: {
      description: 'The round result with per-player scores',
    },
    totalScores: {
      description: 'Accumulated total scores for all players',
    },
    gameOver: {
      description: 'Whether the game is over',
      control: 'boolean',
    },
    winner: {
      description: "Winner's player ID (if game over)",
      control: 'text',
    },
  },
  args: {
    onContinue: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof RoundEndScreen>;

// Helper to create player names map
function createPlayerNames(players: string[]): Map<string, string> {
  const names = ['Alice', 'Bob', 'Carol', 'Dave'];
  const map = new Map<string, string>();
  players.forEach((id, i) => map.set(id, names[i] ?? id));
  return map;
}

// Example round results
const twoPlayerRound: RoundResult = {
  roundNumber: 1,
  calledBy: 'player-1',
  playerScores: [
    { playerId: 'player-1', foundationCards: 15, nertzPenalty: 0, roundScore: 15 },
    { playerId: 'player-2', foundationCards: 8, nertzPenalty: 5, roundScore: -2 },
  ],
  timestamp: Date.now(),
};

const fourPlayerRound: RoundResult = {
  roundNumber: 3,
  calledBy: 'player-3',
  playerScores: [
    { playerId: 'player-1', foundationCards: 12, nertzPenalty: 2, roundScore: 8 },
    { playerId: 'player-2', foundationCards: 10, nertzPenalty: 4, roundScore: 2 },
    { playerId: 'player-3', foundationCards: 18, nertzPenalty: 0, roundScore: 18 },
    { playerId: 'player-4', foundationCards: 5, nertzPenalty: 8, roundScore: -11 },
  ],
  timestamp: Date.now(),
};

/**
 * Two players, round 1 - simple game.
 */
export const TwoPlayers: Story = {
  args: {
    roundResult: twoPlayerRound,
    totalScores: [
      { playerId: 'player-1', total: 15 },
      { playerId: 'player-2', total: -2 },
    ],
    playerNames: createPlayerNames(['player-1', 'player-2']),
    gameOver: false,
    currentPlayerId: 'player-1',
  },
};

/**
 * Four players, round 3 - more complex scoring.
 */
export const FourPlayers: Story = {
  args: {
    roundResult: fourPlayerRound,
    totalScores: [
      { playerId: 'player-1', total: 45 },
      { playerId: 'player-2', total: 32 },
      { playerId: 'player-3', total: 58 },
      { playerId: 'player-4', total: 12 },
    ],
    playerNames: createPlayerNames(['player-1', 'player-2', 'player-3', 'player-4']),
    gameOver: false,
    currentPlayerId: 'player-2',
  },
};

/**
 * Game over - someone reached the target score!
 */
export const GameOver: Story = {
  args: {
    roundResult: {
      roundNumber: 5,
      calledBy: 'player-1',
      playerScores: [
        { playerId: 'player-1', foundationCards: 20, nertzPenalty: 0, roundScore: 20 },
        { playerId: 'player-2', foundationCards: 12, nertzPenalty: 3, roundScore: 6 },
      ],
      timestamp: Date.now(),
    },
    totalScores: [
      { playerId: 'player-1', total: 105 },
      { playerId: 'player-2', total: 78 },
    ],
    playerNames: createPlayerNames(['player-1', 'player-2']),
    gameOver: true,
    winner: 'player-1',
    currentPlayerId: 'player-2',
  },
  parameters: {
    docs: {
      description: {
        story: 'When a player reaches the target score, they win and the game ends.',
      },
    },
  },
};

/**
 * Current player view - highlights their row.
 */
export const CurrentPlayerHighlight: Story = {
  args: {
    roundResult: fourPlayerRound,
    totalScores: [
      { playerId: 'player-1', total: 45 },
      { playerId: 'player-2', total: 32 },
      { playerId: 'player-3', total: 58 },
      { playerId: 'player-4', total: 12 },
    ],
    playerNames: createPlayerNames(['player-1', 'player-2', 'player-3', 'player-4']),
    gameOver: false,
    currentPlayerId: 'player-4', // Highlight the player in last place
  },
  parameters: {
    docs: {
      description: {
        story: 'The current player\'s row is highlighted in both the breakdown and totals.',
      },
    },
  },
};

/**
 * Close game - tight scores near the finish.
 */
export const CloseGame: Story = {
  args: {
    roundResult: {
      roundNumber: 7,
      calledBy: 'player-2',
      playerScores: [
        { playerId: 'player-1', foundationCards: 14, nertzPenalty: 1, roundScore: 12 },
        { playerId: 'player-2', foundationCards: 16, nertzPenalty: 0, roundScore: 16 },
        { playerId: 'player-3', foundationCards: 11, nertzPenalty: 2, roundScore: 7 },
      ],
      timestamp: Date.now(),
    },
    totalScores: [
      { playerId: 'player-1', total: 92 },
      { playerId: 'player-2', total: 95 },
      { playerId: 'player-3', total: 88 },
    ],
    playerNames: createPlayerNames(['player-1', 'player-2', 'player-3']),
    gameOver: false,
    currentPlayerId: 'player-1',
  },
  parameters: {
    docs: {
      description: {
        story: 'A close game where everyone is near the target score.',
      },
    },
  },
};
