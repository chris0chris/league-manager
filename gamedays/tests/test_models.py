from django.test import TestCase

from gamedays.models import Gameinfo
from gamedays.service.stage_category import StageCategory
from gamedays.tests.setup_factories.factories import GameinfoFactory


class TestGameinfoStageCategoryAutoDerive(TestCase):
    def test_save_derives_category_from_known_legacy_stage_name(self):
        gi = GameinfoFactory(stage="Vorrunde")
        assert gi.stage_category == StageCategory.PRELIMINARY

    def test_save_derives_custom_for_unknown_stage_name(self):
        gi = GameinfoFactory(stage="Liga")
        assert gi.stage_category == StageCategory.CUSTOM

    def test_save_does_not_override_explicitly_set_category(self):
        gi = GameinfoFactory(stage="Liga", stage_category=StageCategory.PRELIMINARY)
        assert gi.stage_category == StageCategory.PRELIMINARY

        gi.refresh_from_db()
        assert gi.stage_category == StageCategory.PRELIMINARY
