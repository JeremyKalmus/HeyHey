# HeyHey Spec: Wire Up App

> **Purpose**: Connect existing UI components to the server via socket.io
> **Status**: READY FOR CONVOY

## Overview

All the pieces exist but aren't connected:
- **UI Components**: Complete (Lobby, Game, Cards, etc.)
- **Server**: Complete (LobbyManager, GameManager, SetupManager)
- **Shared Types**: Complete (socket events, game state)
- **App.tsx**: Placeholder - needs everything wired up

## Goal

Make the app playable end-to-end: HomePage → Create/Join Room → Lobby → Setup → Play → Score

## Architecture

```
App.tsx
├── SocketProvider (context for socket connection)
├── GameStateProvider (context for game/room state)
└── Router
    ├── / → HomePage
    ├── /room/:code → RoomLobby (waiting room)
    ├── /game/:gameId → GameBoard (active game)
    └── /results/:gameId → ScoreScreen (round results)
```

## Implementation Tasks

### Phase 1: Socket Infrastructure

**Task 1.1: Create SocketContext**
- File: `packages/client/src/context/SocketContext.tsx`
- Provides typed socket.io connection to all components
- Auto-connects on mount, handles reconnection
- Exposes `socket` instance and `isConnected` state

```tsx
// Expected interface
interface SocketContextValue {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  isConnected: boolean;
}
```

**Task 1.2: Create GameStateContext**
- File: `packages/client/src/context/GameStateContext.tsx`
- Manages all game state: room, players, game phase, local player state
- Listens to socket events and updates state
- Provides actions: createRoom, joinRoom, leaveRoom, startGame, etc.

```tsx
// Expected interface
interface GameStateContextValue {
  // Room state
  room: RoomState | null;
  playerId: string | null;
  isHost: boolean;

  // Game state
  gameId: string | null;
  gamePhase: GamePhase;
  playerState: PlayerGameState | null;
  foundations: FoundationPile[];
  opponents: PlayerGameState[];

  // Actions
  createRoom: (playerName: string) => void;
  joinRoom: (roomCode: string, playerName: string) => void;
  leaveRoom: () => void;
  updateSettings: (settings: Partial<GameConfig>) => void;
  startGame: () => void;
  setupComplete: () => void;
  makeMove: (move: Move) => void;
  callNertz: () => void;

  // Errors
  error: string | null;
  clearError: () => void;
}
```

### Phase 2: Routing

**Task 2.1: Install react-router-dom**
```bash
npm install react-router-dom
```

**Task 2.2: Update App.tsx with routing**
- File: `packages/client/src/App.tsx`
- Wrap with providers (SocketProvider, GameStateProvider)
- Add routes for each screen

```tsx
// Expected structure
<SocketProvider>
  <GameStateProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/room/:code" element={<RoomLobby />} />
        <Route path="/game/:gameId" element={<GameScreen />} />
      </Routes>
    </BrowserRouter>
  </GameStateProvider>
</SocketProvider>
```

### Phase 3: Connect Components

**Task 3.1: Wire HomePage**
- File: `packages/client/src/components/Lobby/HomePage.tsx`
- Connect "Create Room" button to `createRoom()` action
- Connect "Join Room" to `joinRoom()` action
- Navigate to `/room/:code` on success

**Task 3.2: Wire RoomLobby**
- File: `packages/client/src/components/Lobby/RoomLobby.tsx`
- Display room code, player list from context
- Connect settings controls (host only)
- Connect "Start Game" button to `startGame()`
- Navigate to `/game/:gameId` when game starts

**Task 3.3: Create GameScreen**
- File: `packages/client/src/components/Game/GameScreen.tsx`
- New component that orchestrates game phases:
  - `setup` phase: Show SetupArea, call `setupComplete()` when done
  - `playing` phase: Show GameBoard with live state
  - `scoring` phase: Show round results

**Task 3.4: Wire GameBoard**
- File: `packages/client/src/components/Game/GameBoard.tsx`
- Connect to game state from context
- Wire card interactions to `makeMove()` action
- Wire HeyHey button to `callNertz()` action
- Show opponent states via OpponentMini components

### Phase 4: Local Player State

**Task 4.1: Create useLocalPlayerState hook**
- File: `packages/client/src/hooks/useLocalPlayerState.ts`
- Manages optimistic updates for local player's piles
- Handles stock/waste cycling (draw cards)
- Provides drag-and-drop state for card movement

**Task 4.2: Wire Player piles**
- Connect NertzPile, WorkPiles, StockPile, WastePile to local state
- Implement click/drag handlers for card selection
- Implement drop targets for valid moves

### Phase 5: Foundation Sync

**Task 5.1: Wire FoundationArea**
- Connect to shared foundations from context
- Handle optimistic updates with rollback on rejection
- Show card ownership colors (who played what)

## Socket Event Flow

### Create Room Flow
```
Client                          Server
  |-- createRoom({playerName}) -->|
  |<-- roomCreated({room, id}) ---|
  |   Navigate to /room/:code     |
```

### Join Room Flow
```
Client                          Server
  |-- joinRoom({code, name}) ---->|
  |<-- roomJoined({room, id}) ----|
  |   (other clients)             |
  |<-- playerJoined({player}) ----|
```

### Start Game Flow
```
Client (Host)                   Server
  |-- startGame() --------------->|
  |<-- gameStarted({gameId}) -----|
  |   Navigate to /game/:id       |
  |   Show SetupArea              |
  |-- setupComplete() ----------->|
  |<-- playerSetupComplete() -----|
  |<-- allPlayersReady() ---------|
  |   Transition to playing phase |
```

### Game Play Flow
```
Client                          Server
  |-- makeMove({move}) ---------->|
  |<-- stateUpdated({delta}) ------|  (broadcast)
  |   OR                          |
  |<-- moveRejected({error}) -----|  (individual)
  |                               |
  |-- callNertz() --------------->|
  |<-- stateUpdated({nertzCalled})-|  (broadcast)
  |<-- roundScored({results}) ----|  (broadcast)
```

## File Structure

```
packages/client/src/
├── App.tsx                    # Updated with routing
├── context/
│   ├── SocketContext.tsx      # NEW
│   ├── GameStateContext.tsx   # NEW
│   └── index.ts               # NEW
├── hooks/
│   ├── useLocalPlayerState.ts # NEW
│   ├── useSocket.ts           # NEW (convenience hook)
│   └── useGameState.ts        # NEW (convenience hook)
└── components/
    └── Game/
        └── GameScreen.tsx     # NEW - game phase orchestrator
```

## Dependencies to Add

```json
{
  "dependencies": {
    "react-router-dom": "^6.x",
    "socket.io-client": "^4.x"  // May already exist
  }
}
```

## Testing Strategy

1. **Manual flow test**: Create room → Join from another tab → Start game → Play moves
2. **Reconnection test**: Disconnect/reconnect during game
3. **Error handling**: Invalid room codes, network errors

## Success Criteria

- [ ] Can create a room and see room code
- [ ] Can join a room with code
- [ ] Host can change settings, others see updates
- [ ] Host can start game with 2+ players
- [ ] Setup phase shows deck arrangement
- [ ] Game board shows own piles and opponents
- [ ] Can move cards between piles
- [ ] Can play cards to foundations
- [ ] Foundation updates sync across all players
- [ ] HeyHey button ends round
- [ ] Score screen shows round results
- [ ] Game continues until target score reached

## Notes

- Server is already running at default port (check `packages/server/src/index.ts`)
- Use `VITE_SERVER_URL` env var for socket connection URL
- All types are in `@heyhey/shared` - import from there

---

**Spec Version**: 1.0
**Author**: heyhey/crew/jeremy
**Date**: 2026-01-13
