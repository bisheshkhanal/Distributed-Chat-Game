from pydantic import BaseModel,PrivateAttr
from api.utils.utility import generate_random_alphanumeric
from api.models.player import PlayerStatus
from api.models.question import QuestionModel,QuestionInGame
from api.data_services.question import QuestionDataService
import uuid
from typing import Dict,List,Tuple
import random
from time import time

class GameContext(BaseModel):
    
    current_state:str=None
    leaderID:str=None
    join_code:str=None
    # map ID to nickname
    participants:Dict[str,PlayerStatus]={}

    current_questions: List[QuestionInGame] = []
    selected_players:List[str]=[]
    not_selected_players:List[str]=[]
    
    # dictionary to store the player's votes. 
    current_votes: Dict[str, str] = {}
    current_voting_index: int = 0

    current_round_result:dict={}
    
    # timers 
    timer_finish_time: float = None     # this is the absolute time when the timer finishes 
    timer_remaining_time: float = None  # time in seconds left on the timer. must be updated by calling update_remaining_time()
    timer_duration: int = None          # this is the duration of the timer in seconds


    # private attribute has to be here
    __state=PrivateAttr()
    __questionService=PrivateAttr()
    
    def __init__(self,question_service:QuestionDataService=None,**data):
        super().__init__(**data)
        # set it to join state on game creation
        # avoiding circular import error
        self.__questionService:QuestionDataService=question_service

    def update_player(self,id:str,player:PlayerStatus):
        self.participants[id]=player

    def do_something(self,player:PlayerStatus)->PlayerStatus:
        return self.__state.do_something(player)

    def next_state(self):
        self.__state=self.__state.next_state()
        self.current_state=self.__state.state_text

    def set_current_questions(self, questions: List[QuestionInGame]):
        self.current_questions = questions
    
    def answering_question(self,player:PlayerStatus)->None:
        for question in self.current_questions:       
            if question.player1.id == player.id:
                self.participants[player.id]=player
                question.player1.proposed_answer = player.proposed_answer
            elif question.player2.id == player.id:
                self.participants[player.id]=player
                question.player2.proposed_answer = player.proposed_answer

    def record_vote(self, player:PlayerStatus):
            
        if player.id in self.current_votes: # this is to ensure that the player can only vote once
            return False

        current_question = self.current_questions[self.current_voting_index]
        
        if player.vote_for_id in [current_question.player1.id, current_question.player2.id]:
            self.current_votes[player.id] = player.vote_for_id
            return True
        
        return False
        
    # util function
    def get_random_questions(self,sample_size:int)->QuestionModel|None:
        return self.__questionService.get_random(sample_size)
    
    def select_two_players(self)->Tuple[PlayerStatus]:
        if len(self.not_selected_players) == 0:
            self.swap_player_arrays()
        player1ID:str=self.not_selected_players.pop()
        self.selected_players.append(player1ID)
        player1:PlayerStatus=self.participants[player1ID]
        player1.proposed_answer=""
        
        if len(self.not_selected_players) == 0:
            self.swap_player_arrays()
        player2ID:str=self.not_selected_players.pop()
        self.selected_players.append(player2ID)
        player2:PlayerStatus=self.participants[player2ID]
        player2.proposed_answer=""

        return (player1,player2)

    def swap_player_arrays(self) -> None:
        random.shuffle(self.selected_players)
        self.selected_players,self.not_selected_players=self.not_selected_players,self.selected_players

    def all_ans_received(self) -> bool:
        return all(
            question.player1.proposed_answer != "" and question.player2.proposed_answer != ""
            for question in self.current_questions
        )
    
    def reset_all_playerVotes(self):
        self.current_votes={}
        for _,player in self.participants.items():
            player.reset_vote()
    
    def all_votes_received(self) -> bool:
        required_votes = len(self.participants) - 2  # exclude  the two answering players
        return len(self.current_votes) >= required_votes

    def calculate_scores(self):
        """
        Calculates and updates the scores for the current question's answerers. 
        """
        current_question = self.current_questions[self.current_voting_index]
        player1_votes = sum(1 for vote in self.current_votes.values() if vote == current_question.player1.id)
        player2_votes = sum(1 for vote in self.current_votes.values() if vote == current_question.player2.id)
        
        total_voters = len(self.current_votes)  # exclude the two answering players
        
        if total_voters == 0:  # Avoid division by zero
            p1_score = 0
            p2_score = 0
        else:
            p1_score = 600 * (player1_votes / total_voters)
            p2_score = 600 * (player2_votes / total_voters)
        
        current_question.player1.set_scores(p1_score)
        current_question.player2.set_scores(p2_score)

        self.participants[current_question.player1.id].set_scores(p1_score)
        self.participants[current_question.player2.id].set_scores(p2_score)
        
    def set_intermediate_results(self):
        current_question = self.current_questions[self.current_voting_index]
        player1_votes = sum(1 for vote in self.current_votes.values() if vote == current_question.player1.id)
        player2_votes = sum(1 for vote in self.current_votes.values() if vote == current_question.player2.id)
        
        self.current_round_result = {
            "question": current_question.text,
            
            "player1": {
                "nickname": current_question.player1.nickname,
                "votes": player1_votes,
                "score": current_question.player1.scores
            },
            
            "player2": {
                "nickname": current_question.player2.nickname,
                "votes": player2_votes,
                "score": current_question.player2.scores
            }
        }
    
    def reset_scores(self):
        for _,player in self.participants.items():
            player.reset_scores()
        self.current_votes={}
        self.current_voting_index=0

    def set_joining_code(self,code:str):
        self.join_code=code

    def set_state(self,state):
        self.__state=state
        if state.state_text != "recovering":
            self.current_state=state.state_text

    def set_leader(self,player:PlayerStatus):
        self.leaderID=player.id
        self.participants[self.leaderID]=player
        
    
    # timer functions 
    def set_timer(self, duration: int):
        """ Set the timer for the current state"""
        self.timer_duration = duration
        self.timer_finish_time = time() + duration

    def update_remaining_time(self) -> None:
        """ Update the remaining time for the current timer. """
        if self.timer_finish_time is None:
            self.timer_remaining_time = None
            return
        self.timer_remaining_time = max(0, self.timer_finish_time - time())
        