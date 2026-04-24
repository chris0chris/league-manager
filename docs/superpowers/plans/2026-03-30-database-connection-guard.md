# Database Connection Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent application crashes and container restarts when the database is unreachable by implementing a proactive connection guard and a resilient health check.

**Architecture:** A new middleware will perform a lightweight, cached database connectivity check on every request, redirecting to a static info page if the database is down. The existing health check will be modified to always return 200 OK while accurately reporting "degraded" status if the database is unreachable.

**Tech Stack:** Python (Django), MySQL (via `mysqlclient`), Django Health Check library.

---

### Task 1: Create Static Database Error Template

**Files:**
- Create: `league_manager/templates/league_manager/db_error.html`

- [ ] **Step 1: Create the template**
  Create a simple, self-contained HTML template that does NOT use any context processors or tags that trigger DB queries.

```html
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Datenbank nicht erreichbar - LeagueSphere</title>
    <link crossorigin="anonymous" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { background-color: #f8f9fa; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .error-container { max-width: 600px; padding: 2rem; background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; }
        h1 { color: #dc3545; }
    </style>
</head>
<body>
    <div class="error-container">
        <h1>Datenbank nicht erreichbar</h1>
        <p class="lead mt-4">
            LeagueSphere kann momentan keine Verbindung zur Datenbank herstellen.
        </p>
        <div class="alert alert-warning mt-4" role="alert">
            Wir arbeiten bereits an einer Lösung. Bitte versuche es in ein paar Minuten erneut.
        </div>
        <p class="text-muted small mt-4">
            Vielen Dank für dein Verständnis.
        </p>
    </div>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add league_manager/templates/league_manager/db_error.html
git commit -m "feat: add static database error template"
```

---

### Task 2: Implement Database Guard Middleware

**Files:**
- Create: `league_manager/middleware/db_guard.py`
- Modify: `league_manager/settings/base.py`

- [ ] **Step 1: Implement the middleware**
  Create the middleware that checks for database connectivity and caches the result.

```python
import logging
from django.db import connection
from django.core.cache import cache
from django.shortcuts import redirect
from django.urls import reverse

logger = logging.getLogger(__name__)

class DatabaseGuardMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.db_status_cache_key = 'db_connection_status'

    def __call__(self, request):
        # Skip check for the error page itself and static/media files
        error_url = reverse('database-error')
        if request.path.startswith(error_url) or request.path.startswith('/static/') or request.path.startswith('/media/'):
            return self.get_response(request)

        # Skip check for health endpoint as it has its own logic
        if request.path.startswith('/health/'):
            return self.get_response(request)

        db_online = cache.get(self.db_status_cache_key)
        
        if db_online is None:
            try:
                with connection.cursor() as cursor:
                    cursor.execute("SELECT 1")
                db_online = True
                cache.set(self.db_status_cache_key, True, 10)  # Cache success for 10s
            except Exception as e:
                logger.error(f"Database connection guard detected failure: {e}")
                db_online = False
                cache.set(self.db_status_cache_key, False, 5)  # Cache failure for 5s

        if not db_online:
            return redirect(error_url)

        return self.get_response(request)
```

- [ ] **Step 2: Register the middleware**
  Add `league_manager.middleware.db_guard.DatabaseGuardMiddleware` to `MIDDLEWARE` in `league_manager/settings/base.py`. Place it early in the list, but after `SecurityMiddleware`.

```python
# league_manager/settings/base.py

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "league_manager.middleware.db_guard.DatabaseGuardMiddleware",  # Add here
    "django.contrib.sessions.middleware.SessionMiddleware",
    ...
]
```

- [ ] **Step 3: Commit**

```bash
git add league_manager/middleware/db_guard.py league_manager/settings/base.py
git commit -m "feat: implement DatabaseGuardMiddleware and register it"
```

---

### Task 3: Add Database Error Route and View

**Files:**
- Modify: `league_manager/urls.py`
- Modify: `league_manager/views.py`

- [ ] **Step 1: Add the view**
  Create a simple view that renders the static template without any extra context.

```python
# league_manager/views.py

def database_error_view(request):
    return render(request, "league_manager/db_error.html")
```

- [ ] **Step 2: Add the URL route**
  Register the `/database-error/` route in `league_manager/urls.py`.

```python
# league_manager/urls.py

from league_manager.views import homeview, ClearCacheView, robots_txt_view, database_error_view # Add import

urlpatterns = [
    ...
    path("database-error/", database_error_view, name="database-error"),
    ...
]
```

- [ ] **Step 3: Commit**

```bash
git add league_manager/views.py league_manager/urls.py
git commit -m "feat: add database-error route and view"
```

---

### Task 4: Override Health Check to always return 200 OK

**Files:**
- Modify: `league_manager/urls.py`

- [ ] **Step 1: Modify HealthCheckView**
  Update the `HealthCheckView` in `league_manager/urls.py` to catch exceptions and return a custom response.

```python
# league_manager/urls.py

from django.http import JsonResponse # Add import

class HealthCheckView(_BaseHealthCheckView):
    checks = [
        "health_check.checks.Cache",
        "health_check.checks.Database",
        "health_check.checks.DNS",
        "health_check.checks.Storage",
    ]

    def get(self, request, *args, **kwargs):
        status_code = 200 # Always 200
        try:
            response = super().get(request, *args, **kwargs)
            # If the base view returned a non-200 (error), we force it to 200
            if response.status_code != 200:
                # We can still keep the body if it's already JSON or similar
                response.status_code = 200
            return response
        except Exception:
            # Fallback if something goes wrong during the check itself
            return JsonResponse({"status": "degraded", "database": "offline"}, status=200)
```

- [ ] **Step 2: Commit**

```bash
git add league_manager/urls.py
git commit -m "feat: override health check to always return 200 OK"
```

---

### Task 5: Verification and Testing

**Files:**
- Create: `league_manager/tests/test_db_guard.py`

- [ ] **Step 1: Write tests for Middleware and Health Check**
  Implement tests that mock a database failure and verify the redirection and health check status.

```python
from django.test import TestCase, Client
from django.urls import reverse
from unittest.mock import patch
from django.db import DatabaseError

class DatabaseGuardTest(TestCase):
    def setUp(self):
        self.client = Client()

    @patch('django.db.connection.cursor')
    def test_middleware_redirects_on_db_error(self, mock_cursor):
        # Force a database error
        mock_cursor.side_effect = DatabaseError("Database is down")
        
        # Clear cache to force a check
        from django.core.cache import cache
        cache.delete('db_connection_status')
        
        response = self.client.get(reverse('league-home'), follow=True)
        self.assertTemplateUsed(response, "league_manager/db_error.html")

    @patch('django.db.connection.cursor')
    def test_health_check_returns_200_on_db_error(self, mock_cursor):
        mock_cursor.side_effect = DatabaseError("Database is down")
        
        response = self.client.get('/health/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Database", status_code=200)
```

- [ ] **Step 2: Run tests**
  Execute the newly created tests.

Run: `pytest league_manager/tests/test_db_guard.py`
Expected: PASS

- [ ] **Step 3: Manual Verification**
  Briefly change the `MYSQL_HOST` in `.env` to a non-existent host and verify the app behavior in a local dev server.

- [ ] **Step 4: Commit**

```bash
git add league_manager/tests/test_db_guard.py
git commit -m "test: add tests for database connection guard"
```
