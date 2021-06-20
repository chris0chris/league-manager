echo "activating venv"
source ../.virtualenvs/venv/bin/activate
echo "checkout git"
git pull
echo "installing requirements"
pip install -r requirements.txt
echo "doing django stuff"
python manage.py migrate
rm -rf league_manager/static
python manage.py collectstatic
echo "reloading webapp"
touch /var/www/5erdffl_eu_pythonanywhere_com_wsgi.py
echo "done :-)"