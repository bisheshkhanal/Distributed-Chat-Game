from pymongo.database import Database
from api.data_services.base import BaseService
from api.models.question import QuestionModel
from typing import List

class QuestionDataService(BaseService[QuestionModel]):
    
    def __init__(self, collection_name: str, db: Database):
        super().__init__(collection_name, db)

    def get_random(self,sample_size:int=1) -> List[QuestionModel] | None:
        documents:List[dict]=self.read_random(sample_size)
        if documents is None:
            return None
        questions:List[QuestionModel]=[]
        for document in documents:
            question:QuestionModel=QuestionModel(**document)
            questions.append(question)
        return questions


    



