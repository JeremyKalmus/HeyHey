import type { Meta, StoryObj } from '@storybook/react';
import { TableLayout, type OpponentState } from '../TableLayout';
import { MultiFoundationArea, type PlayerFoundationGroup } from '../../Foundation';
import { GameBoard } from '../GameBoard';
import type { Card as CardType } from '@heyhey/shared';
import type { PlayerColor } from '../../Card/CardBack';

// Helper to create cards
function createCard(suit: CardType['suit'], rank: number, deckId = 'player-1'): CardType {
  return { suit, rank, deckId };
}

// Sample data for foundations
function createFoundationGroups(players: { id: string; name: string; color: PlayerColor }[]): PlayerFoundationGroup[] {
  return players.map((p) => ({
    playerId: p.id,
    playerName: p.name,
    playerColor: p.color,
    piles: [
      { suit: 'hearts' as const, cards: [], ownerId: p.id },
      { suit: 'diamonds' as const, cards: [], ownerId: p.id },
      { suit: 'clubs' as const, cards: [], ownerId: p.id },
      { suit: 'spades' as const, cards: [], ownerId: p.id },
    ],
  }));
}

// Sample opponent state
function createOpponentState(
  id: string,
  name: string,
  color: PlayerColor,
  nertzCount = 10,
  stockCount = 35,
  hasWaste = true
): OpponentState {
  return {
    playerId: id,
    playerName: name,
    playerColor: color,
    stockCount,
    wasteTopCard: hasWaste ? createCard('hearts', 7, id) : null,
    nertzCount,
    nertzTopCard: nertzCount > 0 ? createCard('spades', 11, id) : null,
    workPiles: [
      [createCard('clubs', 13, id), createCard('hearts', 12, id)],
      [createCard('diamonds', 10, id)],
      [createCard('spades', 8, id), createCard('hearts', 7, id), createCard('clubs', 6, id)],
      [createCard('hearts', 5, id)],
    ],
    isActive: false,
  };
}

// Sample local player cards
const localPlayerNertz = [
  createCard('hearts', 5),
  createCard('clubs', 8),
  createCard('diamonds', 3),
  createCard('spades', 11),
  createCard('hearts', 7),
  createCard('clubs', 2),
  createCard('diamonds', 9),
];

const localPlayerWork: [CardType[], CardType[], CardType[], CardType[]] = [
  [createCard('spades', 13), createCard('hearts', 12)],
  [createCard('diamonds', 10), createCard('spades', 9)],
  [createCard('hearts', 8), createCard('clubs', 7)],
  [createCard('clubs', 4)],
];

const localPlayerStock = Array.from({ length: 30 }, (_, i) =>
  createCard(['hearts', 'diamonds', 'clubs', 'spades'][i % 4] as CardType['suit'], (i % 13) + 1)
);

const localPlayerWaste = [createCard('clubs', 11), createCard('spades', 12)];

const meta: Meta<typeof TableLayout> = {
  title: 'Game/TableLayout',
  component: TableLayout,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ height: '100vh', background: '#0a0a12', overflow: 'hidden' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TableLayout>;

// 2 Players - opponent at top
export const TwoPlayers: Story = {
  render: () => {
    const opponent = createOpponentState('opp-1', 'Alice', 'red', 8, 32);
    const players = [
      { id: 'player-1', name: 'You', color: 'blue' as PlayerColor },
      { id: 'opp-1', name: 'Alice', color: 'red' as PlayerColor },
    ];

    return (
      <TableLayout
        opponents={[opponent]}
        centerContent={
          <MultiFoundationArea
            playerGroups={createFoundationGroups(players)}
            selectedCard={null}
            onPileClick={() => {}}
            canPlace={false}
            showMoveHints={false}
            isDragging={false}
            validDragFoundations={[]}
          />
        }
        bottomContent={
          <GameBoard
            nertzPile={localPlayerNertz}
            workPiles={localPlayerWork}
            stockPile={localPlayerStock}
            wastePile={localPlayerWaste}
            foundationPiles={[]}
            playerColor="blue"
            currentRound={1}
            selectedCard={null}
            validWorkDestinations={[]}
            canCallHeyHey={false}
            canRecycleStock={false}
            hideFoundation
            hideTopBar
            maxPileHeight={200}
          />
        }
      />
    );
  },
};

// 3 Players - one top, one left
export const ThreePlayers: Story = {
  render: () => {
    const opponents = [
      createOpponentState('opp-1', 'Alice', 'red', 6, 28),
      createOpponentState('opp-2', 'Bob', 'green', 10, 35, false),
    ];
    const players = [
      { id: 'player-1', name: 'You', color: 'blue' as PlayerColor },
      { id: 'opp-1', name: 'Alice', color: 'red' as PlayerColor },
      { id: 'opp-2', name: 'Bob', color: 'green' as PlayerColor },
    ];

    return (
      <TableLayout
        opponents={opponents}
        centerContent={
          <MultiFoundationArea
            playerGroups={createFoundationGroups(players)}
            selectedCard={null}
            onPileClick={() => {}}
            canPlace={false}
            showMoveHints={false}
            isDragging={false}
            validDragFoundations={[]}
          />
        }
        bottomContent={
          <GameBoard
            nertzPile={localPlayerNertz}
            workPiles={localPlayerWork}
            stockPile={localPlayerStock}
            wastePile={localPlayerWaste}
            foundationPiles={[]}
            playerColor="blue"
            currentRound={1}
            selectedCard={null}
            validWorkDestinations={[]}
            canCallHeyHey={false}
            canRecycleStock={false}
            hideFoundation
            hideTopBar
            maxPileHeight={180}
          />
        }
      />
    );
  },
};

// 4 Players - one left, one top, one right
export const FourPlayers: Story = {
  render: () => {
    const opponents = [
      createOpponentState('opp-1', 'Alice', 'red', 5, 25),
      createOpponentState('opp-2', 'Bob', 'green', 8, 30),
      createOpponentState('opp-3', 'Charlie', 'orange', 12, 38),
    ];
    const players = [
      { id: 'player-1', name: 'You', color: 'blue' as PlayerColor },
      { id: 'opp-1', name: 'Alice', color: 'red' as PlayerColor },
      { id: 'opp-2', name: 'Bob', color: 'green' as PlayerColor },
      { id: 'opp-3', name: 'Charlie', color: 'orange' as PlayerColor },
    ];

    return (
      <TableLayout
        opponents={opponents}
        centerContent={
          <MultiFoundationArea
            playerGroups={createFoundationGroups(players)}
            selectedCard={null}
            onPileClick={() => {}}
            canPlace={false}
            showMoveHints={false}
            isDragging={false}
            validDragFoundations={[]}
          />
        }
        bottomContent={
          <GameBoard
            nertzPile={localPlayerNertz}
            workPiles={localPlayerWork}
            stockPile={localPlayerStock}
            wastePile={localPlayerWaste}
            foundationPiles={[]}
            playerColor="blue"
            currentRound={1}
            selectedCard={null}
            validWorkDestinations={[]}
            canCallHeyHey={false}
            canRecycleStock={false}
            hideFoundation
            hideTopBar
            maxPileHeight={160}
          />
        }
      />
    );
  },
};

// 6 Players - scrollable row at top
export const SixPlayers: Story = {
  render: () => {
    const opponents = [
      createOpponentState('opp-1', 'Alice', 'red', 5, 25),
      createOpponentState('opp-2', 'Bob', 'green', 8, 30),
      createOpponentState('opp-3', 'Charlie', 'orange', 12, 38),
      createOpponentState('opp-4', 'Diana', 'purple', 3, 20),
      createOpponentState('opp-5', 'Eve', 'pink', 9, 33),
    ];
    const players = [
      { id: 'player-1', name: 'You', color: 'blue' as PlayerColor },
      ...opponents.map((o) => ({ id: o.playerId, name: o.playerName, color: o.playerColor })),
    ];

    return (
      <TableLayout
        opponents={opponents}
        centerContent={
          <MultiFoundationArea
            playerGroups={createFoundationGroups(players)}
            selectedCard={null}
            onPileClick={() => {}}
            canPlace={false}
            showMoveHints={false}
            isDragging={false}
            validDragFoundations={[]}
          />
        }
        bottomContent={
          <GameBoard
            nertzPile={localPlayerNertz}
            workPiles={localPlayerWork}
            stockPile={localPlayerStock}
            wastePile={localPlayerWaste}
            foundationPiles={[]}
            playerColor="blue"
            currentRound={1}
            selectedCard={null}
            validWorkDestinations={[]}
            canCallHeyHey={false}
            canRecycleStock={false}
            hideFoundation
            hideTopBar
            maxPileHeight={140}
          />
        }
      />
    );
  },
};

// Opponent close to winning (nertz almost empty)
export const OpponentAlmostWinning: Story = {
  render: () => {
    const opponent = createOpponentState('opp-1', 'Alice', 'red', 2, 10); // Only 2 cards left in nertz!
    const players = [
      { id: 'player-1', name: 'You', color: 'blue' as PlayerColor },
      { id: 'opp-1', name: 'Alice', color: 'red' as PlayerColor },
    ];

    return (
      <TableLayout
        opponents={[opponent]}
        centerContent={
          <MultiFoundationArea
            playerGroups={createFoundationGroups(players)}
            selectedCard={null}
            onPileClick={() => {}}
            canPlace={false}
            showMoveHints={false}
            isDragging={false}
            validDragFoundations={[]}
          />
        }
        bottomContent={
          <GameBoard
            nertzPile={localPlayerNertz}
            workPiles={localPlayerWork}
            stockPile={localPlayerStock}
            wastePile={localPlayerWaste}
            foundationPiles={[]}
            playerColor="blue"
            currentRound={1}
            selectedCard={null}
            validWorkDestinations={[]}
            canCallHeyHey={false}
            canRecycleStock={false}
            hideFoundation
            hideTopBar
            maxPileHeight={200}
          />
        }
      />
    );
  },
};

// Just opponent play area (isolated)
export const OpponentPlayAreaOnly: Story = {
  render: () => {
    const opponents = [
      createOpponentState('opp-1', 'Alice', 'red', 8, 32),
      createOpponentState('opp-2', 'Bob', 'green', 5, 25),
    ];

    return (
      <TableLayout
        opponents={opponents}
        centerContent={
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            (Foundations would go here)
          </div>
        }
        bottomContent={
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            (Local player area would go here)
          </div>
        }
      />
    );
  },
};
