-- LeagueSphere Staging Database Initialization
-- This script creates the staging database and user with proper privileges

CREATE DATABASE IF NOT EXISTS leaguesphere_staging CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'leaguesphere_staging'@'%' IDENTIFIED BY '${MYSQL_PWD}';
GRANT ALL PRIVILEGES ON leaguesphere_staging.* TO 'leaguesphere_staging'@'%';
FLUSH PRIVILEGES;
