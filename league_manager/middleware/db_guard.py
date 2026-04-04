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
        self.error_html = """<!DOCTYPE html>
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
</html>"""

    def __call__(self, request):
        # Determine error URL
        try:
            error_url = reverse('database-error')
        except:
            error_url = '/database-error/'

        # Skip check for static/media files and robots/sitemap
        if any(request.path.startswith(p) for p in ['/static/', '/media/', '/robots.txt', '/sitemap.xml']):
            return self.get_response(request)

        # Check DB status
        db_online = cache.get(self.db_status_cache_key)
        
        if db_online is None:
            # Skip check for the error page itself during the active probe to avoid recursion if something goes wrong
            # but usually we want to know the status.
            try:
                with connection.cursor() as cursor:
                    cursor.execute("SELECT 1")
                db_online = True
                cache.set(self.db_status_cache_key, True, 10)  # Cache success for 10s
            except Exception as e:
                logger.error(f"Database connection guard detected failure: {e}")
                db_online = False
                cache.set(self.db_status_cache_key, False, 5)  # Cache failure for 5s

        # Store status on request for other middlewares
        request.db_online = db_online

        if not db_online:
            # If we are on the error page, return the response directly to bypass the rest of the stack
            # (bypasses SessionMiddleware, AuthenticationMiddleware, and DebugToolbarMiddleware)
            if request.path.startswith(error_url):
                return HttpResponse(self.error_html, content_type="text/html", status=503)
            
            # Allow health check to proceed but with the db_online=False flag set
            if request.path.startswith('/health/'):
                return self.get_response(request)
                
            # For all other pages, redirect to the error page
            return redirect(error_url)

        return self.get_response(request)
