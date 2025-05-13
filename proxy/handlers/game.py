from fastapi import FastAPI, HTTPException, status

from proxy.game_service import ProxyGameService
from proxy.handlers.base import BaseHandler
from proxy.models.context import GameContext
from proxy.models.player import PlayerStatus


class ProxyHandler(BaseHandler):
  def __init__(self, service:ProxyGameService, app:FastAPI):
    super().__init__('Redirect Proxy Game Interface', '/game', app)
    self.service:ProxyGameService = service


  def register_routes(self):
    # # for debugging
    # @self.app.get(f'{self.route}/test')
    # async def test():
    #   return self.service.random_live_server()

    @self.app.post(f'{self.route}', tags=[self.tag])
    async def create_game(player:PlayerStatus):
      '''
      POST: player wants to create a new game.
      - generate a game code so we can store the code-server mapping
      - establish comm. with game server (confirm it's active)
      - tell player address of this game server
      '''
      if player is None:
        raise HTTPException(
          status_code=status.HTTP_400_BAD_REQUEST,
          detail='Player information is required'
        )
      return self.service.create_game(player)

    @self.app.get(f'{self.route}', tags=[self.tag])
    async def join_game(join_code:str):
      '''
      GET: player wants to join an existing game.
      - tell player address of the game server the given code is assigned to
      '''
      if join_code is None or join_code == "":
        raise HTTPException(
          status_code=status.HTTP_400_BAD_REQUEST,
          detail='The game join code is required'
        )
      return self.service.join_game(join_code)

    @self.app.get(f'{self.route}/heartbeat', tags=[self.tag])
    async def heartbeat():
      '''
      GET: player wants to check if proxy alive. just send OK.
      '''
      return "I'm alive!"

    @self.app.put(f'{self.route}', tags=[self.tag])
    async def recover_game(game:GameContext, player:PlayerStatus):
      '''
      PUT: player has detected a potential crash and wants new server.
      - check if server is actually down of if the player just timed out
      - find live server(s)---poll all of them?
      - if OG server (server from current game-server mapping) is down, redirect
        player to one of the live servers.
      '''
      if game is None or player is None or game.join_code is None or game.join_code == '':
        raise HTTPException(
          status_code=status.HTTP_400_BAD_REQUEST,
          detail='A game state with a nonempty join code and a player state are required.'
        )
      return self.service.recover_game(game.join_code, game, player)

    return