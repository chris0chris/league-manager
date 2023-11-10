echo "truncating all tables"
mysql -u demodffl -h demodffl.mysql.eu.pythonanywhere-services.com -Nse 'show tables' 'demodffl$default' | while read table; do echo "SET FOREIGN_KEY_CHECKS = 0;truncate table $table;"; done | mysql -u demodffl -h demodffl.mysql.eu.pythonanywhere-services.com 'demodffl$default'
echo "activating venv"
source ../.virtualenvs/venv/bin/activate
echo "importing demo_database.json"
python manage.py loaddata demo_database.json
echo "done :-)"
