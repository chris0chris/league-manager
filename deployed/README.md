# LeagueSphere Deployment Configurations

This directory contains Docker Compose configurations for deploying LeagueSphere to different environments.

## Files

- `docker-compose.yaml` - Production deployment configuration
- `docker-compose.staging.yaml` - Staging deployment configuration
- `.env.staging` - Environment variables for staging (Traefik/Docker Compose)
- `ls.env.staging.template` - Template for staging application secrets
- `mysql-init/` - MySQL database initialization scripts

## Staging Environment Setup

### Prerequisites

1. Docker and Docker Compose installed on the server
2. Traefik reverse proxy running with `proxy` network
3. DNS records pointing to the server:
   - `stage.leaguesphere.app`
   - `leaguesphere-stage.lehel.xyz` (internal)

### Initial Deployment

1. **Generate secrets:**
   ```bash
   # Database password
   STAGING_DB_PASSWORD=$(openssl rand -base64 32)
   STAGING_ROOT_PASSWORD=$(openssl rand -base64 32)

   # Django secret key
   STAGING_SECRET_KEY=$(python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())")

   echo "Save these to your password manager:"
   echo "STAGING_DB_PASSWORD: ${STAGING_DB_PASSWORD}"
   echo "STAGING_ROOT_PASSWORD: ${STAGING_ROOT_PASSWORD}"
   echo "STAGING_SECRET_KEY: ${STAGING_SECRET_KEY}"
   ```

2. **Create application environment file:**
   ```bash
   cp ls.env.staging.template ls.env.staging

   # Edit ls.env.staging and replace placeholders with actual values
   nano ls.env.staging
   ```

3. **Ensure proxy network exists:**
   ```bash
   docker network create proxy 2>/dev/null || echo "Network already exists"
   ```

4. **Pull and start staging environment:**
   ```bash
   docker compose -f docker-compose.staging.yaml pull
   docker compose -f docker-compose.staging.yaml up -d
   ```

5. **Verify deployment:**
   ```bash
   # Check container status
   docker compose -f docker-compose.staging.yaml ps

   # Check logs
   docker compose -f docker-compose.staging.yaml logs -f

   # Test database connection
   docker compose -f docker-compose.staging.yaml exec mysql mariadb -u leaguesphere_staging -p -e "SHOW DATABASES;"

   # Create Django superuser
   docker compose -f docker-compose.staging.yaml exec app python manage.py createsuperuser
   ```

6. **Test URLs:**
   - https://stage.leaguesphere.app
   - https://leaguesphere-stage.lehel.xyz
   - http://leaguesphere-stage.lehel (local network)

### Updating Staging

When new `:staging` images are pushed to Docker Hub (automatically via CI/CD):

```bash
cd ~/dev/leaguesphere/deployed/
docker compose -f docker-compose.staging.yaml pull
docker compose -f docker-compose.staging.yaml up -d
```

### Troubleshooting

**Container won't start:**
```bash
# Check logs
docker compose -f docker-compose.staging.yaml logs app
docker compose -f docker-compose.staging.yaml logs mysql

# Check environment variables
docker compose -f docker-compose.staging.yaml config
```

**Database connection issues:**
```bash
# Verify MySQL is running
docker compose -f docker-compose.staging.yaml exec mysql mariadb -u root -p -e "SELECT 1;"

# Check database exists
docker compose -f docker-compose.staging.yaml exec mysql mariadb -u root -p -e "SHOW DATABASES;"
```

**SSL certificate issues:**
```bash
# Check Traefik logs
docker logs traefik 2>&1 | grep stage.leaguesphere

# Verify DNS resolution
nslookup stage.leaguesphere.app
nslookup leaguesphere-stage.lehel.xyz
```

### Stopping/Removing Staging

```bash
# Stop containers
docker compose -f docker-compose.staging.yaml down

# Stop and remove volumes (WARNING: deletes all staging data)
docker compose -f docker-compose.staging.yaml down -v
```

## Production Environment

See production deployment documentation for production-specific instructions.

## Security Notes

- Never commit `ls.env.staging` or `ls.env` files to version control
- Store secrets securely in a password manager (Bitwarden, 1Password, etc.)
- Use strong, randomly generated passwords for all credentials
- Rotate secrets periodically
- Limit access to the staging environment to authorized personnel only
