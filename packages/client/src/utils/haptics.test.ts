// HapticsManager tests
// Tests haptic feedback with mocked Capacitor plugins

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

// Mock @capacitor/haptics
const mockImpact = vi.fn();
const mockNotification = vi.fn();
vi.mock('@capacitor/haptics', () => ({
  Haptics: {
    impact: (...args: unknown[]) => mockImpact(...args),
    notification: (...args: unknown[]) => mockNotification(...args),
  },
  ImpactStyle: {
    Light: 'LIGHT',
    Medium: 'MEDIUM',
    Heavy: 'HEAVY',
  },
  NotificationType: {
    Success: 'SUCCESS',
    Warning: 'WARNING',
    Error: 'ERROR',
  },
}));

// Mock @capacitor/core
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => true),
  },
}));

// Import after mocks are set up
import { HapticsManager } from './haptics';

describe('HapticsManager', () => {
  let manager: HapticsManager;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    manager = new HapticsManager();
  });

  describe('configuration', () => {
    it('should be enabled by default', () => {
      expect(manager.getConfig().enabled).toBe(true);
    });

    it('should allow disabling haptics', () => {
      manager.setEnabled(false);
      expect(manager.getConfig().enabled).toBe(false);
    });

    it('should allow re-enabling haptics', () => {
      manager.setEnabled(false);
      manager.setEnabled(true);
      expect(manager.getConfig().enabled).toBe(true);
    });

    it('should return a copy of config (not reference)', () => {
      const config1 = manager.getConfig();
      const config2 = manager.getConfig();
      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });

  describe('play', () => {
    it('should call Haptics.impact with Light style for cardSelect', () => {
      manager.play('cardSelect');
      expect(mockImpact).toHaveBeenCalledWith({ style: ImpactStyle.Light });
    });

    it('should call Haptics.impact with Medium style for cardPlace', () => {
      manager.play('cardPlace');
      expect(mockImpact).toHaveBeenCalledWith({ style: ImpactStyle.Medium });
    });

    it('should call Haptics.notification with Error for invalidMove', () => {
      manager.play('invalidMove');
      expect(mockNotification).toHaveBeenCalledWith({ type: NotificationType.Error });
    });

    it('should call Haptics.impact with Heavy style for heyHey', () => {
      manager.play('heyHey');
      expect(mockImpact).toHaveBeenCalledWith({ style: ImpactStyle.Heavy });
    });

    it('should call Haptics.notification with Success for heyHey after delay', () => {
      vi.useFakeTimers();
      manager.play('heyHey');
      expect(mockNotification).not.toHaveBeenCalled();
      vi.advanceTimersByTime(100);
      expect(mockNotification).toHaveBeenCalledWith({ type: NotificationType.Success });
      vi.useRealTimers();
    });

    it('should call Haptics.impact with Light style for stockDraw', () => {
      manager.play('stockDraw');
      expect(mockImpact).toHaveBeenCalledWith({ style: ImpactStyle.Light });
    });

    it('should not call Haptics when disabled', () => {
      manager.setEnabled(false);
      manager.play('cardSelect');
      manager.play('cardPlace');
      manager.play('invalidMove');
      manager.play('heyHey');
      manager.play('stockDraw');
      expect(mockImpact).not.toHaveBeenCalled();
      expect(mockNotification).not.toHaveBeenCalled();
    });
  });
});

describe('HapticsManager (web fallback)', () => {
  it('should not call Haptics on web platform', () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    const webManager = new HapticsManager();

    vi.clearAllMocks();
    webManager.play('cardSelect');
    webManager.play('cardPlace');
    webManager.play('invalidMove');
    webManager.play('heyHey');
    webManager.play('stockDraw');
    expect(mockImpact).not.toHaveBeenCalled();
    expect(mockNotification).not.toHaveBeenCalled();
  });
});
