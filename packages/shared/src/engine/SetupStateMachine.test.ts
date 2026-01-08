import { describe, it, expect, beforeEach } from 'vitest';
import { SetupStateMachine } from './SetupStateMachine.js';

describe('SetupStateMachine', () => {
  let machine: SetupStateMachine;

  beforeEach(() => {
    machine = new SetupStateMachine();
  });

  describe('initial state', () => {
    it('starts in idle state', () => {
      expect(machine.state).toBe('idle');
    });

    it('starts with zero progress', () => {
      const progress = machine.progress;
      expect(progress.nertzCardsPlaced).toBe(0);
      expect(progress.nertzFlipped).toBe(false);
      expect(progress.workPilesPlaced).toBe(0);
    });

    it('is not complete initially', () => {
      expect(machine.isComplete).toBe(false);
    });
  });

  describe('state transitions', () => {
    it('transitions from idle to placingNertz via start()', () => {
      const result = machine.start();

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.previousState).toBe('idle');
      expect(result.newState).toBe('placingNertz');
      expect(machine.state).toBe('placingNertz');
    });

    it('prevents invalid transitions', () => {
      // Cannot skip directly to flipNertz from idle
      const result = machine.transitionTo('flipNertz');

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error).toBe('invalid_transition');
      expect(machine.state).toBe('idle');
    });

    it('prevents transitions from complete state', () => {
      // Fast-forward to complete
      machine.start();
      for (let i = 0; i < 13; i++) machine.placeNertzCard();
      machine.completeNertzPile();
      machine.flipNertz();
      for (let i = 0; i < 4; i++) machine.placeWorkPile();
      machine.completeSetup();

      const result = machine.transitionTo('idle');

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error).toBe('already_complete');
    });
  });

  describe('valid transition checks', () => {
    it('reports valid transitions from idle', () => {
      const valid = machine.getValidTransitions();
      expect(valid).toEqual(['placingNertz']);
    });

    it('reports valid transitions from placingNertz', () => {
      machine.start();
      const valid = machine.getValidTransitions();
      expect(valid).toEqual(['flipNertz']);
    });

    it('reports no valid transitions from complete', () => {
      // Fast-forward to complete
      machine.start();
      for (let i = 0; i < 13; i++) machine.placeNertzCard();
      machine.completeNertzPile();
      machine.flipNertz();
      for (let i = 0; i < 4; i++) machine.placeWorkPile();
      machine.completeSetup();

      const valid = machine.getValidTransitions();
      expect(valid).toEqual([]);
    });

    it('canTransitionTo returns correct values', () => {
      expect(machine.canTransitionTo('placingNertz')).toBe(true);
      expect(machine.canTransitionTo('flipNertz')).toBe(false);
      expect(machine.canTransitionTo('complete')).toBe(false);
    });
  });

  describe('Nertz pile placement', () => {
    it('tracks Nertz cards placed', () => {
      machine.start();

      for (let i = 0; i < 5; i++) {
        expect(machine.placeNertzCard()).toBe(true);
      }

      expect(machine.progress.nertzCardsPlaced).toBe(5);
    });

    it('prevents placing more than nertzPileSize cards', () => {
      machine.start();

      for (let i = 0; i < 13; i++) {
        expect(machine.placeNertzCard()).toBe(true);
      }

      // 14th card should fail
      expect(machine.placeNertzCard()).toBe(false);
      expect(machine.progress.nertzCardsPlaced).toBe(13);
    });

    it('prevents placing cards in wrong state', () => {
      // Still in idle state
      expect(machine.placeNertzCard()).toBe(false);
    });

    it('prevents completing Nertz pile when incomplete', () => {
      machine.start();
      machine.placeNertzCard(); // Only 1 card

      const result = machine.completeNertzPile();

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error).toBe('nertz_incomplete');
    });

    it('allows completing Nertz pile when all cards placed', () => {
      machine.start();
      for (let i = 0; i < 13; i++) {
        machine.placeNertzCard();
      }

      const result = machine.completeNertzPile();

      expect(result.success).toBe(true);
      expect(machine.state).toBe('flipNertz');
    });
  });

  describe('Nertz flip', () => {
    beforeEach(() => {
      machine.start();
      for (let i = 0; i < 13; i++) {
        machine.placeNertzCard();
      }
      machine.completeNertzPile();
    });

    it('flips the Nertz pile and transitions to placingWork', () => {
      const result = machine.flipNertz();

      expect(result.success).toBe(true);
      expect(machine.progress.nertzFlipped).toBe(true);
      expect(machine.state).toBe('placingWork');
    });

    it('prevents flipping in wrong state', () => {
      machine.flipNertz(); // Now in placingWork

      const result = machine.flipNertz();

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error).toBe('invalid_transition');
    });
  });

  describe('work pile placement', () => {
    beforeEach(() => {
      machine.start();
      for (let i = 0; i < 13; i++) {
        machine.placeNertzCard();
      }
      machine.completeNertzPile();
      machine.flipNertz();
    });

    it('tracks work piles placed', () => {
      for (let i = 0; i < 2; i++) {
        expect(machine.placeWorkPile()).toBe(true);
      }

      expect(machine.progress.workPilesPlaced).toBe(2);
    });

    it('prevents placing more than 4 work piles', () => {
      for (let i = 0; i < 4; i++) {
        expect(machine.placeWorkPile()).toBe(true);
      }

      expect(machine.placeWorkPile()).toBe(false);
      expect(machine.progress.workPilesPlaced).toBe(4);
    });

    it('prevents placing work piles in wrong state', () => {
      const freshMachine = new SetupStateMachine();
      expect(freshMachine.placeWorkPile()).toBe(false);
    });

    it('prevents completing setup when work piles incomplete', () => {
      machine.placeWorkPile(); // Only 1 pile

      const result = machine.completeSetup();

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error).toBe('work_incomplete');
    });

    it('allows completing setup when all work piles placed', () => {
      for (let i = 0; i < 4; i++) {
        machine.placeWorkPile();
      }

      const result = machine.completeSetup();

      expect(result.success).toBe(true);
      expect(machine.state).toBe('complete');
      expect(machine.isComplete).toBe(true);
    });
  });

  describe('complete setup flow', () => {
    it('completes the full setup flow with default config (13 Nertz)', () => {
      // Start
      machine.start();
      expect(machine.state).toBe('placingNertz');

      // Place 13 Nertz cards
      for (let i = 0; i < 13; i++) {
        machine.placeNertzCard();
      }
      machine.completeNertzPile();
      expect(machine.state).toBe('flipNertz');

      // Flip
      machine.flipNertz();
      expect(machine.state).toBe('placingWork');

      // Place 4 work piles
      for (let i = 0; i < 4; i++) {
        machine.placeWorkPile();
      }
      machine.completeSetup();

      expect(machine.isComplete).toBe(true);
      expect(machine.state).toBe('complete');
    });

    it('completes the full setup flow with 10-card Nertz', () => {
      const shortMachine = new SetupStateMachine({ nertzPileSize: 10 });

      shortMachine.start();

      // Place 10 Nertz cards
      for (let i = 0; i < 10; i++) {
        shortMachine.placeNertzCard();
      }
      shortMachine.completeNertzPile();
      shortMachine.flipNertz();

      for (let i = 0; i < 4; i++) {
        shortMachine.placeWorkPile();
      }
      shortMachine.completeSetup();

      expect(shortMachine.isComplete).toBe(true);
    });
  });

  describe('reset', () => {
    it('resets all state and progress', () => {
      // Complete a setup
      machine.start();
      for (let i = 0; i < 13; i++) machine.placeNertzCard();
      machine.completeNertzPile();
      machine.flipNertz();
      for (let i = 0; i < 4; i++) machine.placeWorkPile();
      machine.completeSetup();

      machine.reset();

      expect(machine.state).toBe('idle');
      expect(machine.progress.nertzCardsPlaced).toBe(0);
      expect(machine.progress.nertzFlipped).toBe(false);
      expect(machine.progress.workPilesPlaced).toBe(0);
      expect(machine.isComplete).toBe(false);
    });
  });

  describe('getSummary', () => {
    it('returns accurate summary during setup', () => {
      machine.start();
      for (let i = 0; i < 5; i++) machine.placeNertzCard();

      const summary = machine.getSummary();

      expect(summary.state).toBe('placingNertz');
      expect(summary.isComplete).toBe(false);
      expect(summary.nertzProgress).toBe('5/13');
      expect(summary.workProgress).toBe('0/4');
    });

    it('returns accurate summary when complete', () => {
      machine.start();
      for (let i = 0; i < 13; i++) machine.placeNertzCard();
      machine.completeNertzPile();
      machine.flipNertz();
      for (let i = 0; i < 4; i++) machine.placeWorkPile();
      machine.completeSetup();

      const summary = machine.getSummary();

      expect(summary.state).toBe('complete');
      expect(summary.isComplete).toBe(true);
      expect(summary.nertzProgress).toBe('13/13');
      expect(summary.workProgress).toBe('4/4');
    });
  });

  describe('progress immutability', () => {
    it('returns a copy of progress, not the original', () => {
      machine.start();
      const progress1 = machine.progress;

      machine.placeNertzCard();
      const progress2 = machine.progress;

      expect(progress1.nertzCardsPlaced).toBe(0);
      expect(progress2.nertzCardsPlaced).toBe(1);
    });
  });
});
