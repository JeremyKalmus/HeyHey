// ConnectionStatus - Shows connection state and reconnection status

import { useGameState } from '../../context/GameStateContext';
import { useSocket } from '../../context/SocketContext';

export function ConnectionStatus() {
  const { isConnected, connectionError } = useSocket();
  const { isReconnecting, disconnectedPlayers, room } = useGameState();

  // Don't show anything if everything is normal
  if (isConnected && !isReconnecting && disconnectedPlayers.length === 0 && !connectionError) {
    return null;
  }

  // Get player names for disconnected players
  const disconnectedNames = disconnectedPlayers
    .map(playerId => room?.players.find(p => p.id === playerId)?.name ?? playerId)
    .filter(Boolean);

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 flex flex-col gap-2">
      {/* Connection lost */}
      {!isConnected && (
        <div className="bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
          <span className="w-2 h-2 bg-white rounded-full" />
          <span>Connection lost - Reconnecting...</span>
        </div>
      )}

      {/* Reconnecting to game */}
      {isConnected && isReconnecting && (
        <div className="bg-yellow-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <span className="w-2 h-2 bg-white rounded-full animate-ping" />
          <span>Rejoining game...</span>
        </div>
      )}

      {/* Connection error */}
      {connectionError && (
        <div className="bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg">
          <span>{connectionError}</span>
        </div>
      )}

      {/* Disconnected players */}
      {disconnectedNames.length > 0 && (
        <div className="bg-orange-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span>
            {disconnectedNames.length === 1
              ? `${disconnectedNames[0]} disconnected`
              : `${disconnectedNames.length} players disconnected`}
          </span>
        </div>
      )}
    </div>
  );
}

export default ConnectionStatus;
