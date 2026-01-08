import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { useState } from 'react';
import { WorkPiles, type SelectedCard } from '../WorkPiles';
import type { Card } from '@heyhey/shared';
import { isRedCard } from '@heyhey/shared';

/**
 * The WorkPiles component displays 4 cascading columns of cards for gameplay.
 * It supports card selection, valid destination highlighting, and click-to-place
 * interactions.
 *
 * ## Features
 * - 4 vertically cascading work piles
 * - Click to select cards (top card of each pile)
 * - Visual highlight of valid destination piles
 * - Click pile to place selected card
 * - Double-click for auto-move to foundation
 * - Empty pile placeholders
 *
 * ## Solitaire Rules
 * Cards can be placed on a work pile if:
 * - The pile is empty (any card can go)
 * - The card is one rank lower and opposite color to the top card
 */
const meta: Meta<typeof WorkPiles> = {
  title: 'Components/Game/WorkPiles',
  component: WorkPiles,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'dark',
      values: [{ name: 'dark', value: '#1a472a' }],
    },
    docs: {
      description: {
        component:
          'Displays 4 cascading work piles for gameplay with card selection and placement.',
      },
    },
  },
  argTypes: {
    piles: {
      description: 'Array of 4 card arrays, one for each pile',
      control: false,
    },
    backColor: {
      description: 'Player card back color',
      control: 'select',
      options: ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'teal'],
    },
    selectedCard: {
      description: 'Currently selected card information',
      control: false,
    },
    validDestinations: {
      description: 'Array of pile indices that are valid destinations',
      control: false,
    },
    disabled: {
      description: 'Disable all interactions',
      control: 'boolean',
    },
  },
  args: {
    onCardClick: fn(),
    onCardDoubleClick: fn(),
    onPileClick: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof WorkPiles>;

// Helper to create cards
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
const createCard = (suit: (typeof SUITS)[number], rank: number, deckId = 'player-1'): Card => ({
  suit,
  rank,
  deckId,
});

// Create a sample set of work piles
const createSamplePiles = (): [Card[], Card[], Card[], Card[]] => [
  [createCard('hearts', 13), createCard('spades', 12), createCard('diamonds', 11)],
  [createCard('clubs', 10)],
  [createCard('diamonds', 8), createCard('clubs', 7), createCard('hearts', 6)],
  [],
];

/**
 * Default work piles setup showing 4 columns with varying card counts.
 */
export const Default: Story = {
  args: {
    piles: createSamplePiles(),
    backColor: 'blue',
  },
};

/**
 * Work piles with a card selected. Shows the selection highlight
 * on the selected card.
 */
export const WithSelectedCard: Story = {
  args: {
    piles: createSamplePiles(),
    backColor: 'blue',
    selectedCard: {
      card: createCard('hearts', 6),
      sourceType: 'workPile',
      sourcePileIndex: 2,
      cardIndex: 2,
    },
  },
};

/**
 * Shows valid destinations highlighted when a card is selected.
 * The green glow indicates where the selected card can be placed.
 */
export const WithValidDestinations: Story = {
  args: {
    piles: createSamplePiles(),
    backColor: 'blue',
    selectedCard: {
      card: createCard('hearts', 6),
      sourceType: 'workPile',
      sourcePileIndex: 2,
      cardIndex: 2,
    },
    validDestinations: [1, 3], // Pile 2 (index 1) and empty pile 4 (index 3)
  },
};

/**
 * All empty piles showing the placeholder slots.
 */
export const AllEmpty: Story = {
  args: {
    piles: [[], [], [], []],
    backColor: 'blue',
  },
};

/**
 * Work piles with interactions disabled.
 */
export const Disabled: Story = {
  args: {
    piles: createSamplePiles(),
    backColor: 'blue',
    disabled: true,
  },
};

/**
 * Interactive example showing the full selection and placement flow.
 * Click a card to select it, then click a valid destination to place it.
 */
export const Interactive: Story = {
  render: function InteractiveWorkPiles() {
    const [piles, setPiles] = useState<[Card[], Card[], Card[], Card[]]>([
      [createCard('hearts', 13), createCard('spades', 12), createCard('diamonds', 11)],
      [createCard('clubs', 10), createCard('hearts', 9)],
      [createCard('diamonds', 8), createCard('clubs', 7)],
      [createCard('spades', 6)],
    ]);
    const [selectedCard, setSelectedCard] = useState<SelectedCard | null>(null);

    // Calculate valid destinations based on solitaire rules
    const getValidDestinations = (): number[] => {
      if (!selectedCard) return [];

      const validPiles: number[] = [];
      const card = selectedCard.card;

      piles.forEach((pile, index) => {
        // Skip source pile
        if (selectedCard.sourceType === 'workPile' && selectedCard.sourcePileIndex === index) {
          return;
        }

        // Empty pile - any card can go (in some variants, only Kings)
        if (pile.length === 0) {
          validPiles.push(index);
          return;
        }

        // Check if card can be placed (opposite color, one rank lower)
        const topCard = pile[pile.length - 1]!;
        const isOppositeColor = isRedCard(card) !== isRedCard(topCard);
        const isOneRankLower = card.rank === topCard.rank - 1;

        if (isOppositeColor && isOneRankLower) {
          validPiles.push(index);
        }
      });

      return validPiles;
    };

    const handleCardClick = (card: Card, pileIndex: number, cardIndex: number) => {
      // If clicking same card, deselect
      if (
        selectedCard?.sourceType === 'workPile' &&
        selectedCard.sourcePileIndex === pileIndex &&
        selectedCard.cardIndex === cardIndex
      ) {
        setSelectedCard(null);
        return;
      }

      // Select the card
      setSelectedCard({
        card,
        sourceType: 'workPile',
        sourcePileIndex: pileIndex,
        cardIndex,
      });
    };

    const handlePileClick = (pileIndex: number) => {
      if (!selectedCard) return;

      const validDests = getValidDestinations();
      if (!validDests.includes(pileIndex)) return;

      // Move card(s) to the target pile
      const newPiles = [...piles] as [Card[], Card[], Card[], Card[]];

      if (selectedCard.sourceType === 'workPile' && selectedCard.sourcePileIndex !== undefined) {
        const sourcePile = [...newPiles[selectedCard.sourcePileIndex]!];
        const targetPile = [...newPiles[pileIndex]!];

        // Move all cards from selected index to end
        const cardsToMove = sourcePile.splice(selectedCard.cardIndex);
        targetPile.push(...cardsToMove);

        newPiles[selectedCard.sourcePileIndex] = sourcePile;
        newPiles[pileIndex] = targetPile;
      }

      setPiles(newPiles);
      setSelectedCard(null);
    };

    return (
      <div style={{ padding: '24px' }}>
        <p
          style={{
            marginBottom: '16px',
            fontSize: '14px',
            color: 'rgba(255,255,255,0.7)',
            textAlign: 'center',
          }}
        >
          Click a card to select, then click a highlighted pile to place
        </p>
        <WorkPiles
          piles={piles}
          backColor="blue"
          selectedCard={selectedCard}
          validDestinations={getValidDestinations()}
          onCardClick={handleCardClick}
          onPileClick={handlePileClick}
        />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          'Fully interactive example. Click cards to select them, green-highlighted piles show valid destinations. Click to place.',
      },
    },
  },
};

/**
 * Multiple player colors to distinguish decks.
 */
export const MultipleColors: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {(['red', 'blue', 'green', 'yellow'] as const).map((color, i) => (
        <div key={color}>
          <p
            style={{
              marginBottom: '8px',
              fontSize: '12px',
              color: 'rgba(255,255,255,0.6)',
              textTransform: 'uppercase',
            }}
          >
            Player {i + 1} ({color})
          </p>
          <WorkPiles piles={createSamplePiles()} backColor={color} />
        </div>
      ))}
    </div>
  ),
};

/**
 * Long cascades showing how the component handles many cards.
 */
export const LongCascades: Story = {
  args: {
    piles: [
      // 10 alternating cards cascade
      Array.from({ length: 10 }, (_, i) => createCard(i % 2 === 0 ? 'hearts' : 'spades', 13 - i)),
      Array.from({ length: 7 }, (_, i) => createCard(i % 2 === 0 ? 'clubs' : 'diamonds', 10 - i)),
      Array.from({ length: 4 }, (_, i) => createCard(i % 2 === 0 ? 'spades' : 'hearts', 8 - i)),
      Array.from({ length: 2 }, (_, i) => createCard(i % 2 === 0 ? 'diamonds' : 'clubs', 5 - i)),
    ] as [Card[], Card[], Card[], Card[]],
    backColor: 'blue',
  },
};
