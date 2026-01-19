// useGameSounds - Hook that bridges player settings with the audio system
// Syncs soundEnabled/soundVolume settings with the SoundManager

import { useEffect } from 'react';
import { useAudio, type UseAudioReturn } from '../audio';
import { usePlayerSettings, type UsePlayerSettingsReturn } from './usePlayerSettings';

export interface UseGameSoundsOptions {
  /** Player ID for per-player sound settings */
  playerId?: string;
}

export interface UseGameSoundsReturn extends UseAudioReturn {
  /** Whether sound is enabled (from settings) */
  soundEnabled: boolean;
  /** Sound volume (from settings) */
  soundVolume: number;
  /** Toggle sound on/off */
  toggleSound: UsePlayerSettingsReturn['toggleSound'];
  /** Set sound volume */
  setSoundVolume: UsePlayerSettingsReturn['setSoundVolume'];
}

/**
 * Hook that combines audio playback with persistent sound settings.
 *
 * Automatically syncs the player's sound preferences (enabled/volume)
 * with the audio system. Changes are persisted to localStorage.
 *
 * @example
 * ```tsx
 * function GameComponent() {
 *   const { play, soundEnabled, toggleSound, soundVolume, setSoundVolume } = useGameSounds();
 *
 *   return (
 *     <div>
 *       <button onClick={() => play('cardPlace')}>Play Sound</button>
 *       <button onClick={toggleSound}>
 *         {soundEnabled ? 'Mute' : 'Unmute'}
 *       </button>
 *       <input
 *         type="range"
 *         min={0}
 *         max={1}
 *         step={0.1}
 *         value={soundVolume}
 *         onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */
export function useGameSounds(options: UseGameSoundsOptions = {}): UseGameSoundsReturn {
  const { playerId } = options;

  // Get audio controls
  const audio = useAudio();

  // Get player settings
  const { settings, toggleSound, setSoundVolume } = usePlayerSettings({ playerId });

  // Sync settings with audio system
  useEffect(() => {
    audio.setEnabled(settings.soundEnabled);
  }, [settings.soundEnabled, audio]);

  useEffect(() => {
    audio.setVolume(settings.soundVolume);
  }, [settings.soundVolume, audio]);

  return {
    // Audio controls
    play: audio.play,
    volume: settings.soundVolume,
    setVolume: setSoundVolume,
    enabled: settings.soundEnabled,
    setEnabled: (enabled: boolean) => {
      if (enabled !== settings.soundEnabled) {
        toggleSound();
      }
    },
    toggleEnabled: toggleSound,

    // Settings-specific exports
    soundEnabled: settings.soundEnabled,
    soundVolume: settings.soundVolume,
    toggleSound,
    setSoundVolume,
  };
}

export default useGameSounds;
