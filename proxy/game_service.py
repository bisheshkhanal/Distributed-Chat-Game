from fastapi import HTTPException, status

import asyncio
import random
import requests
import typing

from proxy.models.context import GameContext
from proxy.models.player import PlayerStatus


class ProxyGameService:

  def __init__(self, servers:list[str]):
    self.games:typing.Dict[str,str]={}   # mapping of game codes to servers
    self.servers:typing.Dict[str,typing.Dict[bool,str]]={} # server life status and dictionary of running games & states
    for server in servers:
      self.servers[server] = (False, [])


  # =| helper functions |=======================================================
  def random_live_server(self) -> str|None:
    '''
    get a random live server or None if none of the servers appear to be alive
    '''
    all_servers = list(self.servers.keys())
    while len(all_servers) > 0:
      # get random server address and check if it's listed as alive
      server_num = random.randrange(0, len(all_servers))
      server = all_servers[server_num]
      if self.servers[server][0] == True:
        return server
      # not alive, so remove it from the list of servers to check
      all_servers.pop(server_num)
    return None


  # =| handle client reqs |=====================================================
  # CREATE ---------------------------------------------------------------------
  def create_game(self, player:PlayerStatus):
    fail_count:typing.Dict[str,int] = {}
    dead_servers = 0
    # keep trying to create until we find a server or have tried them all
    while dead_servers < len(self.servers):
      server = self.random_live_server()
      if server is None:
        # could not find a server that's alive
        break
      try:
        res = requests.post(f'{server}/games', json=player.model_dump(), timeout=3)
        res.raise_for_status()
        context = res.json()
        # add game to mapping, return server's payload and address
        self.games[context['join_code']] = server
        print(f'\tgame {context['join_code']} mapped to server {server}')
        return {'server': server, 'game_state': res.json()}
      except requests.RequestException as e:
        print(f'\tPOST error: {e.args}')
        # increment fail counter
        if server in fail_count:
          fail_count[server] += 1
        else:
          fail_count[server] = 1
        # assume dead after 3 failures
        if fail_count[server] >= 3:
          dead_servers += 1
          self.servers[server] = (False, [])
      except Exception as e:
        print(f'\tLocal error: {e}')
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail='Error sending to or reading from game server')
    # none of the servers seem to be up
    raise HTTPException(status.HTTP_404_NOT_FOUND, detail='Unable to find a live game server to connect to')
    

  # JOIN -----------------------------------------------------------------------
  def join_game(self, code:str):
    if code in self.games:
      server = self.games[code]
      if self.servers[server][0]:
        return server
      else:
        raise HTTPException(
          status_code=status.HTTP_404_NOT_FOUND,
          detail='old game server dead'
        )
    else:
      raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail='Unable to find mapping of this game to any server'
      )


  # RECOVERY -------------------------------------------------------------------
  def recover_game(self, code:str, game:GameContext, player:PlayerStatus):
    # try to reconnect to the old server 3 times first
    if code in self.games:
      server = self.games[code]
      for _ in range(1):
        try:
          requests.get(f'{server}/games/heartbeats', timeout=3)
          # we got a response. server isn't down, no need to reassign game
          print(f'\tgame {code} stays on server {server}')
          return server
        except requests.exceptions.RequestException as e:
          print(f'\t{server}: could not heartbeat. {e.args}')
    # either reconnect failed or we haven't seen this code before. either way, assign to new server  
    # try reconnecting on random servers until we connect to one
    fail_count:typing.Dict[str,int] = {}
    dead_servers = 0
    while dead_servers < len(self.servers):
      server = self.random_live_server()
      if server is None:
        # could not find a server that's alive
        break
      try:
        payload = {'snapshot': game.model_dump(), 'player': player.model_dump()}
        # print(f'gonna send json={json.dumps(payload)}')
        res = requests.post(f'{server}/games/recover', json=payload, timeout=3)

        if res.status_code == 400:
          # game server received it but doesn't want to accept because we were in an invalid state for recovery
          raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=res.json()['detail']
          )
        elif res.status_code != 200:
          # some other weird error? raise an exception for us to catch and count as a failure
          raise requests.RequestException(f'{res.status_code} status from server: {res.json()}')
        
        # update game mapping, return server's address
        self.games[code] = server
        print(f'\tgame {code} moved to server {server}')
        return server
      except requests.RequestException as e:
        print(f'\tPOST error: {e.args}')
        # increment fail counter
        if server in fail_count:
          fail_count[server] += 1
        else:
          fail_count[server] = 1
        # assume dead after 3 failures
        if fail_count[server] >= 3:
          dead_servers += 1
          self.servers[server] = (False, [])
    # none of the servers seem to be up
    raise HTTPException(status.HTTP_404_NOT_FOUND, detail='Unable to find a live game server to connect to')


  # =| heartbeat servers |======================================================
  async def listen_server_heartbeats(self):
    timeout_count:typing.Dict[str,str] = {}
    while True:
      for server in self.servers:
        try:
          res = requests.get(f'{server}/games/heartbeats', timeout=3)
          print(f'{server} heartbeat: {res.json().keys()}') # print list of gamecodes running on this server for debugging
          # no issues, it's alive
          self.servers[server] = (True, res.json())
          timeout_count[server] = 0
          # add previous mappings. don't overwrite original though
          # this could be an old server coming back to life, whose game was already transferred to another server
          for code in res.json().keys():
            if code not in self.games:
              self.games[code] = server
        except requests.exceptions.RequestException as e:
          print(f'\t{server}: heartbeat failed! {e.args}')
          # increment timeout counter
          if server in timeout_count:
            timeout_count[server] += 1
          else:
            timeout_count[server] = 1
          # if 3 timeouts, mark dead
          if timeout_count[server] >= 3:
            self.servers[server] = (False, [])
      print(f'current mapping: {self.games}')
      await asyncio.sleep(1)
