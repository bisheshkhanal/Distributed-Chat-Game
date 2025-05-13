from typing import Dict,Optional
from api.utils.context import GameContext
from api.utils.game_states import JoiningState
from api.models.player import PlayerStatus
from api.data_services.question import QuestionDataService

class GameService:

    def __init__(self,question_service:QuestionDataService):
        self.games:Dict[str,GameContext]={}
        self.question_service:QuestionDataService=question_service
    
    def create_game(self,leader:PlayerStatus)->GameContext:
        new_game:GameContext=GameContext(self.question_service)
        joining_state:JoiningState=JoiningState(leader,new_game)
        new_game.set_state(joining_state)
        self.games[new_game.join_code]=new_game
        return new_game
    
    def read_gamecontext(self,join_code:str)->GameContext:
        if join_code in self.games:
            return self.games[join_code]
        return None
    
    def update_context(self,join_code:str,player:PlayerStatus)->Optional[PlayerStatus]:
        if join_code in self.games:
            if self.games[join_code].current_state == 'result' and self.games[join_code].leaderID == player.id:
                del self.games[join_code]
            status:PlayerStatus=self.games[join_code].do_something(player)
            return status
        return None
    
    def recover(self,game:GameContext):
        if (game.join_code in self.games):
            return
        self.games[game.join_code]=game

    def get_all_contexts(self)->Dict[str,GameContext]:
        return self.games
    

