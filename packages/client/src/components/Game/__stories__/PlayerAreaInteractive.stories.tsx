// PlayerArea Interactive Story - Test drag-and-drop solitaire gameplay
// Similar to SetupAreaInteractive but for the main game phase

import type { Meta, StoryObj } from '@storybook/react';
import { useState, useCallback } from 'react';
import { PlayerArea } from '../PlayerArea';
import type { PlayerGameState, GameState, GameConfig, Card, Move } from '@heyhey/shared';
import { createShuffledDeck } from '@heyhey/shared';
import type { PlayerColor } from '../../Card/CardBack';

// Helper to create a card
function createCard(suit: Card['suit'], rank: number, deckId = 'player-1'): Card {
  return { suit, rank, deckId };
}

// Create initial player state for testing solitaire mechanics
function createTestPlayerState(deckId: string): PlayerGameState {
  // Create a shuffled deck and deal it out
  const deck = createShuffledDeck(deckId);

  // Nertz pile: 13 cards, top face up
  const nertzPile = deck.slice(0, 13);

  // Work piles: 4 piles with 1 card each (face up)
  const workPiles: [Card[], Card[], Card[], Card[]] = [
    [deck[13]!],
    [deck[14]!],
    [deck[15]!],
    [deck[16]!],
  ];

  // Stock pile: remaining cards
  const stockPile = deck.slice(17);

  // Waste pile: empty initially
  const wastePile: Card[] = [];

  return {
    playerId: deckId,
    deckId,
    nertzPile,
    workPiles,
    stockPile,
    wastePile,
  };
}

// Create game state wrapper
function createTestGameState(playerState: PlayerGameState): GameState {
  return {
    gameId: 'test-game',
    phase: 'playing',
    players: [playerState],
    foundations: [
      { suit: 'hearts', cards: [] },
      { suit: 'diamonds', cards: [] },
      { suit: 'clubs', cards: [] },
      { suit: 'spades', cards: [] },
    ],
    config: {
      nertzPileSize: 13,
      workPileCount: 4,
      drawCount: 3,
      targetScore: 100,
    },
  };
}

// Default game config
const defaultConfig: GameConfig = {
  nertzPileSize: 13,
  workPileCount: 4,
  drawCount: 3,
  targetScore: 100,
};

interface InteractivePlayerAreaProps {
  playerColor: PlayerColor;
  playerName: string;
}

function InteractivePlayerArea({ playerColor, playerName }: InteractivePlayerAreaProps) {
  const playerId = `player-${playerColor}`;

  // Initialize state
  const [playerState, setPlayerState] = useState<PlayerGameState>(() =>
    createTestPlayerState(playerId)
  );
  const [gameState, setGameState] = useState<GameState>(() =>
    createTestGameState(playerState)
  );
  const [moveLog, setMoveLog] = useState<string[]>([]);

  // Handle moves (update local state for demo)
  const handleMove = useCallback((move: Move) => {
    console.log('Move:', move);
    setMoveLog(prev => [...prev.slice(-9), `${move.type}: ${JSON.stringify(move)}`]);

    // For demo purposes, we'll let the useLocalPlayerState handle optimistic updates
    // In real game, server would send back updated state
  }, []);

  // Handle foundation moves
  const handleFoundationMove = useCallback((card: Card, foundationIndex: number) => {
    console.log('Foundation move:', card, 'to foundation', foundationIndex);
    setMoveLog(prev => [...prev.slice(-9), `foundation: ${card.suit} ${card.rank} -> pile ${foundationIndex}`]);

    // Update game state with new foundation card
    setGameState(prev => {
      const newFoundations = [...prev.foundations];
      const pile = newFoundations[foundationIndex];
      if (pile) {
        newFoundations[foundationIndex] = {
          ...pile,
          cards: [...pile.cards, card],
        };
      }
      return { ...prev, foundations: newFoundations };
    });
  }, []);

  // Handle HeyHey call
  const handleHeyHey = useCallback(() => {
    console.log('HeyHey called!');
    setMoveLog(prev => [...prev.slice(-9), 'HEYHEY called!']);
  }, []);

  // Reset game
  const handleReset = useCallback(() => {
    const newPlayerState = createTestPlayerState(playerId);
    setPlayerState(newPlayerState);
    setGameState(createTestGameState(newPlayerState));
    setMoveLog([]);
  }, [playerId]);

  // Keep game state in sync with player state
  const currentGameState: GameState = {
    ...gameState,
    players: [playerState],
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '100vh', background: '#0a0a12' }}>
      <PlayerArea
        serverState={playerState}
        gameState={currentGameState}
        config={defaultConfig}
        playerId={playerId}
        playerName={playerName}
        playerColor={playerColor}
        playerScore={0}
        currentRound={1}
        totalRounds={10}
        disabled={false}
        onMove={handleMove}
        onFoundationMove={handleFoundationMove}
        onCallHeyHey={handleHeyHey}
      />

      {/* Debug Panel */}
      <div
        style={{
          padding: '12px 16px',
          margin: '0 16px 16px',
          background: 'rgba(0, 0, 0, 0.5)',
          borderRadius: '8px',
          color: '#fff',
          fontSize: '0.85rem',
          display: 'flex',
          gap: '24px',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: '0 0 auto' }}>
          <strong>Nertz:</strong> {playerState.nertzPile.length}
        </div>
        <div style={{ flex: '0 0 auto' }}>
          <strong>Stock:</strong> {playerState.stockPile.length}
        </div>
        <div style={{ flex: '0 0 auto' }}>
          <strong>Waste:</strong> {playerState.wastePile.length}
        </div>
        <div style={{ flex: '0 0 auto' }}>
          <strong>Work:</strong> {playerState.workPiles.map(p => p.length).join(', ')}
        </div>
        <div style={{ flex: '1 1 200px', maxHeight: '80px', overflow: 'auto' }}>
          <strong>Log:</strong>
          <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
            {moveLog.slice(-5).map((log, i) => (
              <div key={i}>{log}</div>
            ))}
          </div>
        </div>
        <button
          onClick={handleReset}
          style={{
            padding: '6px 12px',
            borderRadius: '4px',
            border: 'none',
            background: '#ef5350',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          Reset
        </button>
      </div>

      {/* Instructions */}
      <div
        style={{
          padding: '12px 16px',
          margin: '0 16px 16px',
          background: 'rgba(0, 100, 200, 0.2)',
          borderRadius: '8px',
          color: '#fff',
          fontSize: '0.85rem',
        }}
      >
        <strong>How to play:</strong>
        <ul style={{ margin: '8px 0 0', paddingLeft: '20px' }}>
          <li><strong>Drag cards</strong> from Nertz pile, Waste pile, or Work piles</li>
          <li><strong>Drop on Work piles</strong> (alternating colors, descending rank)</li>
          <li><strong>Drop on Foundations</strong> (same suit, ascending from Ace)</li>
          <li><strong>Click Stock</strong> to draw 3 cards to Waste</li>
          <li><strong>Double-click</strong> a card to auto-move to Foundation</li>
          <li><strong>Multi-card drag</strong>: Drag from middle of Work pile to move stack</li>
        </ul>
      </div>
    </div>
  );
}

const meta: Meta<typeof InteractivePlayerArea> = {
  title: 'Game/PlayerArea/Interactive',
  component: InteractivePlayerArea,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
      values: [{ name: 'dark', value: '#0a0a12' }],
    },
  },
  argTypes: {
    playerColor: {
      control: 'select',
      options: ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'teal', 'pink'],
    },
    playerName: {
      control: 'text',
    },
  },
};

export default meta;
type Story = StoryObj<typeof InteractivePlayerArea>;

/**
 * Full interactive solitaire gameplay with drag-and-drop.
 *
 * **How to play:**
 * - **Drag** cards from Nertz pile, Waste pile, or Work piles
 * - **Drop** on Work piles (alternating colors, descending rank)
 * - **Drop** on Foundations (same suit, Ace to King)
 * - **Click Stock** to draw cards to Waste
 * - **Double-click** to auto-move to Foundation
 */
export const DragAndDrop: Story = {
  args: {
    playerColor: 'blue',
    playerName: 'Player 1',
  },
};

/**
 * Different player color for variety.
 */
export const GreenPlayer: Story = {
  args: {
    playerColor: 'green',
    playerName: 'Player 2',
  },
};
