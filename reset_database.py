import subprocess

# Truncate all tables
mysql_command = (
    "mysql -u demodffl -h demodffl.mysql.eu.pythonanywhere-services.com "
    "-Nse 'show tables' 'demodffl$default' | "
    "while read table; do "
    "echo \"SET FOREIGN_KEY_CHECKS = 0; truncate table $table;\"; done"
)
print('Truncate all tables')
subprocess.run(mysql_command, shell=True)

print('Change directory to league_manager')
subprocess.run("cd /home/demodffl/league_manager", shell=True)

print('Activate virtual environment')
subprocess.run("source ../.virtualenvs/venv/bin/activate", shell=True)

print('Import demo_database.json')
subprocess.run("python manage.py loaddata demo_database.json", shell=True)

print("done :-)")
