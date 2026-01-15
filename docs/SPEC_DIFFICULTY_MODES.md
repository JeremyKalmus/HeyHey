# Spec: Difficulty Modes / Easy Mode

## Overview

Add optional visual assistance features that can be enabled per-player. By default, the game provides no hints about valid moves - players must know the rules. Players can optionally enable "Easy Mode" to get visual help.

## Current State

The game currently highlights valid destinations when a card is selected:
- Work piles that can accept the selected card glow green
- Foundation piles that can accept the selected card are highlighted

This makes the game easier but removes the skill element of knowing the rules.

## Requirements

### 1. Default Behavior (No Hints)

By default, selecting a card should NOT show any visual hints:
- No highlighting of valid work pile destinations
- No highlighting of valid foundation destinations
- Player must know solitaire rules (alternating colors, descending rank for work; same suit, ascending for foundations)
- Invalid moves are still rejected with error feedback

### 2. Easy Mode (Optional)

Players can enable "Easy Mode" in settings to get visual assistance:
- Valid work pile destinations highlighted when card is selected
- Valid foundation destinations highlighted when card is selected
- Possibly: invalid drop targets show red/warning when dragging over them

### 3. Per-Player Setting

Each player can independently choose their difficulty:
- Setting stored per-player (not global game setting)
- Other players don't see if someone is using Easy Mode
- Could be stored in localStorage or player profile

### 4. UI for Toggle

Options for where to put the toggle:
- In-game settings menu
- Pre-game lobby (player can set before game starts)
- Quick toggle button in game UI (corner icon?)

### 5. Implementation Approach

**Option A: Component Props**
- Add `showHints?: boolean` prop to relevant components
- Pass down from PlayerArea based on player settings
- Cleanest separation, easy to test

**Option B: Context**
- Create `GameSettingsContext` with hint preferences
- Components read from context
- More implicit, less prop drilling

**Recommendation**: Option A for simplicity - add `showMoveHints` prop.

## Components to Modify

### GameBoard.tsx
- Accept `showMoveHints` prop
- Only pass `validWorkDestinations` to WorkPiles when hints enabled
- Only highlight foundations when hints enabled

### WorkPiles.tsx
- Only apply valid destination styling when `showMoveHints` is true
- Otherwise render all piles identically (no green glow)

### FoundationArea.tsx
- Only highlight valid foundation when `showMoveHints` is true

### PlayerArea.tsx
- Read player's hint setting
- Pass `showMoveHints` to GameBoard

### Settings Storage
- Add to player preferences in localStorage
- Key: `heyhey-settings-{playerId}` or similar

## Future Considerations

### Additional Difficulty Features
- **Auto-move to foundation**: Automatically move cards to foundations when possible
- **Undo button**: Allow undoing moves (casual mode)
- **Move suggestions**: Highlight recommended moves
- **Timer handicap**: Give easier mode players extra time in timed variants

### Competitive Fairness
- In ranked/competitive modes, Easy Mode might be disabled or affect scoring
- Could show indicator if player is using Easy Mode (optional transparency)

## Phases

### Phase 1: Core Toggle
- Add `showMoveHints` prop to components
- Default to `false` (no hints)
- Pass through from PlayerArea

### Phase 2: Settings UI
- Add settings toggle in game UI
- Persist to localStorage
- Load on game start

### Phase 3: Polish
- Smooth transitions when toggling
- Settings accessible from lobby
- Clear iconography for the toggle

## Success Criteria

1. By default, no valid destination highlighting
2. Players can enable Easy Mode to see hints
3. Setting persists across sessions
4. Easy to toggle on/off during play
5. No performance impact from conditional rendering

## Files to Modify

- `packages/client/src/components/Game/GameBoard.tsx` - Add showMoveHints prop
- `packages/client/src/components/Game/WorkPiles.tsx` - Conditional highlighting
- `packages/client/src/components/Game/PlayerArea.tsx` - Read/pass settings
- `packages/client/src/components/Foundation/FoundationArea.tsx` - Conditional highlighting
- `packages/client/src/hooks/usePlayerSettings.ts` - New hook (create)
- `packages/client/src/components/ui/SettingsToggle.tsx` - New component (create)
