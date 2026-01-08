# HeyHey! Constitution

## Vision

Bring the chaotic, fast-paced fun of in-person HeyHey (Nertz) to the web, preserving the physical game feel through intentional manual interactions.

## Game Rules (HeyHey / Nertz)

HeyHey (also known as Nertz, Pounce, or Racing Demon) is a competitive, real-time multiplayer card game where everyone plays simultaneously.

### Equipment
- Each player uses their own standard 52-card deck
- Each player's deck has a unique back color/design to identify ownership
- 2-8+ players can play together

### Setup (Manual - each player does this themselves)
1. Shuffle your deck
2. Deal cards face-down into your "Nertz pile" (house rule: 10 or 13 cards)
3. Flip the top card of your Nertz pile face-up
4. Deal 4 cards face-up in a row as your "work piles" (one card each)
5. Remaining cards form your "stock pile" (held in hand, face-down)

### Play Areas
- **Nertz Pile**: Your personal stack to empty (goal!)
- **Work Piles**: 4 personal columns, build down in alternating colors
- **Stock Pile**: Draw pile, flip 3 cards at a time to waste
- **Waste Pile**: Drawn cards, play from top only
- **Foundations**: SHARED center area, build up by suit (Ace to King)

### Gameplay (Simultaneous!)
All players play at the same time - there are no turns!

**Legal Moves:**
- Play top card of Nertz pile to your work piles or foundations
- Play from work piles to other work piles (descending, alternating colors)
- Play from work piles to foundations (ascending, same suit)
- Draw 3 cards from stock to waste pile
- Play top waste card to work piles or foundations
- When stock is empty, flip waste pile to form new stock

**Work Pile Rules:**
- Build down (K, Q, J, 10, 9...)
- Alternate colors (red on black, black on red)
- Can move stacks of cards together
- Empty spot can only be filled by a King

**Foundation Rules:**
- Start with Ace only
- Build up by suit (A, 2, 3, 4... K)
- Anyone can play to any foundation
- First valid card placed wins (racing!)

### Winning a Round
- First player to empty their Nertz pile calls "HEYHEY!" (or slams the button!)
- Round immediately ends for everyone

### Scoring
- **+1 point** for each of your cards in the foundations
- **-2 points** for each card remaining in your Nertz pile
- Play to a target score (e.g., 100) or single rounds

### House Rules (Configurable)
- Nertz pile size: 10 cards (our default) or 13 cards (traditional)
- Draw count: 3 cards (traditional) or 1 card (easier)
- Scoring variants
- Target score to win

## Design Principles

### 1. No Automation
Every card move requires an explicit player click. Cards never move on their own. The game doesn't auto-sort, auto-stack, or auto-play anything.

### 2. Manual Setup
Players click to place each card during setup:
- Click 10+ times to build the Nertz pile
- Click to flip the top card
- Click 4 more times to place work pile cards

This preserves the "racing to set up" feeling from the physical game.

### 3. Click-to-Select, Click-to-Place
No drag-and-drop. Players:
1. Click a card to select it (visual highlight)
2. Click the destination to place it
3. Invalid destinations show error feedback

### 4. Satisfying Feedback
- Big, satisfying "HeyHey!" button to smash when you win
- Sound effects for card actions (place, flip, error)
- Visual feedback for selections and valid moves
- Celebrations for winning

### 5. House Rules
Players can customize:
- Nertz pile size
- Draw count
- Scoring rules
- Target score

### 6. Fair Play
- Server validates all moves (no cheating)
- First valid move to a foundation wins (server timestamp)
- Reconnection handling for dropped connections

## UX Philosophy

> The frantic clicking IS the game.

In physical HeyHey, the chaos comes from everyone scrambling to:
- Set up faster than opponents
- Spot plays before others
- Race to shared foundation piles
- Physically move cards quickly

Automation would remove the skill and chaos that makes HeyHey fun. We intentionally require manual actions to preserve this experience online.

## Technical Principles

### Server-Authoritative
All game state lives on the server. Client sends move requests, server validates and broadcasts results. This prevents cheating and ensures consistency.

### Low Latency
Racing to foundations requires minimal lag. We use:
- WebSocket connections (Socket.io)
- Delta updates (only send changes)
- Optimistic UI with server reconciliation

### Graceful Degradation
- Handle disconnections with reconnection grace period
- Preserve game state through refreshes
- Support spectator mode
