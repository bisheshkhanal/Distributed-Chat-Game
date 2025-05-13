import { useContext, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../components/JoinGame.css";
import config from "../config";
import { GameContext } from "../components/GameContext";
import Recovery from "../components/Recovery";

function JoinGame() {
  const navigate = useNavigate();
  // Track user input for game code
  const [input, setInput] = useState("");

  // Pull necessary values from context
  const {nickname, setGameCode, assignedServer,setAssignedServer, assignedProxy} = useContext(GameContext);
  const [popup1, setPopup1] = useState(false); // Popup for no game code
  const [popup2, setPopup2] = useState(false); // Popup for failed game join
  const [popup3, setPopup3] = useState(false); // No proxy/server found for game


  /**
   * Handles joining a game with the code entered by the user.
   * 1. Verifies code isn't blank
   * 2. Asks the proxy where the game server is
   * 3. Asks the server to add this player
   * 4. Navigates to the game page
   */
  const handleJoinGame = async () => {
    if (input.trim() === "") {
      setPopup1(true); // Show "please enter code" popup
      return;
    }
  
    try {
      // Store code in state and localStorage
      setGameCode(input);
      localStorage.setItem("gameCode", input);
  
      // First: Ask proxy where the server is
      let data1;
      try {
        const response1 = await fetch(`${assignedProxy}/game?join_code=${input}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" }
        });
  
        if (!response1.ok) throw new Error(`Bad response from proxy: ${response1.status}`);
        data1 = await response1.json();
        console.log("Proxy found server:", data1);
        setAssignedServer(data1); // Save the actual server address
      } catch (err) {
        console.error("Proxy check failed:", err);
        setPopup3(true); // Show "Did not find server" message
        return;
      }

      // Second: Ask the server to add this player to the game
      const response2 = await fetch(`${data1}/games?join_code=${input}`, { 
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: nickname,
          proposed_answer: "", 
        }),
      });
  
      if (!response2.ok) {
        throw new Error("Failed to join game");
      }

      const data2 = await response2.json();
      console.log("Joined game:", data2);
      // Success! Go to /create (lobby)
      navigate("/create");
    } catch (error) {
      console.error("Error joining game:", error);
      setPopup2(true);
    }
  };

  return (
    <div className="join-container">
      <Link to="/home" className="join-back-link">Back</Link>
      <h1 className="join-title">Enter Game Code</h1>
      <p className="join-instruction">Ask the game host for the code and enter it below.</p>
      
      <input 
        type="text" 
        className="join-code-input" 
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Enter code..."
      />
      
      <button className="join-button" onClick={handleJoinGame}>Join Game</button>

      {(popup1 || popup2 || popup3) && (
        <div className="join-popup-overlay">
          <div className="join-popup-box">
            <p>
              {popup1
                ? "Please enter a valid game code."
                : popup3
                ? "Did not find a server running this game."
                : "Could not join game. Please try again."}
            </p>
            <button className="join-popup-button" onClick={() => { setPopup1(false); setPopup2(false); setPopup3(false); }}>OK</button>
          </div>
        </div>
      )}
    
    <Recovery />

    </div>
  );
}

export default JoinGame;
