from gamedays.models import Gameday
from gamedays.tests.setup_factories.factories import GameinfoFactory, GameresultFactory, GamedayFactory, \
    GameOfficialFactory


class DBSetup:
    def g62_qualify_finished(self):
        return self._create_gameday()

    def g62_status_empty(self):
        return self._create_gameday(qualify='')

    def g62_finalround(self, sf='', p5='', p3='', p1=''):
        return self._create_gameday(sf=sf, p5=p5, p3=p3, p1=p1)

    def g62_finished(self):
        gameday = self._create_gameday(sf='beendet', p5='beendet', p3='beendet', p1='beendet')
        return gameday

    def g72_finished(self):
        gameday = self._create_gameday(group_a=4, sf='beendet', p5='beendet', p3='beendet', p1='beendet')
        self.create_finalround_game(gameday, standing='P5', status='beendet', home='A4', away='B3')
        return gameday

    def _create_gameday(self, qualify='beendet', sf='', p5='', p3='', p1='', group_a=3, group_b=3) -> Gameday:
        gameday = self.create_empty_gameday()
        self.create_group(gameday=gameday, name="A", standing="Gruppe 1", status=qualify, number_teams=group_a)
        self.create_group(gameday=gameday, name="B", standing="Gruppe 2", status=qualify, number_teams=group_b)
        self.create_finalround_game(gameday=gameday, standing='HF', status=sf, home='B2', away='A1')
        self.create_finalround_game(gameday=gameday, standing='HF', status=sf, home='A2', away='B1')
        self.create_finalround_game(gameday=gameday, standing='P5', status=p5, home='A3', away='B3')
        self.create_finalround_game(gameday=gameday, standing='P3', status=p3, home='B2', away='A2')
        self.create_finalround_game(gameday=gameday, standing='P1', status=p1, home='A1', away='B1')
        return gameday

    def create_group(self, gameday, name, standing, stage='Vorrunde', status='beendet', number_teams=3):
        # teams = [name + str(team) for team in range(number_teams)]
        # if len(teams) % 2:
        #     teams.append('Day off')
        # n = len(teams)
        # matchs = []
        # fixtures = []
        # return_matchs = []
        # for fixture in range(1, n):
        #     for i in range(n // 2):
        #         matchs.append((teams[i], teams[n - 1 - i]))
        #         # return_matchs.append((teams[n - 1 - i], teams[i]))
        #     teams.insert(1, teams.pop())
        #     fixtures.insert(len(fixtures) // 2, matchs)
        #     # fixtures.append(return_matchs)
        #     matchs = []
        #     # return_matchs = []
        #
        # for fixture in fixtures:
        #     print(fixture)
        gi = GameinfoFactory(gameday=gameday, stage=stage, standing=standing, status=status)
        GameresultFactory(gameinfo=gi, team=name + '1', fh=2, sh=1, pa=2, isHome=True)
        GameresultFactory(gameinfo=gi, team=name + '2', fh=1, sh=1, pa=3)
        gi = GameinfoFactory(gameday=gameday, stage=stage, standing=standing, status=status)
        GameresultFactory(gameinfo=gi, team=name + '2', fh=1, sh=1, pa=1, isHome=True)
        GameresultFactory(gameinfo=gi, team=name + '3', fh=1, sh=0, pa=2)
        gi = GameinfoFactory(gameday=gameday, stage=stage, standing=standing, status=status)
        GameresultFactory(gameinfo=gi, team=name + '3', fh=1, sh=0, pa=3, isHome=True)
        GameresultFactory(gameinfo=gi, team=name + '1', fh=2, sh=1, pa=1)
        if number_teams > 3:
            gi = GameinfoFactory(gameday=gameday, stage=stage, standing=standing, status=status)
            GameresultFactory(gameinfo=gi, team=name + '4', fh=0, sh=0, pa=3, isHome=True)
            GameresultFactory(gameinfo=gi, team=name + '1', fh=2, sh=1, pa=0)
            gi = GameinfoFactory(gameday=gameday, stage=stage, standing=standing, status=status)
            GameresultFactory(gameinfo=gi, team=name + '2', fh=1, sh=1, pa=0, isHome=True)
            GameresultFactory(gameinfo=gi, team=name + '4', fh=0, sh=0, pa=2)
            gi = GameinfoFactory(gameday=gameday, stage=stage, standing=standing, status=status)
            GameresultFactory(gameinfo=gi, team=name + '4', fh=0, sh=0, pa=1, isHome=True)
            GameresultFactory(gameinfo=gi, team=name + '3', fh=1, sh=0, pa=0)
        if number_teams > 4:
            gi = GameinfoFactory(gameday=gameday, stage=stage, standing=standing, status=status)
            GameresultFactory(gameinfo=gi, team=name + '5', fh=0, sh=0, pa=3, isHome=True)
            GameresultFactory(gameinfo=gi, team=name + '1', fh=2, sh=1, pa=0)
            gi = GameinfoFactory(gameday=gameday, stage=stage, standing=standing, status=status)
            GameresultFactory(gameinfo=gi, team=name + '2', fh=1, sh=1, pa=0, isHome=True)
            GameresultFactory(gameinfo=gi, team=name + '5', fh=0, sh=0, pa=2)
            gi = GameinfoFactory(gameday=gameday, stage=stage, standing=standing, status=status)
            GameresultFactory(gameinfo=gi, team=name + '5', fh=0, sh=0, pa=1, isHome=True)
            GameresultFactory(gameinfo=gi, team=name + '3', fh=1, sh=0, pa=0)
            gi = GameinfoFactory(gameday=gameday, stage=stage, standing=standing, status=status)
            GameresultFactory(gameinfo=gi, team=name + '4', fh=1, sh=0, pa=0, isHome=True)
            GameresultFactory(gameinfo=gi, team=name + '5', fh=0, sh=0, pa=1)

    def create_finalround_game(self, gameday, standing, status, home='', away=''):
        if status == 'beendet':
            gi = GameinfoFactory(gameday=gameday, stage='Finalrunde', standing=standing, status=status)
            GameresultFactory(gameinfo=gi, team=home, fh=1, sh=1, pa=3, isHome=True)
            GameresultFactory(gameinfo=gi, team=away, fh=2, sh=1, pa=2)
            return gi
        else:
            gi = GameinfoFactory(gameday=gameday, stage='Finalrunde', standing=standing, status=status)
            GameresultFactory(gameinfo=gi, team=standing + '_home', isHome=True)
            GameresultFactory(gameinfo=gi, team=standing + '_away')
            return gi

    def create_empty_gameday(self) -> Gameday:
        gameday = GamedayFactory()
        return gameday

    def create_main_round_gameday(self, status='', number_teams=5) -> Gameday:
        gameday = self.create_empty_gameday()
        self.create_group(gameday=gameday, name='A', stage='Hauptrunde', standing='Gruppe 1',
                          status=status, number_teams=number_teams)
        return gameday

    def create_officials(self, gameinfo):
        for i in list(range(5)):
            GameOfficialFactory(gameinfo=gameinfo)

# def deco_cg(qualify='beendet', sf='', p5='', p3='', p1='', group_a=3, group_b=3) -> Gameday:
#     gameday = GamedayFactory()
#
#     def decorator_function(func):
#         def wrapper_func(*args, **kwargs):
#             gi = GameinfoFactory(gameday=gameday, stage='Vorrunde', standing='Gruppe 1', status='')
#             GameresultFactory(gameinfo=gi, team='A' + '1', fh=2, sh=1, pa=2, isHome=True)
#             GameresultFactory(gameinfo=gi, team='A' + '2', fh=1, sh=1, pa=3)
#             gi = GameinfoFactory(gameday=gameday, stage='Vorrunde', standing='Gruppe 1', status='')
#             GameresultFactory(gameinfo=gi, team='A' + '2', fh=1, sh=1, pa=1, isHome=True)
#             GameresultFactory(gameinfo=gi, team='A' + '3', fh=1, sh=0, pa=2)
#             gi = GameinfoFactory(gameday=gameday, stage='Vorrunde', standing='Gruppe 1', status='')
#             GameresultFactory(gameinfo=gi, team='A' + '3', fh=1, sh=0, pa=3, isHome=True)
#             GameresultFactory(gameinfo=gi, team='A' + '1', fh=2, sh=1, pa=1)
#             return func
#
#         return wrapper_func
#
#     return decorator_function
