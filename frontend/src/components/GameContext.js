import { createContext, useState, useRef} from 'react';
import { useNavigate, useLocation } from "react-router-dom";
import config from "../config";

/**
 * Create a game context to make game state and gamestate fetching function
 * accessible across all pages.
 */

export const GameContext = createContext();

// define provider and the state it provides
export const GameStateProvider = ({children}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Tracks if each proxy is online
  const [proxyStatuses, setProxyStatuses] = useState({
    proxy1: true,
    proxy2: true
  });
  
  // The current proxy assigned to this client
  const [assignedProxy, setAssignedProxy] = useState(config.API_PROXY1_URL)

  // The game server this client is currently communicating with
  const [assignedServer, setAssignedServer] = useState(null)

  // info about this player
  const [nickname, setNickname] = useState(localStorage.getItem("nickname") || "");
  const [isLeader, setIsLeader] = useState(localStorage.getItem("isLeader") === "true"); 
  const [currentPlayer, setCurrentPlayer] = useState(localStorage.getItem("currentPlayer") || "");
  const [question, setQuestion] = useState('');   // question for this player to answer
  // general game info
  const [gameCode, setGameCode] = useState(localStorage.getItem("gameCode") || ""); // Check if gameCode is stored
  const [allPlayers, setAllPlayers] = useState([]);
  const [allAnswered, setAllAnswered] = useState(false);
  const [gameStatus, setGameStatus] = useState(localStorage.getItem("Game Status") || "");
  const [serverState, setServerState] = useState(''); // the state (e.g., 'joining', )
  // state timer
  const [timerDuration, setTimerDuration] = useState(0);
  const [timerRemaining, setTimerRemaining] = useState(0);

  // Stores the response we are trying to send
  const pendingResponse = useRef(null)
  const pendingVote = useRef(null);

  // Redirect to username if no nickname is found
  const checkNickname = () => {
    const storedNickname = localStorage.getItem("nickname");
    if (!storedNickname) {
      navigate("/");
    } else if (storedNickname !== nickname) {
      setNickname(storedNickname);
    }
  };

  
  /**
   * Enforces that the user is on the right page based on current game state.
   */
  const checkCorrectPage = (current_state) => {
    if(location.pathname == "/" || location.pathname == "/home" || location.pathname == "/join")
      return
    const currentPath = location.pathname;
    if (current_state === "joining" && currentPath !== "/create") {
      navigate("/create");
    }
    else if (current_state === "question_selecting" && currentPath !== "/create") {
      navigate("/create");
    }
    else if (current_state === "answering" && currentPath !== "/question") {
      navigate("/question");
    }
    else if (current_state === "display_response" && currentPath !== "/voting") {
      navigate("/voting");
    }
    else if (current_state === "voting" && currentPath !== "/voting") {
      navigate("/voting");
    }
    else if (current_state === "intermediate_results" && currentPath !== "/voting") {
      navigate("/voting");
    }
    else if (current_state === "result" && currentPath !== "/leaderboard") {
      navigate("/leaderboard");
    }
      
  }

  /**
   * Triggers game recovery via the proxy using local snapshot and player info.
   */
  async function recoverGame() {
    try {
      if (!gameStatus || !currentPlayer) {
        console.error("Missing snapshot or player data for recovery.");
        return;
      }
      let data;
      const response = await fetch(`${assignedProxy}/game`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "game": gameStatus, "player" : currentPlayer }),
      });
  
      if (!response.ok) {
        throw new Error(`Recovery failed: ${response}`);
      }
      
      data = await response.json();
      setAssignedServer(data)
      console.log("recovery Response:", data)
    } catch (err) {
      console.error("Recovery error:", err);
    }
  }
  
  /**
   * Updates currentPlayer player object to include the given answer and
   * sends the update object to the server (submits this player's answer)
   * 
   * Throws error on bad server response.
   */
  async function sendAnswer() {
    // we don't update the player status locally. we let the server update it and then
    // save it locally once the change is reflected in the server, to prevent desynch with server
    try {
      const response = await fetch(`${assignedServer}/games?join_code=${gameCode}`, {
        signal: AbortSignal.timeout(2000),
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentPlayer),
      });
      if (!response.ok) throw new Error(response);
      // response ok => update game status right away so if we were last answerer we transition to voting
    } catch (err) {
      console.error("Error sending answer or vote:", err.message || err);
    }
  }


  /**
   * Fetches the current game state from the assigned server and updates all
   * related states. Handles resending lost answers/votes and page redirection.
   */
  async function fetchGameStatus() {
    try {
      checkNickname();
      if (!gameCode) return; // Don't fetch if gameCode is missing
      if(!assignedServer) throw new Error(`No server`);
      
      // Debug info (identifies which server/proxy is being used)
      if(assignedServer){
        console.log(assignedServer)
        if(assignedServer == "http://25.27.131.197:8080")
          console.log("Running on Ruben's Server")
        else if (assignedServer == "http://25.36.152.12:8080")
          console.log("Running on Charles's Server")
        else if (assignedServer == "http://25.27.136.6:8080")
          console.log("Running on Bishesh's Server")
      }
      
      if(assignedProxy){
        console.log(assignedProxy)
        if(assignedProxy == "http://25.22.177.20:8083")
          console.log("Running on Adesh's Proxy")
        else if (assignedProxy == "http://25.27.126.130:8083")
          console.log("Running on Vitaliy's Proxy")
      }


      const response = await fetch(`${assignedServer}/games?join_code=${gameCode}`, {
        signal: AbortSignal.timeout(5000),
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
  
      if (!response.ok) throw new Error(`Bad response from server: ${response}`);
      const data = await response.json();
      // console.log("Game Status:", data);
      setGameStatus(data)
      localStorage.setItem("Game Status", JSON.stringify(data));
  
      if (data.participants) {
        let all_answered = true;
        const updatedPlayers = Object.values(data.participants).map(player => {
          const isCurrentPlayer = player.nickname === nickname;
          
          if (isCurrentPlayer) {
            setCurrentPlayer(player); // Set current player if matching nickname
            localStorage.setItem('currentPlayer', JSON.stringify(player));


            if (pendingResponse.current && player.proposed_answer !== pendingResponse.current) {
              // re-send the answer because it didn’t get saved
              setCurrentPlayer({
                ...currentPlayer,
                proposed_answer: pendingResponse.current
              })
              sendAnswer();
            }

          
            if (
              pendingVote.current &&
              (!data.current_votes || data.current_votes[currentPlayer.id] !== pendingVote.current)
            ) {
              console.log("Game fetch lost vote:", pendingVote.current);
              setCurrentPlayer({
                ...player,
                vote_for_id: pendingVote.current
              });
              sendAnswer();
            }


            if(player.id === data.leaderID){
              setIsLeader(true)
              localStorage.setItem("isLeader", true);
            }
            else{
              setIsLeader(false)
              localStorage.setItem("isLeader", false);
            }
          }
          // track whether everyone answered or not
          let player_answered = player.proposed_answer !== ''
          if (!player_answered) {
            all_answered = false;
          }
          return {
            name: player.nickname,
            answered: player_answered
          };
        });

        setAllPlayers(updatedPlayers);
        setAllAnswered(all_answered);
      }

      if (data.current_state) {
        setServerState(data.current_state);
        checkCorrectPage(data.current_state);
        // perform state-specific actions
        if (serverState === 'answering') {
          if (data.current_questions) {
            // find the question that's been assigned to the current player
            for (const q of data.current_questions) {
              if (nickname === q.player1.nickname || nickname === q.player2.nickname) {
                setQuestion(q.text);
              }
            }
          } else {
            setQuestion(null);
          }
        }
      }
      // =| server's master timer |=============================================
      if (data.timer_remaining_time && data.timer_duration) {
        // round to int number of seconds and ensure not negative
        setTimerRemaining(Math.max(0, Math.round(data.timer_remaining_time)));
        setTimerDuration(data.timer_duration);
      } else {
        // if one or the other isn't set, neither make sense
        setTimerDuration(0);
        setTimerRemaining(0);
      }

    } catch (error) {
        console.error(`Error fetching game status: `, error);
        console.log("Fetch failed. Attempting recovery.");
        recoverGame();
    }
  }


  /**
   * Removes all game info except nickname when player exits the create/join pages.
   * Both from the context and from local storage.
   */
  function clearGameStatus() {
    setGameCode("");
    localStorage.removeItem("gameCode");
    setCurrentPlayer(null);
    localStorage.removeItem("currentPlayer");
    setAllPlayers([]);
    setAllAnswered(false);
    setIsLeader(false);
    localStorage.removeItem('isLeader')
    localStorage.removeItem("Game Status");
    pendingResponse.current = null;
    pendingVote.current = null;
  }


  return (
    <GameContext.Provider value={{
      fetchGameStatus, clearGameStatus, sendAnswer,
      nickname, setNickname,
      gameCode, setGameCode,
      currentPlayer, setCurrentPlayer,
      question, setQuestion,
      allPlayers, setAllPlayers,
      allAnswered, setAllAnswered,
      isLeader, setIsLeader,
      gameStatus, setGameStatus,
      serverState, setServerState,
      // timer stuff
      timerRemaining, setTimerRemaining, // frontend updates this every sec & synchs with backend
      timerDuration, // frontend shouldn't be setting the duration
      pendingResponse, pendingVote,
      proxyStatuses, setProxyStatuses,
      assignedServer, setAssignedServer,
      assignedProxy, setAssignedProxy
    }}
    >
      {children}
    </GameContext.Provider>
  )
}