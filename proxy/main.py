from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import asyncio
from contextlib import asynccontextmanager
import json
import os

from proxy.handlers.game import ProxyHandler
from proxy.game_service import ProxyGameService

# get list of all possible server addresses
servers=json.loads(os.getenv("SERVER_ADDR"))
# servers = ['http://localhost:8080']  # for dev mode (`fastapi dev proxy`)


# set up service and background task (server heartbeat listening)
service:ProxyGameService = ProxyGameService(servers)

@asynccontextmanager
async def lifespan(app: FastAPI):
  # start heartbeat listening
  asyncio.create_task(service.listen_server_heartbeats())
  # cleanup on shutdown
  yield


# set up app
app = FastAPI(title='Text Game Proxy', lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# init handler
handler:ProxyHandler = ProxyHandler(service, app)

@app.get("/")
async def root():
    return "Hello there! go to `/docs` for documentation"

handler.register_routes()
