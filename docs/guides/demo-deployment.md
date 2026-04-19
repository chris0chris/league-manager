# Demo Environment Deployment Guide

## Overview

The demo environment (`demo.leaguesphere.app`) is a public-facing instance of LeagueSphere with daily resets and synthetic data. This guide covers local testing, deployment via Docker Compose, and Ansible automation.

## Local Testing

### Prerequisites

- Docker and Docker Compose installed
- `.env.demo` file configured (see docker-compose.demo.yml)
- Sufficient disk space for database volume

### Quick Start

```bash
# Start the demo environment
docker-compose -f docker-compose.demo.yml up -d

# Check service status
docker-compose -f docker-compose.demo.yml ps

# View logs
docker-compose -f docker-compose.demo.yml logs -f demo-app

# Stop and remove
docker-compose -f docker-compose.demo.yml down
```

### First Run Initialization

On first startup, the demo-app container will:
1. Run Django migrations
2. Execute `manage.py seed_demo_data`
3. Create a database snapshot at `/app/snapshots/demo_snapshot.sql`
4. Start the Django application

This typically takes 2-3 minutes. Monitor with: `docker-compose -f docker-compose.demo.yml logs -f demo-app`

### Testing Reset Mechanism

```bash
# Check reset flag file
docker-compose -f docker-compose.demo.yml exec demo-app cat /app/.demo_last_reset

# Manually trigger reset
docker-compose -f docker-compose.demo.yml down
docker-compose -f docker-compose.demo.yml up -d
```

### Accessing the Demo

- **Local:** http://localhost:8001
- **Production:** https://demo.leaguesphere.app

### Demo Credentials

All demo accounts use `@demo.local` email:
- **admin@demo.local** / DemoAdmin123! (Administrator)
- **referee@demo.local** / DemoRef123! (Referee)
- **manager@demo.local** / DemoMgr123! (Team Manager)
- **user@demo.local** / DemoUser123! (Regular User)

## Database Snapshot Management

### Creating a New Snapshot

If you've updated the seed data script and want to create a fresh snapshot:

```bash
# Stop the demo
docker-compose -f docker-compose.demo.yml down

# Remove old volume (if needed)
docker volume rm demo-demo-snapshot

# Start fresh
docker-compose -f docker-compose.demo.yml up -d

# Wait for initialization to complete
docker-compose -f docker-compose.demo.yml logs -f demo-app | grep "snapshot created"
```

### Restoring a Specific Snapshot

```bash
# If snapshot was saved outside docker:
mysql -h 127.0.0.1 -u demo_user -p demo_db < /path/to/demo_snapshot.sql
```

## Ansible Deployment (Infrastructure Repo)

The infrastructure repo contains the `ls_demo` Ansible role for automated deployment. See `plays/roles/ls_demo/` for full details.

### Deployment Workflow

1. Update leaguesphere repo (git pull origin main)
2. Update demo.py settings if needed
3. Rebuild demo Docker image: `docker build -f container/app.Dockerfile -t leaguesphere:demo .`
4. Run Ansible playbook: `ansible-playbook plays/leaguesphere.yml --tags demo`

### Monitoring Deployment

```bash
# SSH to demo server
ssh admin@demo.leaguesphere.app

# Check demo container status
docker ps -a | grep demo

# View demo logs
docker logs ls-demo-app

# Check reset schedule
cat /var/lib/docker/volumes/*/demo-snapshot/_data/demo_snapshot.sql | head
```

## Troubleshooting

### Database Connection Issues

**Error:** `Can't connect to MySQL server on 'demo-db'`

- Ensure MariaDB container is running: `docker-compose -f docker-compose.demo.yml ps`
- Check database environment variables in `.env.demo`
- Wait 10-15 seconds after startup for database to be ready

### Snapshot Not Created

**Error:** `Demo snapshot not found at /app/snapshots/demo_snapshot.sql`

```bash
# Manually create snapshot
docker-compose -f docker-compose.demo.yml exec demo-app \
  mysqldump -h demo-db -u demo_user -p<password> demo_db > /app/snapshots/demo_snapshot.sql
```

### Reset Not Triggering

- Check that entrypoint.demo.sh is executable: `docker-compose -f docker-compose.demo.yml exec demo-app ls -la /app/entrypoint.demo.sh`
- Verify timezone is UTC on container: `docker-compose -f docker-compose.demo.yml exec demo-app date -u`
- Check logs: `docker-compose -f docker-compose.demo.yml exec demo-app cat /app/logs/demo_reset.log`

### Credentials Not Displaying on Login

- Verify `DEMO_MODE=True` in `.env.demo`
- Clear browser cache
- Check that `demo_info.html` template is in correct location
- Verify login template includes demo banner code

## Performance Considerations

- **Database Reset Time:** ~5-10 seconds for typical snapshot restore
- **Container Startup:** ~40 seconds for migrations + seeding on first run
- **Health Check:** Configured to allow 40s startup grace period
- **Memory:** Allocate minimum 2GB RAM for demo-app, 1GB for MariaDB

## Security Notes

- All demo data is synthetic with no real PII
- Demo credentials are intentionally weak and public
- Demo database is isolated from production via separate network
- CSRF and CORS are configured for demo domain only
- SSL/TLS handled by Traefik in production

## Maintenance

### Weekly Tasks

- Monitor demo environment health: `curl https://demo.leaguesphere.app/health/`
- Check disk usage for database volume
- Review reset logs for errors

### Monthly Tasks

- Update seed data if new features added
- Regenerate snapshot if database schema changed
- Verify all demo accounts still work correctly

### Before Major Releases

- Test entire demo flow in staging
- Update seed data to showcase new features
- Test reset mechanism explicitly
- Verify all demo accounts have appropriate permissions
