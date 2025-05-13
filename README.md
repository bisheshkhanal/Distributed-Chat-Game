## Dev mode

Dev mode requires programmer to activate a virtual environment and install the required package

```bash
# create virtual environment and name it ".venv"
python -m venv .venv

# activate the environment
source .venv/Scripts/activate

# make sure that we are not using global python environment
which pip

# install the required package
pip install -r ./api/requirements.txt

# run the api in dev mode
fastapi dev ./api/main.py

```

## container mode

If you wnat to spin up the application in container mode, please switch `db_uri` to get the connection string from `os` (in line 9, 10 of `main.py`). Make sure your docker application is running, then type in the command `docker compose up -d`

## installing new python package

Whenever install a package using `pip install`, we need to run `pip freeze > requirements.txt` to keep track of the packages used in this project
