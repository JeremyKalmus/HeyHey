# Opponent Play Areas - Full Card Display (v2)

## Problem with Current Implementation

The current OpponentArea shows a **summary badge** with card counts:
```
┌─────────────────┐
│ 👤 HOST         │
│ NERTZ: 9        │
│ Stock:35 Waste:0│
└─────────────────┘
```

**What we actually need**: A miniaturized version of the opponent's **actual play area** showing their real cards, positioned around the table like sitting across from them.

## Visual Goal

```
┌──────────────────────────────────────────────────────────────────┐
│                    OPPONENT'S PLAY AREA (scaled down)            │
│  ┌─────┐ ┌─────┐   ┌─────┐   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│  │▓▓▓▓▓│ │ 8♦  │   │ Q♥  │   │ 5♦  │ │ 3♣  │ │ K♦  │ │ 2♠  │   │
│  │▓▓▓▓▓│ │     │   │     │   │     │ │     │ │     │ │     │   │
│  │stock│ │waste│   │nertz│   │work1│ │work2│ │work3│ │work4│   │
│  └─────┘ └─────┘   └─────┘   └─────┘ └─────┘ └─────┘ └─────┘   │
│                         "Host" (red)                             │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                      SHARED FOUNDATIONS                          │
│    ┌────────────────────┐    ┌────────────────────┐             │
│    │ HOST's foundations │    │ PLAYER foundations │             │
│    │ ♥  ♦  ♣  A♠       │    │ A♦  ♥  ♣  ♠       │             │
│    └────────────────────┘    └────────────────────┘             │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                    LOCAL PLAYER'S PLAY AREA                      │
│  ┌─────┐ ┌─────┐   ┌─────┐   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│  │▓▓▓▓▓│ │ 8♦  │   │ Q♥  │   │ 5♦  │ │ 3♣  │ │ K♦  │ │ 2♠  │   │
│  │▓▓▓▓▓│ │     │   │  9  │   │ 4♠  │ │     │ │     │ │     │   │
│  │stock│ │waste│   │nertz│   │work1│ │work2│ │work3│ │work4│   │
│  └─────┘ └─────┘   └─────┘   └─────┘ └─────┘ └─────┘ └─────┘   │
└──────────────────────────────────────────────────────────────────┘
```

## Layout by Player Count

### 2 Players (most common)
```
        ┌─────────────────────────┐
        │   OPPONENT (top)        │
        │   [mini play area]      │
        └─────────────────────────┘

        ┌─────────────────────────┐
        │   FOUNDATIONS           │
        └─────────────────────────┘

        ┌─────────────────────────┐
        │   LOCAL PLAYER (bottom) │
        │   [full size]           │
        └─────────────────────────┘
```

### 3-4 Players
```
        ┌─────────────────────────┐
        │   OPPONENT 2 (top)      │
        └─────────────────────────┘

┌───────┐                         ┌───────┐
│ OPP 1 │   FOUNDATIONS           │ OPP 3 │
│ left  │                         │ right │
└───────┘                         └───────┘

        ┌─────────────────────────┐
        │   LOCAL PLAYER          │
        └─────────────────────────┘
```

### 5+ Players
```
   ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
   │ OPP 1 │ │ OPP 2 │ │ OPP 3 │ │ OPP 4 │  (scrollable row)
   └───────┘ └───────┘ └───────┘ └───────┘

        ┌─────────────────────────┐
        │   FOUNDATIONS           │
        └─────────────────────────┘

        ┌─────────────────────────┐
        │   LOCAL PLAYER          │
        └─────────────────────────┘
```

## Component: OpponentPlayArea

NOT a summary badge. A **miniaturized GameBoard** showing actual cards.

```tsx
interface OpponentPlayAreaProps {
  playerId: string;
  playerName: string;
  playerColor: PlayerColor;

  // Actual card data (face-up cards only)
  stockCount: number;           // Just count, cards are face-down
  wasteTopCard: Card | null;    // Top card visible
  nertzCount: number;           // Count shown
  nertzTopCard: Card | null;    // Top card visible
  workPiles: Card[][];          // Full work piles (all face-up)

  // Visual options
  scale?: 'xs' | 'sm' | 'md';   // Size variant
  position?: 'top' | 'left' | 'right'; // For rotation/orientation
}
```

### What to Display

| Pile | Display |
|------|---------|
| Stock | Card back with count badge |
| Waste | Top card face-up (or empty slot) |
| Nertz | Top card face-up with count badge |
| Work Piles | All cards in each pile (stacked, all face-up) |

### Scaling

- **Opponent cards**: 50-60% of normal card size
- **Card overlap in work piles**: Compressed (8-10px showing per card)
- **Spacing**: Tighter than local player area

## Server Changes Required

### New Socket Event: `opponentStateUpdate`

The server must broadcast opponent state to all players in the room.

```typescript
// Server broadcasts when any player's state changes
interface OpponentStateUpdatePayload {
  playerId: string;
  stockCount: number;
  wasteTopCard: Card | null;
  nertzCount: number;
  nertzTopCard: Card | null;
  workPiles: Card[][];  // All cards (they're all face-up)
}

// Server to Client event
socket.emit('opponentStateUpdate', payload);
```

### When to Broadcast

Broadcast `opponentStateUpdate` after ANY move that changes visible state:
- Card played to foundation → update source pile
- Card moved to work pile → update work piles
- Card drawn from stock → update stock count + waste
- Stock recycled → update stock/waste

### Privacy Consideration

Only broadcast **face-up** cards:
- Stock pile: Just the count (cards are face-down)
- Waste pile: Top card only
- Nertz pile: Top card + count
- Work piles: All cards (they're all face-up in Nertz)

## Real-Time Card Animation

When opponent plays to foundation, animate the card flying from their area.

### Flow

1. Server broadcasts `foundationUpdated` with `playerId` and `source`
2. Client checks if `playerId !== localPlayerId`
3. Calculate source position based on opponent's area position
4. Animate card flying from opponent area → foundation pile

### Animation Implementation

```css
@keyframes cardFlyFromOpponent {
  0% {
    transform: translate(var(--from-x), var(--from-y)) scale(0.5);
    opacity: 0.8;
  }
  50% {
    transform: translate(calc(var(--from-x) / 2), calc(var(--from-y) / 2)) scale(0.75);
    opacity: 1;
  }
  100% {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }
}
```

### Source Position Calculation

Need refs to opponent play areas to calculate `--from-x` and `--from-y`:

```typescript
// In MultiFoundationArea or parent component
const opponentRefs = useRef<Map<string, HTMLDivElement>>(new Map());

// When foundationUpdated arrives from opponent
const opponentEl = opponentRefs.current.get(playerId);
const foundationEl = foundationRefs.current.get(foundationIndex);
if (opponentEl && foundationEl) {
  const fromRect = opponentEl.getBoundingClientRect();
  const toRect = foundationEl.getBoundingClientRect();
  // Calculate offsets and trigger animation
}
```

## Files to Create/Modify

### New Files
- `components/Game/OpponentPlayArea.tsx` - Mini play area with actual cards
- `components/Game/OpponentPlayArea.module.css` - Styling
- `components/Game/TableLayout.tsx` - Orchestrates opponent positioning

### Server Modifications
- `server/src/events/GameManager.ts` - Add `broadcastOpponentState()` method
- `server/src/events/handlers.ts` - Call broadcast after each move

### Client Modifications
- `context/GameStateContext.tsx` - Listen for `opponentStateUpdate`, store full opponent state
- `pages/GameScreenConnected.tsx` - Use TableLayout with OpponentPlayArea components
- `components/Foundation/MultiFoundationArea.tsx` - Add flying card animation

## Acceptance Criteria

### Opponent Play Areas
- [ ] Can see opponent's actual cards (waste top, nertz top, all work pile cards)
- [ ] Opponent areas are scaled down (50-60% card size)
- [ ] Layout adapts: 2 players = top, 3-4 = around, 5+ = scrollable
- [ ] Stock shows card back with count
- [ ] Nertz shows top card with count badge
- [ ] Work piles show stacked cards

### Real-Time Updates
- [ ] Opponent areas update immediately when they make moves
- [ ] Server broadcasts state after every move
- [ ] No noticeable lag in opponent state updates

### Card Animation
- [ ] When opponent plays to foundation, card visually flies from their area
- [ ] Animation is smooth (CSS-based, 60fps)
- [ ] Animation duration ~300ms
- [ ] Source position matches opponent's pile location

## Important Notes

1. **This replaces the current OpponentArea component** - The count-badge version can be removed or repurposed for a compact mode

2. **Server MUST send state** - Without server broadcasting opponent card state, this feature cannot work

3. **Performance** - Use React.memo liberally, only re-render on actual state changes

4. **The "table" feeling** - Opponent at top should feel like they're sitting across from you. Consider subtle rotation or mirroring of their area.
