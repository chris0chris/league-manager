#!/bin/zsh
echo "starting test container"
pushd ~/dev/infrastructure/container/scripts/
./setup_test_container.sh
popd
sleep 10
echo "starting test db"
ssh servyy-test.lxd "docker rm -f mysql && docker run -d --name mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=user -e MYSQL_DATABASE=test_db mariadb:lts"
sleep 20
echo "setup test db"
ssh servyy-test.lxd "docker exec -i mysql mariadb -puser -uroot "< test_user.sql
