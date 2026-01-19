// usePlayerSettings - Hook for managing player preferences
// Persists settings to localStorage per-player

import { useState, useCallback, useEffect } from 'react';

/* =============================================================================
   TYPES
   ============================================================================= */

export interface PlayerSettings {
  /** Whether to show valid move destination hints (Easy Mode) */
  showMoveHints: boolean;
  /** Whether sound effects are enabled */
  soundEnabled: boolean;
  /** Sound volume (0-1) */
  soundVolume: number;
}

export interface UsePlayerSettingsOptions {
  /** Player ID for per-player settings (optional - uses global key if not provided) */
  playerId?: string;
}

export interface UsePlayerSettingsReturn {
  /** Current player settings */
  settings: PlayerSettings;
  /** Update a single setting */
  updateSetting: <K extends keyof PlayerSettings>(key: K, value: PlayerSettings[K]) => void;
  /** Toggle showMoveHints on/off */
  toggleMoveHints: () => void;
  /** Toggle sound on/off */
  toggleSound: () => void;
  /** Set sound volume (0-1) */
  setSoundVolume: (volume: number) => void;
  /** Reset all settings to defaults */
  resetSettings: () => void;
}

/* =============================================================================
   CONSTANTS
   ============================================================================= */

const STORAGE_KEY_PREFIX = 'heyhey-settings';

const DEFAULT_SETTINGS: PlayerSettings = {
  showMoveHints: false, // Default: no hints (harder mode)
  soundEnabled: true, // Default: sounds on
  soundVolume: 0.5, // Default: 50% volume
};

/* =============================================================================
   HELPERS
   ============================================================================= */

function getStorageKey(playerId?: string): string {
  if (playerId) {
    return `${STORAGE_KEY_PREFIX}-${playerId}`;
  }
  return STORAGE_KEY_PREFIX;
}

function loadSettings(playerId?: string): PlayerSettings {
  try {
    const key = getStorageKey(playerId);
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<PlayerSettings>;
      // Merge with defaults to handle new settings added in future versions
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (error) {
    // localStorage might be unavailable or JSON parse failed
    console.warn('Failed to load player settings:', error);
  }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings: PlayerSettings, playerId?: string): void {
  try {
    const key = getStorageKey(playerId);
    localStorage.setItem(key, JSON.stringify(settings));
  } catch (error) {
    // localStorage might be unavailable or quota exceeded
    console.warn('Failed to save player settings:', error);
  }
}

/* =============================================================================
   HOOK
   ============================================================================= */

export function usePlayerSettings(
  options: UsePlayerSettingsOptions = {}
): UsePlayerSettingsReturn {
  const { playerId } = options;

  // Initialize state from localStorage
  const [settings, setSettings] = useState<PlayerSettings>(() =>
    loadSettings(playerId)
  );

  // Re-load settings if playerId changes
  useEffect(() => {
    setSettings(loadSettings(playerId));
  }, [playerId]);

  // Persist settings whenever they change
  useEffect(() => {
    saveSettings(settings, playerId);
  }, [settings, playerId]);

  // Update a single setting
  const updateSetting = useCallback(
    <K extends keyof PlayerSettings>(key: K, value: PlayerSettings[K]) => {
      setSettings((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    []
  );

  // Convenience method to toggle move hints
  const toggleMoveHints = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      showMoveHints: !prev.showMoveHints,
    }));
  }, []);

  // Toggle sound on/off
  const toggleSound = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      soundEnabled: !prev.soundEnabled,
    }));
  }, []);

  // Set sound volume (clamped to 0-1)
  const setSoundVolume = useCallback((volume: number) => {
    setSettings((prev) => ({
      ...prev,
      soundVolume: Math.max(0, Math.min(1, volume)),
    }));
  }, []);

  // Reset to default settings
  const resetSettings = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS });
  }, []);

  return {
    settings,
    updateSetting,
    toggleMoveHints,
    toggleSound,
    setSoundVolume,
    resetSettings,
  };
}

export default usePlayerSettings;
