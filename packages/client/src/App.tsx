import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import { GameStateProvider } from './context/GameStateContext';
import { HomePageConnected } from './pages/HomePageConnected';
import { RoomLobbyConnected } from './pages/RoomLobbyConnected';
import { GameScreenConnected } from './pages/GameScreenConnected';

function App() {
  return (
    <SocketProvider>
      <GameStateProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePageConnected />} />
            <Route path="/room/:code" element={<RoomLobbyConnected />} />
            <Route path="/game/:gameId" element={<GameScreenConnected />} />
          </Routes>
        </BrowserRouter>
      </GameStateProvider>
    </SocketProvider>
  );
}

export default App;
