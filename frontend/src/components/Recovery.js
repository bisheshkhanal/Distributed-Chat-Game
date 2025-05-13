import React, { useContext, useEffect, useState } from "react";
import { GameContext } from "../components/GameContext";
import { useNavigate } from "react-router-dom";
import "../components/Recovery.css";

const Recovery = () => {
  // Access functions from the GameContext to fetch game state or clear it
  const { fetchGameStatus, clearGameStatus } = useContext(GameContext);

  const navigate = useNavigate();
  
  // Controls whether the recovery popup is shown
  const [showPopup, setShowPopup] = useState(false);

  // Check if a game code is stored in localStorage (i.e., crashed game)
  const storedGameCode = localStorage.getItem("gameCode");

  // On component mount, determine if recovery popup should be shown
  useEffect(() => {
    if (storedGameCode) {
      setShowPopup(true);
    }
  }, []);


  /**
   * User chooses to reconnect:
   * - Re-fetch game state from server
   * - Hide the popup
   * - Navigate to /create at which point you will be sent to the correct page
   */

  const handleReconnect = () => {
    fetchGameStatus();
    setShowPopup(false);
    navigate("/create");
  };

  /**
   * User declines recovery:
   * - Clear stored game state
   * - Hide the popup
   */
  const handleDecline = () => {
    clearGameStatus(); 
    setShowPopup(false);
  };

  // If no game to recover, don't render anything
  if (!showPopup) return null;
  else
  return (
    <div className="recovery-overlay">
      <div className="recovery-box">
        <p>Game context found in local files. Would you like to reconnect to that game?</p>
        <div className="recovery-buttons">
          <button className="recovery-button" onClick={handleReconnect}>Yes</button>
          <button className="recovery-button" onClick={handleDecline}>No</button>
        </div>
      </div>
    </div>
  );
};

export default Recovery;
