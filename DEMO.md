# League Manager

## How to run Demo

### Django setup

Run the following commands in the league_manager root folder, where the `manage.py` file is located.

#### Migration steps

Run new migration step in terminal

```
python manage.py migrate
```

#### Import inital dummy data

Import the initial dummy data so the project is ready to be used.

```
python manage.py loaddata demo_database.json
```

#### Access images and CSS

Run in Terminal

```
python manage.py collectstatic
```

#### Run server

To run server local under pycharm

1. create new python configuration (Alt + E)
   1. set script path to `manage.py`
   2. set **parameters** to: `runserver`
   3. set **environment variables** to: `league_manager=dev`
