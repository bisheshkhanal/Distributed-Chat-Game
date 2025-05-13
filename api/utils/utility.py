
import random
import string

def generate_random_alphanumeric(length=6)->str:
    # Define the characters to choose from (letters and digits)
    characters = string.ascii_letters + string.digits
    
    # Generate a random alphanumeric string
    random_string = ''.join(random.choice(characters) for _ in range(length))
    
    return random_string

