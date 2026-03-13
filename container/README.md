# Container & Infrastructure

This directory contains Docker configurations, deployment scripts, and development environment setup tools.

## Key Files
- `app.Dockerfile`: Dockerfile for the Django backend application.
- `nginx.Dockerfile`: Dockerfile for the Nginx frontend server.
- `deploy.sh`: Main deployment script for various environments (major, minor, patch).
- `start_dev_server.sh`: Script to launch the local development environment.
- `spinup_test_db.sh`: Helper script to initialize a MariaDB instance for testing.
- `test_db_dump.sql`: Sample database dump for testing purposes.

## Usage
Refer to the root `README.md` and `docs/guides/setup-guide.md` for detailed instructions on using these scripts.
