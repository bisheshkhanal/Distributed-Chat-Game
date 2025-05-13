from fastapi import FastAPI
from pymongo.mongo_client import MongoClient
from pymongo.database import Database
from fastapi.middleware.cors import CORSMiddleware
import os

from api.data_services.question import QuestionDataService
from api.data_services.game import GameService
from api.handlers.questions import QuestionHandler
from api.handlers.game import GameHandler

# db_uri="mongodb://user:pass@localhost:27017/"
db_uri=os.getenv("CONNECTION_STR")

client:MongoClient=MongoClient(db_uri)
mongoDB:Database=client.get_database("sampleDB")

app=FastAPI(title="Text Game API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# data service
question_service:QuestionDataService = QuestionDataService("questions",mongoDB)
game_service:GameService = GameService(question_service)

# handler
question_handler:QuestionHandler=QuestionHandler(question_service,app)
game_handler:GameHandler=GameHandler(game_service,app)


@app.get("/")
async def root():
    return "Hello there! go to `/docs` for documentation"

question_handler.register_routes()
game_handler.register_routes()


