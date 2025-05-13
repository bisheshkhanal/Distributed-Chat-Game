from pydantic import BaseModel

class PlayerStatus(BaseModel):

    id:str=None
    nickname:str
    scores:float=0
    vote_for_id:str=""

    proposed_answer:str=""
    
    def __init__(self,**kwarg):
        super().__init__(**kwarg)

    def reset_scores(self):
        self.scores=0

    def set_scores(self,scores:float):
        self.scores=scores

    def reset_vote(self):
        self.vote_for_id=""

    