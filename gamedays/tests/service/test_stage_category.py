from django.test import SimpleTestCase

from gamedays.service.stage_category import StageCategory, derive_legacy_stage_category


class TestDeriveLegacyStageCategory(SimpleTestCase):
    def test_vorrunde_is_preliminary(self):
        assert derive_legacy_stage_category("Vorrunde") == StageCategory.PRELIMINARY

    def test_hauptrunde_is_preliminary(self):
        assert derive_legacy_stage_category("Hauptrunde") == StageCategory.PRELIMINARY

    def test_finalrunde_is_final(self):
        assert derive_legacy_stage_category("Finalrunde") == StageCategory.FINAL

    def test_zwischenrunde_is_placement(self):
        assert derive_legacy_stage_category("Zwischenrunde") == StageCategory.PLACEMENT

    def test_unknown_stage_name_is_custom(self):
        assert derive_legacy_stage_category("Liga") == StageCategory.CUSTOM
        assert derive_legacy_stage_category("FF BL") == StageCategory.CUSTOM
        assert derive_legacy_stage_category("") == StageCategory.CUSTOM
