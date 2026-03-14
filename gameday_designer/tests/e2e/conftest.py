# Make the Django live server single-threaded to serialize concurrent write requests,
# preventing SQLite's SQLITE_LOCKED errors when multiple async requests hit the server
# simultaneously.
#
# SQLite's SQLITE_LOCKED error is NOT handled by the busy timeout mechanism —
# it requires serializing writes at the application level.
#
# Run E2E tests with:
#   pytest gameday_designer/tests/e2e/ --ds=test_settings --headed
from django.core.servers.basehttp import WSGIServer
from django.test.testcases import LiveServerThread
from django.conf import settings


def pytest_configure(config):
    """Enforce SQLite settings for E2E tests; exit early with a clear error."""
    import pytest

    ds = (
        config.getoption("--ds", default=None, skip=True)
        or config.getini("DJANGO_SETTINGS_MODULE")
    )
    if ds != "test_settings":
        pytest.exit(
            f"\nGameday Designer E2E tests require SQLite settings.\n"
            f"Run with:  pytest gameday_designer/tests/e2e/ --ds=test_settings --headed\n"
            f"Current DJANGO_SETTINGS_MODULE: {ds!r}\n",
            returncode=4,
        )


class SingleThreadedWSGIServer(WSGIServer):
    """Non-threaded WSGI server: handles one request at a time to avoid SQLite locking."""

    def __init__(self, *args, connections_override=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.connections_override = connections_override or {}


LiveServerThread.server_class = SingleThreadedWSGIServer
