import { Link, useNavigate } from "react-router-dom";
import "../components/Home.css";
import { useContext } from "react";
import { GameContext } from "../components/GameContext";
import Recovery from "../components/Recovery";

function Home() {
  const navigate = useNavigate();

  // Access GameContext for clearing state and reading current nickname
  const {clearGameStatus, nickname} = useContext(GameContext)


  /**
   * Triggered when user clicks "Create Game":
   * - Clears any existing game state (just in case)
   * - Navigates to /create page to start a new game
   */
  const handleCreateGame = () => {
    clearGameStatus();
    navigate("/create");
  };

  return (
    <div className="home-container">
      <Link to="/" className="home-back-link">Change Name</Link>
      <div className="home-half-side">
        <h1 className="home-welcome-text">Welcome {nickname}</h1>
        
        <div className="home-logo-circle">
          <span>Text Chat Game</span>
        </div>
        
        <div className="home-rules-circle">
          <span>Rules</span>
        </div>
      </div>
      <div className="home-half-side">
        <div className="home-button-rectangle" onClick={handleCreateGame} style={{ cursor: "pointer" }}>
          Create Game
        </div>

        <Link to="/join" style={{ textDecoration: "none" }}>
          <div className="home-button-rectangle">Join Game</div>
        </Link>
      </div>

    <Recovery />
    </div>
  );
}

export default Home;
