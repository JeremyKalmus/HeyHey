# HeyHey! Roadmap

This roadmap defines all build phases for the HeyHey! multiplayer card game. Each issue is designed to be a discrete, testable unit of work.

## Phase 1: Foundation

**Goal**: Project infrastructure and card component library

- [ ] HEYHEY-001: Initialize monorepo with npm workspaces
  - Create `packages/shared`, `packages/server`, `packages/client`
  - Configure TypeScript for all packages
  - Set up path aliases and build scripts

- [ ] HEYHEY-002: Configure development tooling
  - ESLint + Prettier configuration
  - Vite for client bundling
  - Nodemon for server development
  - Package scripts for dev/build/test

- [ ] HEYHEY-003: Create shared types package
  - Card, Suit, Rank types
  - GameState, PlayerState types
  - Move and MoveType definitions
  - GameConfig for house rules

- [ ] HEYHEY-004: Build Card component library
  - `<Card>` base component with face-up/face-down states
  - `<CardFace>` with suit symbols and rank display
  - `<CardBack>` with customizable player colors
  - `<CardStack>` for overlapping card displays
  - CSS modules for styling

- [ ] HEYHEY-005: Set up Storybook
  - Configure Storybook for React
  - Create stories for all card components
  - Document component props and variants

- [ ] HEYHEY-006: Scaffold Express + Socket.io server
  - Basic Express server setup
  - Socket.io integration
  - Health check endpoint
  - CORS configuration

**Deliverable**: Card components viewable in Storybook, server running

---

## Phase 2: Lobby System

**Goal**: Room creation and player joining

- [ ] HEYHEY-007: Implement room code generator
  - Generate unique "HEYHEY-XXXX" format codes
  - Avoid ambiguous characters (0/O, 1/I/L)
  - Validate code format

- [ ] HEYHEY-008: Build RoomManager class
  - Create room with host
  - Join room by code
  - Leave room
  - Track player list per room
  - Handle room lifecycle (close when empty)

- [ ] HEYHEY-009: Create Lobby UI pages
  - Home page with Create/Join buttons
  - CreateRoom modal/page
  - JoinRoom with code input
  - RoomLobby showing players
  - Game settings panel for host

- [ ] HEYHEY-010: Implement lobby socket events
  - `createRoom` / `roomCreated`
  - `joinRoom` / `roomJoined`
  - `leaveRoom` / `playerLeft`
  - `playerJoined` broadcast
  - `updateSettings` / `settingsUpdated`
  - `startGame` / `gameStarted`

- [ ] HEYHEY-011: Add player customization
  - Player name input
  - Deck color selection
  - Avatar/emoji selection (optional)

**Deliverable**: Multiple browsers can create/join rooms and see each other

---

## Phase 3: Single-Player Setup

**Goal**: Manual card setup phase mechanics

- [ ] HEYHEY-012: Implement deck creation
  - Create 52-card deck with unique IDs
  - Fisher-Yates shuffle algorithm
  - Assign player ownership to cards

- [ ] HEYHEY-013: Build setup state machine
  - States: `idle` -> `placingNertz` -> `flipNertz` -> `placingWork` -> `complete`
  - Track progress (cards placed count)
  - Validate state transitions

- [ ] HEYHEY-014: Create SetupArea UI
  - Instructions overlay
  - Progress indicator (e.g., "Place card 7/10")
  - Deck area (source)
  - Nertz pile slot
  - Work pile slots (4)

- [ ] HEYHEY-015: Implement manual setup interactions
  - Click deck to place card on Nertz pile (repeat 10x)
  - Click Nertz pile to flip top card
  - Click deck to place work pile cards (4x)
  - Disable interactions until previous complete

- [ ] HEYHEY-016: Add setup completion sync
  - Track which players have completed setup
  - Show waiting screen for completed players
  - Broadcast when all players ready
  - Transition to playing phase

**Deliverable**: Single player can complete full setup with manual clicks

---

## Phase 4: Single-Player Game

**Goal**: Full game mechanics for one player (local)

- [ ] HEYHEY-017: Implement game rules engine
  - `validateMove(state, move)` function
  - Work pile rules (descending, alternating colors)
  - Foundation rules (ascending, same suit)
  - Move type handlers for all move types

- [ ] HEYHEY-018: Build useCardSelection hook
  - Selection state management
  - `selectCard(card, source)` function
  - `placeCard(destination)` function
  - `clearSelection()` function
  - Calculate valid destinations for selected card

- [ ] HEYHEY-019: Create PlayerArea layout
  - Left section: Nertz pile
  - Center section: 4 work piles
  - Right section: Stock + Waste
  - Bottom: HeyHey button (disabled)

- [ ] HEYHEY-020: Build NertzPile component
  - Display stack with top card face-up
  - Click to select top card
  - Visual indicator when empty

- [ ] HEYHEY-021: Build WorkPiles component
  - 4 cascading columns
  - Stacked card display (offset)
  - Click card to select
  - Click pile to place selected card
  - Highlight valid destinations

- [ ] HEYHEY-022: Build Stock and Waste components
  - StockPile: Click to draw 3 cards
  - WastePile: Display top 3 cards fanned
  - Click waste top card to select
  - Recycle waste when stock empty

- [ ] HEYHEY-023: Build local FoundationArea
  - Display foundation piles (starts empty)
  - Click to place selected card
  - Show card count per pile

- [ ] HEYHEY-024: Add sound effects
  - Card select sound
  - Card place sound
  - Card flip sound
  - Invalid move error sound
  - Load and manage audio

**Deliverable**: Complete single-player Nertz game (local, no win condition)

---

## Phase 5: Multiplayer Foundation

**Goal**: Server-authoritative gameplay

- [ ] HEYHEY-025: Build GameSession class
  - Initialize game state from room
  - Manage authoritative state
  - Assign deck colors to players
  - Track all player states

- [ ] HEYHEY-026: Implement server-side move validation
  - Receive move requests from clients
  - Validate using shared rules engine
  - Apply valid moves to state
  - Reject invalid moves with reason

- [ ] HEYHEY-027: Create state synchronization system
  - Delta update format
  - Sequence numbering for ordering
  - Broadcast updates to all players
  - Send rejection to individual player

- [ ] HEYHEY-028: Implement shared foundations
  - Multiple players can play to same foundation
  - Conflict resolution (first received wins)
  - Broadcast foundation updates to all

- [ ] HEYHEY-029: Add game socket events
  - `makeMove` / `gameUpdate`
  - `moveRejected` with reason
  - `foundationUpdate` broadcast
  - Player state updates

**Deliverable**: 2 players can play simultaneously, racing to foundations

---

## Phase 6: Complete Multiplayer

**Goal**: Full game with scoring and round flow

- [ ] HEYHEY-030: Build OpponentMini components
  - Mini view of each opponent's area
  - Show card counts (not actual cards)
  - Nertz pile count (important!)
  - Activity indicator

- [ ] HEYHEY-031: Create HeyHeyButton component
  - Large, prominent button
  - Disabled until Nertz pile empty
  - Satisfying press animation
  - Sound effect on press
  - Emit `callHeyHey` event

- [ ] HEYHEY-032: Implement scoring system
  - Count cards per player in foundations
  - Calculate Nertz pile penalties
  - Store round scores
  - Accumulate total scores

- [ ] HEYHEY-033: Build round end flow
  - Detect HeyHey call
  - Freeze all gameplay
  - Calculate and display scores
  - Show round summary modal
  - "Next Round" or "End Game" buttons

- [ ] HEYHEY-034: Create Scoreboard component
  - Display all player scores
  - Highlight leader
  - Show round-by-round breakdown
  - Animate score changes

- [ ] HEYHEY-035: Implement multi-round support
  - Reset game state between rounds
  - Maintain cumulative scores
  - Detect game winner (target score)
  - Game end celebration

**Deliverable**: Full multiplayer game with scoring and multiple rounds

---

## Phase 7: Polish

**Goal**: Configuration, reliability, and UX improvements

- [ ] HEYHEY-036: Build GameSettings UI
  - Nertz pile size selector (10/13)
  - Draw count selector (1/3)
  - Target score input
  - Save as room defaults

- [ ] HEYHEY-037: Implement reconnection handling
  - Detect disconnection
  - Grace period before removal
  - Rejoin with session token
  - Sync missed state updates

- [ ] HEYHEY-038: Add spectator mode
  - Join room as spectator
  - Full game visibility
  - No interaction allowed
  - Spectator count display

- [ ] HEYHEY-039: Improve mobile responsiveness
  - Touch-friendly card sizes
  - Responsive layout breakpoints
  - Card tap interactions
  - Viewport optimizations

- [ ] HEYHEY-040: Add card animations
  - Move animations
  - Flip animations
  - Stack shuffling
  - Victory celebration

- [ ] HEYHEY-041: Implement theme options
  - Card back designs
  - Table color/texture
  - Light/dark mode
  - Card face styles

**Deliverable**: Production-ready game with configurable rules

---

## Phase 8: Testing & Launch

**Goal**: Quality assurance and deployment

- [ ] HEYHEY-042: Write shared package unit tests
  - Deck creation and shuffling
  - All move validation rules
  - Scoring calculations
  - State machine transitions

- [ ] HEYHEY-043: Write server integration tests
  - Room lifecycle
  - Game session flow
  - Socket event handling
  - Conflict resolution

- [ ] HEYHEY-044: Write E2E tests
  - Full game flow (setup to win)
  - Multi-player scenarios
  - Edge cases (disconnection, etc.)
  - Performance under load

- [ ] HEYHEY-045: Performance optimization
  - Profile and optimize renders
  - Minimize socket payload sizes
  - Implement lazy loading
  - Memory leak detection

- [ ] HEYHEY-046: Deployment setup
  - Production build configuration
  - Environment variables
  - Deployment scripts
  - Monitoring setup

- [ ] HEYHEY-047: Launch preparation
  - Documentation
  - Onboarding flow
  - Error tracking
  - Analytics

**Deliverable**: Deployed, tested, production-ready HeyHey!

---

## Future Ideas (Post-Launch)

- [ ] HEYHEY-F01: Leaderboards and stats
- [ ] HEYHEY-F02: Friend lists and invites
- [ ] HEYHEY-F03: Tournaments mode
- [ ] HEYHEY-F04: Custom deck designs
- [ ] HEYHEY-F05: Chat/emotes system
- [ ] HEYHEY-F06: Mobile apps (React Native)
- [ ] HEYHEY-F07: AI opponents
- [ ] HEYHEY-F08: Replay system
