// App - Main application with routing and context providers
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import { GameStateProvider } from './context/GameStateContext';
import { HomePageConnected } from './pages/HomePageConnected';
import { RoomLobbyConnected } from './pages/RoomLobbyConnected';
import { GameScreenConnected } from './pages/GameScreenConnected';
import { ConnectionStatus } from './components/ui/ConnectionStatus';

function App() {
  return (
    <SocketProvider>
      <GameStateProvider>
        <ConnectionStatus />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePageConnected />} />
            <Route path="/room/:code" element={<RoomLobbyConnected />} />
            <Route path="/game/:gameId" element={<GameScreenConnected />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </GameStateProvider>
    </SocketProvider>
  );
}

export default App;
