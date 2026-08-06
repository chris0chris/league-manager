import importlib

from django.test import TestCase

from gamedays.models import Gameinfo, GamedayDesignerState
from gamedays.tests.setup_factories.db_setup import DBSetup
from gamedays.tests.setup_factories.factories import GameinfoFactory

_migration = importlib.import_module("gamedays.migrations.0041_backfill_stage_category")


class TestBackfillStageCategory(TestCase):
    def test_backfills_from_designer_state_when_present(self):
        gameday = DBSetup().create_empty_gameday()
        gi_preliminary = GameinfoFactory(gameday=gameday, stage="Liga")
        gi_final = GameinfoFactory(gameday=gameday, stage="Playoffs")
        # bypass the Task 2 save() fallback to simulate pre-migration data
        Gameinfo.objects.filter(pk__in=[gi_preliminary.pk, gi_final.pk]).update(
            stage_category=""
        )
        GamedayDesignerState.objects.create(
            gameday=gameday,
            state_data={
                "nodes": [
                    {
                        "type": "stage",
                        "data": {"name": "Liga", "category": "preliminary"},
                    },
                    {
                        "type": "stage",
                        "data": {"name": "Playoffs", "category": "final"},
                    },
                ]
            },
        )

        _migration.backfill_stage_category(apps_module=None, schema_editor=None)

        gi_preliminary.refresh_from_db()
        gi_final.refresh_from_db()
        assert gi_preliminary.stage_category == "preliminary"
        assert gi_final.stage_category == "final"

    def test_backfills_from_legacy_heuristic_when_no_designer_state(self):
        gameday = DBSetup().create_empty_gameday()
        gi = GameinfoFactory(gameday=gameday, stage="Hauptrunde")
        Gameinfo.objects.filter(pk=gi.pk).update(stage_category="")

        _migration.backfill_stage_category(apps_module=None, schema_editor=None)

        gi.refresh_from_db()
        assert gi.stage_category == "preliminary"

    def test_leaves_already_populated_rows_untouched(self):
        gameday = DBSetup().create_empty_gameday()
        gi = GameinfoFactory(gameday=gameday, stage="Liga")
        Gameinfo.objects.filter(pk=gi.pk).update(stage_category="custom")
        GamedayDesignerState.objects.create(
            gameday=gameday,
            state_data={
                "nodes": [
                    {"type": "stage", "data": {"name": "Liga", "category": "preliminary"}}
                ]
            },
        )

        _migration.backfill_stage_category(apps_module=None, schema_editor=None)

        gi.refresh_from_db()
        assert gi.stage_category == "custom"

    def test_reverse_resets_stage_category_to_blank(self):
        gameday = DBSetup().create_empty_gameday()
        gi_designer = GameinfoFactory(gameday=gameday, stage="Liga")
        gi_heuristic = GameinfoFactory(gameday=gameday, stage="Hauptrunde")
        Gameinfo.objects.filter(
            pk__in=[gi_designer.pk, gi_heuristic.pk]
        ).update(stage_category="")
        GamedayDesignerState.objects.create(
            gameday=gameday,
            state_data={
                "nodes": [
                    {"type": "stage", "data": {"name": "Liga", "category": "preliminary"}}
                ]
            },
        )
        _migration.backfill_stage_category(apps_module=None, schema_editor=None)
        gi_designer.refresh_from_db()
        gi_heuristic.refresh_from_db()
        assert gi_designer.stage_category == "preliminary"
        assert gi_heuristic.stage_category == "preliminary"

        _migration.reverse_backfill_stage_category(apps_module=None, schema_editor=None)

        gi_designer.refresh_from_db()
        gi_heuristic.refresh_from_db()
        assert gi_designer.stage_category == ""
        assert gi_heuristic.stage_category == ""

    def test_falls_through_to_heuristic_when_designer_node_has_no_category_key(self):
        # Pre-v2 designer states have stage nodes with a "name" but no "category"
        # key at all — this must NOT default to "preliminary"; it must fall
        # through to the legacy name-based heuristic pass instead.
        gameday = DBSetup().create_empty_gameday()
        gi = GameinfoFactory(gameday=gameday, stage="Finalrunde")
        Gameinfo.objects.filter(pk=gi.pk).update(stage_category="")
        GamedayDesignerState.objects.create(
            gameday=gameday,
            state_data={
                "nodes": [
                    {"type": "stage", "data": {"name": "Finalrunde"}},
                ]
            },
        )

        _migration.backfill_stage_category(apps_module=None, schema_editor=None)

        gi.refresh_from_db()
        assert gi.stage_category == "final"

    def test_tolerates_stage_node_with_null_data(self):
        # A stage node can have a literal "data": None (key present, value null).
        # This must not raise and must not block backfilling other rows for the
        # same gameday.
        gameday = DBSetup().create_empty_gameday()
        gi_null_data = GameinfoFactory(gameday=gameday, stage="Finalrunde")
        gi_well_formed = GameinfoFactory(gameday=gameday, stage="Liga")
        Gameinfo.objects.filter(pk__in=[gi_null_data.pk, gi_well_formed.pk]).update(
            stage_category=""
        )
        GamedayDesignerState.objects.create(
            gameday=gameday,
            state_data={
                "nodes": [
                    {"type": "stage", "data": None},
                    {
                        "type": "stage",
                        "data": {"name": "Liga", "category": "preliminary"},
                    },
                ]
            },
        )

        _migration.backfill_stage_category(apps_module=None, schema_editor=None)

        gi_null_data.refresh_from_db()
        gi_well_formed.refresh_from_db()
        # "Finalrunde" had no usable designer-state entry (its node's data was
        # None), so it falls through to the legacy heuristic.
        assert gi_null_data.stage_category == "final"
        # "Liga" was resolved from the well-formed sibling node.
        assert gi_well_formed.stage_category == "preliminary"
