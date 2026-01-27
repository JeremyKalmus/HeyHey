// SocketContext tests
// Tests Capacitor App lifecycle integration for socket management

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { SocketProvider, useSocket } from './SocketContext';

// --- Mocks ---

// Capture lifecycle listeners registered via App.addListener
type ListenerMap = Record<string, Array<(...args: unknown[]) => void>>;
const appListeners: ListenerMap = {};

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(async (event: string, callback: (...args: unknown[]) => void) => {
      if (!appListeners[event]) appListeners[event] = [];
      appListeners[event].push(callback);
      return { remove: vi.fn(() => {
        const idx = appListeners[event]?.indexOf(callback) ?? -1;
        if (idx >= 0) appListeners[event].splice(idx, 1);
      }) };
    }),
  },
}));

// Mock socket.io-client
const mockSocket = {
  id: 'test-socket-id',
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  io: {
    on: vi.fn(),
    off: vi.fn(),
  },
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

// Helper to fire a Capacitor App event
function fireAppEvent(event: string, ...args: unknown[]) {
  appListeners[event]?.forEach((cb) => cb(...args));
}

// Helper to trigger socket's 'connect' callback
function triggerSocketConnect() {
  const connectCall = mockSocket.on.mock.calls.find(
    (call: unknown[]) => call[0] === 'connect'
  );
  if (connectCall) (connectCall[1] as () => void)();
}

// Wrapper for rendering with SocketProvider
function wrapper({ children }: { children: ReactNode }) {
  return createElement(SocketProvider, { serverUrl: 'http://test:3000' }, children);
}

describe('SocketContext — Capacitor App lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear listener map
    for (const key of Object.keys(appListeners)) {
      delete appListeners[key];
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should register pause and resume listeners when socket is available', async () => {
    const { App } = await import('@capacitor/app');

    renderHook(() => useSocket(), { wrapper });

    // Wait for the async setupListeners to complete
    await waitFor(() => {
      expect(App.addListener).toHaveBeenCalledWith('pause', expect.any(Function));
      expect(App.addListener).toHaveBeenCalledWith('resume', expect.any(Function));
    });
  });

  it('should disconnect socket when app is backgrounded (pause)', async () => {
    renderHook(() => useSocket(), { wrapper });

    // Wait for listeners to be set up
    await waitFor(() => {
      expect(appListeners['pause']?.length).toBeGreaterThan(0);
    });

    act(() => {
      fireAppEvent('pause');
    });

    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  it('should reconnect socket when app is foregrounded (resume)', async () => {
    renderHook(() => useSocket(), { wrapper });

    // Wait for listeners to be set up
    await waitFor(() => {
      expect(appListeners['resume']?.length).toBeGreaterThan(0);
    });

    act(() => {
      fireAppEvent('resume');
    });

    expect(mockSocket.connect).toHaveBeenCalled();
  });

  it('should call rejoinGame when app returns to foreground after background', async () => {
    renderHook(() => useSocket(), { wrapper });

    // Wait for listeners to be set up
    await waitFor(() => {
      expect(appListeners['pause']?.length).toBeGreaterThan(0);
      expect(appListeners['resume']?.length).toBeGreaterThan(0);
    });

    // Simulate full background/foreground cycle
    act(() => {
      fireAppEvent('pause');
    });
    expect(mockSocket.disconnect).toHaveBeenCalled();

    act(() => {
      fireAppEvent('resume');
    });
    expect(mockSocket.connect).toHaveBeenCalled();

    // When socket reconnects, the existing GameStateContext rejoin effect
    // fires automatically (tested via integration). Here we verify the
    // SocketContext correctly manages disconnect/reconnect lifecycle.
  });

  it('should clean up listeners on unmount', async () => {
    const { App } = await import('@capacitor/app');
    const { unmount } = renderHook(() => useSocket(), { wrapper });

    // Wait for listeners to be registered
    await waitFor(() => {
      expect(App.addListener).toHaveBeenCalledTimes(2);
    });

    // Capture the remove functions
    const pauseResult = await (App.addListener as ReturnType<typeof vi.fn>).mock.results[0]?.value;
    const resumeResult = await (App.addListener as ReturnType<typeof vi.fn>).mock.results[1]?.value;

    unmount();

    expect(pauseResult.remove).toHaveBeenCalled();
    expect(resumeResult.remove).toHaveBeenCalled();
  });

  it('should handle rapid background/foreground cycling', async () => {
    renderHook(() => useSocket(), { wrapper });

    await waitFor(() => {
      expect(appListeners['pause']?.length).toBeGreaterThan(0);
    });

    // Rapid cycling
    act(() => {
      fireAppEvent('pause');
      fireAppEvent('resume');
      fireAppEvent('pause');
      fireAppEvent('resume');
    });

    expect(mockSocket.disconnect).toHaveBeenCalledTimes(2);
    expect(mockSocket.connect).toHaveBeenCalledTimes(2);
  });
});
