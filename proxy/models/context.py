from pydantic import BaseModel,PrivateAttr
from proxy.models.player import PlayerStatus
from proxy.models.question import QuestionInGame
from typing import Dict,List
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