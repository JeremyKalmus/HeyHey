// SoundManager - Manages game sound effects using Web Audio API
// Generates synthetic sounds for card interactions without external audio files

import { clamp } from '@heyhey/shared';

export type SoundType =
  | 'cardSelect'
  | 'cardPlace'
  | 'cardToFoundation'
  | 'cardDraw'
  | 'cardFlip'
  | 'error'
  | 'heyHey'
  | 'opponentMove'
  | 'roundComplete'
  | 'scoreTally';

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
    this.config.volume = clamp(volume, 0, 1);
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
      case 'cardToFoundation':
        this.playCardToFoundation();
        break;
      case 'cardDraw':
        this.playCardDraw();
        break;
      case 'cardFlip':
        this.playCardFlip();
        break;
      case 'error':
        this.playError();
        break;
      case 'heyHey':
        this.playHeyHey();
        break;
      case 'opponentMove':
        this.playOpponentMove();
        break;
      case 'roundComplete':
        this.playRoundComplete();
        break;
      case 'scoreTally':
        this.playScoreTally();
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
   * HeyHey call sound - Triumphant ascending fanfare
   */
  private playHeyHey(): void {
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    // Three-note ascending triumphant chord
    const notes = [
      { freq: 523.25, delay: 0 }, // C5
      { freq: 659.25, delay: 0.08 }, // E5
      { freq: 783.99, delay: 0.16 }, // G5
    ];

    notes.forEach(({ freq, delay }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      // Bright sine wave
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);

      // Envelope with sustain
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(this.config.volume * 0.4, now + delay + 0.02);
      gain.gain.setValueAtTime(this.config.volume * 0.35, now + delay + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.4);

      osc.start(now + delay);
      osc.stop(now + delay + 0.4);
    });

    // Add shimmer overlay
    const shimmerOsc = ctx.createOscillator();
    const shimmerGain = ctx.createGain();

    shimmerOsc.connect(shimmerGain);
    shimmerGain.connect(ctx.destination);

    shimmerOsc.type = 'triangle';
    shimmerOsc.frequency.setValueAtTime(1046.5, now + 0.2); // C6

    shimmerGain.gain.setValueAtTime(0, now + 0.2);
    shimmerGain.gain.linearRampToValueAtTime(this.config.volume * 0.2, now + 0.22);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    shimmerOsc.start(now + 0.2);
    shimmerOsc.stop(now + 0.5);
  }

  /**
   * Opponent move sound - Subtle tap/tick for background multiplayer activity
   * Quieter than player moves to create audio depth
   */
  private playOpponentMove(): void {
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    // Soft tick sound - lower volume and higher pitch than cardPlace
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    // Quick tick with pitch drop
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);

    // Low-pass for softness
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);

    // Very quick, subtle envelope (quieter than player sounds)
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(this.config.volume * 0.15, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  /**
   * Card to foundation sound - Satisfying 'ding' when card lands on foundation
   * More rewarding than regular card placement since foundation plays are key
   */
  private playCardToFoundation(): void {
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    // Main tone - bright, satisfying note
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Pleasant mid-high frequency
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now); // A5
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.15);

    // Quick attack, medium decay
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(this.config.volume * 0.35, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.start(now);
    osc.stop(now + 0.2);

    // Add a subtle harmonic overtone for richness
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1760, now); // A6 (octave up)
    osc2.frequency.exponentialRampToValueAtTime(880, now + 0.1);

    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(this.config.volume * 0.1, now + 0.01);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc2.start(now);
    osc2.stop(now + 0.12);
  }

  /**
   * Card draw sound - Light swipe/flip for drawing cards from stock
   */
  private playCardDraw(): void {
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    // Quick whoosh noise
    const bufferSize = ctx.sampleRate * 0.1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Fill with filtered noise - quick rising pitch
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * (1 - t * 0.8);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    // Highpass to bandpass sweep for card flip character
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1500, now);
    filter.frequency.exponentialRampToValueAtTime(800, now + 0.1);
    filter.Q.setValueAtTime(0.8, now);

    // Quick envelope
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(this.config.volume * 0.2, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    noise.start(now);
  }

  /**
   * Round complete sound - Celebratory fanfare when round ends
   */
  private playRoundComplete(): void {
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    // Ascending chord progression with shimmer
    const notes = [
      { freq: 392.0, delay: 0 }, // G4
      { freq: 493.88, delay: 0.1 }, // B4
      { freq: 587.33, delay: 0.2 }, // D5
      { freq: 783.99, delay: 0.3 }, // G5
    ];

    notes.forEach(({ freq, delay }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);

      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(this.config.volume * 0.3, now + delay + 0.02);
      gain.gain.setValueAtTime(this.config.volume * 0.25, now + delay + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.5);

      osc.start(now + delay);
      osc.stop(now + delay + 0.5);
    });

    // Add sparkle effect on top
    for (let i = 0; i < 3; i++) {
      const sparkle = ctx.createOscillator();
      const sparkleGain = ctx.createGain();

      sparkle.connect(sparkleGain);
      sparkleGain.connect(ctx.destination);

      sparkle.type = 'triangle';
      const sparkleDelay = 0.35 + i * 0.08;
      const sparkleFreq = 1046.5 + i * 200; // C6 and above
      sparkle.frequency.setValueAtTime(sparkleFreq, now + sparkleDelay);

      sparkleGain.gain.setValueAtTime(0, now + sparkleDelay);
      sparkleGain.gain.linearRampToValueAtTime(this.config.volume * 0.15, now + sparkleDelay + 0.01);
      sparkleGain.gain.exponentialRampToValueAtTime(0.001, now + sparkleDelay + 0.15);

      sparkle.start(now + sparkleDelay);
      sparkle.stop(now + sparkleDelay + 0.15);
    }
  }

  /**
   * Score tally sound - Quick tick for score counting animation
   */
  private playScoreTally(): void {
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Quick blip
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.03);

    // Very short envelope
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(this.config.volume * 0.15, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.start(now);
    osc.stop(now + 0.04);
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
