// MultiplayerGame Stories - Static multiplayer game layouts
// Shows MultiFoundationArea with OpponentMini displays for various player counts

import type { Meta, StoryObj } from '@storybook/react-vite';
import type { Card, PlayerGameState } from '@heyhey/shared';
import type { PlayerColor } from '../../Card/CardBack';
import type { AvatarString } from '../../ui/Avatar';
import type { FoundationPile } from '../../Foundation';
import { MultiFoundationArea, type PlayerFoundationGroup } from '../../Foundation';
import { OpponentMini } from '../OpponentMini';

// =============================================================================
// HELPERS
// =============================================================================

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;

const PLAYER_COLORS: PlayerColor[] = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'teal'];
const PLAYER_NAMES = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
const PLAYER_AVATARS: AvatarString[] = [
  'user:circle',
  'smile:square',
  'ghost:diamond',
  'skull:hexagon',
  'cat:star',
  'bot:triangle',
  'heart:circle',
  'zap:square',
];

/**
 * Create cards for a pile
 */
function createCards(count: number, deckId: string): Card[] {
  return Array.from({ length: count }, (_, i) => ({
    suit: SUITS[i % 4]!,
    rank: (i % 13) + 1,
    deckId,
  }));
}

/**
 * Create foundation piles for a player with some random cards
 */
function createFoundationPiles(playerId: string, cardCounts: [number, number, number, number]): FoundationPile[] {
  return SUITS.map((suit, index) => ({
    suit,
    cards: createCards(cardCounts[index]!, playerId).map(c => ({ ...c, suit })),
    ownerId: playerId,
  }));
}

/**
 * Create player game state for OpponentMini display
 */
function createPlayerState(playerId: string, nertzCount: number): PlayerGameState {
  return {
    playerId,
    deckId: playerId,
    nertzPile: createCards(nertzCount, playerId),
    stockPile: createCards(35 - nertzCount, playerId),
    wastePile: createCards(Math.floor(Math.random() * 6), playerId),
    workPiles: [
      createCards(1 + Math.floor(Math.random() * 3), playerId),
      createCards(1 + Math.floor(Math.random() * 3), playerId),
      createCards(1 + Math.floor(Math.random() * 3), playerId),
      createCards(1 + Math.floor(Math.random() * 3), playerId),
    ],
  };
}

/**
 * Create player foundation group
 */
function createPlayerGroup(index: number, foundationCards: [number, number, number, number]): PlayerFoundationGroup {
  const playerId = `player-${index + 1}`;
  return {
    playerId,
    playerName: PLAYER_NAMES[index] ?? `Player ${index + 1}`,
    playerColor: PLAYER_COLORS[index] ?? 'blue',
    piles: createFoundationPiles(playerId, foundationCards),
  };
}

// =============================================================================
// STORY WRAPPER COMPONENT
// =============================================================================

interface MultiplayerGameLayoutProps {
  playerCount: 2 | 4 | 6 | 8;
  /** Foundation card counts for each player (array of [hearts, diamonds, clubs, spades]) */
  foundationCards?: [number, number, number, number][];
  /** Nertz pile counts for each opponent */
  nertzCounts?: number[];
  /** Title for the layout */
  title: string;
}

function MultiplayerGameLayout({
  playerCount,
  foundationCards,
  nertzCounts,
  title,
}: MultiplayerGameLayoutProps) {
  // Generate default foundation cards if not provided
  const defaultFoundationCards = Array.from({ length: playerCount }, () => {
    // Vary the foundation progress for visual interest
    const base = Math.floor(Math.random() * 5);
    return [
      base + Math.floor(Math.random() * 3),
      base + Math.floor(Math.random() * 3),
      base + Math.floor(Math.random() * 3),
      base + Math.floor(Math.random() * 3),
    ] as [number, number, number, number];
  });

  const actualFoundationCards = foundationCards ?? defaultFoundationCards;

  // Create player groups for foundations
  const playerGroups: PlayerFoundationGroup[] = Array.from(
    { length: playerCount },
    (_, i) => createPlayerGroup(i, actualFoundationCards[i]!)
  );

  // Default nertz counts (varying progress)
  const defaultNertzCounts = Array.from({ length: playerCount - 1 }, (_, i) => {
    // First opponent is close to winning, others vary
    if (i === 0) return 3;
    return 13 - Math.floor(Math.random() * 6);
  });

  const actualNertzCounts = nertzCounts ?? defaultNertzCounts;

  // Create opponent states (all players except "you" - player 0)
  const opponents = Array.from({ length: playerCount - 1 }, (_, idx) => ({
    playerState: createPlayerState(`player-${idx + 2}`, actualNertzCounts[idx]!),
    name: PLAYER_NAMES[idx + 1] ?? `Player ${idx + 2}`,
    avatar: PLAYER_AVATARS[idx + 1]!,
    color: PLAYER_COLORS[idx + 1]!,
    isActive: idx === 0, // First opponent is active
  }));

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      padding: '24px',
      minHeight: '100vh',
      background: '#0a0a12',
    }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        color: '#FFD23F',
        fontFamily: 'Inter, sans-serif',
        fontWeight: 900,
        fontSize: '1.5rem',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
      }}>
        {title}
      </div>

      {/* Opponents Row */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '16px',
        flexWrap: 'wrap',
      }}>
        {opponents.map((opp) => (
          <OpponentMini
            key={opp.name}
            playerState={opp.playerState}
            name={opp.name}
            avatar={opp.avatar}
            color={opp.color}
            isActive={opp.isActive}
          />
        ))}
      </div>

      {/* Shared Foundations */}
      <MultiFoundationArea
        playerGroups={playerGroups}
        canPlace={false}
      />

      {/* Info Panel */}
      <div style={{
        padding: '12px 16px',
        background: 'rgba(0, 100, 200, 0.2)',
        borderRadius: '8px',
        color: '#fff',
        fontSize: '0.85rem',
        textAlign: 'center',
      }}>
        <strong>{playerCount} Players</strong> • {playerCount * 4} Foundation Piles •
        Each player has their own set of 4 foundations (♥ ♦ ♣ ♠)
      </div>
    </div>
  );
}

// =============================================================================
// STORYBOOK META
// =============================================================================

const meta: Meta<typeof MultiplayerGameLayout> = {
  title: 'Game/MultiplayerGame',
  component: MultiplayerGameLayout,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
      values: [{ name: 'dark', value: '#0a0a12' }],
    },
    docs: {
      description: {
        component: `
Multiplayer game layouts showing the MultiFoundationArea component with
opponent displays for various player counts.

In multiplayer Nertz:
- Each player has their own set of 4 foundation piles (one per suit)
- All foundation piles are shared targets - anyone can play on any pile
- The player who empties their Nertz pile first calls "HeyHey!" to end the round
- Score = cards played to foundations (+1 each) - remaining Nertz cards (-2 each)
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof MultiplayerGameLayout>;

// =============================================================================
// STORIES
// =============================================================================

/**
 * Two-player game with 8 foundation piles (4 per player).
 * Classic head-to-head Nertz match.
 */
export const TwoPlayerGame: Story = {
  args: {
    playerCount: 2,
    title: '2-Player Game',
    foundationCards: [
      [3, 2, 4, 1], // Alice's foundations
      [2, 5, 1, 3], // Bob's foundations
    ],
    nertzCounts: [5], // Bob has 5 cards left
  },
  parameters: {
    docs: {
      description: {
        story: `
Classic head-to-head Nertz! Two players each have 4 foundation piles.
Bob is close to winning with only 5 cards in his Nertz pile.
        `,
      },
    },
  },
};

/**
 * Four-player game with 16 foundation piles (4 per player).
 * Standard multiplayer party game.
 */
export const FourPlayerGame: Story = {
  args: {
    playerCount: 4,
    title: '4-Player Game',
    foundationCards: [
      [4, 3, 5, 2], // Alice
      [2, 1, 3, 4], // Bob
      [5, 4, 2, 3], // Charlie
      [1, 2, 4, 5], // Diana
    ],
    nertzCounts: [3, 8, 11], // Bob is about to win!
  },
  parameters: {
    docs: {
      description: {
        story: `
Standard 4-player Nertz party game! 16 foundation piles total.
Bob (blue) is in the danger zone with only 3 Nertz cards remaining!
        `,
      },
    },
  },
};

/**
 * Six-player game with 24 foundation piles (4 per player).
 * Large group game showing grid scalability.
 */
export const SixPlayerGame: Story = {
  args: {
    playerCount: 6,
    title: '6-Player Game',
    foundationCards: [
      [3, 4, 2, 5], // Alice
      [4, 2, 3, 1], // Bob
      [2, 5, 4, 3], // Charlie
      [5, 3, 1, 4], // Diana
      [1, 4, 5, 2], // Eve
      [4, 1, 3, 5], // Frank
    ],
    nertzCounts: [7, 4, 10, 9, 6], // Charlie is close!
  },
  parameters: {
    docs: {
      description: {
        story: `
6-player chaos! 24 foundation piles make for a busy table.
Charlie (green) has only 4 cards left - watch out!
        `,
      },
    },
  },
};

/**
 * Eight-player game with 32 foundation piles (4 per player).
 * Maximum supported player count.
 */
export const EightPlayerGame: Story = {
  args: {
    playerCount: 8,
    title: '8-Player Game',
    foundationCards: [
      [2, 3, 1, 4], // Alice
      [3, 1, 4, 2], // Bob
      [1, 4, 2, 3], // Charlie
      [4, 2, 3, 1], // Diana
      [2, 3, 4, 1], // Eve
      [3, 4, 1, 2], // Frank
      [4, 1, 2, 3], // Grace
      [1, 2, 3, 4], // Henry
    ],
    nertzCounts: [6, 9, 2, 11, 8, 7, 10], // Diana is winning!
  },
  parameters: {
    docs: {
      description: {
        story: `
Maximum 8-player game! 32 foundation piles create controlled chaos.
Diana (yellow) has only 2 Nertz cards - she's about to win!
        `,
      },
    },
  },
};

/**
 * Late-game scenario with many cards on foundations.
 */
export const LateGame: Story = {
  args: {
    playerCount: 4,
    title: 'Late Game - Round Almost Over',
    foundationCards: [
      [10, 8, 11, 9],  // Alice - doing well
      [7, 9, 8, 10],   // Bob
      [9, 11, 7, 8],   // Charlie
      [8, 7, 10, 11],  // Diana
    ],
    nertzCounts: [1, 4, 6], // Bob is about to call HeyHey!
  },
  parameters: {
    docs: {
      description: {
        story: `
Late in the round - foundations are filling up fast!
Bob has only 1 card in his Nertz pile and is about to call "HeyHey!"
        `,
      },
    },
  },
};

/**
 * Early game scenario with mostly empty foundations.
 */
export const EarlyGame: Story = {
  args: {
    playerCount: 4,
    title: 'Early Game - Just Started',
    foundationCards: [
      [1, 0, 1, 0], // Alice
      [0, 1, 0, 1], // Bob
      [1, 1, 0, 0], // Charlie
      [0, 0, 1, 1], // Diana
    ],
    nertzCounts: [12, 13, 11],
  },
  parameters: {
    docs: {
      description: {
        story: `
Just starting out! Only a few aces have been played.
Everyone still has most of their Nertz pile intact.
        `,
      },
    },
  },
};
