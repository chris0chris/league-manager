import pytest
from gamedays.api.serializers import GamedayListSerializer, GamedaySerializer
from gamedays.tests.setup_factories.db_setup import DBSetup


@pytest.mark.django_db
class TestGamedaySerializers:
    def test_list_serializer_fields(self):
        gameday = DBSetup().create_empty_gameday()

        serializer = GamedayListSerializer(instance=gameday)
        assert "id" in serializer.data
        assert "name" in serializer.data
        assert "status" in serializer.data
        assert "has_designer_state" in serializer.data
        assert "designer_data" not in serializer.data

    def test_gameday_serializer_fields(self):
        gameday = DBSetup().create_empty_gameday()

        serializer = GamedaySerializer(instance=gameday)
        assert "id" in serializer.data
        assert "name" in serializer.data
        assert "status" in serializer.data
        assert "designer_data" not in serializer.data
