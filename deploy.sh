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
touch /var/www/demodffl_eu_pythonanywhere_com_wsgi.py
echo "done :-)"
