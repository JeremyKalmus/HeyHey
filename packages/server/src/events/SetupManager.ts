// Setup Manager - Tracks player setup completion per room

export interface SetupRoomState {
  gameId: string;
  totalPlayers: number;
  completedPlayers: Set<string>;
}

export class SetupManager {
  private roomSetupState: Map<string, SetupRoomState> = new Map();

  /**
   * Initialize setup tracking for a room when game starts
   */
  initializeRoom(roomCode: string, gameId: string, playerIds: string[]): void {
    this.roomSetupState.set(roomCode, {
      gameId,
      totalPlayers: playerIds.length,
      completedPlayers: new Set(),
    });
  }

  /**
   * Mark a player as having completed setup
   * @returns Setup status including whether all players are ready
   */
  markPlayerComplete(
    roomCode: string,
    playerId: string
  ):
    | {
        success: true;
        playersReady: number;
        totalPlayers: number;
        allReady: boolean;
        gameId: string;
      }
    | { success: false; error: string } {
    const state = this.roomSetupState.get(roomCode);

    if (!state) {
      return { success: false, error: 'setup_not_initialized' };
    }

    if (state.completedPlayers.has(playerId)) {
      return { success: false, error: 'already_complete' };
    }

    state.completedPlayers.add(playerId);

    const playersReady = state.completedPlayers.size;
    const allReady = playersReady === state.totalPlayers;

    return {
      success: true,
      playersReady,
      totalPlayers: state.totalPlayers,
      allReady,
      gameId: state.gameId,
    };
  }

  /**
   * Check if a player has completed setup
   */
  isPlayerComplete(roomCode: string, playerId: string): boolean {
    const state = this.roomSetupState.get(roomCode);
    return state?.completedPlayers.has(playerId) ?? false;
  }

  /**
   * Get setup status for a room
   */
  getRoomStatus(roomCode: string): SetupRoomState | null {
    return this.roomSetupState.get(roomCode) ?? null;
  }

  /**
   * Handle player disconnect during setup
   */
  handlePlayerLeave(
    roomCode: string,
    playerId: string
  ): { allReady: boolean; gameId: string } | null {
    const state = this.roomSetupState.get(roomCode);

    if (!state) {
      return null;
    }

    // Remove from completed if they were there
    state.completedPlayers.delete(playerId);

    // Reduce total player count
    state.totalPlayers--;

    // If room is now empty, clean up
    if (state.totalPlayers <= 0) {
      this.roomSetupState.delete(roomCode);
      return null;
    }

    // Check if remaining players are all ready
    const allReady = state.completedPlayers.size === state.totalPlayers;

    return { allReady, gameId: state.gameId };
  }

  /**
   * Clean up room setup state (after transitioning to playing)
   */
  cleanupRoom(roomCode: string): void {
    this.roomSetupState.delete(roomCode);
  }
}
