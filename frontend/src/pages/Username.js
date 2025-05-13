import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../components/Username.css";
import { GameContext } from "../components/GameContext";

function UsernamePage() {
  const [inputName, setInputName] = useState(""); // Local input state
  const navigate = useNavigate();
  const [popup1, setPopup1] = useState(false); // Popup for no Username

  const {setNickname} = useContext(GameContext);

  
  /**
   * Called when user clicks "Confirm"
   * - Validates input
   * - Saves nickname to localStorage and GameContext
   * - Navigates to /home
   */
  const handleSetUsername = () => {
    if (inputName.trim() !== "") {
      localStorage.setItem("nickname", inputName);
      setNickname(inputName);

      navigate("/home");
    } else {
      setPopup1(true) // Show error popup for empty name
    }
  };

  return (
    <div className="username-container">
      <h1 className="username-title-text">Welcome to Text-Chat-Game</h1>
      <p className="username-instruction-text">To begin, Choose a name to use in the game.</p>
      
      <input 
        type="text" 
        className="username-input-field" 
        value={inputName} 
        onChange={(e) => setInputName(e.target.value)} 
        placeholder="Enter nickname..."
      />
      
      <button className="username-submit-button" onClick={handleSetUsername}>Confirm</button>
      
      {popup1 && (
        <div className="username-popup-overlay">
          <div className="username-popup-box">
            <p>Please enter a valid nickname.</p>
            <button className="username-popup-button" onClick={() => setPopup1(false)}>OK</button>
          </div>
        </div>
      )}
      
    </div>
  );
}

export default UsernamePage;
