import { describe, it, expect, beforeEach } from 'vitest';
import { SocketRegistry } from './SocketRegistry.js';

describe('SocketRegistry', () => {
  let registry: SocketRegistry;

  beforeEach(() => {
    registry = new SocketRegistry();
  });

  describe('join', () => {
    it('registers a socket to a room', () => {
      registry.join('socket-1', 'ROOM01');

      expect(registry.getRoom('socket-1')).toBe('ROOM01');
    });

    it('overwrites previous room mapping', () => {
      registry.join('socket-1', 'ROOM01');
      registry.join('socket-1', 'ROOM02');

      expect(registry.getRoom('socket-1')).toBe('ROOM02');
    });

    it('allows multiple sockets in the same room', () => {
      registry.join('socket-1', 'ROOM01');
      registry.join('socket-2', 'ROOM01');

      expect(registry.getRoom('socket-1')).toBe('ROOM01');
      expect(registry.getRoom('socket-2')).toBe('ROOM01');
    });
  });

  describe('leave', () => {
    it('unregisters a socket and returns its room', () => {
      registry.join('socket-1', 'ROOM01');

      const roomCode = registry.leave('socket-1');

      expect(roomCode).toBe('ROOM01');
      expect(registry.getRoom('socket-1')).toBeUndefined();
    });

    it('returns undefined for unregistered socket', () => {
      const roomCode = registry.leave('socket-1');

      expect(roomCode).toBeUndefined();
    });
  });

  describe('getRoom', () => {
    it('returns room code for registered socket', () => {
      registry.join('socket-1', 'ROOM01');

      expect(registry.getRoom('socket-1')).toBe('ROOM01');
    });

    it('returns undefined for unregistered socket', () => {
      expect(registry.getRoom('socket-1')).toBeUndefined();
    });
  });

  describe('has', () => {
    it('returns true for registered socket', () => {
      registry.join('socket-1', 'ROOM01');

      expect(registry.has('socket-1')).toBe(true);
    });

    it('returns false for unregistered socket', () => {
      expect(registry.has('socket-1')).toBe(false);
    });

    it('returns false after socket leaves', () => {
      registry.join('socket-1', 'ROOM01');
      registry.leave('socket-1');

      expect(registry.has('socket-1')).toBe(false);
    });
  });

  describe('getSocketsInRoom', () => {
    it('returns all sockets in a room', () => {
      registry.join('socket-1', 'ROOM01');
      registry.join('socket-2', 'ROOM01');
      registry.join('socket-3', 'ROOM02');

      const sockets = registry.getSocketsInRoom('ROOM01');

      expect(sockets).toHaveLength(2);
      expect(sockets).toContain('socket-1');
      expect(sockets).toContain('socket-2');
    });

    it('returns empty array for room with no sockets', () => {
      const sockets = registry.getSocketsInRoom('ROOM01');

      expect(sockets).toEqual([]);
    });

    it('excludes sockets that have left', () => {
      registry.join('socket-1', 'ROOM01');
      registry.join('socket-2', 'ROOM01');
      registry.leave('socket-1');

      const sockets = registry.getSocketsInRoom('ROOM01');

      expect(sockets).toHaveLength(1);
      expect(sockets).toContain('socket-2');
    });
  });

  describe('clearRoom', () => {
    it('removes all sockets from a room', () => {
      registry.join('socket-1', 'ROOM01');
      registry.join('socket-2', 'ROOM01');
      registry.join('socket-3', 'ROOM02');

      const removed = registry.clearRoom('ROOM01');

      expect(removed).toHaveLength(2);
      expect(removed).toContain('socket-1');
      expect(removed).toContain('socket-2');
      expect(registry.getRoom('socket-1')).toBeUndefined();
      expect(registry.getRoom('socket-2')).toBeUndefined();
      expect(registry.getRoom('socket-3')).toBe('ROOM02');
    });

    it('returns empty array for room with no sockets', () => {
      const removed = registry.clearRoom('ROOM01');

      expect(removed).toEqual([]);
    });
  });

  describe('size', () => {
    it('returns 0 for empty registry', () => {
      expect(registry.size).toBe(0);
    });

    it('returns count of registered sockets', () => {
      registry.join('socket-1', 'ROOM01');
      registry.join('socket-2', 'ROOM01');

      expect(registry.size).toBe(2);
    });

    it('decrements when socket leaves', () => {
      registry.join('socket-1', 'ROOM01');
      registry.join('socket-2', 'ROOM01');
      registry.leave('socket-1');

      expect(registry.size).toBe(1);
    });
  });
});
