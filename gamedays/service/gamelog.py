import json

from django.db.models import QuerySet

from gamedays.models import Gameresult, TeamLog


class GameLogCreator(object):
    def __init__(self, gameinfo, team, event, half=1):
        self.gameinfo = gameinfo
        self.team = team
        self.half = half
        self.event = event

    def create(self):
        print(type(self.event), self.event)
        sequence = self._getSequence()
        for attr, value in self.event.items():
            teamlog = TeamLog()
            teamlog.gameinfo = self.gameinfo
            teamlog.team = self.team
            teamlog.sequence = sequence
            teamlog.cop = attr == 'cop'
            teamlog.event = attr
            teamlog.player = self._get_player(value)
            teamlog.value = self._getValue(attr) if teamlog.player is not None else 0
            teamlog.half = self.half
            teamlog.save()
            print(attr, '=', value)
        return GameLog(self.gameinfo)

    def _getSequence(self):
        entryWithLatestSequence: TeamLog = TeamLog.objects.filter(gameinfo=self.gameinfo).order_by(
            '-sequence').first()
        if entryWithLatestSequence:
            return entryWithLatestSequence.sequence + 1
        return 1

    def _getValue(self, attr):
        if attr == 'td':
            return 6
        if attr in ('pat1', '+1'):
            return 1
        if attr in ('pat2', '+2'):
            return 2
        return 0

    def _get_player(self, value):
        try:
            return value if value.isdigit() else None
        except:
            return None


class GameLog(object):
    home_firsthalf_entries: QuerySet[TeamLog] = None
    away_firsthalf_entries: QuerySet[TeamLog] = None
    home_secondhalf_entries: QuerySet[TeamLog] = None
    away_secondhalf_entries: QuerySet[TeamLog] = None

    def __init__(self, gameinfo):
        self.gameinfo = gameinfo
        home = Gameresult.objects.get(gameinfo=self.gameinfo, isHome=True).team
        away = Gameresult.objects.get(gameinfo=self.gameinfo, isHome=False).team
        self.gamelog = GameLogObject(gameinfo.pk, home, away)

    def as_json(self):
        self.gamelog.is_first_half = self.is_firsthalf()
        self.gamelog.home.score = self.get_home_score()
        self.gamelog.away.score = self.get_away_score()
        self.gamelog.home.firsthalf.score = self._calc_score(self.get_entries_home_firsthalf())
        self.gamelog.home.firsthalf.entries = self.create_entries_for_half(self.get_entries_home_firsthalf())
        self.gamelog.away.firsthalf.score = self._calc_score(self.get_entries_away_firsthalf())
        self.gamelog.away.firsthalf.entries = self.create_entries_for_half(self.get_entries_away_firsthalf())
        self.gamelog.home.secondhalf.score = self._calc_score(self.get_entries_home_secondhalf())
        self.gamelog.home.secondhalf.entries = self.create_entries_for_half(self.get_entries_home_secondhalf())
        self.gamelog.away.secondhalf.score = self._calc_score(self.get_entries_away_secondhalf())
        self.gamelog.away.secondhalf.entries = self.create_entries_for_half(self.get_entries_away_secondhalf())
        return json.dumps(self.gamelog, cls=(GameLogEncoder))

    def get_home_team(self):
        return self.gamelog.home.name

    def get_away_team(self):
        return self.gamelog.away.name

    def get_entries_home_firsthalf(self):
        if self.home_firsthalf_entries:
            return self.home_firsthalf_entries
        self.home_firsthalf_entries = self._get_entries_for_team_and_half(team=self.gamelog.home.name, half=1)
        return self.home_firsthalf_entries

    def get_entries_away_firsthalf(self):
        if self.away_firsthalf_entries:
            return self.away_firsthalf_entries
        self.away_firsthalf_entries = self._get_entries_for_team_and_half(team=self.gamelog.away.name, half=1)
        return self.away_firsthalf_entries

    def get_entries_home_secondhalf(self):
        if self.home_secondhalf_entries:
            return self.home_secondhalf_entries
        self.home_secondhalf_entries = self._get_entries_for_team_and_half(team=self.gamelog.home.name, half=2)
        return self.home_secondhalf_entries

    def get_entries_away_secondhalf(self):
        if self.away_secondhalf_entries:
            return self.away_secondhalf_entries
        self.away_secondhalf_entries = self._get_entries_for_team_and_half(team=self.gamelog.away.name, half=2)
        return self.away_secondhalf_entries

    def _get_entries_for_team_and_half(self, team, half):
        return TeamLog.objects.filter(gameinfo=self.gameinfo, team=team, half=half).order_by('-sequence')

    def get_home_score(self):
        return self.get_home_firsthalf_score() + self.get_home_secondhalf_score()

    def get_away_score(self):
        return self.get_away_firsthalf_score() + self.get_away_secondhalf_score()

    def _calc_score(self, half_entries):
        sum = 0
        entry: TeamLog
        for entry in half_entries:
            if not entry.isDeleted:
                sum = sum + entry.value
        return sum

    def create_entries_for_half(self, half_entries):
        result = dict()
        entry: TeamLog
        for entry in half_entries:
            if result.get(entry.sequence) is None:
                result[entry.sequence] = {
                    'sequence': entry.sequence
                }
            if entry.cop:
                result[entry.sequence].update({'cop': entry.cop})
            else:
                result[entry.sequence].update({entry.event: entry.player})
            if entry.isDeleted:
                result[entry.sequence].update({'isDeleted': True})
        return list(result.values())

    def is_firsthalf(self):
        return self.gameinfo.gameHalftime is None

    def get_home_firsthalf_score(self):
        return self._calc_score(self.get_entries_home_firsthalf())

    def get_home_secondhalf_score(self):
        return self._calc_score(self.get_entries_home_secondhalf())

    def get_away_firsthalf_score(self):
        return self._calc_score(self.get_entries_away_firsthalf())

    def get_away_secondhalf_score(self):
        return self._calc_score(self.get_entries_away_secondhalf())

    def mark_entries_as_deleted(self, sequence):
        TeamLog.objects.filter(gameinfo=self.gameinfo, sequence=sequence).update(isDeleted=True)


class Half(object):
    def __init__(self):
        self.score = None
        self.entries = []

    def as_json(self):
        return dict(score=self.score, entries=self.entries)


class Team(object):
    def __init__(self, name):
        self.name = name
        self.score = None
        self.firsthalf = Half()
        self.secondhalf = Half()

    def as_json(self):
        return dict(name=self.name, score=self.score, firsthalf=self.firsthalf, secondhalf=self.secondhalf)


class GameLogObject(object):
    def __init__(self, gameId, home, away):
        self.gameId = gameId
        self.home = Team(home)
        self.away = Team(away)
        self.is_first_half = True

    def as_json(self):
        return dict(gameId=self.gameId, isFirstHalf=self.is_first_half, home=self.home, away=self.away)


class GameLogEncoder(json.JSONEncoder):
    def default(self, obj):
        if hasattr(obj, 'as_json'):
            return obj.as_json()
        return json.JSONEncoder.default(self, obj)
