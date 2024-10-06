from django.test import TestCase

from officials.models import OfficialPosition
from scorecard2.api.serializers import ScorecardGamedaySerializer, ScorecardGameinfoSerializer, \
    ScorecardOfficialSerializer
from scorecard2.models import ScorecardOfficial, ScorecardConfig


def create_some_input_game_data(**kwargs):
    defaults = {
        "id": 5,
        "field": 1,
        "scheduled": "10:00",
        "officials_id": 75,
        "officials__description": "Officials Team",
        "gameFinished": "None",
        "home": "Home Team",
        "away": "Away Team",
        "stage": "preliminary",
        "standing": "group 1",
    }
    defaults.update(kwargs)
    return defaults


def create_some_input_gameday_data(**kwargs):
    defaults = [
        {
            "id": 248,
            "date": "05.10.2024",
            "name": "Gameday name",
            "games": [
                create_some_input_game_data()
            ]}
    ]
    defaults[0].update(kwargs)
    return defaults


class TestScorecardGamedaySerializer:
    # noinspection PyMethodMayBeStatic

    def test_serialize_scorecard_gameday_serializer(self):
        result = ScorecardGamedaySerializer(
            instance=create_some_input_gameday_data(),
            many=True).data
        assert list(result) == [{
            "id": 248,
            "date": "05.10.2024",
            "name": "Gameday name",
            "games": [
                {
                    "id": 5,
                    "field": 1,
                    "scheduled": "10:00",
                    "home": "Home Team",
                    "away": "Away Team",
                    "isFinished": True,
                    "officials": "Officials Team",
                    "officialsId": 75,
                }
            ]
        }]


class TestScorecardGameinfoSerializer:
    def test_serializer_with_all_fields(self):
        result = ScorecardGameinfoSerializer(
            instance=create_some_input_game_data()).data
        assert dict(result) == {
            "id": 5,
            "field": 1,
            "scheduled": "10:00",
            "home": "Home Team",
            "away": "Away Team",
            "isFinished": True,
            "officials": "Officials Team",
            "officialsId": 75,
            "stage": "preliminary",
            "standing": "group 1"
        }

    def test_serializer_with_game_setup_fields(self):
        result = ScorecardGameinfoSerializer(
            instance=create_some_input_game_data(),
            fields=ScorecardGameinfoSerializer.ALL_SETUP_FIELDS).data
        assert dict(result) == {
            "field": 1,
            "scheduled": "10:00",
            "home": "Home Team",
            "away": "Away Team",
            "stage": "preliminary",
            "standing": "group 1"
        }

    def test_serializer_with_game_overview_fields(self):
        result = ScorecardGameinfoSerializer(
            instance=create_some_input_game_data(),
            fields=ScorecardGameinfoSerializer.ALL_GAME_OVERVIEW_FIELDS).data
        assert dict(result) == {
            "id": 5,
            "field": 1,
            "scheduled": "10:00",
            "home": "Home Team",
            "away": "Away Team",
            "isFinished": True,
            "officials": "Officials Team",
            "officialsId": 75,
        }


class TestScorecardOfficialSerializer(TestCase):
    def test_serializer_with_no_official_position(self):
        position_name = 'some position'
        config = ScorecardConfig.objects.create(name='Some scorecard config')
        scorecard_official = ScorecardOfficial.objects.create(scorecard_config=config, position_name=position_name)
        result = ScorecardOfficialSerializer(instance=scorecard_official).data
        assert dict(result) == {
            "position_name": position_name,
            "position_id": None,
            "is_optional": False,
        }

    def test_serializer_with_official_position(self):
        position_name = 'THE official position'
        config = ScorecardConfig.objects.create(name='Some scorecard config')
        official_position = OfficialPosition.objects.create(name=position_name)
        scorecard_official = ScorecardOfficial.objects.create(scorecard_config=config,
                                                              official_position=official_position, is_optional=True)
        result = ScorecardOfficialSerializer(instance=scorecard_official).data
        assert dict(result) == {
            "position_name": position_name,
            "position_id": official_position.pk,
            "is_optional": True,
        }
