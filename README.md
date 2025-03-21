# League Manager

Metrics:

[![Website Status](https://img.shields.io/website?url=https%3A%2F%2F5erdffl.eu.pythonanywhere.com%2F)](https://5erdffl.eu.pythonanywhere.com/)
[![Last Commit](https://img.shields.io/github/last-commit/chris0chris/league-manager)](https://github.com/chris0chris/league-manager)
[![GitHub Workflow Status](https://img.shields.io/circleci/build/github/chris0chris/league-manager/master)](https://app.circleci.com/pipelines/github/chris0chris/league-manager)
[![codecov](https://codecov.io/gh/chris0chris/league-manager/branch/master/graph/badge.svg)](https://codecov.io/gh/chris0chris/league-manager)

## Dev Documentation

### Django

#### Run server

To run server local under pycharm

1. create new python configuration (Alt + E)
  1. set script path to `manage.py`
  2. set **parameters** to: `runserver`
  3. set **environment variables** to: `league_manager=dev`

#### Migration steps

Run new migration step in terminal

```
    python manage.py makemigrations
    python manage.py migrate
```

#### Access images and CSS

Run in Terminal

```
python manage.py collectstatic
```

### MySQL

#### EXPORT MySQL from pythonanywhere

    mysqldump -u 5erdffl -h 5erdffl.mysql.eu.pythonanywhere-services.com --set-gtid-purged=OFF --no-tablespaces '5erdffl$league_manager'  > db-backup.sql

#### IMPORT MySQL into pythonanywhere

    mysql -u 5erdffl -h 5erdffl.mysql.eu.pythonanywhere-services.com '5erdffl$league_manager'  < db-backup.sql

#### IMPORT MySQL from local .sql file via mysql command

under windows: move terminal to mysql bin folder (`cd C:\xampp\mysql\bin`)

    mysql -u root -p 5erdffl$league_manager < db-backup.sql

#### EXPORT MySQL to local .sql file via mysql command

    mysqldump -u root -p --set-gtid-purged=OFF --no-tablespaces 5erdffl$league_manager  > db-backup.sql

### Python

#### Reset virtual environment for pythonanywhere

Open terminal in pythonanywhere. While in home directory do the following steps:

    rm -rf .virtualenvs/
    mkvirtualenv venv --python=/usr/bin/python3.8
