import type { Meta, StoryObj } from '@storybook/react-vite';
import { CardBack, type PlayerColor } from '../CardBack';

/**
 * The CardBack component renders the back of a playing card with
 * customizable colors for player identification in multiplayer games.
 *
 * ## Features
 * - 8 distinct player colors
 * - Decorative pattern overlay
 * - Used to identify which player owns a card when face-down
 *
 * ## Player Colors
 * Each player in a game is assigned a unique back color to help
 * distinguish their cards from other players during gameplay.
 */
const meta: Meta<typeof CardBack> = {
  title: 'Components/Card/CardBack',
  component: CardBack,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Renders the back of a playing card with customizable player colors. Used to identify card ownership in multiplayer games.',
      },
    },
  },
  argTypes: {
    color: {
      description: 'The player color for the card back',
      control: 'select',
      options: ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'teal'] as PlayerColor[],
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '70px', height: '100px', border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CardBack>;

/**
 * Default blue card back.
 */
export const Blue: Story = {
  args: {
    color: 'blue',
  },
};

/**
 * Red card back.
 */
export const Red: Story = {
  args: {
    color: 'red',
  },
};

/**
 * Green card back.
 */
export const Green: Story = {
  args: {
    color: 'green',
  },
};

/**
 * Yellow card back.
 */
export const Yellow: Story = {
  args: {
    color: 'yellow',
  },
};

/**
 * Purple card back.
 */
export const Purple: Story = {
  args: {
    color: 'purple',
  },
};

/**
 * Orange card back.
 */
export const Orange: Story = {
  args: {
    color: 'orange',
  },
};

/**
 * Pink card back.
 */
export const Pink: Story = {
  args: {
    color: 'pink',
  },
};

/**
 * Teal card back.
 */
export const Teal: Story = {
  args: {
    color: 'teal',
  },
};

/**
 * All 8 player colors displayed together.
 */
export const AllColors: Story = {
  decorators: [
    () => (
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {(['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'teal'] as const).map((color) => (
          <div key={color} style={{ textAlign: 'center' }}>
            <div style={{ width: '70px', height: '100px', border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden' }}>
              <CardBack color={color} />
            </div>
            <p style={{ marginTop: '4px', fontSize: '11px', color: '#666', textTransform: 'capitalize' }}>{color}</p>
          </div>
        ))}
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'All 8 available player colors. Each player is assigned a unique color to identify their cards during gameplay.',
      },
    },
  },
};

/**
 * Color groups showing warm vs cool palettes.
 */
export const ColorGroups: Story = {
  decorators: [
    () => (
      <div style={{ display: 'flex', gap: '32px' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 'bold', color: '#666' }}>Warm Colors</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['red', 'orange', 'yellow', 'pink'] as const).map((color) => (
              <div key={color} style={{ width: '70px', height: '100px', border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden' }}>
                <CardBack color={color} />
              </div>
            ))}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 'bold', color: '#666' }}>Cool Colors</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['blue', 'green', 'purple', 'teal'] as const).map((color) => (
              <div key={color} style={{ width: '70px', height: '100px', border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden' }}>
                <CardBack color={color} />
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'Colors grouped by warm (red, orange, yellow, pink) and cool (blue, green, purple, teal) palettes.',
      },
    },
  },
};
