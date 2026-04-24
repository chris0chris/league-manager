# Design Spec: Database Connection Guard Middleware (v2)

## 1. Goal
Implement a robust `DatabaseGuardMiddleware` for LeagueSphere that intercepts database connection failures *before* they crash the entire request-response cycle, providing a user-friendly error page instead.

## 2. Architecture
The middleware is placed early in the `MIDDLEWARE` stack in `settings/base.py` to catch failures before they reach session or authentication middlewares that rely on the database.

### 2.1 Component: `DatabaseGuardMiddleware`
Located at `league_manager/middleware/db_guard.py`.

**Responsibilities:**
- Perform a lightweight probe (`SELECT 1`) to verify database availability.
- Cache the result (5-10 seconds) using the project's cache backend (Redis/File) to avoid overhead.
- Redirect all non-essential traffic to a custom `/database-error/` page during outages.
- Set a `request.db_online` flag for other components to adapt.

### 2.2 Compatibility Fixes
- **Debug Toolbar:** Modified `settings/dev.py` to include a `SHOW_TOOLBAR_CALLBACK` that checks `request.db_online`. This prevents the toolbar from attempting a session lookup when the database is down.
- **Error Page Bypassing:** The middleware returns a raw `HttpResponse` with embedded HTML when the database is offline and the user is on the error page, bypassing the rest of the Django middleware stack (Sessions, Auth, Debug Toolbar).

## 3. Implementation Details

### 3.1 Middleware Logic (Python)
```python
import logging
from django.db import connection
from django.core.cache import cache
from django.shortcuts import redirect
from django.urls import reverse
from django.http import HttpResponse

logger = logging.getLogger(__name__)

class DatabaseGuardMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.db_status_cache_key = 'db_connection_status'
        self.error_html = "..." # Embedded Bootstrap error page

    def __call__(self, request):
        # 1. Skip check for static/media files
        if any(request.path.startswith(p) for p in ['/static/', '/media/', '/robots.txt', '/sitemap.xml']):
            return self.get_response(request)

        # 2. Check DB status (cached)
        db_online = cache.get(self.db_status_cache_key)
        if db_online is None:
            try:
                with connection.cursor() as cursor:
                    cursor.execute("SELECT 1")
                db_online = True
                cache.set(self.db_status_cache_key, True, 10)
            except Exception as e:
                logger.error(f"Database connection guard detected failure: {e}")
                db_online = False
                cache.set(self.db_status_cache_key, False, 5)

        request.db_online = db_online

        # 3. Handle failure
        if not db_online:
            error_url = '/database-error/' # Fallback or dynamic reverse
            if request.path == error_url:
                return HttpResponse(self.error_html, content_type="text/html", status=503)
            return redirect(error_url)

        return self.get_response(request)
```

### 3.2 Configuration
- Added to `MIDDLEWARE` in `base.py` after `SecurityMiddleware`.
- `SHOW_TOOLBAR_CALLBACK` added to `dev.py`.

## 4. Testing & Validation
- **Local Reproduction:** Tested by stopping the database container (`docker stop mysql`) and verifying the error page appears without a traceback.
- **CI/CD:** Ensure the middleware does not interfere with test suites that use in-memory SQLite (handled by `DEBUG_TOOLBAR` check and cache).
