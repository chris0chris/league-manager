from datetime import datetime

from django.test import TestCase

from officials.models import Official
from officials.service.officials_appearance import OfficialAppearanceTeamList, OfficialAppearanceTeamListEntry
from officials.tests.setup_factories.db_setup_officials import DbSetupOfficials
from teammanager.models import Team


class TestOfficialApearanceTeamList(TestCase):
    def test_empty_appearance(self):
        current_year = datetime.today().year
        officials_list = OfficialAppearanceTeamList(0, current_year)
        assert officials_list.as_json() == {
            'year': current_year,
            'officials_list': []
        }

    def test_appearance_list_is_correct(self):
        team = DbSetupOfficials().create_officials_full_setup()
        current_year = datetime.today().year
        officials_list = OfficialAppearanceTeamList(team.pk, current_year)
        result = officials_list.as_json()
        assert result['year'] == current_year
        assert len(result['officials_list']) == 2


class TestOfficialAppearanceTeamListEntry(TestCase):
    def test_list_entry_results_as_expected(self):
        DbSetupOfficials().create_officials_full_setup()
        current_year = datetime.today().year
        first_official = Official.objects.first()
        first_team = Team.objects.first()
        team_list_entry = OfficialAppearanceTeamListEntry(first_official, current_year).as_json()
        assert team_list_entry == {'down_judge': 1,
                                   'down_judge_ext': 0,
                                   'field_judge': 1,
                                   'field_judge_ext': 0,
                                   'first_name': 'Franzi',
                                   'id': first_official.pk,
                                   'last_name': 'Fedora',
                                   'license': 'F1',
                                   'mix_ext': 0,
                                   'overall': 4,
                                   'overall_ext': 0,
                                   'referee': 1,
                                   'referee_ext': 0,
                                   'side_judge': 1,
                                   'side_judge_ext': 0,
                                   'team': 'Test Team',
                                   'team_id': first_team.pk,
                                   }
