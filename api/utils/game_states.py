from abc import abstractmethod
from api.utils.context import GameContext
from api.models.player import PlayerStatus
from api.models.question import QuestionModel,QuestionInGame
from api.utils.utility import generate_random_alphanumeric
import threading
import uuid
import random

class State:

    def __init__(self,context:GameContext):
        self.context:GameContext=context
        self.state_text:str=""

    @abstractmethod
    def next_state(self)->'State':
        pass

    # state will call certain method to modify the context
    @abstractmethod
    def do_something(self,player:PlayerStatus)->PlayerStatus:
        pass


class JoiningState(State):
    # wait for participant
    # generate random code
    # generate player ID for each participant

    def __init__(self,leader:PlayerStatus,context:GameContext):
        super().__init__(context)
        self.state_text='joining'
        join_code:str=generate_random_alphanumeric()
        self.context.set_joining_code(join_code)
        leader.id=str(uuid.uuid1())
        self.context.set_leader(leader)

    def do_something(self,player:PlayerStatus)->PlayerStatus:
        if player.id == None:
            # new player joining
            player.id=str(uuid.uuid1())
            self.context.update_player(player.id,player)
        elif player.id==self.context.leaderID:
            # if leader client tells join state to do something, the program will start the game
            self.context.not_selected_players=list(self.context.participants.keys())
            self.context.next_state()
        return player

    def next_state(self):
        return QuestionSelectingState(self.context)
        
class QuestionSelectingState(State):
    # get a question from the database
    # select two players in the context to anwser the question
    # go to the next phase
    def __init__(self, context:GameContext):
        super().__init__(context)
        self.state_text="question_selecting"
        # select the question and state and go straight to the next state
        self.do_something(None)
        # stay in question selecting state for 10 second
        self.context.set_timer(3)
        threading.Timer(3,self.context.next_state).start()
    
    def do_something(self, player:PlayerStatus|None)->PlayerStatus:
        
        # getting a list of players and shuffling them
        player_ids = list(self.context.participants.keys())
        random.shuffle(player_ids)
        num_questions = len(player_ids) // 2
        
        # getting a list of n/2 questions  
        questions = self.context.get_random_questions(num_questions)
        
        # using a loop to assign each question to 2 players 
        question_assignments = []
        for i in range(num_questions):
            player1 = self.context.participants[player_ids.pop()]
            player2 = self.context.participants[player_ids.pop()]
            question_id = str(uuid.uuid4())  # Generate unique ID
            current_question = QuestionInGame(text=questions[i].text, player1=player1, player2=player2)
            question_assignments.append(current_question)
        
        # then we store the questions in the context 
        self.context.set_current_questions(question_assignments)

    def next_state(self)->State:
        return AnsweringState(self.context)
    

class AnsweringState(State):
    def __init__(self,context:GameContext):
        super().__init__(context)
        self.state_text='answering'
        self.context.set_timer(60)  # Set a 60-second timer
        self.timer = threading.Timer(60,self.context.next_state)
        self.timer.start()
    
    def do_something(self, player:PlayerStatus)->PlayerStatus:
        self.context.answering_question(player)
        
        if self.context.all_ans_received():
            self.context.next_state()
            self.timer.cancel()
            
        return player
    
    def next_state(self)-> State:
        return DisplayResponseState(self.context)

class DisplayResponseState(State):

    def __init__(self, context:GameContext):
        self.state_text="display_response"
        self.context=context
        self.context.reset_scores()
        self.context.reset_all_playerVotes()
        self.context.set_timer(5)
        self.timer = threading.Timer(5,self.context.next_state)
        self.timer.start()
        
    def do_something(self, player):
        # when leader ping, go to voting
        if player.id==self.context.leaderID:
            self.timer.cancel()
            self.context.next_state()

    def next_state(self):
        return VotingState(self.context)

class VotingState(State):
    
    def __init__(self,context:GameContext):
        super().__init__(context)
        self.state_text='voting'
        self.context.set_timer(30)  # Set a 30-second timer
        self.context.reset_all_playerVotes()
        self.timer = threading.Timer(30, self.timeout_next)  # Set 30-sec timer
        self.timer.start()

    def do_something(self, player: PlayerStatus) -> PlayerStatus:
    
        if self.context.record_vote(player):
            if self.context.all_votes_received():
                self.timer.cancel()
                self.context.calculate_scores()
                self.context.next_state()
                
        return player
    
    def timeout_next (self):
        self.context.calculate_scores()
        self.context.next_state()
    
    def next_state(self) -> State:
        return IntermediateResultState(self.context)

class IntermediateResultState(State):
    
    def __init__(self, context):
        super().__init__(context)
        self.state_text = 'intermediate_results'
        self.context.set_timer(10)  # Set a 10-second timer
        self.context.set_intermediate_results()
        self.timer = threading.Timer(10, self.context.next_state)  # results are displayed for ten seconds
        self.timer.start()
        
    def do_something(self, player:PlayerStatus):
        return player
        
    def next_state(self):
        if self.context.current_voting_index + 1 < len(self.context.current_questions):
            self.context.current_voting_index += 1
            return VotingState(self.context) # we go back to voting state for the next index's question
        else: 
            return ResultState(self.context) # if there are no more questions, we go to the result state
        

class ResultState(State):
    def __init__(self, context):
        super().__init__(context)
        self.state_text='result'
    
    def do_something(self, player):
        return player

    def next_state(self):
        return None  


class RecoveryState(State):
    # init function will be called when there is no such game in the server
    def __init__(self,context:GameContext,player:PlayerStatus):
        super().__init__(context)
        self.state_text="recovering"
        self.context.set_leader(player)

    def do_something(self, player:PlayerStatus):
        return player
    
    def next_state(self):

        if self.context.current_state == "answering":
            return AnsweringState(self.context)
        
        if self.context.current_state == "display_response":
            return DisplayResponseState(self.context)
        
        if self.context.current_state == 'voting':
            return VotingState(self.context)
        
        if self.context.current_state == 'intermediate_results':
            return IntermediateResultState(self.context)
        
        if self.context.current_state == 'result':
            return ResultState(self.context)

        

        
        




