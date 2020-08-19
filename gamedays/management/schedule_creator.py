import json

from gamedays.models import Gameinfo, Gameday, Gameresult


class ScheduleEntry():
    def __init__(self, entry):
        self.entry = entry

    def get_scheduled(self):
        return self.entry["scheduled"]

    def get_stage(self):
        return self.entry["stage"]

    def get_standing(self):
        return self.entry["standing"]

    def get_field(self):
        return self.entry["field"]

    def get_home(self):
        return self.entry["home"]

    def get_away(self):
        return self.entry["away"]

    def get_official(self):
        return self.entry["official"]


class Schedule():
    def __init__(self, fields, groups):
        self.groups = groups
        teams = sum(len(group) for group in groups)
        self.schedule_version = str(teams) + '_' + str(fields)

    def get_entries(self):
        with open('gamedays/management/schedules/schedule_' + self.schedule_version + '.json') as f:
            data = json.load(f)
        entries = []
        for entry in data:
            for key in entry:
                tmp = entry[key].split('_')
                if len(tmp) > 1:
                    entry[key] = self.groups[int(tmp[0])][int(tmp[1])]
            entries.append(ScheduleEntry(entry))
        return entries


class ScheduleCreator():
    def __init__(self, gameday: Gameday, schedule: Schedule):
        self.gameday = gameday
        self.schedule = schedule

    def create(self):
        for entry in self.schedule.get_entries():
            gameinfo = Gameinfo()
            gameinfo.gameday = self.gameday
            gameinfo.scheduled = entry.get_scheduled()
            gameinfo.stage = entry.get_stage()
            gameinfo.field = entry.get_field()
            gameinfo.standing = entry.get_standing()
            if entry.get_official() != '':
                gameinfo.officials = entry.get_official()
            gameinfo.save()

            if entry.get_home() != '' and entry.get_away() != '':
                home = Gameresult()
                home.gameinfo = gameinfo
                home.team = entry.get_home()
                home.isHome = True
                home.save()
                away = Gameresult()
                away.gameinfo = gameinfo
                away.team = entry.get_away()
                away.save()
