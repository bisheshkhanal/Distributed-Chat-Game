from fastapi import FastAPI,HTTPException,status
from api.data_services.question import QuestionDataService
from api.handlers.base import BaseHandler
from api.models.question import QuestionModel
from typing import List

class QuestionHandler(BaseHandler):

    def __init__(self, service:QuestionDataService, app:FastAPI):
        super().__init__("Questions", "/questions", app)
        self.__service=service
    
    def register_routes(self):
        
        @self.app.post(self.route,tags=[self.tag])
        async def create_question(question:QuestionModel):
            msg:str=self.__service.create(question)
            if msg is None:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="question creation fail"
                )
            return msg
        
        @self.app.get(f"{self.route}/random",tags=[self.tag])
        async def get_random_question()->QuestionModel:
            questions:List[QuestionModel]=self.__service.get_random()

            if questions is None and len(questions)==0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No question available"
                )
            
            return questions[0]
        
        
        

        
                