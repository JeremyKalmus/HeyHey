// PlayerArea Interactive Story - Test drag-and-drop solitaire gameplay
// Similar to SetupAreaInteractive but for the main game phase

import type { Meta, StoryObj } from '@storybook/react';
import { useState, useCallback } from 'react';
import { PlayerArea } from '../PlayerArea';
import type { PlayerGameState, GameState, GameConfig, Card, Move, MoveSource } from '@heyhey/shared';
import { createShuffledDeck } from '@heyhey/shared';
import type { PlayerColor } from '../../Card/CardBack';
import { usePlayerSettings } from '../../../hooks/usePlayerSettings';
import { SettingsToggle } from '../../ui/SettingsToggle';

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
      drawCount: 3,
      targetScore: 100,
    },
  };
}

// Default game config
const defaultConfig: GameConfig = {
  nertzPileSize: 13,
  drawCount: 3,
  targetScore: 100,
};

interface InteractivePlayerAreaProps {
  playerColor: PlayerColor;
  playerName: string;
}

function InteractivePlayerArea({ playerColor, playerName }: InteractivePlayerAreaProps) {
  const playerId = `player-${playerColor}`;

  // Player settings (Easy Mode toggle)
  const { settings, toggleMoveHints } = usePlayerSettings({ playerId });

  // Initialize state
  const [playerState, setPlayerState] = useState<PlayerGameState>(() =>
    createTestPlayerState(playerId)
  );
  const [gameState, setGameState] = useState<GameState>(() =>
    createTestGameState(playerState)
  );
  const [moveLog, setMoveLog] = useState<string[]>([]);

  // Handle moves - actually update state (simulating server response)
  const handleMove = useCallback((move: Move) => {
    console.log('Move:', move);
    setMoveLog(prev => [...prev.slice(-9), `${move.type}: ${JSON.stringify(move)}`]);

    // Actually update playerState to simulate server response
    setPlayerState(prev => {
      if (move.type === 'draw') {
        // Draw 3 cards from stock to waste
        const drawCount = 3;
        const cardsToDraw = prev.stockPile.slice(-drawCount);
        const newStock = prev.stockPile.slice(0, -drawCount);
        const newWaste = [...prev.wastePile, ...cardsToDraw.reverse()];
        return { ...prev, stockPile: newStock, wastePile: newWaste };
      }

      if (move.type === 'flipStock') {
        // Move all waste back to stock (reversed)
        const newStock = [...prev.wastePile].reverse();
        return { ...prev, stockPile: newStock, wastePile: [] };
      }

      if (move.type === 'card') {
        const { source, destination, cardCount = 1 } = move;

        // Get the card(s) being moved
        let movedCards: Card[] = [];
        let newState = { ...prev };

        // Remove from source
        if (source.type === 'nertz') {
          movedCards = prev.nertzPile.slice(-1);
          newState.nertzPile = prev.nertzPile.slice(0, -1);
        } else if (source.type === 'waste') {
          movedCards = prev.wastePile.slice(-1);
          newState.wastePile = prev.wastePile.slice(0, -1);
        } else if (source.type === 'work' && source.pileIndex !== undefined) {
          const pile = prev.workPiles[source.pileIndex] ?? [];
          const startIdx = source.cardIndex ?? (pile.length - cardCount);
          movedCards = pile.slice(startIdx);
          const newPiles = [...prev.workPiles] as [Card[], Card[], Card[], Card[]];
          newPiles[source.pileIndex] = pile.slice(0, startIdx);
          newState.workPiles = newPiles;
        }

        // Add to destination (only for work piles - foundation handled separately)
        if (destination.type === 'work' && destination.pileIndex !== undefined) {
          const newPiles = [...newState.workPiles] as [Card[], Card[], Card[], Card[]];
          newPiles[destination.pileIndex] = [
            ...(newPiles[destination.pileIndex] ?? []),
            ...movedCards,
          ];
          newState.workPiles = newPiles;
        }

        return newState;
      }

      return prev;
    });
  }, []);

  // Handle foundation moves - remove from source AND add to foundation
  const handleFoundationMove = useCallback((card: Card, foundationIndex: number, source: MoveSource) => {
    console.log('Foundation move:', card, 'from', source, 'to foundation', foundationIndex);
    setMoveLog(prev => [...prev.slice(-9), `foundation: ${card.suit} ${card.rank} -> pile ${foundationIndex}`]);

    // Remove card from source pile in player state
    setPlayerState(prev => {
      if (source.type === 'nertz') {
        return { ...prev, nertzPile: prev.nertzPile.slice(0, -1) };
      } else if (source.type === 'waste') {
        return { ...prev, wastePile: prev.wastePile.slice(0, -1) };
      } else if (source.type === 'work' && source.pileIndex !== undefined) {
        const newPiles = [...prev.workPiles] as [Card[], Card[], Card[], Card[]];
        const pile = newPiles[source.pileIndex] ?? [];
        newPiles[source.pileIndex] = pile.slice(0, -1);
        return { ...prev, workPiles: newPiles };
      }
      return prev;
    });

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '100vh', background: '#0a0a12', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
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
        showMoveHints={settings.showMoveHints}
      />

      {/* Debug Panel */}
      <div
        style={{
          padding: '12px 16px',
          background: 'rgba(0, 0, 0, 0.5)',
          borderRadius: '8px',
          color: '#fff',
          fontSize: '0.85rem',
          display: 'flex',
          gap: '24px',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          maxWidth: '800px',
          width: '100%',
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
        <SettingsToggle
          showMoveHints={settings.showMoveHints}
          onToggleHints={toggleMoveHints}
        />
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
          background: 'rgba(0, 100, 200, 0.2)',
          borderRadius: '8px',
          color: '#fff',
          fontSize: '0.85rem',
          maxWidth: '800px',
          width: '100%',
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
