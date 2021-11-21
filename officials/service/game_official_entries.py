from officials.models import Official
from teammanager.models import Gameinfo, GameOfficial


def convert_to_int(attr_name, value):
    try:
        return int(value)
    except ValueError:
        raise TypeError(f'{attr_name} muss eine Zahl sein!')


def check_for_allowed_value(position):
    if position in ['Referee', 'Down Judge', 'Field Judge', 'Side Judge']:
        return position
    raise ValueError('Position muss genau einen der Werte haben: Referee, Down Judge, Field Judge, Side Judge!')


class InternalGameOfficialEntry:
    def __init__(self, gameinfo_id, official_id, position):
        self.gameinfo_id = convert_to_int('gameinfo_id', gameinfo_id)
        self.official_id = convert_to_int('official_id', official_id)
        self.position = check_for_allowed_value(position)

    def save(self) -> str:
        gameinfo = Gameinfo.objects.get(pk=self.gameinfo_id)
        official = Official.objects.get(pk=self.official_id)
        game_official_entry = GameOfficial(gameinfo=gameinfo, official=official, position=self.position)
        game_official_entry.save()
        return f'ID: {game_official_entry.pk} ' \
               f'-> Spiel {self.gameinfo_id} - {official.first_name} {official.last_name} als {self.position}'
