// HapticsManager - Manages native haptic feedback for card interactions
// Uses @capacitor/haptics with web fallback (no-op when Capacitor not available)

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

export type HapticType =
  | 'cardSelect'
  | 'cardPlace'
  | 'invalidMove'
  | 'heyHey'
  | 'stockDraw';

interface HapticsConfig {
  enabled: boolean;
}

/**
 * HapticsManager handles native haptic feedback using Capacitor Haptics plugin.
 * Falls back to no-op when not running on a native device.
 * Follows the same singleton pattern as SoundManager.
 */
export class HapticsManager {
  private config: HapticsConfig = {
    enabled: true,
  };
  private readonly isNative: boolean;

  constructor() {
    this.isNative = Capacitor.isNativePlatform();
  }

  /**
   * Enable or disable haptic feedback.
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Get current configuration.
   */
  getConfig(): Readonly<HapticsConfig> {
    return { ...this.config };
  }

  /**
   * Trigger a haptic effect.
   * No-op on web or when disabled.
   */
  play(haptic: HapticType): void {
    if (!this.config.enabled || !this.isNative) {
      return;
    }

    switch (haptic) {
      case 'cardSelect':
        this.playCardSelect();
        break;
      case 'cardPlace':
        this.playCardPlace();
        break;
      case 'invalidMove':
        this.playInvalidMove();
        break;
      case 'heyHey':
        this.playHeyHey();
        break;
      case 'stockDraw':
        this.playStockDraw();
        break;
    }
  }

  /**
   * Card select - Light impact tap
   */
  private playCardSelect(): void {
    Haptics.impact({ style: ImpactStyle.Light });
  }

  /**
   * Card place - Medium impact tap
   */
  private playCardPlace(): void {
    Haptics.impact({ style: ImpactStyle.Medium });
  }

  /**
   * Invalid move - Error notification pattern
   */
  private playInvalidMove(): void {
    Haptics.notification({ type: NotificationType.Error });
  }

  /**
   * HeyHey press - Heavy impact + success notification
   */
  private playHeyHey(): void {
    Haptics.impact({ style: ImpactStyle.Heavy });
    // Follow up with success notification after a brief delay
    setTimeout(() => {
      Haptics.notification({ type: NotificationType.Success });
    }, 100);
  }

  /**
   * Stock draw - Light impact tap
   */
  private playStockDraw(): void {
    Haptics.impact({ style: ImpactStyle.Light });
  }
}

// Export singleton instance
export const hapticsManager = new HapticsManager();

export default hapticsManager;
