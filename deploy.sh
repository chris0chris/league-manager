echo "activating venv"
source ../.virtualenvs/venv/bin/activate
echo "checkout git"
git pull
echo "installing requirements"
pip install -r requirements.txt
echo "migrating django"
python manage.py migrate
echo "collecting django static files"
rm -rf league_manager/league_manager/static
python manage.py collectstatic
echo "reloading webapp"
touch /var/www/5erdffl_eu_pythonanywhere_com_wsgi.py
echo "done :-)"

# reset python environment
# rm -rf .virtualenvs/
# mkvirtualenv venv --python=/usr/bin/python3.8

# EXPORT database
#mysqldump -u 5erdffl -h 5erdffl.mysql.eu.pythonanywhere-services.com --set-gtid-purged=OFF --no-tablespaces '5erdffl$league_manager'  > db-backup.sql
# IMPORT remote database
#mysql -u 5erdffl -h 5erdffl.mysql.eu.pythonanywhere-services.com '5erdffl$league_manager'  < db-backup.sql

# IMPORT database local
# mysql -u root -p 5erdffl$league_manager < db-backup.sql

# EXPORT database local
#mysqldump -u root -p --set-gtid-purged=OFF --no-tablespaces 5erdffl$league_manager  > db-backup.sql
