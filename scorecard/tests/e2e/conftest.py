# Make the Django live server single-threaded to serialize concurrent write requests,
# preventing SQLite's SQLITE_LOCKED errors when multiple async requests hit the server
# simultaneously (e.g., game setup + team possession from Officials form submit).
#
# SQLite's SQLITE_LOCKED error is NOT handled by the busy timeout mechanism —
# it requires serializing writes at the application level.
from django.core.servers.basehttp import WSGIServer
from django.test.testcases import LiveServerThread


class SingleThreadedWSGIServer(WSGIServer):
    """Non-threaded WSGI server: handles one request at a time to avoid SQLite locking."""

    def __init__(self, *args, connections_override=None, **kwargs):
        super().__init__(*args, **kwargs)
        # connections_override is not needed for transaction=True tests since
        # data is committed and visible to all connections without sharing.
        self.connections_override = connections_override or {}


LiveServerThread.server_class = SingleThreadedWSGIServer
