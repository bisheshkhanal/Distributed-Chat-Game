
from fastapi import FastAPI
from abc import ABC,abstractmethod

class BaseHandler(ABC):
    def __init__(self,tag:str,route:str,app:FastAPI):
        self.tag=tag
        self.route=route
        self.app=app
        

    @abstractmethod
    def register_routes(self):
        pass