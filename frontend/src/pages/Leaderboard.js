import { useEffect, useState, useContext } from "react";
import { Link,useNavigate } from "react-router-dom";
import "../components/Leaderboard.css"; 
import config from "../config";
import { GameContext } from "../components/GameContext";

function Leaderboard() {
  // Access game context and navigation
  const { fetchGameStatus, gameCode, gameStatus, clearGameStatus } = useContext(GameContext);
  const navigate = useNavigate();
  
  // Extract players from the game status object
  const participantsObj = gameStatus?.participants || {};
  const players = Object.values(participantsObj).map((p) => ({
    name: p.nickname,
    score: p.scores,
  }));

  
  /**
   * Periodically fetch game status every second.
   * Helps ensure real-time leaderboard updates.
   */
  useEffect(() => {
    const interval = setInterval(() => {
      fetchGameStatus();
    }, 1000);

    return () => clearInterval(interval);
  }, [gameCode, fetchGameStatus]);

  // Sort players from highest to lowest score
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  // Compute score range for proportional sizing
  const minScore = Math.min(...sortedPlayers.map((p) => p.score));
  const maxScore = Math.max(...sortedPlayers.map((p) => p.score));

  /**
   * Dynamically calculates size of leaderboard boxes based on score.
   * Prevents division by zero if all scores are equal.
   */
  function getBoxDimension(score) {
    if (maxScore === minScore) {
      return 15;
    }
    const ratio = (score - minScore) / (maxScore - minScore);
    return 7 + ratio * 8;
  }

  return (
    <div className="leaderboard-container">
      <h1>Leaderboard</h1>
      <div className="leaderboard-grid">
        {sortedPlayers.map((player, index) => {
          const dim = getBoxDimension(player.score);
          return (
            <div key={index} className="leaderboard-box">
              <div
                className="leaderboard-inner-square"
                style={{
                  width:  `${dim}vw`,
                  height: `${dim*2}vh`,
                }}
              >
                {player.name}
                <br />
                {player.score} pts
              </div>
            </div>
          );
        })}
      </div>
      <div className="leaderboard-buttons">
        <button className="leaderboard-button" onClick={() => { clearGameStatus(); navigate("/home"); }}>Home</button>
      </div>
    </div>
  );
}

export default Leaderboard;
