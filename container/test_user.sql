CREATE USER IF NOT EXISTS 'user' IDENTIFIED BY 'user';
GRANT ALL ON *.* TO 'user' WITH GRANT OPTION;
FLUSH PRIVILEGES;
