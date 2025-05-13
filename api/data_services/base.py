from typing import TypeVar,Generic,Any,Dict,Optional,List
from pydantic import BaseModel
from pymongo.database import Database
from bson.objectid import ObjectId

T= TypeVar("T",bound=BaseModel)
class BaseService(Generic[T]):
    def __init__(self,collection_name:str,db:Database):
        self.collection=db.get_collection(name=collection_name)
    
    def create(self,model:T)->str|None:
        result=self.collection.insert_one(model.model_dump())
        if result.acknowledged:
            return str(result.inserted_id)
        return None
        

    def read(self,lookup:Dict[str,Any])->Optional[Dict[str,Any]]:
        try:
            result=self.collection.find_one(lookup)
        except Exception as e:
            return None
        return result
    
    def read_many(self,lookup:dict)->list[dict]|None:
        try:
            cursor = self.collection.find(lookup)
            result = list(cursor)
        except Exception as e:
            return None
        return result if result else None
    
    def read_by_Id(self,id:str)->dict|None:
        try:
            objId=ObjectId(id)
            result=self.collection.find_one(objId)
        except Exception as e:
            return None
        return result
    
    def read_random(self,sample_size:int=1) -> List[dict]|None:
        try:
            result = self.collection.aggregate([{"$sample": {"size": sample_size}}])
            return list(result)
        except Exception as e:
            return None

    def update(self,lookup:dict,field_to_change:dict)->bool:
        try:
            result=self.collection.update_one(lookup,{'$set':field_to_change})
            return result.acknowledged and result.matched_count>0
        except Exception as e:
            print(str(e))
            return False
        
    
    def update_ById(self,id:str,field_to_change:dict)->bool:
        id_instance=ObjectId(id)
        return self.update({"_id":id_instance},field_to_change=field_to_change)

    def delete(self,lookup:dict)->bool:
        try:
            result=self.collection.delete_one(lookup)
            return result.acknowledged and result.deleted_count>0
        except Exception as e:
            print(str(e))
            return False
    
    def delete_byId(self,id:str)->bool:
        id_instance=ObjectId(id)
        return self.delete({"_id":id_instance})