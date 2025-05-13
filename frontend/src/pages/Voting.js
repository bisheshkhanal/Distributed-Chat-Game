import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../components/Voting.css";
import { GameContext } from "../components/GameContext";
import config from "../config";
import { useNavigate } from "react-router-dom";
import TimerBar from "../components/TimerBar";

function VotingPage() {
  
  const navigate = useNavigate();

  // Pull necessary values from context
  const {
    fetchGameStatus,
    sendAnswer,
    gameStatus,
    setCurrentPlayer,
    currentPlayer,
    serverState,
    gameCode,
    timerRemaining, timerDuration,
    pendingVote
  } = useContext(GameContext);

  // user interface
  const [percentTimeLeft, setPercentTimeLeft] = useState(100);
  const [results, setResults] = useState(false);
  const [userVote, setUserVote] = useState(null);

  // Get current question index & data
  const currentIndex = gameStatus?.current_voting_index ?? 0;
  const currentQ = gameStatus?.current_questions?.[currentIndex];
  const isSelfVoter = currentPlayer.id === currentQ?.player1?.id || currentPlayer.id === currentQ?.player2?.id;


  // IDs and nicknames of the two players involved in the current question
  const player1Id = currentQ?.player1?.id;
  const player2Id = currentQ?.player2?.id;
  const author1 = gameStatus?.participants?.[player1Id]?.nickname || "Player 1";
  const author2 = gameStatus?.participants?.[player2Id]?.nickname || "Player 2";

  // Compute votes for each player
  const voteData = gameStatus?.current_votes || {};

  const player1Votes = Object.entries(voteData)
    .filter(([voterId, votedForId]) => votedForId === player1Id)
    .map(([voterId]) => gameStatus.participants?.[voterId]?.nickname || "Anon");

  const player2Votes = Object.entries(voteData)
    .filter(([voterId, votedForId]) => votedForId === player2Id)
    .map(([voterId]) => gameStatus.participants?.[voterId]?.nickname || "Anon");

  const [showFinalVotes, setShowFinalVotes] = useState(false);

  
  // Question text and player answers
  const currentQuestion = currentQ?.text || "Loading question...";
  const currentResponses = [
    currentQ?.player1?.proposed_answer || "(Did not answer...)",
    currentQ?.player2?.proposed_answer || "(Did not answer...)"
  ];

  /**
   * Submit vote when currentPlayer.vote_for_id is set
   */
  useEffect(() => {
    if (currentPlayer.vote_for_id && userVote !== null) {
      sendAnswer().catch((error) =>
        console.error("Error submitting vote:", error)
      );
    }
  }, [currentPlayer.vote_for_id]);
    

  /**
   * Update timer bar
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
   * Poll the game status every second
   */
  useEffect(() => {
    const interval = setInterval(() => {
      fetchGameStatus();
    }, 1000);

    return () => clearInterval(interval);
  }, [gameCode, fetchGameStatus]);



  /**
   * Handle transitions between voting states
   */
  useEffect(() => {
    let timeoutID;

    if (serverState === "intermediate_results") {
      setResults(true);
      setShowFinalVotes(true);
      pendingVote.current = null;  // clear any stale vote
    }
    if (serverState === "result") {
      
      navigate("/leaderboard");  // Final results
    }
    if (serverState === "voting") {
      // New round of voting
      setUserVote(null);
      setResults(false);
      setShowFinalVotes(false);
    }
    if (serverState == 'display_response'){
      // If we somehow land here, just navigate back after a short delay
      timeoutID = setTimeout(() => {
        console.warn("Timeout reached: Proceeding to voting state.");
        navigate("/voting");
      }, 5000);
    }

    return () => clearTimeout(timeoutID);
  }, [serverState]);
  
  /**
   * Handles vote click by a player (except the 2 who wrote the answers)
   */
const handleVote = (response) => {
  if (userVote !== null) return; // prevent re-voting
  if (!currentQ) return;

  if (currentPlayer.id === player1Id || currentPlayer.id === player2Id) return;

  setUserVote(response);

  const selectedPlayerId =
    response === "response1" ? player1Id : player2Id;

  if (!selectedPlayerId) return;

  //Store the player vote
  pendingVote.current = selectedPlayerId

  setCurrentPlayer({
    ...currentPlayer,
    vote_for_id: selectedPlayerId
  });
};

  return (
    <div className="voting-container">
      <TimerBar percent={percentTimeLeft} colour='purple'/>
      <div className="voting-question-box">{currentQuestion}</div>
      <div className="voting-responses-container">

        <button
          className={`voting-response-card voting-response-left ${!results ? (userVote === "response1" ? "selected-vote" : "") : ""}`}
          onClick={() => handleVote("response1")}
          disabled={userVote !== null} // Disable button after first vote
        >
          {results && <div className="voting-user-label">{author1}</div>}
          <span>{currentResponses[0]}</span>
          {showFinalVotes && (
            <div className="voting-vote-bubbles">
              {player1Votes.map((vote, index) => (
                <div key={index} className="voting-vote-circle">{vote}</div>
              ))}
            </div>
          )}

        </button>

        <button
          className={`voting-response-card voting-response-right ${!results ? (userVote === "response2" ? "selected-vote" : "") : ""}`}
          onClick={() => handleVote("response2")}
          disabled={userVote !== null || isSelfVoter} // Disable button after first vote
        >
          {results && <div className="voting-user-label">{author2}</div>}
          <span>{currentResponses[1]}</span>
          {showFinalVotes && (
            <div className="voting-vote-bubbles">
              {player2Votes.map((vote, index) => (
                <div key={index} className="voting-vote-circle">{vote}</div>
              ))}
            </div>
          )}
        </button>
      </div>
      {isSelfVoter && !userVote && !showFinalVotes && (
        <div className="voting-info-msg">
          You are not allowed to vote on your own question.
        </div>
      )}

    </div>
  );
}

export default VotingPage;