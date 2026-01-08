// useAudio - React hook for game sound effects
// Provides a simple interface to play sounds in components

import { useCallback, useEffect, useRef, useState } from 'react';
import { soundManager, type SoundType } from './SoundManager';

export interface UseAudioOptions {
  /** Initial volume (0-1), defaults to 0.5 */
  initialVolume?: number;
  /** Whether sounds are initially enabled, defaults to true */
  initialEnabled?: boolean;
}

export interface UseAudioReturn {
  /** Play a sound effect */
  play: (sound: SoundType) => void;
  /** Current volume level (0-1) */
  volume: number;
  /** Set volume level (0-1) */
  setVolume: (volume: number) => void;
  /** Whether sounds are enabled */
  enabled: boolean;
  /** Enable or disable sounds */
  setEnabled: (enabled: boolean) => void;
  /** Toggle sounds on/off */
  toggleEnabled: () => void;
}

/**
 * Hook for playing game sound effects.
 * Automatically initializes audio on first user interaction.
 *
 * @example
 * ```tsx
 * function GameComponent() {
 *   const { play } = useAudio();
 *
 *   const handleCardClick = () => {
 *     play('cardSelect');
 *     // ... other logic
 *   };
 *
 *   return <Card onClick={handleCardClick} />;
 * }
 * ```
 */
export function useAudio(options: UseAudioOptions = {}): UseAudioReturn {
  const { initialVolume = 0.5, initialEnabled = true } = options;

  const [volume, setVolumeState] = useState(initialVolume);
  const [enabled, setEnabledState] = useState(initialEnabled);
  const initialized = useRef(false);

  // Initialize audio context on first interaction
  useEffect(() => {
    const handleInteraction = () => {
      if (!initialized.current) {
        soundManager.init();
        soundManager.setVolume(volume);
        soundManager.setEnabled(enabled);
        initialized.current = true;
      }
      soundManager.resume();
    };

    // Listen for first interaction
    const events = ['click', 'touchstart', 'keydown'];
    events.forEach((event) => {
      document.addEventListener(event, handleInteraction, { once: false, passive: true });
    });

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleInteraction);
      });
    };
  }, [volume, enabled]);

  // Sync volume changes
  useEffect(() => {
    soundManager.setVolume(volume);
  }, [volume]);

  // Sync enabled changes
  useEffect(() => {
    soundManager.setEnabled(enabled);
  }, [enabled]);

  const play = useCallback((sound: SoundType) => {
    // Ensure initialized on first play
    if (!initialized.current) {
      soundManager.init();
      initialized.current = true;
    }
    soundManager.play(sound);
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    const clamped = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clamped);
  }, []);

  const setEnabled = useCallback((newEnabled: boolean) => {
    setEnabledState(newEnabled);
  }, []);

  const toggleEnabled = useCallback(() => {
    setEnabledState((prev) => !prev);
  }, []);

  return {
    play,
    volume,
    setVolume,
    enabled,
    setEnabled,
    toggleEnabled,
  };
}

export default useAudio;
