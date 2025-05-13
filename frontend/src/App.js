import { Routes, Route } from "react-router-dom";
import UsernamePage from "./pages/Username";
import Home from "./pages/Home";
import CreateGame from "./pages/CreateGame";
import JoinGame from "./pages/JoinGame";
import Leaderboard from "./pages/Leaderboard";
import QuestionAnswer from "./pages/QuestionAnswer";
import Voting from "./pages/Voting";
import { GameStateProvider } from "./components/GameContext";
import ProxyHeartbeatChecker from "./components/ProxyHeartbeat";

function App() {
  return (
    <GameStateProvider>
      <ProxyHeartbeatChecker />
      <Routes>
        <Route path="/" element={<UsernamePage />} />
        <Route path="/home" element={<Home />} />
        <Route path="/create" element={<CreateGame />} />
        <Route path="/join" element={<JoinGame />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/question" element={<QuestionAnswer />} />
        <Route path="/voting" element={<Voting />} />
      </Routes>
    </GameStateProvider>
  );
}

export default App;
