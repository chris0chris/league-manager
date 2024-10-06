from gamedays.api.serializers import GameOfficialSerializer
from gamedays.models import GameOfficial
from scorecard2.api.serializers import GameSetupCategoryValueSerializer, ScorecardGameSetupSerializer
from scorecard2.models import ScorecardGameSetup, GameSetupCategoryValue


class GameSetupWrapper:
    def __init__(self, gameinfo_id):
        self.gameinfo_id = gameinfo_id

    def create_or_update_game_setup(self, data) -> tuple[dict, bool]:
        game_setup, was_game_setup_created = ScorecardGameSetup.objects.update_or_create(gameinfo_id=self.gameinfo_id)
        category_value_results = []
        for item in data:
            category_id = item['category']
            category_value = GameSetupCategoryValue.objects.filter(game_setup=game_setup, category_id=category_id)
            if category_value.exists():
                category_value.update(category_value_id=item['category_value'])
                category_value = category_value.first()
            else:
                category_value = GameSetupCategoryValue.objects.create(
                    game_setup=game_setup,
                    category_id=category_id,
                    category_value_id=item['category_value'],
                )
            category_value_results.append(category_value)
        return GameSetupCategoryValueSerializer(instance=category_value_results, many=True).data, was_game_setup_created

    def create_or_update_game_officials(self, data) -> tuple[list, list]:
        result = []
        error = []
        for item in data:
            official, _ = GameOfficial.objects.get_or_create(gameinfo_id=self.gameinfo_id, position=item['position'])
            serializer = GameOfficialSerializer(instance=official, data=item)
            if serializer.is_valid():
                serializer.save()
                result.append(serializer.data)
            else:
                error.append(serializer.errors)
        return result, error

    def get_game_setup(self):
        return {
            **ScorecardGameSetupSerializer(instance=ScorecardGameSetup.objects.get(gameinfo_id=self.gameinfo_id)).data,
            'officials': GameOfficialSerializer(instance=GameOfficial.objects.filter(gameinfo_id=self.gameinfo_id), many=True).data,
        }

