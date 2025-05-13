import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
 import "../components/QuestionAnswer.css";
import { GameContext } from "../components/GameContext";
import LoadingPopup from "../components/LoadingPopup";
import config from "../config";
import TimerBar from "../components/TimerBar";

function QuestionsPage() {
  const [response, setResponse] = useState("");  // Player's typed response
  const navigate = useNavigate();
  const [popup1, setPopup1] = useState(false); // Popup for no response
  const [isLoading, setIsLoading] = useState(false); // popup for post-submission
  const [loadMsg, setLoadMsg] = useState('');
  const [percentTimeLeft, setPercentTimeLeft] = useState(100); // Timer bar percent

  // Pull necessary values from context
  const { 
    fetchGameStatus, gameCode, sendAnswer, currentPlayer, setCurrentPlayer, question, allAnswered, serverCrash, serverState, isLeader,
    timerRemaining, timerDuration, pendingResponse, assignedServer
  } = useContext(GameContext);

  const [iterations, setIterations] = useState(0);


  /**
   * Update timer bar based on timerRemaining and timerDuration
   */
  useEffect(() => {
    // get percentage of time left
    if (timerDuration === 0) {
      setPercentTimeLeft(0);
    } else{
      setPercentTimeLeft((timerRemaining / timerDuration) * 100);
    }
  }, [timerRemaining, timerDuration, setPercentTimeLeft]);


  /**
   * Poll the game state every second to stay updated
   */
  useEffect(() => {
    const interval = setInterval(() => {
      
      console.log("========= About to fetch Game State " + iterations +" =========" )
      setIterations(iterations + 1);
      fetchGameStatus();
      console.log("Has the Server Crashed? " + serverCrash)
    }, 1000);

    return () => clearInterval(interval);
  }, [gameCode, fetchGameStatus]);

  /**
   * If the current player is the leader, reset scores at end of round
   */
  async function reset_scores() {
    if (!isLeader) return;
    try {
      const response = await fetch(`${assignedServer}/games?join_code=${gameCode}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentPlayer),
      });
      if (!response.ok) throw new Error(response);
      // response ok => update game status right away to get the questions to vote on
      fetchGameStatus();
    } catch (error) {
      console.error("Error resetting score:", error);
    }
  }


  /**
   * When all players have answered, navigate to voting after a short delay
   */
  useEffect(() => {
    if (allAnswered || (serverState && serverState == "display_response")) {
      setTimeout(() => {
        reset_scores()
      }, 1000); // 1 second delay leave display_response
      setTimeout(() => {
        setIsLoading(false);
        setLoadMsg('');
        navigate("/voting");
      }, 1000); // 1 second delay

    }
  }, [allAnswered, serverState, navigate])


  /**
   * Watch for a change in currentPlayer.proposed_answer and trigger answer submission
   */
  useEffect(() => {
    if (currentPlayer.proposed_answer) {
      try {
        sendAnswer();
        // on successfull submit, change loading message
        setLoadMsg('Submitted! Waiting for other players...')
      } catch (error) {
        console.error('Error submitting question:', error)
        setIsLoading(false); // hide popup. allow use to try again. (add error popup later?)
      }
    } else {
      // don't send empty answer
      setIsLoading(false); // hide popup if it was up
    }
  }, [currentPlayer.proposed_answer])

  /**
   * Called when the user clicks Submit button
   */
  const handleSubmit = () => {
    if (response.trim() !== "") {
      const trimmed = response.trim();
      pendingResponse.current = trimmed;
      // update currentPlayer object. useEffect will then send that object to server.
      setCurrentPlayer({
        ...currentPlayer, // keep all fields other than proposed_answer the same
        proposed_answer: response.trim()
      })
      setLoadMsg('Submitting...')
      setIsLoading(true);
    } else {
      setPopup1(true)
    }
  };

  return (
    <div className="question-container">
      <TimerBar percent={percentTimeLeft} />
      <div className="question-box">{question}</div>
      <input 
        type="text" 
        className="question-response-box" 
        value={response} 
        onChange={(e) => setResponse(e.target.value)} 
        placeholder="Type your response..."
      />
      <button className="question-submit-button" onClick={handleSubmit}>Submit</button>

      {popup1 && (
        <div className="question-popup-overlay">
          <div className="question-popup-box">
            <p>Please enter a response before submitting.</p>
            <button className="question-popup-button" onClick={() => setPopup1(false)}>OK</button>
          </div>
        </div>
      )}
      {isLoading && <LoadingPopup msg={loadMsg} colour='red' />}
      {serverCrash && <LoadingPopup msg="Looks like the server crashed attempting to reconnect..." colour='red' />}
    </div>
  );
}

export default QuestionsPage;