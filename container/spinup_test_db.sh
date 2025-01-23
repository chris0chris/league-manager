docker run -d --name mysql -p 3306:3306 -v test_user.sql:/docker-entrypoint-initdb.d/init.sql -e MYSQL_ROOT_PASSWORD=user -e MYSQL_DATABASE=test_db mariadb:lts

