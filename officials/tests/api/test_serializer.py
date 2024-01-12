from datetime import datetime, date

from django.test import TestCase

from officials.api.serializers import GameOfficialAllInfoSerializer, OfficialSerializer, OfficialGamelistSerializer, \
    Obfuscator, OfficialGameCountSerializer
from officials.models import Official
from officials.tests.setup_factories.db_setup_officials import DbSetupOfficials


class TestObfuscator:
    def test_obfuscator_obfuscate(self):
        assert Obfuscator.obfuscate(*'Some Name'.split(' ')[:2]) == 'S****N****'
        assert Obfuscator.obfuscate('Some', 'Name') == 'S****N****'

    def test_obfuscator_only_one_argument(self):
        assert Obfuscator.obfuscate('Some') == 'S****'

    def test_obfuscator_works_with_empty_values(self):
        assert Obfuscator.obfuscate(None) == ''
        assert Obfuscator.obfuscate('') == ''
        assert Obfuscator.obfuscate(None, '') == ''
        assert Obfuscator.obfuscate(None, '', 'Nmae') == 'N****'


class TestGameOfficialAllInfoSerializer:
    def create_some_official(self, **kwargs):
        defaults = {
            'id': 77,
            'name': 'Julia Kuli',
            'position': 'Referee',
            'gameinfo_id': 5,
            'gameinfo__standing': 'group 1',
            'gameinfo__gameday__date': datetime.today(),
            'gameinfo__gameday__name': 'Some Bowl Name',
            'gameinfo__officials_id': 7,
            'gameinfo__officials__description': 'Some Team description',
            'gameinfo__officials__name': 'Some Team name',
            'official__first_name': 'Julia',
            'official__last_name': 'Kuli',
            'official__team__name': 'Some Official Team name',
            'home': 'home team',
            'away': 'away team',
        }

        defaults.update(kwargs)
        return defaults

    def test_names_are_obfuscated(self):
        all_game_officials = [self.create_some_official(), self.create_some_official()]
        serializer = GameOfficialAllInfoSerializer(all_game_officials, many=True)
        assert serializer.data[0].get('name') == 'J****K****'

    def test_names_are_unlinked(self):
        all_game_officials = [self.create_some_official(official__first_name=None), self.create_some_official()]
        serializer = GameOfficialAllInfoSerializer(all_game_officials, many=True)
        assert serializer.data[0].get('name') == 'J****K**** ?'

    def test_names_are_clear_for_staff(self):
        all_game_officials = [self.create_some_official(), self.create_some_official()]
        serializer = GameOfficialAllInfoSerializer(all_game_officials, is_staff=True, many=True)
        assert serializer.data[0].get('name') == 'Julia Kuli'

    def test_names_are_clear_for_same_team_name(self):
        all_game_officials = [self.create_some_official(official__first_name=None), self.create_some_official()]
        serializer = GameOfficialAllInfoSerializer(
            instance=all_game_officials,
            display_names_for_team='Some Team name',
            is_staff=True,
            many=True
        )
        assert serializer.data[0].get('name') == 'Julia Kuli ?'
        serializer = GameOfficialAllInfoSerializer(
            instance=all_game_officials,
            display_names_for_team='Some Official Team name',
            is_staff=True,
            many=True
        )
        assert serializer.data[1].get('name') == 'Julia Kuli'

    def test_game_official_is_serialized(self):
        officials = self.create_some_official()
        serializer = GameOfficialAllInfoSerializer(instance=officials)
        assert serializer.data.get('name') == 'J****K****'


class TestOfficialSerializer(TestCase):
    def test_official_serializer_with_license(self):
        DbSetupOfficials().create_officials_full_setup()
        official = Official.objects.first()
        year = datetime.today().year + 1
        assert OfficialSerializer(instance=official).data == {
            'association': 'ABBR',
            'email': '',
            'first_name': 'F****',
            'id': official.pk,
            'is_valid': True,
            'last_name': 'F****',
            'license': 'F1',
            'name': 'F****F****',
            'team': official.team.description,
            'valid_until': date(year, 3, 31)
        }

    def test_official_serializer_without_association(self):
        DbSetupOfficials().create_officials_full_setup()
        official = Official.objects.last()
        year = datetime.today().year + 1
        assert OfficialSerializer(instance=official, is_staff=True).data == {
            'association': 'Kein Verband hinterlegt',
            'email': '',
            'first_name': 'Julia',
            'id': official.pk,
            'is_valid': True,
            'last_name': 'Jegura',
            'license': 'F2',
            'name': 'Julia Jegura',
            'team': official.team.description,
            'valid_until': date(year, 3, 31)
        }


class TestOfficialGamelistSerializer(TestCase):
    def test_game_official_is_serialized(self):
        DbSetupOfficials().create_officials_full_setup()
        DbSetupOfficials().create_external_officials_entries()
        official = Official.objects.last()
        season = datetime.today().year
        serializer = OfficialGamelistSerializer(instance=official, season=season, is_staff=False).data
        assert serializer['external_games']['number_games'] == 7
        assert len(serializer['external_games']['all_games']) == 1
        assert serializer['dffl_games']['number_games'] == 8


class TestOfficialGameCountSerializer(TestCase):
    def test_games_are_count(self):
        DbSetupOfficials().create_officials_full_setup()
        DbSetupOfficials().create_external_officials_entries()
        official = Official.objects.last()
        season = datetime.today().year
        serializer = OfficialGameCountSerializer(instance=official, season=season, is_staff=False).data
        assert serializer['position_count'] == {
            'scorecard': {
                'referee': 2,
                'down_judge': 2,
                'field_judge': 2,
                'side_judge': 2,
                'overall': 8,
            },
            'external': {
                'referee': 7.0,
                'down_judge': 0,
                'field_judge': 0,
                'side_judge': 0,
                'overall': 7.0,
            },
            'sum': {
                'overall': 15.0,
                'referee': 9.0,
                'down_judge': 2,
                'field_judge': 2,
                'side_judge': 2
            }
        }
