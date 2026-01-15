# Spec: Multiplayer Game Visualization

## Overview

Create Storybook stories and potentially new components to visualize and test multiplayer Nertz gameplay. Currently we only have single-player views.

## Current State

- `PlayerAreaInteractive` - Single player's full game area
- `OpponentMini` - Compact view of opponent's card counts
- `FoundationArea` - Only 4 foundation piles (wrong for multiplayer!)

## Nertz Multiplayer Rules (Foundation)

In multiplayer Nertz:
- **Each player contributes 1 set of 4 foundation piles** (one per suit)
- 2 players = 8 foundation piles
- 4 players = 16 foundation piles
- 8 players = 32 foundation piles
- **Any player can play on ANY foundation pile**
- Foundation piles build up by suit: Ace → 2 → 3 → ... → King
- Cards show owner color indicator so scoring can track who played what
- When a pile reaches King, it's complete and locked

## Requirements

### 1. Fix Foundation Pile Count

Update `GameState.foundations` to support multiple sets:
```typescript
// Option A: Flat array with player attribution
foundations: FoundationPile[]; // Length = 4 * playerCount

// Option B: Nested by player
foundationSets: {
  playerId: string;
  piles: FoundationPile[];
}[];
```

### 2. Multi-Player Foundation Area Component

New component or enhanced `FoundationArea` that:
- Displays N sets of 4 foundation piles (where N = player count)
- Each set visually grouped by owner color
- Layout adapts to player count:
  - 2 players: 2 rows of 4
  - 4 players: 2 rows of 8, or 4 rows of 4
  - 6+ players: Grid layout with scroll if needed
- Shows owner color border/indicator on each pile set
- All piles are drop targets regardless of owner

### 3. Multiplayer Game Story

Create `MultiplayerGame.stories.tsx` with:

**Story: TwoPlayerGame**
- Full view of YOUR player area (bottom)
- Opponent mini display (top corner)
- Foundation area with 8 piles (2 sets)

**Story: FourPlayerGame**
- Your player area (bottom)
- 3 opponent mini displays (top)
- Foundation area with 16 piles (4 sets)
- See how crowded/busy it gets

**Story: SimulatedMultiplayer**
- Interactive story where you control YOUR player
- Other players make random moves on a timer
- See cards appearing on foundations from other players
- Experience the "racing" feeling of Nertz

### 4. Owner Color on Foundation Cards

When a card is played to foundation, it should display:
- The card face (rank + suit)
- A color indicator showing who played it (for scoring)
- The `Card` component already has `ownerColor` prop - use it!

### 5. Real-Time Updates Visualization

Show what happens when opponents play:
- Card flies into foundation from edge of screen
- Brief highlight/pulse on the pile that received a card
- Sound effect for opponent moves (subtle)

## Layout Options

### Option A: Horizontal Foundation Bands
```
┌─────────────────────────────────────────┐
│  [Opp1 Mini] [Opp2 Mini] [Opp3 Mini]   │
├─────────────────────────────────────────┤
│  ┌───┐┌───┐┌───┐┌───┐  P1 Foundations  │
│  │ ♥ ││ ♦ ││ ♣ ││ ♠ │  (red border)   │
│  └───┘└───┘└───┘└───┘                   │
│  ┌───┐┌───┐┌───┐┌───┐  P2 Foundations  │
│  │ ♥ ││ ♦ ││ ♣ ││ ♠ │  (blue border)  │
│  └───┘└───┘└───┘└───┘                   │
│  ... more rows for more players ...     │
├─────────────────────────────────────────┤
│  [Your Player Area - Stock/Nertz/Work]  │
└─────────────────────────────────────────┘
```

### Option B: Grid Foundation (More Compact)
```
┌─────────────────────────────────────────┐
│  [Opponent Minis across top]            │
├─────────────────────────────────────────┤
│  ┌───┐┌───┐┌───┐┌───┐┌───┐┌───┐┌───┐┌───┐│
│  │♥P1││♦P1││♣P1││♠P1││♥P2││♦P2││♣P2││♠P2││
│  └───┘└───┘└───┘└───┘└───┘└───┘└───┘└───┘│
│  ┌───┐┌───┐┌───┐┌───┐┌───┐┌───┐┌───┐┌───┐│
│  │♥P3││♦P3││♣P3││♠P3││♥P4││♦P4││♣P4││♠P4││
│  └───┘└───┘└───┘└───┘└───┘└───┘└───┘└───┘│
├─────────────────────────────────────────┤
│  [Your Player Area]                     │
└─────────────────────────────────────────┘
```

## Storybook Simulation Approach

To simulate multiplayer in Storybook:

1. **Multiple Player States**: Create game state with N players
2. **Timer-Based Opponent Moves**: Use `useEffect` + `setInterval` to simulate opponents making moves every 1-3 seconds
3. **Random Valid Moves**: Opponents pick random valid moves (card to foundation, work pile moves, etc.)
4. **State Updates**: When opponent "plays", update the shared foundation state

```typescript
// Simulated opponent behavior
useEffect(() => {
  const interval = setInterval(() => {
    // Pick random opponent
    const opponent = opponents[Math.floor(Math.random() * opponents.length)];
    // Find a valid move for them
    const move = findRandomValidMove(opponent, gameState);
    // Apply move
    if (move) {
      applyOpponentMove(move);
      playSound('opponentMove');
    }
  }, 2000); // Every 2 seconds

  return () => clearInterval(interval);
}, [opponents, gameState]);
```

## Phases

### Phase 1: Foundation Data Model Update
- Update `GameState` to support multiple foundation sets
- Add `ownerId` or similar to track pile ownership
- Update StateManager/RulesEngine if needed

### Phase 2: Multi-Foundation UI Component
- Create `MultiFoundationArea` or enhance `FoundationArea`
- Support variable player counts
- Responsive layout for different screen sizes

### Phase 3: Multiplayer Story - Static
- Create story showing full multiplayer layout
- Multiple foundation sets displayed
- OpponentMini displays for each opponent
- Your player area at bottom

### Phase 4: Multiplayer Story - Interactive
- Add timer-based opponent simulation
- Opponents make moves automatically
- See cards appearing on foundations
- Experience the race!

### Phase 5: Polish
- Card flight animations for opponent moves
- Sound effects for opponent plays
- Highlight dangerous opponents (low Nertz pile)

## Success Criteria

1. Can view 2, 4, 6, 8 player game layouts in Storybook
2. Foundation area correctly shows N × 4 piles
3. Each pile set shows owner color
4. Interactive story simulates opponent moves
5. Owner color visible on played cards
6. Layout works on different screen sizes

## Files to Create/Modify

- `packages/shared/src/types/index.ts` - Update GameState.foundations
- `packages/client/src/components/Foundation/MultiFoundationArea.tsx` - New component
- `packages/client/src/components/Game/__stories__/MultiplayerGame.stories.tsx` - New stories
- `packages/client/src/hooks/useSimulatedOpponents.ts` - New hook for story simulation
- `packages/shared/src/engine/StateManager.ts` - Support multi-foundation
- `packages/shared/src/engine/RulesEngine.ts` - Validate against all foundation sets
