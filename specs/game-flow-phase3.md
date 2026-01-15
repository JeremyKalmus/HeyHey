# Phase 3: Game Flow Implementation

## Overview

Wire up the full game flow from lobby → setup → playing → round end. The game components exist but need to be connected with proper state management and multiplayer sync.

## Requirements

### 1. Round Start Rotation

**User Story**: Each round, a different player gets to start the game by pressing "Go!". This rotates starting with the host.

**Behavior**:
- After all players complete setup, show a "start screen"
- The **starter** (host for round 1, rotates each subsequent round) sees a "GO!" button
- All other players see "Get Ready..." with the starter's name
- When starter clicks Go, ALL players transition to play phase simultaneously
- Server broadcasts the start to ensure sync

**New State**:
```typescript
// In room/game state
currentStarterIndex: number; // Index into players array, starts at 0 (host)
```

**New Events**:
```typescript
// Client → Server
startRound: () => void;

// Server → Client
roundStarting: { starterId: string; starterName: string } => void;
roundStarted: { timestamp: number } => void;
```

### 2. Setup Phase (Interactive Dealing)

**User Story**: Players interactively deal their cards before each round begins.

**Setup Steps** (must complete in order):
1. **Deal Nertz Pile**: Click deck 10 or 13 times (based on `config.nertzPileSize`) to deal cards face-down to nertz pile
2. **Flip Nertz Top**: Click nertz pile once to flip top card face-up
3. **Deal Work Piles**: Click each of 4 work pile positions once to deal one face-up card each

**Visual Feedback**:
- Highlight the next clickable area
- Show progress: "Deal to Nertz (3/13)"
- Disable/dim areas that aren't next in sequence
- Animation: card slides from deck to destination

**Existing Infrastructure**:
- `setupComplete` event already exists (see `.keeper/seeds/backend.yaml`)
- `SetupManager` tracks player completion
- `playerSetupComplete` broadcasts progress

**New Component**: `SetupPhase.tsx`
- Renders deck, nertz pile position, 4 work pile positions
- Tracks local setup step
- Emits `setupComplete` when all steps done

### 3. HeyHey Celebration (Round End)

**User Story**: When a player empties their nertz pile and calls it, everyone sees a celebration.

**Trigger**: Player's nertz pile is empty AND they click the "HEYHEY!" button

**Behavior**:
1. Player clicks HEYHEY button (only enabled when nertz pile empty)
2. Server validates and broadcasts `nertzCalled`
3. ALL players immediately see:
   - Full-screen overlay
   - Giant "HEYHEY!" text (animated entrance)
   - Confetti animation (3-5 seconds)
   - Caller's name: "Called by {playerName}!"
4. Game pauses (no more moves accepted)
5. After celebration, transition to scoring phase

**New Component**: `HeyHeyCelebration.tsx`
- Full-screen overlay (z-index above game)
- Confetti effect (use `canvas-confetti` or similar)
- Animated text entrance
- Auto-dismiss after ~4 seconds → scoring

**Existing Infrastructure**:
- `callNertz` event exists
- `nertzCalled` delta type exists in `StateDelta`
- `GameManager.processNertzCall` exists

### 4. Game Phase Transitions

```
lobby → [startGame] → setup → [all setupComplete] →
  waiting_for_start → [startRound] → playing →
  [callNertz] → celebration → scoring →
  [nextRound or gameOver] → setup/finished
```

**Phase State Updates**:
- Add `waiting_for_start` phase (or reuse `setup` with sub-state)
- Track round number for starter rotation

## Patterns to Reuse

**Reference**: `.keeper/seeds/` for existing patterns

### Socket Broadcast Pattern (from backend.yaml)
```typescript
// Client
socket.emit('startRound');

// Server
socket.on('startRound', () => {
  // Validate caller is current starter
  io.to(roomCode).emit('roundStarted', { timestamp: Date.now() });
});

// Client reducer
case 'ROUND_STARTED':
  return { ...state, gamePhase: 'playing' };
```

### Component Pattern (from frontend.yaml)
- Use existing `Button` component with `variant="primary"` for Go button
- Use existing `Modal` as base for celebration overlay (or create simpler overlay)
- Follow `PlayerArea` pattern for setup phase layout

### State Management (from frontend.yaml)
- Extend `GameStateContext` reducer with new action types
- Follow existing `SETTINGS_UPDATED`, `PLAYER_UPDATED` patterns

## File Changes Summary

### New Files
- `packages/client/src/components/Game/SetupPhase.tsx`
- `packages/client/src/components/Game/HeyHeyCelebration.tsx`
- `packages/client/src/components/Game/WaitingToStart.tsx`
- Stories for each new component

### Modified Files
- `packages/shared/src/types/index.ts` - New events, phases
- `packages/server/src/events/lobbyEvents.ts` - New handlers
- `packages/server/src/events/GameManager.ts` - Round start logic
- `packages/client/src/context/GameStateContext.tsx` - New actions
- `packages/client/src/pages/GamePage.tsx` - Phase routing

## Acceptance Criteria

- [ ] Host can start round 1, player 2 starts round 2, etc.
- [ ] Non-starters see "Get Ready" with starter's name
- [ ] Setup phase requires clicking in correct order
- [ ] Visual feedback shows which area to click next
- [ ] `setupComplete` fires after all setup steps
- [ ] HEYHEY button only enabled when nertz pile empty
- [ ] All players see celebration overlay simultaneously
- [ ] Confetti animation plays for ~3-5 seconds
- [ ] Game stops accepting moves during celebration
- [ ] Scores calculated after celebration ends

## Notes for Keeper Review

This spec should be reviewed against the Seed Vault to ensure:
1. Socket events follow existing patterns in `backend.yaml`
2. Components use existing UI primitives from `frontend.yaml`
3. State management extends existing reducer pattern
4. No duplicate functionality being created
