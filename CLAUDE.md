# HeyHey! - Claude Code Context

## Project Overview

HeyHey! is an online multiplayer card game implementing Nertz (also known as Pounce, Racing Demon). It's a real-time competitive game where 2-8+ players race simultaneously to empty their Nertz piles.

**Key Documents:**
- `CONSTITUTION.md` - Vision, game rules, and design principles
- `ROADMAP.md` - All build phases and issues

## Tech Stack

- **Frontend**: React + Vite + TypeScript
- **Backend**: Node.js + Express + Socket.io
- **Structure**: Monorepo with npm workspaces

```
packages/
├── shared/     # Types + game engine (used by both)
├── server/     # Node.js + Socket.io backend
└── client/     # React SPA frontend
```

## Critical Design Principle

> **NO AUTOMATION** - Every card move requires explicit player clicks.

This is the core UX philosophy. The frantic clicking IS the game. Never add:
- Auto-stacking
- Drag-and-drop
- Auto-play suggestions
- Automated setup

Always use **click-to-select, click-to-place** for all card interactions.

## Game Rules Quick Reference

1. **Setup**: Place 10 cards face-down (Nertz pile), flip top card, place 4 work cards
2. **Play**: Everyone plays simultaneously to shared foundation piles
3. **Win**: First to empty Nertz pile calls "HeyHey!"
4. **Score**: +1 per foundation card, -2 per Nertz card remaining

See `CONSTITUTION.md` for complete rules.

## Code Guidelines

### Shared Package
The game rules engine lives in `packages/shared/src/engine/`. This code runs on both client (for UI feedback) and server (for authoritative validation).

```typescript
// Always validate moves through the shared engine
import { validateMove } from '@heyhey/shared/engine/rules';
```

### Server Authority
All game state is authoritative on the server. Client sends move requests, server validates and broadcasts.

```typescript
// Server handles moves
socket.on('makeMove', (move) => {
  const result = validateMove(gameState, move);
  if (result.valid) {
    applyMove(gameState, move);
    io.to(roomCode).emit('gameUpdate', delta);
  } else {
    socket.emit('moveRejected', { move, reason: result.reason });
  }
});
```

### Card Selection Pattern
Use the `useCardSelection` hook for all card interactions:

```tsx
const { selection, selectCard, placeCard, validDestinations } = useCardSelection();

// Click card to select
<Card onClick={() => selectCard(card, source)} selected={isSelected} />

// Click destination to place
<Pile onClick={() => placeCard(destination)} highlighted={isValidDestination} />
```

## Current Phase

Check `ROADMAP.md` for current progress. Issues are numbered HEYHEY-001 through HEYHEY-047.

## Testing

- Unit tests for rules engine in `packages/shared`
- Integration tests for server in `packages/server`
- E2E tests in `tests/e2e`

Run tests: `npm test` (from root)

## Deployment

TBD - Will be configured in Phase 8.
