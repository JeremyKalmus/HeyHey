# Round End & Scoring System Spec

## Overview

When a player calls HeyHey (empties their Nertz pile), the round ends for all players. We need to:
1. Show the celebration overlay (already implemented)
2. Calculate and display round scores
3. Show a "Round End" screen with score breakdown
4. Wait for all players to ready up
5. Start the next round (or end game if someone hit target score)

## Scoring Rules (Already Implemented in ScoringEngine)

- **+1 point** per card you placed in any foundation pile
- **-2 penalty** per card remaining in your Nertz pile
- **Round Score** = Foundation Cards - (Nertz Cards × 2)
- **Game ends** when any player reaches the target score (default: 100)

## Architecture

### Phase 1: Server-Side Round Ending

When `callNertz` is received and successful:

1. **Calculate Scores** - Use `calculateRoundResult()` from ScoringEngine
2. **Broadcast `roundEnded`** event to all players with:
   ```typescript
   interface RoundEndedPayload {
     roundResult: RoundResult;  // Per-player breakdown
     totalScores: { playerId: string; total: number }[];
     gameOver: boolean;
     winner?: string;  // If someone hit target score
   }
   ```
3. **Track ready state** per player for next round

### Phase 2: Client-Side RoundEndScreen Component

**Location:** `packages/client/src/components/Game/RoundEndScreen.tsx`

**Props:**
```typescript
interface RoundEndScreenProps {
  roundNumber: number;
  callerName: string;  // Who called HeyHey
  playerScores: Array<{
    playerId: string;
    playerName: string;
    playerColor: PlayerColor;
    foundationCards: number;  // +1 each
    nertzPenalty: number;     // -2 each
    roundScore: number;       // Net
    totalScore: number;       // Running total
    isLocalPlayer: boolean;
  }>;
  targetScore: number;
  gameOver: boolean;
  winner?: { id: string; name: string };
  isReady: boolean;  // Has local player clicked ready
  playersReady: string[];  // IDs of players who are ready
  onReady: () => void;  // "Ready for Next Round" clicked
}
```

**UI Layout:**
```
┌─────────────────────────────────────────┐
│           ROUND 3 COMPLETE!             │
│         Called by: PlayerName           │
├─────────────────────────────────────────┤
│                                         │
│  PLAYER 1 (you)                         │
│  ┌──────────┬───────────┬──────────┐   │
│  │ +12 cards│ -4 nertz  │ = +4 pts │   │
│  └──────────┴───────────┴──────────┘   │
│  Total: 45 pts                          │
│                                         │
│  PLAYER 2                               │
│  ┌──────────┬───────────┬──────────┐   │
│  │ +8 cards │ -0 nertz  │ = +8 pts │   │
│  └──────────┴───────────┴──────────┘   │
│  Total: 52 pts  ← CALLED HEYHEY         │
│                                         │
├─────────────────────────────────────────┤
│  First to 100 wins                      │
│                                         │
│  [✓ Player 2 Ready]  [○ Waiting...]    │
│                                         │
│         [ READY FOR NEXT ROUND ]        │
│               (or PLAY AGAIN if gameOver)│
└─────────────────────────────────────────┘
```

### Phase 3: Socket Event Flow

**New Client → Server Events:**
```typescript
// Player signals ready for next round
readyForNextRound: () => void;
```

**New Server → Client Events:**
```typescript
// Round ended, show scores
roundEnded: (payload: RoundEndedPayload) => void;

// Player clicked ready
playerReadyForNextRound: (payload: { playerId: string }) => void;

// All players ready, transitioning to next round
allReadyForNextRound: (payload: { nextRoundNumber: number; nextStarterId: string }) => void;
```

### Phase 4: GameStateContext Updates

Add to state:
```typescript
interface GameState {
  // ... existing ...
  roundResult: RoundResult | null;
  playersReadyForNextRound: string[];
  gameOver: boolean;
  gameWinner: string | null;
}
```

Add actions:
```typescript
| { type: 'ROUND_ENDED'; payload: RoundEndedPayload }
| { type: 'PLAYER_READY_FOR_NEXT_ROUND'; playerId: string }
| { type: 'ALL_READY_FOR_NEXT_ROUND' }
```

### Phase 5: GameScreenConnected Integration

After celebration completes:
1. Check if `roundResult` is set in context
2. If set, render `<RoundEndScreen>` instead of game board
3. When all players ready, transition to `waiting_for_start` phase

## File Changes Summary

**New Files:**
- `packages/client/src/components/Game/RoundEndScreen.tsx`
- `packages/client/src/components/Game/RoundEndScreen.module.css`
- `packages/client/src/components/Game/__stories__/RoundEndScreen.stories.tsx`

**Modified Files:**
- `packages/shared/src/types/index.ts` - Add new socket events
- `packages/server/src/events/GameManager.ts` - Add round ending logic
- `packages/server/src/events/lobbyEvents.ts` - Handle new events
- `packages/client/src/context/GameStateContext.tsx` - Add round result state
- `packages/client/src/pages/GameScreenConnected.tsx` - Render RoundEndScreen

## Acceptance Criteria

1. [ ] When HeyHey is called, celebration shows, then transitions to RoundEndScreen
2. [ ] RoundEndScreen shows breakdown for each player (foundation cards, nertz penalty, round score)
3. [ ] Running total scores displayed for each player
4. [ ] "Ready for Next Round" button works, shows which players are ready
5. [ ] When all players ready, next round starts with rotated starter
6. [ ] If someone hits target score, show "Game Over" with winner
7. [ ] Works correctly with 2-4 players

## Implementation Order

1. Server: Add `roundEnded` event emission after nertz call
2. Shared: Add new socket event types
3. Client: Create RoundEndScreen component
4. Client: Add roundResult state to GameStateContext
5. Client: Integrate RoundEndScreen in GameScreenConnected
6. Server: Add ready-for-next-round flow
7. Client: Wire up ready button and player ready indicators
8. Test full round flow with multiple players
