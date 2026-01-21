from gamedays.models import Gameinfo, GameOfficial
from officials.models import Official, OfficialExternalGames


def convert_to_int(attr_name, value):
    try:
        return int(value)
    except ValueError:
        raise TypeError(f"{attr_name} muss eine Zahl sein!")


def check_for_allowed_value(position):
    if position in ["Referee", "Down Judge", "Field Judge", "Side Judge"]:
        return position
    raise ValueError(
        "Position muss genau einen der Werte haben: Referee, Down Judge, Field Judge, Side Judge!"
    )


class InternalGameOfficialEntry:
    def __init__(self, gameinfo_id, official_id, position):
        self.gameinfo_id = convert_to_int("gameinfo_id", gameinfo_id)
        self.official_id = convert_to_int("official_id", official_id)
        self.position = check_for_allowed_value(position)

    def save(self) -> str:
        gameinfo = Gameinfo.objects.get(pk=self.gameinfo_id)
        official = Official.objects.get(pk=self.official_id)
        game_official_entry = GameOfficial(
            gameinfo=gameinfo, official=official, position=self.position
        )
        game_official_entry.save()
        return (
            f"ID: {game_official_entry.pk} "
            f"-> Spiel {self.gameinfo_id} - {official.first_name} {official.last_name} als {self.position}"
        )


class ExternalGameOfficialEntry:
    class Meta:
        model = OfficialExternalGames
        fields = "__all__"

    def __init__(
        self,
        official_id,
        number_games,
        date,
        position,
        association,
        is_international=False,
        comment=None,
    ):
        self.official_id = convert_to_int("official_id", official_id)
        self.constructor_values = [
            convert_to_int("official_id", official_id),
            convert_to_int("number_games", number_games),
            date,
            position,
            association,
            is_international,
            comment,
        ]

    def save(self) -> str:
        official = Official.objects.get(pk=self.official_id)
        external_official_game_entry = OfficialExternalGames(
            None, *self.constructor_values
        )
        external_official_game_entry.save()
        return (
            f"ID: {external_official_game_entry.pk} "
            f"-> #Spiele {external_official_game_entry.number_games}:"
            f" {official.first_name} {official.last_name} als {external_official_game_entry.position}"
        )
