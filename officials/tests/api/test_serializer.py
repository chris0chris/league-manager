from django.test import TestCase

from officials.api.serializers import GameOfficialAllInfosSerializer
from officials.tests.setup_factories.db_setup_officials import DbSetupOfficials
from teammanager.models import GameOfficial


class TestGameOfficialAllInfosSerializer(TestCase):
    def test_names_are_obfuscated(self):
        DbSetupOfficials().create_officials_full_setup()
        all_game_officials = GameOfficial.objects.all()
        serializer = GameOfficialAllInfosSerializer(all_game_officials, many=True)
        assert serializer.data[0].get('name') == 'F***** F*****'

    def test_names_are_clear_for_staff(self):
        DbSetupOfficials().create_officials_full_setup()
        all_game_officials = GameOfficial.objects.all()
        serializer = GameOfficialAllInfosSerializer(all_game_officials, is_staff=True, many=True)
        assert serializer.data[0].get('name') == 'Franzi Fedora'

    def test_names_are_clear_for_same_team_name(self):
        DbSetupOfficials().create_officials_full_setup()
        all_game_officials = GameOfficial.objects.all()
        serializer = GameOfficialAllInfosSerializer(instance=all_game_officials, display_names_for_team='officials',
                                                    many=True)
        assert serializer.data[0].get('name') == 'Franzi Fedora'

    def test_game_official_is_serialized(self):
        DbSetupOfficials().create_officials_full_setup()
        first_entry = GameOfficial.objects.first()
        first_entry.name = None
        first_entry.save()
        all_game_officials = GameOfficial.objects.all()
        serializer = GameOfficialAllInfosSerializer(instance=all_game_officials, many=True)
        assert serializer.data[0].get('name') == 'F***** F*****'
