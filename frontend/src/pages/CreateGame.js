import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../components/CreateGame.css";
import { GameContext } from "../components/GameContext";
import LoadingPopup from "../components/LoadingPopup";

function CreateGame() {
  const navigate = useNavigate();

  // Track if enough players have joined to start the game
  const [validStart, setValidStart] = useState(false);

  // Toggle loading popup while server is preparing questions
  const [isLoading, setIsLoading] = useState(false);

  // Pull relevant game context
  const {
    fetchGameStatus,
    nickname,
    gameCode, setGameCode,
    currentPlayer,
    question,
    allPlayers,
    isLeader,
    serverState,
    assignedServer, setAssignedServer,
    assignedProxy
  } = useContext(GameContext);

  /**
   * Sends a POST request to proxy to create a new game.
   * Stores returned server address and game code in state and localStorage.
   */
  async function createGame() {
    try {
      const response = await fetch(`${assignedProxy}/game`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: nickname,
          id: "",
          proposed_answer: "",
          vote_for_id: "",
          scores: 0
        }),
      });

      if (!response.ok) throw new Error("Failed to create game");

      const data = await response.json();
      setAssignedServer(data.server);
      setGameCode(data.game_state.join_code);
      localStorage.setItem("gameCode", data.game_state.join_code); // Store game code
    } catch (error) {
      console.error("Error creating game:", error);
    }
  }

  /**
   * If no game code exists (i.e., player hasn't joined a game),
   * trigger game creation when the component mounts.
   */
  useEffect(() => {
    if (!gameCode) {
      createGame();
    }
  }, []);

  
  
  /**
   * Enable "Start Game" button only if the correct number of players are present.
   */
  useEffect(() => {
    if ([4, 6, 8].includes(allPlayers.length)) {
      setValidStart(true);
    }
    else{
      setValidStart(false);
    }   
  }, [allPlayers])


  /**
   * Respond to server state: show loading icon and disable the "start game"
   * button if server is in question selecting; move on to question answering
   * page if server is in answering state.
   */
  useEffect(() => {
    if (serverState === 'question_selecting') {
      setIsLoading(true);
    } else if (serverState === 'answering') {
      // don't navigate to the question answering page until we've actually figured out which question is for this player
      if (question) {
        setIsLoading(false);
        navigate('/question');
      }
    } else {
      setIsLoading(false);
    }
  }, [serverState, question, navigate])


  /**
   * Poll server for game updates every second.
   */
  useEffect(() => {
    const interval = setInterval(() => {
      fetchGameStatus();
    }, 1000);

    return () => clearInterval(interval);
  }, [gameCode, fetchGameStatus]);


  /**
   * Sends PUT request to game server to begin the question selection process.
   * Only callable by the leader.
   */
  async function request_questions() {
    if (!isLeader) return; // ignore this if asker is not the leader. this shouldnt happen anyways
    try {
      const response = await fetch(`${assignedServer}/games?join_code=${gameCode}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentPlayer),
      });
      if (!response.ok) throw new Error(response);
      // response ok => update game status right away to get the questions
      fetchGameStatus();
    } catch (error) {
      console.error("Error getting questions:", error);
    }
  }


  return (
    <div className="create-container">
      <Link to="/home" className="create-back-link">Back</Link>
      <div className="create-left-section">
        <div className="create-title">Ask others to join using the code below</div>
        <div className="create-code-box">
          <div>{gameCode}</div>
        </div>
        {isLeader && (
          <div>
            <div
              onClick={request_questions}
              className={`create-start-button ${!validStart || isLoading ? "create-disabled-link" : ""}`}
            >
              Start Game
            </div>
            {!validStart && (
              <div className="create-valid-start">Game can only start with 4, 6, or 8 players.</div>
            )}
          </div>
        )}
      </div>
      <div className="create-right-section">
        <h2>Player List</h2>
        <ul className="create-player-list">
          {allPlayers.map((player, index) => (
            <li key={index} className="create-player-item">
              {player.name}
              </li>
          ))}
        </ul>
      </div>
      {isLoading && (
        <LoadingPopup msg="Getting everyone's questions ready..." />
      )}
    </div>
  );
}

export default CreateGame;
