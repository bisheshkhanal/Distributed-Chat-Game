from pydantic import BaseModel
from datetime import datetime
from typing import Dict
from api.models.player import PlayerStatus


class QuestionModel(BaseModel):

    text:str="Question text"
    createdAt:datetime=datetime.now()
    def __init__(self,**kwarg):
        super().__init__(**kwarg)


class QuestionInGame(BaseModel):
    question_id: str = ""
    text:str=""
    player1:PlayerStatus=None
    player2:PlayerStatus=None

    def __init__(self, **kwarg):
        super().__init__(**kwarg)

    def update_player(self,player:PlayerStatus)->None:
        if player.id == self.player1.id:
            self.player1=player
        
        if player.id == self.player2.id:
            self.player2=player

    def both_ans_received(self)->bool:
        return self.player1.proposed_answer != "" and self.player2.proposed_answer != ""
    




    


    

    

    


