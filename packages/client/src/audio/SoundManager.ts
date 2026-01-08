// SoundManager - Manages game sound effects using Web Audio API
// Generates synthetic sounds for card interactions without external audio files

export type SoundType = 'cardSelect' | 'cardPlace' | 'cardFlip' | 'error';

interface SoundConfig {
  volume: number;
  enabled: boolean;
}

/**
 * SoundManager handles game audio using the Web Audio API.
 * Uses synthetic sound generation (no external files required).
 */
class SoundManager {
  private audioContext: AudioContext | null = null;
  private config: SoundConfig = {
    volume: 0.5,
    enabled: true,
  };
  private initialized = false;

  /**
   * Initialize the audio context.
   * Must be called after a user interaction (browser autoplay policy).
   */
  init(): void {
    if (this.initialized) return;

    try {
      this.audioContext = new AudioContext();
      this.initialized = true;
    } catch (err) {
      console.warn('Web Audio API not supported:', err);
    }
  }

  /**
   * Resume audio context if suspended.
   * Call this on user interaction to ensure audio plays.
   */
  async resume(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Set the master volume (0-1).
   */
  setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Enable or disable all sounds.
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Get current configuration.
   */
  getConfig(): Readonly<SoundConfig> {
    return { ...this.config };
  }

  /**
   * Play a sound effect.
   */
  play(sound: SoundType): void {
    if (!this.config.enabled || !this.audioContext) {
      return;
    }

    // Ensure context is running
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    switch (sound) {
      case 'cardSelect':
        this.playCardSelect();
        break;
      case 'cardPlace':
        this.playCardPlace();
        break;
      case 'cardFlip':
        this.playCardFlip();
        break;
      case 'error':
        this.playError();
        break;
    }
  }

  /**
   * Card select sound - Short, crisp click
   */
  private playCardSelect(): void {
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    // Create oscillator for the click
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // High-pitched click
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);

    // Quick envelope
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(this.config.volume * 0.3, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  /**
   * Card place sound - Soft thud
   */
  private playCardPlace(): void {
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    // Low thud using noise-like oscillator
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    // Low frequency thud
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.1);

    // Low-pass filter for softness
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, now);

    // Quick attack, medium decay
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(this.config.volume * 0.4, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  /**
   * Card flip sound - Whoosh/swipe
   */
  private playCardFlip(): void {
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    // Noise-based whoosh
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Fill with filtered noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    // Bandpass for whoosh character
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(500, now + 0.15);
    filter.Q.setValueAtTime(1, now);

    // Envelope
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(this.config.volume * 0.25, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    noise.start(now);
  }

  /**
   * Error sound - Low warning buzz
   */
  private playError(): void {
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    // Two-tone buzz
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    // Dissonant low tones
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(150, now);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(180, now);

    // Short harsh sound
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(this.config.volume * 0.2, now + 0.01);
    gain.gain.linearRampToValueAtTime(this.config.volume * 0.15, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc1.start(now);
    osc1.stop(now + 0.2);
    osc2.start(now);
    osc2.stop(now + 0.2);
  }

  /**
   * Clean up resources.
   */
  destroy(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      this.initialized = false;
    }
  }
}

// Export singleton instance
export const soundManager = new SoundManager();

export default soundManager;
