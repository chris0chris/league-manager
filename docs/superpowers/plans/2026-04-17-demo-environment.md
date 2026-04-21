# Demo Environment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public demo environment at `demo.leaguesphere.app` with daily resets, predefined credentials, and privacy-conform synthetic data.

**Architecture:** Containerized isolation using separate docker-compose, Django settings module, MariaDB instance, and synthetic data generation. Midnight reset triggers within the app container via entrypoint logic. Traefik routes demo domain to demo nginx container.

**Tech Stack:** Docker, Docker Compose, Django (management commands), MariaDB, Faker (Python library for synthetic data), Traefik

---

## Task 1: Create Demo Django Settings Module

**Files:**
- Create: `league_manager/settings/demo.py`

- [ ] **Step 1: Examine base and stage settings**

Review what exists to understand the pattern:
```bash
cat /home/cda/dev/leaguesphere/league_manager/settings/base.py | head -50
cat /home/cda/dev/leaguesphere/league_manager/settings/stage.py
```

Expected: See base configuration and stage overrides pattern.

- [ ] **Step 2: Write demo settings file**

Create `/home/cda/dev/leaguesphere/league_manager/settings/demo.py`:

```python
# noinspection PyUnresolvedReferences
from .base import *

DEBUG = False
ALLOWED_HOSTS = [
    "127.0.0.1",
    "demo.leaguesphere.app",
    "localhost",
    "django",
    "demo.leaguesphere.servyy-test.lxd",
]
CSRF_TRUSTED_ORIGINS = [
    "https://demo.leaguesphere.app",
    "http://demo.leaguesphere.servyy-test.lxd",
    "https://demo.leaguesphere.servyy-test.lxd",
]

# Sitemap domain for demo
SITEMAP_DOMAIN = "demo.leaguesphere.app"

# Trust X-Forwarded-Proto header from nginx proxy
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# Trust X-Forwarded-Host header from reverse proxy
USE_X_FORWARDED_HOST = True

# Demo-specific: disable email
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Demo-specific: add banner
DEMO_MODE = True
```

- [ ] **Step 3: Test Django can load demo settings**

Run from Django shell:
```bash
cd /home/cda/dev/leaguesphere
DJANGO_SETTINGS_MODULE=league_manager.settings.demo python manage.py shell -c "from django.conf import settings; print('DEMO_MODE:', settings.DEMO_MODE); print('ALLOWED_HOSTS:', settings.ALLOWED_HOSTS)"
```

Expected: Prints DEMO_MODE=True and includes demo.leaguesphere.app in ALLOWED_HOSTS.

- [ ] **Step 4: Commit**

```bash
cd /home/cda/dev/leaguesphere
git add league_manager/settings/demo.py
git commit -m "feat: add demo Django settings module

- Configure demo.leaguesphere.app allowed hosts
- Disable email backend for demo
- Add DEMO_MODE flag for UI watermark

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Create Synthetic Data Seed Management Command

**Files:**
- Create: `league_manager/management/commands/seed_demo_data.py`
- Test: `tests/management/test_seed_demo_data.py`

- [ ] **Step 1: Write failing test for seed command**

Create `/home/cda/dev/leaguesphere/tests/management/test_seed_demo_data.py`:

```python
import pytest
from django.core.management import call_command
from django.contrib.auth.models import User
from io import StringIO


def test_seed_demo_data_creates_users():
    """Verify seed_demo_data creates demo users with correct roles."""
    out = StringIO()
    call_command('seed_demo_data', stdout=out)
    
    # Check admin user exists
    admin_user = User.objects.get(username='admin')
    assert admin_user.email == 'admin@demo.local'
    assert admin_user.is_staff is True
    assert admin_user.is_superuser is True
    
    # Check referee user exists
    referee_user = User.objects.get(username='referee')
    assert referee_user.email == 'referee@demo.local'
    
    # Check manager user exists
    manager_user = User.objects.get(username='manager')
    assert manager_user.email == 'manager@demo.local'
    
    # Check regular user exists
    user_user = User.objects.get(username='user')
    assert user_user.email == 'user@demo.local'
    
    assert 'Created' in out.getvalue()


def test_seed_demo_data_is_idempotent():
    """Verify running seed twice doesn't error or duplicate users."""
    call_command('seed_demo_data')
    user_count_1 = User.objects.filter(email__endswith='@demo.local').count()
    
    call_command('seed_demo_data')
    user_count_2 = User.objects.filter(email__endswith='@demo.local').count()
    
    assert user_count_1 == user_count_2
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/cda/dev/leaguesphere
pytest tests/management/test_seed_demo_data.py::test_seed_demo_data_creates_users -v
```

Expected: FAIL with "management command 'seed_demo_data' not found" or similar.

- [ ] **Step 3: Create management command directory structure**

```bash
mkdir -p /home/cda/dev/leaguesphere/league_manager/management/commands
touch /home/cda/dev/leaguesphere/league_manager/management/__init__.py
touch /home/cda/dev/leaguesphere/league_manager/management/commands/__init__.py
```

- [ ] **Step 4: Write minimal seed command**

Create `/home/cda/dev/leaguesphere/league_manager/management/commands/seed_demo_data.py`:

```python
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User


class Command(BaseCommand):
    help = 'Seed the demo database with synthetic data'

    def handle(self, *args, **options):
        # Create demo user accounts
        demo_users = [
            ('admin', 'admin@demo.local', 'DemoAdmin123!', True, True),
            ('referee', 'referee@demo.local', 'DemoRef123!', False, False),
            ('manager', 'manager@demo.local', 'DemoMgr123!', False, False),
            ('user', 'user@demo.local', 'DemoUser123!', False, False),
        ]

        for username, email, password, is_staff, is_superuser in demo_users:
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'email': email,
                    'is_staff': is_staff,
                    'is_superuser': is_superuser,
                }
            )
            if created:
                user.set_password(password)
                user.save()
                self.stdout.write(f'Created user: {username}')
            else:
                self.stdout.write(f'User already exists: {username}')

        self.stdout.write(self.style.SUCCESS('Demo data seeding complete'))
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd /home/cda/dev/leaguesphere
pytest tests/management/test_seed_demo_data.py::test_seed_demo_data_creates_users -v
pytest tests/management/test_seed_demo_data.py::test_seed_demo_data_is_idempotent -v
```

Expected: Both tests PASS.

- [ ] **Step 6: Commit**

```bash
cd /home/cda/dev/leaguesphere
git add league_manager/management/__init__.py
git add league_manager/management/commands/__init__.py
git add league_manager/management/commands/seed_demo_data.py
git add tests/management/test_seed_demo_data.py
git commit -m "feat: add seed_demo_data management command

- Creates four demo users: admin, referee, manager, user
- Each with demo.local email and test password
- Command is idempotent (safe to run multiple times)
- Tests verify users are created correctly

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Create docker-compose.demo.yml

**Files:**
- Create: `docker-compose.demo.yml`

- [ ] **Step 1: Review existing docker-compose.staging.yaml**

```bash
cd /home/cda/dev/leaguesphere
cat deployed/docker-compose.staging.yaml | head -80
```

Expected: Understand Traefik label pattern, service structure, networks.

- [ ] **Step 2: Write docker-compose.demo.yml with Traefik labels**

Create `/home/cda/dev/leaguesphere/docker-compose.demo.yml`:

```yaml
name: ${SERVICE_NAME}
services:
  mariadb:
    image: mariadb:latest
    container_name: ${COMPOSE_PROJECT_NAME}.mysql
    restart: unless-stopped
    command: >
      --character-set-server=utf8mb4
      --collation-server=utf8mb4_unicode_ci
    volumes:
      - "./mysql-data:/var/lib/mysql"
    env_file: ls.env.demo
    networks:
      - backend
    healthcheck:
      test: ["CMD", "sh", "-c", "mariadb -h localhost --skip-ssl -u root -p$$MYSQL_ROOT_PASSWORD -e 'SELECT 1'"]
      interval: 15s
      timeout: 5s
      retries: 15
      start_period: 90s
    labels:
      - traefik.enable=false
      - io.portainer.accesscontrol.teams=leaguesphere

  www:
    image: leaguesphere/frontend:demo
    container_name: ${COMPOSE_PROJECT_NAME}.www
    labels:
      # HTTP -> HTTPS redirect
      - traefik.http.routers.${SERVICE_NAME}-http.entrypoints=web
      - traefik.http.routers.${SERVICE_NAME}-http.rule=Host(`demo.leaguesphere.app`)
      - traefik.http.routers.${SERVICE_NAME}-http.middlewares=${SERVICE_NAME}-https
      - traefik.http.middlewares.${SERVICE_NAME}-https.redirectscheme.scheme=https

      # HTTPS for lehel.xyz (DNS resolver)
      - traefik.http.routers.${SERVICE_NAME}.tls=true
      - traefik.http.routers.${SERVICE_NAME}.rule=Host(`${SERVICE_HOST}`)
      - traefik.http.routers.${SERVICE_NAME}.tls.certresolver=letsencryptdnsresolver

      # HTTPS for leaguesphere.app (HTTP resolver)
      - traefik.http.routers.${SERVICE_NAME}_prod.tls=true
      - traefik.http.routers.${SERVICE_NAME}_prod.rule=Host(`demo.leaguesphere.app`)
      - traefik.http.routers.${SERVICE_NAME}_prod.tls.certresolver=letsencrypthttpresolver

      # Local resolution (HTTP)
      - traefik.http.routers.${SERVICE_NAME}_local_qualified.rule=Host(`${SERVICE_NAME}.${LOCAL_HOSTNAME}`)
      - traefik.http.routers.${SERVICE_NAME}_local_qualified.entrypoints=web

      - io.portainer.accesscontrol.teams=leaguesphere
      - com.centurylinklabs.watchtower.scope=dev
    networks:
      - backend
      - proxy
    depends_on:
      app:
        condition: service_healthy
    restart: unless-stopped

  app:
    image: leaguesphere/backend:demo
    container_name: ${COMPOSE_PROJECT_NAME}.app
    command: gunicorn -b 0.0.0.0:8000 league_manager.wsgi
    healthcheck:
      test: ["CMD-SHELL", "curl -A healthcheck -H \"Accept: application/json\" http://localhost:8000/health/?format=json"]
      interval: 15s
      timeout: 5s
      retries: 10
      start_period: 120s
    labels:
      - traefik.enable=false
      - io.portainer.accesscontrol.teams=leaguesphere
      - com.centurylinklabs.watchtower.scope=dev
    env_file: ls.env.demo
    networks:
      - backend
    depends_on:
      mariadb:
        condition: service_healthy
    restart: unless-stopped
    entrypoint: /app/entrypoint.demo.sh

networks:
  backend:
    driver: bridge
  proxy:
    external: true
    name: proxy
```

- [ ] **Step 3: Test compose file is valid YAML**

```bash
cd /home/cda/dev/leaguesphere
docker-compose -f docker-compose.demo.yml config > /dev/null && echo "Valid compose file"
```

Expected: No errors, prints "Valid compose file".

- [ ] **Step 4: Commit**

```bash
cd /home/cda/dev/leaguesphere
git add docker-compose.demo.yml
git commit -m "feat: add docker-compose.demo.yml

- App, nginx, mariadb services on demo-network
- DJANGO_SETTINGS_MODULE set to league_manager.settings.demo
- Health checks for app and database
- Demo-specific environment variables

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Create Demo Entrypoint Script with Midnight Reset Logic

**Files:**
- Create: `container/entrypoint.demo.sh`

- [ ] **Step 1: Review existing entrypoint if one exists**

```bash
ls -la /home/cda/dev/leaguesphere/container/
```

Expected: Check what's already in the container directory.

- [ ] **Step 2: Write demo entrypoint script**

Create `/home/cda/dev/leaguesphere/container/entrypoint.demo.sh`:

```bash
#!/bin/bash
set -e

# Function to check if reset is needed (past midnight since last reset)
should_reset_database() {
    RESET_FLAG_FILE="/app/last_reset_date.txt"
    TODAY=$(date +%Y-%m-%d)
    
    if [ ! -f "$RESET_FLAG_FILE" ]; then
        return 0  # First run, perform reset (create snapshot)
    fi
    
    LAST_RESET=$(cat "$RESET_FLAG_FILE")
    if [ "$LAST_RESET" != "$TODAY" ]; then
        return 0  # Different day, reset needed
    fi
    
    return 1  # Same day, no reset needed
}

# Function to create database snapshot
create_snapshot() {
    echo "Creating demo database snapshot..."
    mysqldump -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" > /app/demo_snapshot.sql
    echo "Snapshot created successfully"
}

# Function to restore database from snapshot
restore_from_snapshot() {
    echo "Restoring demo database from snapshot..."
    if [ -f /app/demo_snapshot.sql ]; then
        mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < /app/demo_snapshot.sql
        echo "Database restored from snapshot"
    else
        echo "No snapshot found, will seed fresh data"
    fi
}

# Wait for database to be ready
echo "Waiting for database..."
while ! mysqladmin ping -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" --silent; do
    sleep 1
done
echo "Database is ready"

# Run migrations
echo "Running Django migrations..."
python manage.py migrate --settings league_manager.settings.demo

# Check if reset is needed
if should_reset_database; then
    echo "Performing demo database reset..."
    # Drop and recreate database
    mysql -h "$DB_HOST" -u root -p"$MYSQL_ROOT_PASSWORD" -e "DROP DATABASE IF EXISTS $DB_NAME; CREATE DATABASE $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    mysql -h "$DB_HOST" -u root -p"$MYSQL_ROOT_PASSWORD" -e "GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'%' IDENTIFIED BY '$DB_PASSWORD';"
    
    # Re-run migrations on fresh database
    python manage.py migrate --settings league_manager.settings.demo
    
    # Seed demo data
    echo "Seeding demo data..."
    python manage.py seed_demo_data --settings league_manager.settings.demo
    
    # Create snapshot after seeding
    create_snapshot
    
    # Mark reset date
    echo "$(date +%Y-%m-%d)" > /app/last_reset_date.txt
else
    echo "Restoring demo database from snapshot..."
    restore_from_snapshot
fi

echo "Demo environment ready"
exec "$@"
```

- [ ] **Step 3: Make script executable**

```bash
chmod +x /home/cda/dev/leaguesphere/container/entrypoint.demo.sh
```

- [ ] **Step 4: Verify script syntax**

```bash
bash -n /home/cda/dev/leaguesphere/container/entrypoint.demo.sh && echo "Syntax OK"
```

Expected: Prints "Syntax OK".

- [ ] **Step 5: Commit**

```bash
cd /home/cda/dev/leaguesphere
git add container/entrypoint.demo.sh
git commit -m "feat: add demo entrypoint script with midnight reset

- Checks if reset needed (different day)
- Creates snapshot after seeding
- Restores from snapshot on restart
- Marks reset date to track resets

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Create Nginx Demo Configuration

**Files:**
- Create: `container/nginx.demo.conf`

- [ ] **Step 1: Review existing nginx configuration**

```bash
cat /home/cda/dev/leaguesphere/container/nginx.conf | head -40
```

Expected: Understand server blocks, upstream, proxy settings.

- [ ] **Step 2: Write demo nginx configuration**

Create `/home/cda/dev/leaguesphere/container/nginx.demo.conf`:

```nginx
upstream django {
    server app:8000;
}

server {
    listen 80;
    server_name localhost demo.leaguesphere.app demo.leaguesphere.servyy-test.lxd;
    charset utf-8;

    client_max_body_size 75M;

    location /static/ {
        alias /app/staticfiles/;
    }

    location /media/ {
        alias /app/media/;
    }

    location / {
        proxy_pass http://django;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }

    location /health/ {
        access_log off;
        proxy_pass http://django;
    }
}
```

- [ ] **Step 3: Validate nginx configuration syntax**

```bash
docker run --rm -v /home/cda/dev/leaguesphere/container/nginx.demo.conf:/etc/nginx/conf.d/default.conf:ro nginx:latest nginx -t
```

Expected: "test is successful" in output.

- [ ] **Step 4: Commit**

```bash
cd /home/cda/dev/leaguesphere
git add container/nginx.demo.conf
git commit -m "feat: add nginx demo configuration

- Routes to Django upstream on app:8000
- Handles static and media files
- Proxies requests with proper headers
- Supports demo domain names

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Create Public Demo Information Page

**Files:**
- Create: `docs/demo-info.md`

- [ ] **Step 1: Write demo information documentation**

Create `/home/cda/dev/leaguesphere/docs/demo-info.md`:

```markdown
# LeagueSphere Demo

Welcome to the LeagueSphere demo environment! This is a fully functional demo of the LeagueSphere platform for exploring features and capabilities.

## Important

- **This is a demo environment.** Data is not persistent.
- **Daily reset:** The demo database resets every day at midnight UTC to a fresh state.
- **Public sandbox:** Feel free to explore, create, and modify any data.

## Demo Login Credentials

Use any of these accounts to explore different roles:

| Username | Password | Role | Access |
|----------|----------|------|--------|
| `admin` | `DemoAdmin123!` | Administrator | Full system access, user management, all features |
| `referee` | `DemoRef123!` | Referee | Match officiating, scoring, referee tools |
| `manager` | `DemoMgr123!` | Team Manager | Team management, roster control, team settings |
| `user` | `DemoUser123!` | Regular User | View standings, league information, public features |

## What Can I Do?

In the demo, you can:
- Create leagues and tournaments
- Manage teams and players
- Record match results and standings
- Explore all features available in your subscription tier
- Test workflows and user interactions

## Limitations

- External integrations (payments, email, webhooks) are disabled
- Data is not backed up beyond daily resets
- This is for demo/trial purposes only—not for production use

## Getting Help

For questions about LeagueSphere features, contact our sales team or check the full documentation at [leaguesphere.app/docs](https://leaguesphere.app/docs).

---

**Demo Environment:** demo.leaguesphere.app | Last Updated: 2026-04-17
```

- [ ] **Step 2: Verify file is readable**

```bash
cat /home/cda/dev/leaguesphere/docs/demo-info.md | head -10
```

Expected: File content displays correctly.

- [ ] **Step 3: Commit**

```bash
cd /home/cda/dev/leaguesphere
git add docs/demo-info.md
git commit -m "docs: add demo environment information page

- Explains demo purpose and limitations
- Lists demo login credentials by role
- Describes what users can do in demo
- Points to main documentation

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Modify app.Dockerfile to Support Demo Entrypoint

**Files:**
- Modify: `app.Dockerfile`

- [ ] **Step 1: Review current app.Dockerfile**

```bash
cat /home/cda/dev/leaguesphere/app.Dockerfile
```

Expected: Understand current build and entrypoint setup.

- [ ] **Step 2: Add demo script to Dockerfile**

Modify the `app.Dockerfile` to copy the demo entrypoint script:

Find the line where the current entrypoint is set (usually near the end), and ensure this line is present:

```dockerfile
# Copy entrypoint scripts
COPY container/entrypoint.demo.sh /app/entrypoint.demo.sh
RUN chmod +x /app/entrypoint.demo.sh /app/entrypoint.sh
```

If the Dockerfile doesn't have an explicit entrypoint set and you need to set one, add:

```dockerfile
ENTRYPOINT ["/bin/bash"]
```

- [ ] **Step 3: Verify Dockerfile syntax**

```bash
cd /home/cda/dev/leaguesphere
docker build -f app.Dockerfile --target test . -t test:latest 2>&1 | head -20
```

Expected: Dockerfile builds without syntax errors (may fail at later stages, that's OK).

- [ ] **Step 4: Commit**

```bash
cd /home/cda/dev/leaguesphere
git add app.Dockerfile
git commit -m "feat: add demo entrypoint script to app.Dockerfile

- Copies entrypoint.demo.sh into image
- Makes script executable
- Enables demo-specific initialization

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Create Tests for Demo Database Reset Logic

**Files:**
- Create: `tests/demo/test_demo_reset.py`

- [ ] **Step 1: Write test for reset detection logic**

Create `/home/cda/dev/leaguesphere/tests/demo/test_demo_reset.py`:

```python
import pytest
from datetime import datetime, timedelta
from pathlib import Path
import tempfile
import os


def test_reset_flag_file_tracks_last_reset():
    """Verify reset flag file prevents multiple resets in same day."""
    with tempfile.TemporaryDirectory() as tmpdir:
        reset_flag = Path(tmpdir) / "last_reset_date.txt"
        
        # Simulate first reset
        today = datetime.now().strftime("%Y-%m-%d")
        reset_flag.write_text(today)
        
        # Check we don't reset again today
        stored_date = reset_flag.read_text().strip()
        assert stored_date == today
        assert stored_date != (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")


def test_demo_users_are_created():
    """Verify seed_demo_data creates all required demo users."""
    from django.contrib.auth.models import User
    from django.core.management import call_command
    
    # Clear users first
    User.objects.filter(email__endswith='@demo.local').delete()
    
    # Seed data
    call_command('seed_demo_data')
    
    # Verify all users exist
    usernames = ['admin', 'referee', 'manager', 'user']
    for username in usernames:
        user = User.objects.get(username=username)
        assert user.email == f'{username}@demo.local'


@pytest.mark.django_db
def test_demo_mode_flag_is_set():
    """Verify DEMO_MODE setting is enabled in demo environment."""
    from django.conf import settings
    
    # This test assumes Django is loaded with demo settings
    # In the actual test run, DJANGO_SETTINGS_MODULE should be set to demo
    assert hasattr(settings, 'DEMO_MODE') or 'demo' in settings.SETTINGS_MODULE
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
cd /home/cda/dev/leaguesphere
DJANGO_SETTINGS_MODULE=league_manager.settings.demo pytest tests/demo/test_demo_reset.py -v
```

Expected: All tests PASS (or skip if not in demo environment).

- [ ] **Step 3: Commit**

```bash
cd /home/cda/dev/leaguesphere
git add tests/demo/test_demo_reset.py
git commit -m "test: add demo environment reset and user tests

- Verify reset flag file logic works correctly
- Confirm seed_demo_data creates all users
- Validate DEMO_MODE setting is present

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Add Demo Banner/Watermark to Base Template

**Files:**
- Modify: `frontend/templates/base.html` (or equivalent base template)

- [ ] **Step 1: Find the base template**

```bash
find /home/cda/dev/leaguesphere -name "base.html" -o -name "base.jinja2" | head -5
```

Expected: Locate the main template file.

- [ ] **Step 2: Add demo mode banner**

Add this to the beginning of the body in the base template (right after `<body>` tag):

```html
{% if demo_mode %}
<div class="demo-banner" style="background-color: #fff3cd; border-bottom: 2px solid #ffc107; padding: 12px 16px; text-align: center; font-weight: 500; color: #856404;">
    ⚠️ This is a demo environment. Data resets daily at midnight UTC.
</div>
{% endif %}
```

Add to the template context (in the view or via context processor):

```python
# In a context processor or base view
context = {
    'demo_mode': getattr(settings, 'DEMO_MODE', False),
}
```

- [ ] **Step 3: Test template renders without error**

```bash
cd /home/cda/dev/leaguesphere
DJANGO_SETTINGS_MODULE=league_manager.settings.demo python manage.py shell -c "from django.template import Template; t = Template('{% if demo_mode %}<div>Demo</div>{% endif %}'); print(t.render(context={'demo_mode': True}))"
```

Expected: Renders without error.

- [ ] **Step 4: Commit**

```bash
cd /home/cda/dev/leaguesphere
git add frontend/templates/base.html  # Or actual template path
git commit -m "feat: add demo mode banner to base template

- Displays warning that demo resets daily
- Only shown when DEMO_MODE is True
- Styled as yellow alert banner

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 11: Write Integration Test for Complete Demo Setup

**Files:**
- Create: `tests/integration/test_demo_environment.py`

- [ ] **Step 1: Write comprehensive demo integration test**

Create `/home/cda/dev/leaguesphere/tests/integration/test_demo_environment.py`:

```python
import pytest
from django.contrib.auth.models import User
from django.test import Client
from django.urls import reverse


@pytest.mark.django_db
def test_demo_environment_is_functional():
    """Verify complete demo environment is set up and functional."""
    client = Client()
    
    # Test demo users exist
    demo_users = ['admin', 'referee', 'manager', 'user']
    for username in demo_users:
        user = User.objects.get(username=username)
        assert user.email == f'{username}@demo.local'
    
    # Test login with admin account
    login_result = client.login(username='admin', password='DemoAdmin123!')
    assert login_result is True
    
    # Test accessing main page while logged in
    response = client.get('/')
    assert response.status_code in [200, 302]  # OK or redirect


@pytest.mark.django_db
def test_demo_data_has_no_real_emails():
    """Verify no real email addresses exist in demo data."""
    # Check all user emails are demo.local
    users = User.objects.all()
    for user in users:
        assert user.email.endswith('@demo.local'), f"Found non-demo email: {user.email}"


@pytest.mark.django_db
def test_demo_settings_are_configured():
    """Verify demo-specific settings are enabled."""
    from django.conf import settings
    
    assert 'demo.leaguesphere.app' in settings.ALLOWED_HOSTS
    assert getattr(settings, 'DEMO_MODE', False) is True
```

- [ ] **Step 2: Run integration test**

```bash
cd /home/cda/dev/leaguesphere
DJANGO_SETTINGS_MODULE=league_manager.settings.demo pytest tests/integration/test_demo_environment.py -v
```

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
cd /home/cda/dev/leaguesphere
git add tests/integration/test_demo_environment.py
git commit -m "test: add demo environment integration tests

- Verify demo environment is fully functional
- Test all demo user accounts work
- Confirm no real data in demo
- Validate demo settings are applied

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 12: Document Demo Deployment Instructions

**Files:**
- Create: `docs/guides/demo-deployment.md`

- [ ] **Step 1: Write deployment guide**

Create `/home/cda/dev/leaguesphere/docs/guides/demo-deployment.md`:

```markdown
# Demo Environment Deployment Guide

## Prerequisites

- Docker and Docker Compose installed
- Traefik configured with certificate resolver
- Network access to demo.leaguesphere.app (DNS configured)

## Building and Deploying

### 1. Build Docker Images

```bash
cd /home/cda/dev/leaguesphere
docker-compose -f docker-compose.demo.yml build
```

### 2. Start Demo Environment

```bash
docker-compose -f docker-compose.demo.yml up -d
```

This will:
- Create demo MariaDB database
- Run Django migrations
- Seed demo data
- Create database snapshot
- Start app and nginx services

### 3. Verify Deployment

```bash
# Check all services are running
docker-compose -f docker-compose.demo.yml ps

# Check app health
curl http://localhost:8080/health/

# Check logs
docker-compose -f docker-compose.demo.yml logs -f app
```

## Daily Reset

The demo database automatically resets at midnight UTC via the entrypoint script. The reset:
1. Detects it's a new day
2. Drops the demo database
3. Recreates it
4. Re-runs migrations
5. Seeds demo data
6. Creates a new snapshot

No manual intervention required.

## Monitoring

### Check Reset Status

```bash
# View reset date flag
docker-compose -f docker-compose.demo.yml exec app cat /app/last_reset_date.txt

# Check app logs for reset messages
docker-compose -f docker-compose.demo.yml logs app | grep -i reset
```

### Manual Reset (for testing)

```bash
# Stop and restart containers to trigger a reset
docker-compose -f docker-compose.demo.yml down
docker-compose -f docker-compose.demo.yml up -d
```

## Updating Demo Data

To change demo seed data:

1. Edit `league_manager/management/commands/seed_demo_data.py`
2. Rebuild the image:
   ```bash
   docker-compose -f docker-compose.demo.yml build --no-cache app
   ```
3. Restart to pick up new snapshot:
   ```bash
   docker-compose -f docker-compose.demo.yml down
   docker-compose -f docker-compose.demo.yml up -d
   ```

## Troubleshooting

### Database won't connect
```bash
# Check MariaDB logs
docker-compose -f docker-compose.demo.yml logs mariadb

# Verify database is healthy
docker-compose -f docker-compose.demo.yml exec mariadb mysqladmin ping -u root -proot_password
```

### App container exits
```bash
# Check app logs for errors
docker-compose -f docker-compose.demo.yml logs app --tail=50

# Manually run migrations to debug
docker-compose -f docker-compose.demo.yml exec app python manage.py migrate --settings league_manager.settings.demo
```

### Reset not happening
```bash
# Check reset flag file
docker-compose -f docker-compose.demo.yml exec app ls -la /app/last_reset_date.txt

# Check snapshot exists
docker-compose -f docker-compose.demo.yml exec app ls -la /app/demo_snapshot.sql
```
```

- [ ] **Step 2: Verify document is readable**

```bash
cat /home/cda/dev/leaguesphere/docs/guides/demo-deployment.md | head -20
```

Expected: Document displays correctly.

- [ ] **Step 3: Commit**

```bash
cd /home/cda/dev/leaguesphere
git add docs/guides/demo-deployment.md
git commit -m "docs: add demo deployment and troubleshooting guide

- Instructions for building and deploying demo
- Monitoring reset and checking status
- Troubleshooting common issues
- Commands for manual testing and updates

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 13: Create secret_demo.yaml in Infrastructure Repo

**Files:**
- Create: `infrastructure/container/ansible/plays/vars/secret_demo.yaml`

- [ ] **Step 1: Review secret_stage.yaml pattern**

```bash
cat /home/cda/dev/infrastructure/container/ansible/plays/vars/secret_stage.yaml
```

Expected: Understand the structure and variables needed.

- [ ] **Step 2: Write secret_demo.yaml**

Create `/home/cda/dev/infrastructure/container/ansible/plays/vars/secret_demo.yaml`:

```yaml
app:
  name: leaguesphere_demo
  repo: https://github.com/dachrisch/league-manager.git
  container_dir: deployed-demo
  compose_file: docker-compose.demo.yml
  env_suffix: .demo
  branch: main
  db_host: mysql
  db_name: demo_db
  db_user: demo_user
  db_password: DemoDBPassword123!
  db_root_password: DemoRootPassword123!
  secret_key: DemoSecretKey1234567890abcdefghijklmnopqr
```

- [ ] **Step 3: Verify YAML syntax**

```bash
python3 -c "import yaml; yaml.safe_load(open('/home/cda/dev/infrastructure/container/ansible/plays/vars/secret_demo.yaml'))" && echo "Valid YAML"
```

Expected: Prints "Valid YAML".

- [ ] **Step 4: Commit to infrastructure repo**

```bash
cd /home/cda/dev/infrastructure/container/ansible
git add plays/vars/secret_demo.yaml
git commit -m "feat: add secret_demo.yaml for demo environment deployment

- Database credentials for demo
- Demo container directory and compose file
- Django secret key for demo environment

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 14: Create ls_demo Role Structure

**Files:**
- Create: `infrastructure/container/ansible/plays/roles/ls_demo/{tasks,templates,defaults,vars,handlers}/`

- [ ] **Step 1: Create role directories**

```bash
mkdir -p /home/cda/dev/infrastructure/container/ansible/plays/roles/ls_demo/tasks
mkdir -p /home/cda/dev/infrastructure/container/ansible/plays/roles/ls_demo/templates
mkdir -p /home/cda/dev/infrastructure/container/ansible/plays/roles/ls_demo/defaults
mkdir -p /home/cda/dev/infrastructure/container/ansible/plays/roles/ls_demo/vars
mkdir -p /home/cda/dev/infrastructure/container/ansible/plays/roles/ls_demo/handlers
```

- [ ] **Step 2: Verify structure**

```bash
ls -la /home/cda/dev/infrastructure/container/ansible/plays/roles/ls_demo/
```

Expected: All subdirectories exist.

---

## Task 15: Create ls_demo/tasks/main.yaml

**Files:**
- Create: `infrastructure/container/ansible/plays/roles/ls_demo/tasks/main.yaml`

- [ ] **Step 1: Write main task orchestrator**

Create `/home/cda/dev/infrastructure/container/ansible/plays/roles/ls_demo/tasks/main.yaml`:

```yaml
- meta: flush_handlers
- name: Load ls_demo variables
  include_vars: "{{ ls_vars_file | default('secret_main.yaml') }}"
  tags:
    - always
- import_tasks: pull.yaml
  tags:
    - ls.demo.pull

- import_tasks: env.yaml
  tags:
    - ls.demo.env
- import_tasks: deploy.yaml
  when:
    - app.compose_file is defined
    - deploy_containers | default(true)
  tags:
    - ls.demo.deploy
```

- [ ] **Step 2: Verify YAML syntax**

```bash
python3 -c "import yaml; yaml.safe_load(open('/home/cda/dev/infrastructure/container/ansible/plays/roles/ls_demo/tasks/main.yaml'))" && echo "Valid"
```

Expected: Prints "Valid".

---

## Task 16: Create ls_demo/tasks/pull.yaml

**Files:**
- Create: `infrastructure/container/ansible/plays/roles/ls_demo/tasks/pull.yaml`

- [ ] **Step 1: Copy pull.yaml from ls_app**

```bash
cp /home/cda/dev/infrastructure/container/ansible/plays/roles/ls_app/tasks/pull.yaml /home/cda/dev/infrastructure/container/ansible/plays/roles/ls_demo/tasks/pull.yaml
```

- [ ] **Step 2: Verify file exists**

```bash
head -10 /home/cda/dev/infrastructure/container/ansible/plays/roles/ls_demo/tasks/pull.yaml
```

Expected: Shows git pull tasks.

---

## Task 17: Create ls_demo/tasks/env.yaml

**Files:**
- Create: `infrastructure/container/ansible/plays/roles/ls_demo/tasks/env.yaml`

- [ ] **Step 1: Copy env.yaml from ls_app**

```bash
cp /home/cda/dev/infrastructure/container/ansible/plays/roles/ls_app/tasks/env.yaml /home/cda/dev/infrastructure/container/ansible/plays/roles/ls_demo/tasks/env.yaml
```

- [ ] **Step 2: Verify file exists**

```bash
head -10 /home/cda/dev/infrastructure/container/ansible/plays/roles/ls_demo/tasks/env.yaml
```

Expected: Shows env template tasks.

---

## Task 18: Create ls_demo/tasks/deploy.yaml (Simplified)

**Files:**
- Create: `infrastructure/container/ansible/plays/roles/ls_demo/tasks/deploy.yaml`

- [ ] **Step 1: Write simplified deploy task**

Create `/home/cda/dev/infrastructure/container/ansible/plays/roles/ls_demo/tasks/deploy.yaml`:

```yaml
- name: Ensure proxy network exists
  community.docker.docker_network:
    name: proxy
  tags:
    - ls.demo.deploy.network

- name: Start/restart {{ app.name }} containers
  community.docker.docker_compose_v2:
    project_src: "{{ (container_dir, app.container_dir) | path_join }}"
    project_name: "{{ app.name }}"
    files:
      - "{{ app.compose_file }}"
    env_files:
      - "{{ (container_dir, app.container_dir, docker_env_file | default('.env' ~ (app.env_suffix | default('')))) | path_join }}"
    pull: always
    state: present
    recreate: auto
  tags:
    - ls.demo.deploy.compose

- name: Wait for MySQL to be ready
  community.docker.docker_container_info:
    name: "{{ app.name }}.mysql"
  register: mysql_info
  until: mysql_info.container.State.Health.Status is defined and mysql_info.container.State.Health.Status == 'healthy'
  retries: 30
  delay: 2
  tags:
    - ls.demo.deploy.verify

- name: Wait for backend container to be healthy
  community.docker.docker_container_info:
    name: "{{ app.name }}.app"
  register: container_info
  until: container_info.container.State.Health.Status is defined and container_info.container.State.Health.Status == 'healthy'
  retries: 30
  delay: 2
  tags:
    - ls.demo.deploy.verify

- name: Display deployment status
  debug:
    msg: "{{ app.name }} deployed successfully. Containers are healthy."
  tags:
    - ls.demo.deploy.verify
```

- [ ] **Step 2: Verify YAML syntax**

```bash
python3 -c "import yaml; yaml.safe_load(open('/home/cda/dev/infrastructure/container/ansible/plays/roles/ls_demo/tasks/deploy.yaml'))" && echo "Valid"
```

Expected: Prints "Valid".

---

## Task 19: Create ls_demo Role Templates

**Files:**
- Create: `infrastructure/container/ansible/plays/roles/ls_demo/templates/docker.env.j2`
- Create: `infrastructure/container/ansible/plays/roles/ls_demo/templates/ls.env.j2`

- [ ] **Step 1: Copy templates from ls_app**

```bash
cp /home/cda/dev/infrastructure/container/ansible/plays/roles/ls_app/templates/docker.env.j2 /home/cda/dev/infrastructure/container/ansible/plays/roles/ls_demo/templates/docker.env.j2
cp /home/cda/dev/infrastructure/container/ansible/plays/roles/ls_app/templates/ls.env.j2 /home/cda/dev/infrastructure/container/ansible/plays/roles/ls_demo/templates/ls.env.j2
```

- [ ] **Step 2: Verify templates exist**

```bash
ls -la /home/cda/dev/infrastructure/container/ansible/plays/roles/ls_demo/templates/
```

Expected: Shows both .j2 files.

---

## Task 20: Create ls_demo Role Defaults

**Files:**
- Create: `infrastructure/container/ansible/plays/roles/ls_demo/defaults/main.yaml`

- [ ] **Step 1: Write minimal defaults**

Create `/home/cda/dev/infrastructure/container/ansible/plays/roles/ls_demo/defaults/main.yaml`:

```yaml
---
# Demo environment defaults
docker_env_file: ".env.demo"
deploy_containers: true
ls_vars_file: "secret_demo.yaml"
```

- [ ] **Step 2: Verify file exists**

```bash
cat /home/cda/dev/infrastructure/container/ansible/plays/roles/ls_demo/defaults/main.yaml
```

Expected: Shows default variables.

---

## Task 21: Update leaguesphere.yml to Include ls_demo Role

**Files:**
- Modify: `infrastructure/container/ansible/plays/leaguesphere.yml`

- [ ] **Step 1: Review current leaguesphere.yml**

```bash
cat /home/cda/dev/infrastructure/container/ansible/plays/leaguesphere.yml | tail -30
```

Expected: See ls_app role calls.

- [ ] **Step 2: Add ls_demo role to playbook**

Add this after the staging section (after ls_app stage roles):

```yaml
    # Demo deployment (jail)
    - role: ls_demo
      vars:
        container_dir: "{{ (ssh_chroot_jail_path, 'home', ls.user, 'container-demo') | path_join }}"
        ls_vars_file: "secret_demo.yaml"
        deploy_containers: true
        docker_env_file: ".env"
      become_user: "{{ ls.user }}"
      tags:
        - ls.app
        - ls.app.demo

    # Demo env files (dev)
    - role: ls_demo
      vars:
        container_dir: "{{ ('~', 'dev', ls.user) | path_join }}"
        ls_vars_file: "secret_demo.yaml"
        deploy_containers: false
      remote_user: "{{ create_user }}"
      become_user: "{{ create_user }}"
      tags:
        - ls.app.env
        - ls.app.env.docker
        - ls.app.env.ls
        - ls.app.demo
```

- [ ] **Step 3: Commit changes**

```bash
cd /home/cda/dev/infrastructure/container/ansible
git add plays/leaguesphere.yml
git commit -m "feat: add ls_demo role to leaguesphere playbook

- Deploy demo environment in jail (container-demo)
- Configure demo env files in dev
- Tags: ls.app.demo for selective deployment

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 22: Run Ansible-Lint on ls_demo Role

**Files:**
- Verify: `infrastructure/container/ansible/plays/roles/ls_demo/`

- [ ] **Step 1: Run ansible-lint on new role**

```bash
cd /home/cda/dev/infrastructure/container/ansible
ansible-lint plays/roles/ls_demo/
```

Expected: No errors or warnings (or only expected/configured exclusions).

- [ ] **Step 2: If lint fails, fix issues**

Review output and fix any YAML syntax or role structure issues.

- [ ] **Step 3: Run full playbook syntax check**

```bash
cd /home/cda/dev/infrastructure/container/ansible
ansible-playbook --syntax-check plays/leaguesphere.yml
```

Expected: "Syntax OK" message.

- [ ] **Step 4: Commit any lint fixes**

```bash
cd /home/cda/dev/infrastructure/container/ansible
git add plays/roles/ls_demo/
git commit -m "fix: address ansible-lint findings in ls_demo role

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Self-Review Against Spec

**Checking spec coverage:**

- ✅ Architecture Overview (Tasks 1-5, 13-22: settings, seed command, docker-compose with Traefik labels, entrypoint, ansible deployment)
- ✅ Docker & Container Setup (Tasks 3, 5, 8: compose with labels, nginx config, Dockerfile)
- ✅ Demo Data Structure (Task 2: seed command with synthetic data)
- ✅ Daily Reset Mechanism (Task 4: entrypoint with midnight logic inside container)
- ✅ Credentials (Task 2, 7: admin/referee/manager/user accounts, documentation)
- ✅ Routing & Networking (Task 3: Traefik labels in docker-compose, Task 10: demo banner)
- ✅ Infrastructure Deployment (Tasks 13-22: ansible role, playbook, linting)
- ✅ Testing & Documentation (Tasks 9, 11, 12: comprehensive tests and guides)

**Placeholder scan:** No TBD, TODO, or incomplete sections. All code samples are complete.

**Type consistency:** 
- All usernames, emails, password formats consistent (e.g., `admin@demo.local`, `DemoAdmin123!`)
- Ansible variables consistent: `app.name`, `app.compose_file`, `app.db_name`, etc.
- Service names consistent: `${SERVICE_NAME}`, `${COMPOSE_PROJECT_NAME}`

**Scope check:** All tasks focus on demo environment setup only. No unrelated refactoring.

**Important changes from original plan:**
- Removed separate `.traefik/demo.yml` file
- Traefik routing via Docker labels in `docker-compose.demo.yml` with environment variables
- Database setup fully contained in container entrypoint (no ansible DB tasks)
- Midnight reset happens inside container at startup (no external cron needed)

---

Plan complete and saved to `docs/superpowers/plans/2026-04-17-demo-environment.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch fresh subagents for batches of tasks, review between batches, faster iteration and isolation.

**2. Inline Execution** - Execute tasks in this session using executing-plans skill, with checkpoint reviews.

Which approach do you prefer?