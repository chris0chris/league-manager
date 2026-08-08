import importlib

from django.test import TestCase

from gamedays.models import Gameday, GamedayDesignerState
from gamedays.tests.setup_factories.factories import GamedayFactory

_migration = importlib.import_module(
    "gamedays.migrations.0042_publish_legacy_draft_gamedays"
)


class TestPublishLegacyGamedays(TestCase):
    def test_publishes_legacy_gameday_stuck_in_draft(self):
        gameday = GamedayFactory(status=Gameday.STATUS_DRAFT, published_at=None)

        _migration.publish_legacy_gamedays(apps_module=None, schema_editor=None)

        gameday.refresh_from_db()
        assert gameday.status == Gameday.STATUS_PUBLISHED
        assert gameday.published_at is not None

    def test_publishes_legacy_gameday_with_blank_status(self):
        gameday = GamedayFactory(status="", published_at=None)

        _migration.publish_legacy_gamedays(apps_module=None, schema_editor=None)

        gameday.refresh_from_db()
        assert gameday.status == Gameday.STATUS_PUBLISHED
        assert gameday.published_at is not None

    def test_leaves_designer_draft_gameday_untouched(self):
        gameday = GamedayFactory(status=Gameday.STATUS_DRAFT, published_at=None)
        GamedayDesignerState.objects.create(gameday=gameday, state_data={})

        _migration.publish_legacy_gamedays(apps_module=None, schema_editor=None)

        gameday.refresh_from_db()
        assert gameday.status == Gameday.STATUS_DRAFT
        assert gameday.published_at is None

    def test_leaves_already_advanced_gameday_untouched(self):
        gameday = GamedayFactory(status=Gameday.STATUS_IN_PROGRESS, published_at=None)

        _migration.publish_legacy_gamedays(apps_module=None, schema_editor=None)

        gameday.refresh_from_db()
        assert gameday.status == Gameday.STATUS_IN_PROGRESS
        assert gameday.published_at is None
