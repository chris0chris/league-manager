import datetime

from django.test import TestCase

from officials.api.serializers import GameOfficialAllInfoSerializer, OfficialSerializer
from officials.models import Official
from officials.tests.setup_factories.db_setup_officials import DbSetupOfficials
from teammanager.models import GameOfficial


class TestGameOfficialAllInfoSerializer(TestCase):
    def test_names_are_obfuscated(self):
        DbSetupOfficials().create_officials_full_setup()
        all_game_officials = GameOfficial.objects.all()
        serializer = GameOfficialAllInfoSerializer(all_game_officials, many=True)
        assert serializer.data[0].get('name') == 'F***** F*****'

    def test_names_are_clear_for_staff(self):
        DbSetupOfficials().create_officials_full_setup()
        all_game_officials = GameOfficial.objects.all()
        serializer = GameOfficialAllInfoSerializer(all_game_officials, is_staff=True, many=True)
        assert serializer.data[0].get('name') == 'Franzi Fedora'

    def test_names_are_clear_for_same_team_name(self):
        DbSetupOfficials().create_officials_full_setup()
        all_game_officials = GameOfficial.objects.all()
        serializer = GameOfficialAllInfoSerializer(instance=all_game_officials, display_names_for_team='officials',
                                                   many=True)
        assert serializer.data[0].get('name') == 'Franzi Fedora'

    def test_game_official_is_serialized(self):
        DbSetupOfficials().create_officials_full_setup()
        first_entry = GameOfficial.objects.first()
        first_entry.name = None
        first_entry.save()
        all_game_officials = GameOfficial.objects.all()
        serializer = GameOfficialAllInfoSerializer(instance=all_game_officials, many=True)
        assert serializer.data[0].get('name') == 'F***** F*****'


class TestOfficialSerializer(TestCase):
    def test_official_serializer_with_license(self):
        DbSetupOfficials().create_officials_full_setup()
        official = Official.objects.first()
        year = datetime.date.today().year + 1
        assert OfficialSerializer(official).data == {
            'association': 'Association name',
            'first_name': 'Franzi',
            'id': official.pk,
            'is_valid': True,
            'last_name': 'Fedora',
            'license': 'F1',
            'name': 'F****F****',
            'team': official.team.description,
            'valid_until': datetime.date(year, 3, 31)
        }

    def test_official_serializer_without_association(self):
        DbSetupOfficials().create_officials_full_setup()
        official = Official.objects.last()
        year = datetime.date.today().year + 1
        assert OfficialSerializer(official).data == {
            'association': 'Kein Verband hinterlegt',
            'first_name': 'Julia',
            'id': official.pk,
            'is_valid': True,
            'last_name': 'Jegura',
            'license': 'F2',
            'name': 'J****J****',
            'team': official.team.description,
            'valid_until': datetime.date(year, 3, 31)
        }
