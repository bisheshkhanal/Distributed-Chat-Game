from fastapi import FastAPI,HTTPException,status
from api.handlers.base import BaseHandler
from api.models.player import PlayerStatus
from api.utils.context import GameContext
from api.utils.game_states import RecoveryState
from api.data_services.game import GameService
from typing import Dict


class GameHandler(BaseHandler):

    def __init__(self,game_service:GameService, app:FastAPI):
        super().__init__("Games", "/games", app)
        self.__service:GameService=game_service
    def register_routes(self):

        @self.app.post(f"{self.route}", tags=[self.tag])
        async def create_game(player:PlayerStatus)->GameContext:
            newGame:GameContext=self.__service.create_game(player)
            return newGame
        
        @self.app.get(f"{self.route}",tags=[self.tag])
        async def read_game_status(join_code:str)->GameContext:
            game_status:GameContext=self.__service.read_gamecontext(join_code)
            if game_status is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="game not found")
            game_status.update_remaining_time()
            return game_status
        
        @self.app.put(f"{self.route}", tags=[self.tag])
        async def update_game(join_code:str,player:PlayerStatus)->PlayerStatus:
            player_status:PlayerStatus=self.__service.update_context(join_code,player)
            if player_status is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="game not found")
            return player_status


        @self.app.post(f"{self.route}/recover",tags=[self.tag])
        async def recover_game(snapshot:GameContext,player:PlayerStatus)->str:
            print(snapshot.model_dump())
            if snapshot.current_state == "joining" or snapshot.current_state == "question_selecting":
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="recovery does not recover games in join and question selecting state")

            recover_state:RecoveryState=RecoveryState(snapshot,player)
            snapshot.set_state(recover_state)
            snapshot.next_state()
            self.__service.recover(snapshot)
            return "the game is recovered"
        
        @self.app.get(f"{self.route}/heartbeats",tags=[self.tag])
        async def get_all_gamecontext()->Dict[str,GameContext]:
            return self.__service.get_all_contexts()