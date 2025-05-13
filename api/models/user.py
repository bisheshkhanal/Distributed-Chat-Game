from pydantic import BaseModel
class User(BaseModel):
    def __init__(self, username:str):
        self.username:str=username

     