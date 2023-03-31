import datetime

from django.test import TestCase

from officials.models import Official
from officials.service.officials_appearance import OfficialAppearanceTeamList, OfficialAppearanceTeamListEntry
from officials.tests.setup_factories.db_setup_officials import DbSetupOfficials
from teammanager.models import Team


class TestOfficialApearanceTeamList(TestCase):
    def test_empty_appearance(self):
        current_year = datetime.date.today().year
        officials_list = OfficialAppearanceTeamList(0, current_year)
        assert officials_list.as_json() == {
            'year': current_year,
            'team': 'Team nicht gefunden',
            'officials_list': {
                'list': [],
                'years': []
            }
        }

    def test_appearance_list_is_correct(self):
        team = DbSetupOfficials().create_officials_full_setup()
        current_year = datetime.date.today().year
        officials_list = OfficialAppearanceTeamList(team.pk, current_year)
        result = officials_list.as_json()
        assert result['year'] == current_year
        assert len(result['officials_list']['list']) == 2

    def test_appearance_list_has_correct_year_count(self):
        team = DbSetupOfficials().create_officials_full_setup()
        current_year = datetime.date.today().year
        officials_list = OfficialAppearanceTeamList(team.pk, current_year)
        result = officials_list.as_json()
        assert result['year'] == current_year
        assert len(result['officials_list']['years']) == 3


class TestOfficialAppearanceTeamListEntry(TestCase):
    def test_list_entry_results_as_expected(self):
        DbSetupOfficials().create_officials_full_setup()
        current_year = datetime.date.today().year
        first_official = Official.objects.first()
        first_team = Team.objects.first()
        team_list_entry = OfficialAppearanceTeamListEntry(first_official, current_year).as_json()
        assert team_list_entry == {
            'association': 'ABBR',
            'email': '',
            'down_judge': 1,
            'down_judge_ext': 0,
            'field_judge': 1,
            'field_judge_ext': 0,
            'first_name': 'Franzi',
            'id': first_official.pk,
            'is_valid': True,
            'last_name': 'Fedora',
            'license': 'F1',
            'name': 'F****F****',
            'overall': 4,
            'overall_ext': 0,
            'referee': 1,
            'referee_ext': 0,
            'side_judge': 1,
            'side_judge_ext': 0,
            'team': 'Test Team',
            'team_id': first_team.pk,
            'valid_until': datetime.date(current_year + 1, 3, 31)
        }
