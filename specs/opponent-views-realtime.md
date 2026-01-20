# Opponent Views & Real-Time Card Movement

## Overview

Two related features to enhance multiplayer visibility:
1. **Opponent Views**: Show other players' card areas around the board
2. **Real-Time Movement**: Animate opponents' cards moving in real-time

## Feature 1: Opponent Views

### Goal
Display a miniaturized view of each opponent's play area (stock, waste, nertz pile, work piles) around the main game board so players can see everyone's progress.

### Layout Strategy

The local player's full-size controls remain at the bottom. Opponent views appear around the edges based on player count:

**2 Players:**
```
┌────────────────────────────────┐
│     [Opponent - top]           │
├────────────────────────────────┤
│                                │
│    Shared Foundations          │
│                                │
├────────────────────────────────┤
│     [Local Player - bottom]    │
└────────────────────────────────┘
```

**3-4 Players:**
```
┌────────────────────────────────┐
│     [Opponent 2 - top]         │
├────────┬──────────────┬────────┤
│ [Opp1] │  Foundations │ [Opp3] │
│ left   │              │ right  │
├────────┴──────────────┴────────┤
│     [Local Player - bottom]    │
└────────────────────────────────┘
```

**5+ Players:**
- Use scrollable opponent strip at top
- Or grid layout above foundations

### Component: OpponentArea

Create a miniaturized version of the player's area showing:
- Player name + color badge
- Stock pile (card count only, or mini card back)
- Waste pile (top card visible, smaller)
- Nertz pile (count + top card, smaller)
- Work piles (compressed, just top cards visible)

```tsx
interface OpponentAreaProps {
  playerId: string;
  playerName: string;
  playerColor: string;
  stockCount: number;
  wasteTopCard: Card | null;
  nertzCount: number;
  nertzTopCard: Card | null;
  workPiles: Card[][];  // Just need top cards for display
  scale?: number;  // Default 0.5 or 0.6 for opponent views
}
```

### Sizing

- Opponent cards: ~50-60% of normal card size
- Opponent areas: compact, no labels except player name
- Use CSS scale transform or smaller card variants

### State Requirements

Need opponent state in GameStateContext:
- Currently we only track local player's piles
- Server broadcasts `stateUpdated` deltas but we may not be storing them
- Add `opponentStates: Map<playerId, OpponentPlayerState>` to context

```typescript
interface OpponentPlayerState {
  stockCount: number;
  wasteTopCard: Card | null;
  nertzCount: number;
  nertzTopCard: Card | null;
  workPileTops: (Card | null)[];  // Top card of each work pile
}
```

### Server Events

Option A: Broadcast full state periodically (heavy)
Option B: Broadcast deltas for each move (current approach, just need to track on client)
Option C: New event `opponentStateSnapshot` sent on interval (1-2 Hz)

Recommend **Option B** - we already get `stateUpdated` events. Just need to track opponent state in the reducer.

## Feature 2: Real-Time Card Movement

### Goal
When an opponent plays a card to foundation, animate it flying from their area to the foundation pile.

### Animation Flow

1. Receive `foundationUpdated` event with `playerId`
2. If `playerId !== localPlayerId`, trigger opponent card animation
3. Show card flying from opponent's position to the target foundation
4. Use CSS animations with `transform` and `@keyframes`

### Implementation

Extend existing `cardFlyIn` animation in MultiFoundationArea:

```css
/* Flying card from opponent - use CSS custom properties for origin */
@keyframes cardFlyFromOpponent {
  0% {
    transform: translate(var(--fly-from-x), var(--fly-from-y)) scale(0.6);
    opacity: 0.8;
  }
  100% {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }
}
```

### Tracking Animation State

Add to MultiFoundationArea:
```typescript
const [flyingCards, setFlyingCards] = useState<{
  foundationIndex: number;
  card: Card;
  fromPlayerId: string;
  timestamp: number;
}[]>([]);
```

When `foundationUpdated` arrives for another player:
1. Calculate `--fly-from-x` and `--fly-from-y` based on opponent's screen position
2. Add to `flyingCards` with animation trigger
3. Remove after animation completes (~300ms)

### Position Calculation

Need to know where each opponent's area is positioned:
- Store refs to opponent area containers
- Calculate relative offset from foundation target
- Pass as CSS variables to animated card element

## Files to Modify/Create

### New Components
- `packages/client/src/components/Opponent/OpponentArea.tsx`
- `packages/client/src/components/Opponent/OpponentArea.module.css`
- `packages/client/src/components/Game/GameLayout.tsx` (orchestrates layout)

### Modify
- `packages/client/src/context/GameStateContext.tsx` - add opponent tracking
- `packages/client/src/components/Game/GameBoard.tsx` - integrate OpponentArea
- `packages/client/src/components/Game/GameBoard.module.css` - layout for opponents
- `packages/client/src/components/Foundation/MultiFoundationArea.tsx` - flying card animation

## Acceptance Criteria

### Opponent Views
- [ ] Can see all opponents' play areas around the board
- [ ] Opponent areas show: stock count, waste top, nertz count+top, work pile tops
- [ ] Opponent areas update in real-time as they play
- [ ] Layout adapts based on player count (2, 3-4, 5+)
- [ ] Opponent cards are visibly smaller than local player's cards

### Real-Time Movement
- [ ] When opponent plays to foundation, card animates from their position
- [ ] Animation is smooth (60fps)
- [ ] Animation duration ~300ms
- [ ] Multiple simultaneous animations don't conflict
- [ ] Animation works regardless of opponent position

## Design Notes

Match existing 90s Arcade Neubrutalist style:
- Bold borders on opponent areas
- Player color badges
- Arcade-style fonts
- High contrast

Keep performance in mind:
- Don't re-render on every opponent's move
- Use React.memo on opponent area components
- Debounce state updates if needed
