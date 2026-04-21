# Design Spec: Database Connection Guard

Prevent application crashes and container restarts when the database is unreachable by implementing a proactive connection guard and a resilient health check.

## 1. Problem Statement
The application currently crashes or fails to start if the database connection is lost. Monitoring systems (Docker/CircleCI) interpret an unhealthy status as a fatal error, potentially triggering unnecessary container restarts or deployment failures. Users see a generic 500 error instead of a helpful status message.

## 2. Proposed Solution
Implement a "Degraded Mode" where the application remains running even if the database is down.

### 2.1 Middleware: `DatabaseGuardMiddleware`
A new middleware will intercept requests and verify database connectivity.
- **Connectivity Check:** Perform a lightweight `SELECT 1` query using `django.db.connection`.
- **Caching:** 
    - Success: Cache for 10 seconds to minimize overhead.
    - Failure: Cache for 5 seconds to avoid hammering a struggling database.
- **Redirection:** If the database is unreachable, redirect all non-static, non-error-page requests to `/database-error/`.

### 2.2 Health Check Override
Modify the `HealthCheckView` to handle database failures gracefully.
- **Status Policy:** Always return an HTTP `200 OK` status code during health checks.
- **Payload:** If the database check fails, the JSON response should indicate a `degraded` status.
- **Benefit:** Prevents external orchestrators from killing the container while still providing visibility into the failure.

### 2.3 Database Error Page
A dedicated view and template that do not require any database access.
- **Constraint:** The template must not use context processors (like `global_menu`) or tags (like `{% if user.is_authenticated %}`) that trigger database queries.
- **Content:** German language (consistent with existing maintenance pages) explaining that the database is currently unreachable.

## 3. Architecture & Components

### 3.1 New Files
- `league_manager/middleware/db_guard.py`: Middleware logic.
- `league_manager/templates/league_manager/db_error.html`: Static error template.

### 3.2 Modified Files
- `league_manager/settings/base.py`: Register middleware and maintenance settings.
- `league_manager/urls.py`: Add `/database-error/` route and update `HealthCheckView`.
- `league_manager/views.py`: Implement the `DatabaseErrorView`.

## 4. Implementation Details

### 4.1 Middleware Logic (Draft)
```python
class DatabaseGuardMiddleware:
    def __call__(self, request):
        if is_db_down():
            return redirect('/database-error/')
        return self.get_response(request)
```

### 4.2 Health Check logic
```python
class HealthCheckView(BaseHealthCheckView):
    def get(self, request, *args, **kwargs):
        # Always return 200, but with accurate JSON status
        ...
```

## 5. Testing Strategy
- **Unit Tests:** Mock `django.db.connection.cursor` to raise `DatabaseError` and verify middleware redirection.
- **Integration Tests:** Verify the health check returns `200` with the expected JSON payload when the database is mocked as down.
- **Manual Verification:** Temporarily change database credentials in `.env` to simulate a connection failure and observe the application's behavior.

## 6. Success Criteria
1. The application starts and remains running even if the database is unreachable.
2. The health check returns `200 OK` with a "degraded" status during DB outages.
3. Users are redirected to a helpful error page instead of seeing a crash or 500 error.
