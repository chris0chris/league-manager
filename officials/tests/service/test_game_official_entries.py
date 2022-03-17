import pytest
from django.test import TestCase

from officials.service.game_official_entries import convert_to_int, InternalGameOfficialEntry, check_for_allowed_value


class TestInternalGameOfficialEntry(TestCase):
    def test_check_for_type_throws_error(self):
        with pytest.raises(TypeError, match='attribute_name muss eine Zahl sein'):
            convert_to_int('attribute_name', 'string')

    def test_check_for_type_is_correct(self):
        assert convert_to_int('attribute_name', '7') == 7

    def test_check_for_correct_value_is_illegal(self):
        with pytest.raises(ValueError, match='Position muss genau einen'):
            check_for_allowed_value('referee')

    def test_internal_game_official_init_throws_exception_for_according_value(self):
        with pytest.raises(TypeError, match=r'gameinfo_id muss eine Zahl sein'):
            wrong_int_value = 'string'
            InternalGameOfficialEntry(wrong_int_value, None, None)
        with pytest.raises(TypeError, match=r'official_id muss eine Zahl sein'):
            wrong_int_value = 'string'
            InternalGameOfficialEntry(1, wrong_int_value, None)
