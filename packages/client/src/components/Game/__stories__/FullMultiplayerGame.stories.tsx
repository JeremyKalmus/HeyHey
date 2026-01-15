// FullMultiplayerGame Stories - Complete multiplayer game with playable local player
// Combines MultiFoundationArea (shared foundations) with PlayerArea (your cards)

import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, useCallback, useEffect, useRef } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { Card, PlayerGameState, GameState, GameConfig, Move, MoveSource } from '@heyhey/shared';
import { createShuffledDeck } from '@heyhey/shared';
import type { PlayerColor } from '../../Card/CardBack';
import type { AvatarString } from '../../ui/Avatar';
import type { FoundationPile as LocalFoundationPile } from '../../Foundation';
import { MultiFoundationArea, type PlayerFoundationGroup } from '../../Foundation';
import { GameBoard } from '../GameBoard';
import { Card as CardComponent } from '../../Card';
import { Avatar } from '../../ui/Avatar';
import { useLocalPlayerState } from '../../../hooks/useLocalPlayerState';
import { useDragAndDrop } from '../../../hooks/useDragAndDrop';
import { usePlayerSettings } from '../../../hooks/usePlayerSettings';
import { SettingsToggle } from '../../ui/SettingsToggle';
import type { SelectedCard } from '../WorkPiles';

// =============================================================================
// CONSTANTS
// =============================================================================

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
const PLAYER_COLORS: PlayerColor[] = ['blue', 'red', 'green', 'yellow', 'purple', 'orange', 'pink', 'teal'];
const PLAYER_NAMES = ['You', 'Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace'];
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

// =============================================================================
// HELPERS
// =============================================================================

// Create a full K->A sequence (13 cards, alternating colors for valid solitaire)
function createFullKingToAce(deckId: string): Card[] {
  return Array.from({ length: 13 }, (_, i) => ({
    suit: (i % 2 === 0 ? 'hearts' : 'spades') as Card['suit'],
    rank: 13 - i, // K=13, Q=12, ... A=1
    deckId,
  }));
}

function createTestPlayerState(playerId: string, withLongPile = false): PlayerGameState {
  const deck = createShuffledDeck(playerId);

  if (withLongPile) {
    // Create a state with one full K→A pile to test compression
    return {
      playerId,
      deckId: playerId,
      nertzPile: deck.slice(0, 5), // Only 5 cards left in nertz
      workPiles: [
        createFullKingToAce(playerId), // Full 13-card pile
        [deck[13]!, deck[14]!, deck[15]!], // 3 cards
        [deck[16]!, deck[17]!], // 2 cards
        [deck[18]!], // 1 card
      ],
      stockPile: deck.slice(19, 30),
      wastePile: deck.slice(30, 33),
    };
  }

  return {
    playerId,
    deckId: playerId,
    nertzPile: deck.slice(0, 13),
    workPiles: [
      [deck[13]!],
      [deck[14]!],
      [deck[15]!],
      [deck[16]!],
    ],
    stockPile: deck.slice(17),
    wastePile: [],
  };
}

function createOpponentState(playerId: string, nertzCount: number): PlayerGameState {
  const deck = createShuffledDeck(playerId);
  return {
    playerId,
    deckId: playerId,
    nertzPile: deck.slice(0, nertzCount),
    workPiles: [
      deck.slice(nertzCount, nertzCount + 2),
      deck.slice(nertzCount + 2, nertzCount + 4),
      deck.slice(nertzCount + 4, nertzCount + 6),
      deck.slice(nertzCount + 6, nertzCount + 8),
    ],
    stockPile: deck.slice(nertzCount + 8, nertzCount + 30),
    wastePile: deck.slice(nertzCount + 30, nertzCount + 33),
  };
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface FullMultiplayerGameProps {
  playerCount: 2 | 4 | 6 | 8;
  simulateOpponents?: boolean;
  /** Start with a full K→A work pile to test compression */
  withLongPile?: boolean;
}

function FullMultiplayerGame({ playerCount, simulateOpponents = true, withLongPile = false }: FullMultiplayerGameProps) {
  const localPlayerId = 'player-you';
  const localPlayerColor = PLAYER_COLORS[0]!;

  // Player settings (Easy Mode)
  const { settings, toggleMoveHints } = usePlayerSettings({ playerId: localPlayerId });

  // Local player state
  const [localPlayerState, setLocalPlayerState] = useState<PlayerGameState>(() =>
    createTestPlayerState(localPlayerId, withLongPile)
  );

  // Foundation piles for all players (each player has 4 suits)
  const [playerFoundations, setPlayerFoundations] = useState<Map<string, LocalFoundationPile[]>>(() => {
    const map = new Map<string, LocalFoundationPile[]>();
    for (let i = 0; i < playerCount; i++) {
      const playerId = i === 0 ? localPlayerId : `player-${i + 1}`;
      map.set(playerId, SUITS.map(suit => ({ suit, cards: [], ownerId: playerId })));
    }
    return map;
  });

  // Opponent states
  const [opponents, setOpponents] = useState<Array<{
    playerId: string;
    playerState: PlayerGameState;
    name: string;
    avatar: AvatarString;
    color: PlayerColor;
    isActive: boolean;
  }>>(() =>
    Array.from({ length: playerCount - 1 }, (_, i) => ({
      playerId: `player-${i + 2}`,
      playerState: createOpponentState(`player-${i + 2}`, 13 - Math.floor(Math.random() * 4)),
      name: PLAYER_NAMES[i + 1] ?? `Player ${i + 2}`,
      avatar: PLAYER_AVATARS[i + 1] ?? 'user:circle',
      color: PLAYER_COLORS[i + 1] ?? 'blue',
      isActive: false,
    }))
  );

  // Build game state for validation
  const gameState: GameState = {
    gameId: 'multiplayer-test',
    phase: 'playing',
    players: [localPlayerState, ...opponents.map(o => o.playerState)],
    foundations: Array.from(playerFoundations.values()).flat(),
    config: { nertzPileSize: 13, drawCount: 3, targetScore: 100 },
  };

  const config: GameConfig = { nertzPileSize: 13, drawCount: 3, targetScore: 100 };

  // Handle local player moves
  const handleMove = useCallback((move: Move) => {

    setLocalPlayerState(prev => {
      if (move.type === 'draw') {
        const drawCount = 3;
        const cardsToDraw = prev.stockPile.slice(-drawCount);
        const newStock = prev.stockPile.slice(0, -drawCount);
        const newWaste = [...prev.wastePile, ...cardsToDraw.reverse()];
        return { ...prev, stockPile: newStock, wastePile: newWaste };
      }

      if (move.type === 'flipStock') {
        const newStock = [...prev.wastePile].reverse();
        return { ...prev, stockPile: newStock, wastePile: [] };
      }

      if (move.type === 'card') {
        const { source, destination, cardCount = 1 } = move;
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

        // Add to work pile destination
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

  // Handle foundation moves from local player
  const handleFoundationMove = useCallback((card: Card, foundationIndex: number, source: MoveSource) => {
    // Find which player owns this foundation (index / 4)
    const playerIndex = Math.floor(foundationIndex / 4);
    const suitIndex = foundationIndex % 4;
    const playerId = playerIndex === 0 ? localPlayerId : `player-${playerIndex + 1}`;

    // Remove card from source
    setLocalPlayerState(prev => {
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

    // Add card to foundation
    setPlayerFoundations(prev => {
      const newMap = new Map(prev);
      const piles = newMap.get(playerId);
      if (piles) {
        const newPiles = [...piles];
        newPiles[suitIndex] = {
          ...newPiles[suitIndex]!,
          cards: [...newPiles[suitIndex]!.cards, card],
        };
        newMap.set(playerId, newPiles);
      }
      return newMap;
    });
  }, []);

  // Simulate opponent moves
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!simulateOpponents) return;

    const makeOpponentMove = () => {
      // Pick random opponent
      const oppIndex = Math.floor(Math.random() * opponents.length);
      const opponent = opponents[oppIndex];
      if (!opponent) return;

      // Try to play from nertz pile to foundation
      const nertzTop = opponent.playerState.nertzPile[opponent.playerState.nertzPile.length - 1];
      if (!nertzTop) return;

      // Find valid foundation
      let foundValidMove = false;
      const allFoundations = Array.from(playerFoundations.values()).flat();

      for (let i = 0; i < allFoundations.length; i++) {
        const foundation = allFoundations[i]!;
        const topCard = foundation.cards[foundation.cards.length - 1];
        const expectedRank = topCard ? topCard.rank + 1 : 1;

        if (nertzTop.suit === foundation.suit && nertzTop.rank === expectedRank) {
          // Valid move found!
          foundValidMove = true;

          // Update opponent state
          setOpponents(prev => {
            const updated = [...prev];
            updated[oppIndex] = {
              ...updated[oppIndex]!,
              playerState: {
                ...updated[oppIndex]!.playerState,
                nertzPile: updated[oppIndex]!.playerState.nertzPile.slice(0, -1),
              },
              isActive: true,
            };
            // Clear active state after short delay
            setTimeout(() => {
              setOpponents(p => {
                const u = [...p];
                if (u[oppIndex]) u[oppIndex] = { ...u[oppIndex]!, isActive: false };
                return u;
              });
            }, 500);
            return updated;
          });

          // Update foundation
          const ownerIndex = Math.floor(i / 4);
          const suitIndex = i % 4;
          const ownerId = ownerIndex === 0 ? localPlayerId : `player-${ownerIndex + 1}`;

          setPlayerFoundations(prev => {
            const newMap = new Map(prev);
            const piles = newMap.get(ownerId);
            if (piles) {
              const newPiles = [...piles];
              newPiles[suitIndex] = {
                ...newPiles[suitIndex]!,
                cards: [...newPiles[suitIndex]!.cards, nertzTop],
              };
              newMap.set(ownerId, newPiles);
            }
            return newMap;
          });

          break;
        }
      }

      // If no foundation move, try work pile moves (simplified)
      if (!foundValidMove && Math.random() < 0.3) {
        // Just mark as active briefly to show activity
        setOpponents(prev => {
          const updated = [...prev];
          updated[oppIndex] = { ...updated[oppIndex]!, isActive: true };
          setTimeout(() => {
            setOpponents(p => {
              const u = [...p];
              if (u[oppIndex]) u[oppIndex] = { ...u[oppIndex]!, isActive: false };
              return u;
            });
          }, 300);
          return updated;
        });
      }
    };

    intervalRef.current = setInterval(makeOpponentMove, 1500 + Math.random() * 1500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [simulateOpponents, opponents, playerFoundations]);

  // Reset game
  const handleReset = useCallback(() => {
    setLocalPlayerState(createTestPlayerState(localPlayerId));
    setOpponents(
      Array.from({ length: playerCount - 1 }, (_, i) => ({
        playerId: `player-${i + 2}`,
        playerState: createOpponentState(`player-${i + 2}`, 13 - Math.floor(Math.random() * 4)),
        name: PLAYER_NAMES[i + 1] ?? `Player ${i + 2}`,
        avatar: PLAYER_AVATARS[i + 1] ?? 'user:circle',
        color: PLAYER_COLORS[i + 1] ?? 'blue',
        isActive: false,
      }))
    );
    const newFoundations = new Map<string, LocalFoundationPile[]>();
    for (let i = 0; i < playerCount; i++) {
      const playerId = i === 0 ? localPlayerId : `player-${i + 1}`;
      newFoundations.set(playerId, SUITS.map(suit => ({ suit, cards: [], ownerId: playerId })));
    }
    setPlayerFoundations(newFoundations);
  }, [playerCount]);

  // Convert foundations to PlayerFoundationGroup format for MultiFoundationArea
  const playerGroups: PlayerFoundationGroup[] = Array.from(playerFoundations.entries()).map(
    ([playerId, piles], index) => ({
      playerId,
      playerName: index === 0 ? 'You' : (PLAYER_NAMES[index] ?? `Player ${index + 1}`),
      playerColor: PLAYER_COLORS[index] ?? 'blue',
      piles,
    })
  );

  // Check if local player can call HeyHey
  const canCallHeyHey = localPlayerState.nertzPile.length === 0;

  // Drag-drop setup
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  });
  const sensors = useSensors(pointerSensor);

  // Use local player state hook
  const localPlayer = useLocalPlayerState({
    serverState: localPlayerState,
    gameState,
    config,
    playerId: localPlayerId,
    onMove: handleMove,
    onFoundationMove: handleFoundationMove,
  });

  // Use drag-drop hook
  const handleDragMove = useCallback(
    (source: MoveSource, destination: { type: 'work' | 'foundation'; pileIndex?: number; foundationIndex?: number }, cardCount?: number) => {
      const move: Move = {
        type: 'card',
        playerId: localPlayerId,
        source,
        destination: destination.type === 'work'
          ? { type: 'work', pileIndex: destination.pileIndex! }
          : { type: 'foundation', foundationIndex: destination.foundationIndex ?? 0 },
        cardCount,
      };
      handleMove(move);
    },
    [handleMove]
  );

  const dragDrop = useDragAndDrop({
    gameState,
    config,
    playerId: localPlayerId,
    onMove: handleDragMove,
    onFoundationMove: handleFoundationMove,
  });

  // Convert selection for GameBoard
  const selectedCard: SelectedCard | null = localPlayer.selectedCard
    ? {
        card: localPlayer.selectedCard.card,
        sourceType: localPlayer.selectedCard.source.type === 'nertz' ? 'nertz'
          : localPlayer.selectedCard.source.type === 'work' ? 'workPile' : 'waste',
        sourcePileIndex: localPlayer.selectedCard.source.type === 'work'
          ? localPlayer.selectedCard.source.pileIndex : undefined,
        cardIndex: localPlayer.selectedCard.source.type === 'work'
          ? (localPlayer.selectedCard.source.cardIndex ?? 0) : 0,
      }
    : null;

  const selectedWasteIndex = localPlayer.selectedCard?.source.type === 'waste'
    ? localPlayerState.wastePile.length - 1
    : undefined;

  // Compute valid destinations for drag
  const dragWorkDestinations = dragDrop.isDragging
    ? dragDrop.validDropTargets.filter(t => t.type === 'work').map(t => t.index)
    : [];
  const combinedWorkDestinations = [...new Set([...localPlayer.validWorkPileDestinations, ...dragWorkDestinations])];

  const dragFoundationTargets = dragDrop.isDragging
    ? dragDrop.validDropTargets.filter(t => t.type === 'foundation').map(t => t.index)
    : [];

  // Combine click-selection and drag foundation targets
  const combinedFoundationTargets = [...new Set([
    ...localPlayer.validFoundationDestinations,
    ...dragFoundationTargets,
  ])];

  // Handle clicking on a foundation pile in MultiFoundationArea
  const handleMultiFoundationClick = useCallback(
    (_playerId: string, _suit: string, globalIndex: number) => {
      // Use the localPlayer's foundation click handler
      localPlayer.handleFoundationClick(globalIndex);
    },
    [localPlayer]
  );

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      padding: '8px',
      minHeight: '100vh',
      background: '#0a0a12',
    }}>
      {/* Compact header with opponents and controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '4px 8px',
      }}>
        {/* Opponents - just avatars with activity pulse */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {opponents.map((opp) => (
            <div
              key={opp.playerId}
              style={{
                position: 'relative',
                opacity: opp.isActive ? 1 : 0.7,
                transition: 'opacity 0.2s',
              }}
              title={opp.name}
            >
              {opp.isActive && (
                <div style={{
                  position: 'absolute',
                  inset: -3,
                  borderRadius: '50%',
                  border: '2px solid #FFD23F',
                  animation: 'pulse 0.5s ease-out',
                }} />
              )}
              <Avatar avatar={opp.avatar} color={opp.color} size="sm" />
            </div>
          ))}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <SettingsToggle
            showMoveHints={settings.showMoveHints}
            onToggleHints={toggleMoveHints}
          />
          <button
            onClick={handleReset}
            style={{
              padding: '4px 8px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* DndContext wraps both foundations and player area for drag-drop */}
      <DndContext
        sensors={sensors}
        onDragStart={dragDrop.handleDragStart}
        onDragOver={dragDrop.handleDragOver}
        onDragEnd={dragDrop.handleDragEnd}
        onDragCancel={dragDrop.handleDragCancel}
      >
        {/* Shared Foundations (Multi-player) - compact */}
        <MultiFoundationArea
          playerGroups={playerGroups}
          selectedCard={localPlayer.selectedCard?.card ?? null}
          onPileClick={handleMultiFoundationClick}
          canPlace={combinedFoundationTargets.length > 0}
          showMoveHints={settings.showMoveHints}
          isDragging={dragDrop.isDragging}
          validDragFoundations={dragFoundationTargets}
        />

        {/* Your Play Area */}
        <GameBoard
          nertzPile={localPlayerState.nertzPile}
          workPiles={localPlayerState.workPiles as [Card[], Card[], Card[], Card[]]}
          stockPile={localPlayerState.stockPile}
          wastePile={localPlayerState.wastePile}
          foundationPiles={[]}
          hideFoundation={true}
          hideTopBar={true}
          playerColor={localPlayerColor}
          playerName="You"
          currentRound={1}
          selectedCard={selectedCard}
          validWorkDestinations={combinedWorkDestinations}
          selectedWasteIndex={selectedWasteIndex}
          canCallHeyHey={canCallHeyHey}
          canRecycleStock={localPlayerState.stockPile.length === 0 && localPlayerState.wastePile.length > 0}
          disabled={false}
          onNertzCardClick={localPlayer.handleNertzClick}
          onNertzCardDoubleClick={localPlayer.handleNertzDoubleClick}
          onWorkCardClick={localPlayer.handleWorkPileClick}
          onWorkCardDoubleClick={localPlayer.handleWorkPileDoubleClick}
          onWorkPileClick={localPlayer.handleWorkPileTarget}
          onStockDraw={localPlayer.drawCards}
          onStockRecycle={localPlayer.recycleWaste}
          onWasteCardClick={localPlayer.handleWasteClick}
          onWasteCardDoubleClick={localPlayer.handleWasteDoubleClick}
          onCallHeyHey={() => {}}
          canPlaceOnFoundation={localPlayer.validFoundationDestinations.length > 0}
          foundationSelectedCard={localPlayer.selectedCard?.card ?? null}
          isDragging={dragDrop.isDragging}
          dragSource={dragDrop.dragSource}
          validDropTargets={dragDrop.validDropTargets}
          onBackgroundClick={localPlayer.clearSelection}
          showMoveHints={settings.showMoveHints}
          maxPileHeight={280}
        />

        <DragOverlay>
          {dragDrop.dragSource && (
            <CardComponent
              card={dragDrop.dragSource.card}
              faceUp={true}
              backColor={localPlayerColor}
            />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

// =============================================================================
// STORYBOOK META
// =============================================================================

const meta: Meta<typeof FullMultiplayerGame> = {
  title: 'Game/FullMultiplayerGame',
  component: FullMultiplayerGame,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
      values: [{ name: 'dark', value: '#0a0a12' }],
    },
  },
};

export default meta;
type Story = StoryObj<typeof FullMultiplayerGame>;

/**
 * Full 4-player game with playable local player area.
 * - Top: Opponent status indicators
 * - Middle: Shared foundation piles (4 per player = 16 total)
 * - Bottom: Your playable cards (nertz, work piles, stock/waste)
 */
export const FourPlayer: Story = {
  args: {
    playerCount: 4,
    simulateOpponents: true,
  },
};

/**
 * Head-to-head 2-player game.
 */
export const TwoPlayer: Story = {
  args: {
    playerCount: 2,
    simulateOpponents: true,
  },
};

/**
 * Full 6-player chaos.
 */
export const SixPlayer: Story = {
  args: {
    playerCount: 6,
    simulateOpponents: true,
  },
};

/**
 * Maximum 8-player madness!
 */
export const EightPlayer: Story = {
  args: {
    playerCount: 8,
    simulateOpponents: true,
  },
};

/**
 * Practice mode - no opponents, just your cards and foundations.
 */
export const SoloPlaytest: Story = {
  args: {
    playerCount: 2,
    simulateOpponents: false,
  },
};

/**
 * Test with a full K→A work pile (13 cards) to verify compression.
 * This tests the "above the fold" layout with maximum work pile height.
 */
export const WithLongWorkPile: Story = {
  args: {
    playerCount: 4,
    simulateOpponents: false,
    withLongPile: true,
  },
};
