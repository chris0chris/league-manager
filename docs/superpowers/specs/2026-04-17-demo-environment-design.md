# Demo Environment Design

**Date:** 2026-04-17  
**Status:** Draft  
**Purpose:** Public demo environment for customers/prospects with daily reset and privacy-conform data

## Overview

The demo environment is an isolated, containerized instance of leaguesphere accessible to the public at `demo.leaguesphere.app`. It provides a fully functional demo with predefined accounts, realistic synthetic data, and automatic daily resets to a clean state. Unlike stage, the demo has no connection to production data and is designed for public access.

## Architecture

The demo consists of:
- **Demo app container** – Django application with demo-specific configuration
- **Demo nginx container** – Reverse proxy serving the demo domain
- **Demo MariaDB container** – Dedicated database, isolated from stage/prod
- **Reset mechanism** – Built into the app container, triggers at midnight

All components run within a separate Docker Compose setup (`docker-compose.demo.yml`) on a dedicated network, preventing cross-contamination with stage or production environments.

## Docker & Container Setup

### Configuration Files

**`docker-compose.demo.yml`**
- Reuses existing `app.Dockerfile` and `nginx.Dockerfile`
- Sets environment variable: `DJANGO_SETTINGS_MODULE=league_manager.settings.demo`
- Defines demo-specific services: app, nginx, mariadb
- All services on isolated `demo-network`
- Database volume mounted at a demo-specific path

**`league_manager/settings/demo.py`**
- Inherits from `base.py`
- Overrides database configuration (demo host/name)
- Sets `ALLOWED_HOSTS` and `CSRF_TRUSTED_ORIGINS` for `demo.leaguesphere.app`
- Disables email sending (prevents external email on demo)
- Adds optional UI watermark/banner indicating demo mode
- Disables any production integrations (payments, external APIs)

### Database Initialization

On first container startup:
1. Run Django migrations
2. Execute `manage.py seed_demo_data` to populate the database with synthetic data
3. Create a SQL snapshot file (`/app/demo_snapshot.sql`) from the seeded database
4. Start the Django application

The snapshot file is stored in the container and persists across restarts (part of the image or a mounted volume).

## Demo Data Structure

### Semantic Alignment

Demo data mirrors production schema exactly to ensure feature parity:
- All required fields match production
- Relationships and constraints match production
- Data types and formats match production
- No schema differences between demo and production

### Data Generation

A new Django management command `manage.py seed_demo_data` generates:
- **Teams & organizations** with randomly generated synthetic names (e.g., "Phoenix United", "Stellar Strikers", "Velocity FC")
- **User accounts by role:** admin, referee, team managers, regular users (see Credentials section)
- **Matches & game data** with realistic but fictional statistics
- **Standings, rankings, and leaderboards** populated with generated results
- **Historical data** to make the demo feel lived-in

### Privacy Compliance

All generated data is completely synthetic with no real information:
- No real names, email addresses, or phone numbers from production
- All emails use `@demo.local` domain
- No PII from any source (no anonymized production data)
- Team/player names are randomly generated or use placeholder patterns
- Addresses, if needed, use fake valid formats or fictional locations

The generation is deterministic (same seed produces same data) ensuring reproducible resets.

## Daily Reset Mechanism

### Reset Process

At midnight UTC, the demo database is reset to a clean state:

1. **App entrypoint script** checks the current time at container startup
2. If past the last reset time (stored in a flag file or database), triggers reset:
   - Stop the Django application
   - Drop the demo database
   - Restore from `demo_snapshot.sql`
   - Start Django application
3. Container continues running; request handling resumes immediately

### Implementation Options

**Option A: Entrypoint Script (Recommended)**
- Add logic to the app container's entrypoint script
- Uses a simple timestamp check or timezone-aware logic
- Lightweight, no additional dependencies

**Option B: In-Container Cron**
- Run a lightweight cron daemon (busybox crond or similar) in the app container
- Scheduled task triggers reset SQL restore at midnight
- More explicit scheduling but adds process overhead

### Snapshot Management

- **Snapshot creation:** `demo_snapshot.sql` generated once at image build time (or first run)
- **Snapshot storage:** Embedded in the image or stored in a volume
- **Snapshot updates:** Manually regenerated if demo data needs to change (e.g., new features, updated seed script)
- **Reset speed:** SQL restore typically completes in seconds

## Predefined Credentials

Four demo accounts are created during seeding, each with a specific role:

| Username | Password | Role | Purpose |
|----------|----------|------|---------|
| `admin@demo.local` | `DemoAdmin123!` | Administrator | Full system access, user management |
| `referee@demo.local` | `DemoRef123!` | Referee | Match officiating, scoring |
| `manager@demo.local` | `DemoMgr123!` | Team Manager | Team management, roster control |
| `user@demo.local` | `DemoUser123!` | Regular User | Viewing standings, league info |

### Credential Display

Credentials are prominently displayed on the login page via one of:
1. **Dismissible banner** below the login form
2. **Credentials box** on the login sidebar
3. **Link to `/demo-info/`** page with instructions and credentials

The display clearly indicates these are demo accounts for testing purposes.

## Routing & Networking

### Traefik Configuration

Add route for demo domain:
- **Hostname:** `demo.leaguesphere.app`
- **Service:** demo nginx container
- **TLS:** Standard HTTPS certificate (same as stage/prod)

### Docker Network

- All demo services (app, nginx, mariadb) on isolated `demo-network`
- Database not exposed to host or external networks
- Communication between services via internal Docker DNS

### Visual Indicator

Demo environment displays a clear indicator to users (e.g., banner, watermark) showing they're on a demo with data that resets daily. This prevents confusion between demo and production.

## Deployment & Operations

### Startup

```bash
docker-compose -f docker-compose.demo.yml up -d
```

This pulls/builds images, creates volumes, runs migrations, seeds data, and starts all services.

### Reset Testing

To manually trigger a reset:
```bash
docker-compose -f docker-compose.demo.yml down
docker-compose -f docker-compose.demo.yml up -d
```

Or, within the container, manually restore the snapshot:
```bash
mysql demo_db < /app/demo_snapshot.sql
```

### Monitoring

- Check demo service health via Docker health checks (standard ping to `/health/`)
- Monitor reset events in application logs
- Verify credentials still work post-reset

## Files & Changes Summary

### LeagueSphere Repository
| File | Change | Purpose |
|------|--------|---------|
| `docker-compose.demo.yml` | Create | Demo environment with Traefik labels |
| `league_manager/settings/demo.py` | Create | Django settings for demo |
| `league_manager/management/commands/seed_demo_data.py` | Create | Synthetic data generation |
| `app.Dockerfile` | Modify | Add entrypoint.demo.sh |
| `container/entrypoint.demo.sh` | Create | Midnight reset logic |
| `container/nginx.demo.conf` | Create | Demo nginx configuration |
| `docs/demo-info.md` | Create | Public demo documentation |
| `docs/guides/demo-deployment.md` | Create | Deployment and troubleshooting |
| Tests | Create | Integration and unit tests |

### Infrastructure Repository (Ansible)
| File | Change | Purpose |
|------|--------|---------|
| `plays/vars/secret_demo.yaml` | Create | Demo configuration and secrets |
| `plays/roles/ls_demo/` | Create | Complete ansible role |
| `plays/roles/ls_demo/tasks/main.yaml` | Create | Task orchestrator |
| `plays/roles/ls_demo/tasks/pull.yaml` | Copy from ls_app | Git pull logic |
| `plays/roles/ls_demo/tasks/env.yaml` | Copy from ls_app | Environment setup |
| `plays/roles/ls_demo/tasks/deploy.yaml` | Create | Docker compose deployment |
| `plays/roles/ls_demo/templates/docker.env.j2` | Copy from ls_app | Docker env template |
| `plays/roles/ls_demo/templates/ls.env.j2` | Copy from ls_app | Django env template |
| `plays/roles/ls_demo/defaults/main.yaml` | Create | Role defaults |
| `plays/leaguesphere.yml` | Modify | Add ls_demo role calls |

## Success Criteria

- ✅ Demo environment accessible at `demo.leaguesphere.app`
- ✅ All features work identically to production
- ✅ Four role-based demo accounts with displayed credentials
- ✅ Database automatically resets at midnight to clean state
- ✅ No production or identifiable data in demo database
- ✅ Reset completes within 10 seconds
- ✅ Demo indicates it's a demo environment on all pages

## Known Constraints

- Reset happens at midnight UTC; adjust timezone if needed for different reset time
- Snapshot regeneration requires manual rebuild of the Docker image
- If seed script is updated, image must be rebuilt and snapshot regenerated
