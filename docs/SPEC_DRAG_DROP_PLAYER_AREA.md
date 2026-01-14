# Spec: Drag-and-Drop Player Area

## Overview

Add drag-and-drop interaction to the Player Area for solitaire gameplay. This enhances the existing click-selection system with a more intuitive drag-and-drop interface for moving cards between piles.

## Current State

The player area has **click-selection working**:
- Click card → select → click destination → move
- Double-click → auto-move to foundation
- Rules validation via `RulesEngine.ts`
- Optimistic updates via `useLocalPlayerState.ts`

**Missing**: Drag-and-drop as alternative input method.

## Requirements

### 1. Install Drag-and-Drop Library

**Recommended: `@dnd-kit/core`** (modern, headless, touch-friendly)

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Alternatives considered:
- `react-beautiful-dnd` - Mature but less maintained
- `react-dnd` - Complex setup, HTML5 backend issues on touch

### 2. Draggable Cards

Cards that can be dragged:
- **Nertz pile top card** (single card only)
- **Waste pile top card** (single card only)
- **Work pile cards** (can drag multiple cards as a stack from any face-up card down)

Cards that CANNOT be dragged:
- Stock pile (click to draw only)
- Face-down cards
- Foundation cards (one-way destination)

### 3. Droppable Targets

Valid drop zones:
- **Work piles** (4 piles) - Accepts cards following alternating color, descending rank
- **Foundation piles** (4 piles) - Accepts cards following same suit, ascending rank (Ace→King)
- **Empty work piles** - Accepts any card (or King-only variant)

Invalid drop zones:
- Nertz pile (source only)
- Waste pile (source only)
- Stock pile (click only)
- Same pile card came from

### 4. Visual Feedback

During drag:
```css
.dragging {
  opacity: 0.8;
  transform: rotate(5deg) scale(1.05);
  z-index: 1000;
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  cursor: grabbing;
}
```

Valid drop target:
```css
.dropTarget.valid {
  border: 3px solid var(--arcade-green, #00FF88);
  background: rgba(0, 255, 136, 0.1);
  transform: scale(1.02);
}
```

Invalid drop (drag over non-target):
```css
.dropTarget.invalid {
  border: 3px solid var(--arcade-pink, #FF6B9D);
  opacity: 0.5;
}
```

### 5. Multi-Card Drag (Work Piles)

When dragging from a work pile:
- Clicking/dragging any face-up card drags that card AND all cards below it
- Visual: Stack of cards follows cursor
- Drop: Entire stack moves to destination

Example: Work pile has [K♠, Q♥, J♠, 10♥]
- Drag Q♥ → drags [Q♥, J♠, 10♥] as stack
- Drag 10♥ → drags only [10♥]

### 6. Touch Support

Critical for tablet play (Nertz is popular on tablets):
- Touch start → begin drag
- Touch move → update position
- Touch end → complete drop
- Long press (300ms) → alternative drag initiation
- Pinch-to-zoom disabled during drag

### 7. Integration with Existing Hooks

Connect drag-drop to `useLocalPlayerState`:

```typescript
// In drag end handler
const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;

  if (!over) return; // Dropped outside valid target

  const source = parseDragId(active.id); // { type: 'nertz' | 'work' | 'waste', ... }
  const destination = parseDropId(over.id); // { type: 'work' | 'foundation', index }

  // Use existing move logic
  const result = moveToDestination(destination);

  if (!result.valid) {
    // Show error feedback (shake animation, sound)
    playSound('error');
  }
};
```

### 8. Keyboard Accessibility

Maintain keyboard support alongside drag-drop:
- Tab through cards
- Enter/Space to select
- Arrow keys to navigate piles
- Enter on destination to place

## Component Changes

### WorkPiles.tsx
- Wrap each card in `<Draggable>`
- Wrap pile container in `<Droppable>`
- Add drag preview for multi-card stacks

### NertzPile.tsx
- Top card only is `<Draggable>`
- Not a drop target

### WastePile.tsx
- Top card only is `<Draggable>`
- Not a drop target

### FoundationArea.tsx
- Each pile is `<Droppable>`
- Not draggable (cards are permanent)

### PlayerArea.tsx or GameBoard.tsx
- Wrap in `<DndContext>`
- Handle `onDragStart`, `onDragOver`, `onDragEnd`
- Manage drag state for visual feedback

## New Hook: useDragAndDrop

```typescript
interface UseDragAndDropOptions {
  localState: PlayerGameState;
  gameState: GameState;
  onMove: (source: MoveSource, destination: MoveDestination) => void;
  onFoundationMove: (card: Card, foundationIndex: number) => void;
}

interface UseDragAndDropReturn {
  isDragging: boolean;
  dragSource: DragSource | null;
  validDropTargets: DropTarget[];
  handleDragStart: (event: DragStartEvent) => void;
  handleDragOver: (event: DragOverEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  getDraggableProps: (source: CardSource) => DraggableProps;
  getDroppableProps: (target: DropTarget) => DroppableProps;
}
```

## Phases

### Phase 1: Basic Drag-Drop Infrastructure
- Install @dnd-kit
- Create DndContext wrapper
- Single card drag from Nertz → Work pile
- Basic visual feedback

### Phase 2: All Source Piles
- Waste pile dragging
- Work pile dragging (single card)
- Foundation as drop target

### Phase 3: Multi-Card Stacks
- Drag multiple cards from work piles
- Stack preview during drag
- Proper z-index handling

### Phase 4: Polish & Touch
- Touch device support
- Animations (snap to target, return on invalid)
- Sound effects integration
- Performance optimization

### Phase 5: Testing & Edge Cases
- Test with existing click handlers (both should work)
- Test rapid drag sequences
- Test drag cancel (Escape key, drag outside)
- Mobile browser testing

## Success Criteria

1. Can drag cards from Nertz, Waste, Work piles to valid destinations
2. Visual feedback clearly shows valid/invalid targets
3. Multi-card stacks drag together from work piles
4. Touch works smoothly on tablet
5. Click-selection still works (not replaced, enhanced)
6. No performance degradation with many cards
7. Accessible via keyboard as fallback

## Files to Modify

- `packages/client/package.json` - Add @dnd-kit dependencies
- `packages/client/src/components/Game/PlayerArea.tsx` - DndContext wrapper
- `packages/client/src/components/Game/WorkPiles.tsx` - Draggable/Droppable
- `packages/client/src/components/Game/NertzPile.tsx` - Draggable top card
- `packages/client/src/components/Player/WastePile.tsx` - Draggable top card
- `packages/client/src/components/Foundation/FoundationArea.tsx` - Droppable piles
- `packages/client/src/hooks/useDragAndDrop.ts` - New hook (create)
- `packages/client/src/components/Card/Card.module.css` - Drag styles

## References

- Existing hooks: `useLocalPlayerState.ts`, `useCardSelection.ts`
- Rules: `packages/shared/src/engine/RulesEngine.ts`
- Current layout: `GameBoard.tsx`, `SetupArea.tsx`
- @dnd-kit docs: https://dndkit.com/
