// SocketRegistry - Shared service for tracking socket-to-room mappings
// Extracted from GameManager and LobbyManager to avoid duplication

/**
 * SocketRegistry manages the mapping between socket IDs and room codes.
 * This provides a single source of truth for which room a socket belongs to.
 */
export class SocketRegistry {
  private socketToRoom: Map<string, string> = new Map();

  /**
   * Register a socket to a room
   * @param socketId - The socket ID to register
   * @param roomCode - The room code to associate with the socket
   */
  join(socketId: string, roomCode: string): void {
    this.socketToRoom.set(socketId, roomCode);
  }

  /**
   * Unregister a socket from its room
   * @param socketId - The socket ID to unregister
   * @returns The room code the socket was in, or undefined if not registered
   */
  leave(socketId: string): string | undefined {
    const roomCode = this.socketToRoom.get(socketId);
    this.socketToRoom.delete(socketId);
    return roomCode;
  }

  /**
   * Get the room code for a socket
   * @param socketId - The socket ID to look up
   * @returns The room code, or undefined if not registered
   */
  getRoom(socketId: string): string | undefined {
    return this.socketToRoom.get(socketId);
  }

  /**
   * Check if a socket is registered to any room
   * @param socketId - The socket ID to check
   * @returns true if the socket is registered to a room
   */
  has(socketId: string): boolean {
    return this.socketToRoom.has(socketId);
  }

  /**
   * Get all socket IDs registered to a specific room
   * @param roomCode - The room code to look up
   * @returns Array of socket IDs in the room
   */
  getSocketsInRoom(roomCode: string): string[] {
    const sockets: string[] = [];
    for (const [socketId, code] of this.socketToRoom.entries()) {
      if (code === roomCode) {
        sockets.push(socketId);
      }
    }
    return sockets;
  }

  /**
   * Remove all sockets for a room
   * @param roomCode - The room code to clear
   * @returns Array of socket IDs that were removed
   */
  clearRoom(roomCode: string): string[] {
    const removedSockets: string[] = [];
    for (const [socketId, code] of this.socketToRoom.entries()) {
      if (code === roomCode) {
        removedSockets.push(socketId);
      }
    }
    for (const socketId of removedSockets) {
      this.socketToRoom.delete(socketId);
    }
    return removedSockets;
  }

  /**
   * Get the total number of registered sockets
   */
  get size(): number {
    return this.socketToRoom.size;
  }
}
