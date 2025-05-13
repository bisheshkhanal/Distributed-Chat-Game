from pydantic import BaseModel
import utils.utility as util

class Game(BaseModel):

    def __init__(self,leaderId:str):
        self.join_code:str=util.generate_random_alphanumeric()
        self.leaderId:str=leaderId
    
    def join(self,playerId:str)->None:
        pass

    def ping(self,playerId:str)->None:
        pass

    def leave(self,playerId:str)->None:
        pass

    









    