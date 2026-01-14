// Interactive SetupArea Story - Full Setup Flow Demo
// Demonstrates the complete setup interaction using useSetupController

import type { Meta, StoryObj } from '@storybook/react';
import { SetupArea } from '../SetupArea';
import { useSetupController } from '../../../hooks/useSetupController';
import { useAudio } from '../../../audio';
import type { PlayerColor } from '../../Card/CardBack';

// Wrapper component that uses the hook
interface InteractiveSetupProps {
  backColor: PlayerColor;
  nertzPileSize: 10 | 13;
  interactionDelay: number;
  soundEnabled: boolean;
}

function InteractiveSetup({ backColor, nertzPileSize, interactionDelay, soundEnabled }: InteractiveSetupProps) {
  const { play, volume, setVolume, enabled, setEnabled } = useAudio({
    initialEnabled: soundEnabled,
  });

  const {
    state,
    progress,
    deckCards,
    nertzPileCards,
    workPileCards,
    isInteractionDisabled,
    handleDeckClick,
    handleNertzPileClick,
    handleWorkPileClick,
    reset,
  } = useSetupController({
    deckId: `player-${backColor}`,
    nertzPileSize,
    interactionDelay,
    onSetupComplete: () => {
      console.log('Setup complete!');
    },
    onSound: play,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <SetupArea
        state={state}
        progress={progress}
        deckCards={deckCards}
        nertzPileCards={nertzPileCards}
        workPileCards={workPileCards}
        backColor={backColor}
        nertzPileSize={nertzPileSize}
        onDeckClick={handleDeckClick}
        onNertzPileClick={handleNertzPileClick}
        onWorkPileClick={handleWorkPileClick}
      />

      {/* Debug panel */}
      <div
        style={{
          padding: '12px 16px',
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '8px',
          color: '#fff',
          fontSize: '0.85rem',
          display: 'flex',
          gap: '24px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <strong>State:</strong> {state}
        </div>
        <div>
          <strong>Nertz:</strong> {progress.nertzCardsPlaced}/{nertzPileSize}
        </div>
        <div>
          <strong>Flipped:</strong> {progress.nertzFlipped ? 'Yes' : 'No'}
        </div>
        <div>
          <strong>Work Piles:</strong> {progress.workPilesPlaced}/4
        </div>
        <div>
          <strong>Disabled:</strong> {isInteractionDisabled ? 'Yes' : 'No'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            Sound
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            style={{ width: '60px' }}
            disabled={!enabled}
          />
        </div>
        <button
          onClick={reset}
          style={{
            marginLeft: 'auto',
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
    </div>
  );
}

const meta: Meta<typeof InteractiveSetup> = {
  title: 'Game/SetupArea/Interactive',
  component: InteractiveSetup,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'dark',
      values: [{ name: 'dark', value: '#1a1a2e' }],
    },
  },
  tags: ['autodocs'],
  argTypes: {
    backColor: {
      control: 'select',
      options: ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'teal', 'pink'],
    },
    nertzPileSize: {
      control: 'radio',
      options: [10, 13],
    },
    interactionDelay: {
      control: { type: 'range', min: 0, max: 500, step: 50 },
    },
    soundEnabled: {
      control: 'boolean',
      description: 'Enable sound effects for card interactions',
    },
  },
};

export default meta;
type Story = StoryObj<typeof InteractiveSetup>;

/**
 * Full interactive setup flow - fast and frantic!
 *
 * **How to use:**
 * 1. Click the **Deck** to start dealing cards to the Nertz pile
 * 2. Keep clicking the Deck until 13 cards are dealt
 * 3. Click the **Nertz Pile** to flip the top card face-up
 * 4. Click each **Work Pile** slot to drop a card on it
 * 5. Setup is complete!
 *
 * Use the **Reset** button to start over.
 */
export const FullFlow: Story = {
  args: {
    backColor: 'blue',
    nertzPileSize: 13,
    interactionDelay: 0,
    soundEnabled: true,
  },
};

/**
 * 10-card Nertz variant for faster setup.
 */
export const TenCardVariant: Story = {
  args: {
    backColor: 'green',
    nertzPileSize: 10,
    interactionDelay: 0,
    soundEnabled: true,
  },
};
