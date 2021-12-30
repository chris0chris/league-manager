import datetime
from abc import abstractmethod, ABC
from typing import List
from unittest import TestCase

from teammanager.models import Gameresult, Gameinfo, Gameday, Team


class ComparableMixin(object):

    def __repr__(self):
        key_values = ','.join(map(lambda item: f'{item[0]}->{item[1]}', self.__dict__.items()))
        return f'{self.__class__.__name__}({key_values})'

    def __eq__(self, other):
        if type(other) is type(self):
            return self.__dict__ == other.__dict__
        return False


class HashableMixin(ComparableMixin):

    def __hash__(self):
        return hash(tuple(map(lambda item: (item[0], item[1]), self.__dict__.items())))


class FinalTableEntry(ComparableMixin):
    def __init__(self, team: Team, points: int):
        self.points = points
        self.team = team


class GamedayFinalTable(ComparableMixin):

    def __init__(self, entry: List[FinalTableEntry]):
        self.entry = entry


class GameresultPointsRule(ABC):
    @abstractmethod
    def points(self):
        raise NotImplementedError

    @abstractmethod
    def accept(self, result: Gameresult):
        raise NotImplementedError


class WonGameresultPointsRule(GameresultPointsRule):

    def accept(self, result: Gameresult):
        return result.fh + result.sh > result.pa

    def points(self):
        return 3


class LostGameresultPointsRule(GameresultPointsRule):

    def points(self):
        return 0

    def accept(self, result: Gameresult):
        return result.fh + result.sh < result.pa


class TieGameresultPointsRule(GameresultPointsRule):

    def points(self):
        return 1

    def accept(self, result: Gameresult):
        return result.fh + result.sh == result.pa


class PointsCalculator:

    def __init__(self, rules: List[GameresultPointsRule]):
        self.rules = rules

    def calculate_points(self, results: List[Gameresult]):
        points = 0
        for rule in self.rules:
            for result in results:
                if rule.accept(result):
                    points += rule.points()
        return points


def from_game_results(game_results: List[Gameresult]):
    team_entries = []
    points_calculator = PointsCalculator(
        [WonGameresultPointsRule(), LostGameresultPointsRule(), TieGameresultPointsRule()])
    for team in set(map(lambda result: result.team, game_results)):
        team_results = list(filter(lambda result: result.team == team, game_results))

        team_entries.append(FinalTableEntry(team, points_calculator.calculate_points(team_results)))

    return GamedayFinalTable(team_entries)


class GamedayFinalTableTest(TestCase):
    def test_3_teams_clear_winner(self):
        team_1 = Team(1, name='a(12)')
        team_2 = Team(2, name='b(6)')
        team_3 = Team(3, name='c(0)')

        gameday = Gameday(name='first day')
        game_results = self.perform_match(gameday, team_1, team_2, fh=6, sh=0, pa=0)
        game_results.extend(self.perform_match(gameday, team_3, team_2, fh=0, sh=0, pa=6))
        game_results.extend(self.perform_match(gameday, team_3, team_1, fh=0, sh=0, pa=6))

        self.assertEqual(GamedayFinalTable([
            FinalTableEntry(team_1, 6),
            FinalTableEntry(team_2, 3),
            FinalTableEntry(team_3, 0)]),
            from_game_results(game_results))

    def perform_match(self, gameday, team_1, team_2, fh, sh, pa):
        game_results = []
        first_game = Gameinfo(scheduled=datetime.time(10), gameday=gameday)
        game_results.append(Gameresult(gameinfo=first_game, team=team_1, fh=fh, sh=sh, pa=pa))
        game_results.append(Gameresult(gameinfo=first_game, team=team_2, fh=pa, sh=sh, pa=fh))
        return game_results
