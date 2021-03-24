from django.contrib.auth.models import User

from gamedays.tests.setup_factories.factories import GameinfoFactory, GameresultFactory, GamedayFactory, \
    GameOfficialFactory, TeamLogFactory, GameSetupFactory, TeamFactory, UserFactory
from teammanager.models import Gameday, Gameinfo


class DBSetup:
    def g62_qualify_finished(self):
        return self._create_gameday()

    def g62_status_empty(self):
        return self._create_gameday(qualify='Geplant')

    def g62_finalround(self, sf='', p5='', p3='', p1=''):
        return self._create_gameday(sf=sf, p5=p5, p3=p3, p1=p1)

    def g62_finished(self, season=None):
        gameday = self._create_gameday(sf='beendet', p5='beendet', p3='beendet', p1='beendet', season=season)
        return gameday

    def g72_finished(self, season=None):
        gameday = self._create_gameday(group_a=4, sf='beendet', p5='beendet', p3='beendet', p1='beendet', season=season)
        home = TeamFactory(name='A4')
        away = TeamFactory(name='B3')
        self.create_finalround_game(gameday, standing='P5', status='beendet', home=home, away=away)
        return gameday

    def _create_gameday(self, qualify='beendet', sf='', p5='', p3='', p1='', group_a=3, group_b=3,
                        season=None) -> Gameday:
        gameday = self.create_empty_gameday(season=season)
        teams_group_a = self.create_group(gameday=gameday, name="A", standing="Gruppe 1", status=qualify,
                                          number_teams=group_a)
        teams_group_b = self.create_group(gameday=gameday, name="B", standing="Gruppe 2", status=qualify,
                                          number_teams=group_b)
        self.create_finalround_game(gameday=gameday, standing='HF', status=sf, home=teams_group_b[1],
                                    away=teams_group_a[0])
        self.create_finalround_game(gameday=gameday, standing='HF', status=sf, home=teams_group_a[1],
                                    away=teams_group_b[0])
        self.create_finalround_game(gameday=gameday, standing='P5', status=p5, home=teams_group_a[2],
                                    away=teams_group_b[2])
        self.create_finalround_game(gameday=gameday, standing='P3', status=p3, home=teams_group_b[1],
                                    away=teams_group_a[1])
        self.create_finalround_game(gameday=gameday, standing='P1', status=p1, home=teams_group_a[0],
                                    away=teams_group_b[0])
        return gameday

    def create_group(self, gameday, name, standing, stage='Vorrunde', status='beendet', number_teams=3):
        official = TeamFactory(name='officials')
        teams = self.create_teams(name, number_teams)
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

        gi = GameinfoFactory(gameday=gameday, stage=stage, standing=standing, status=status, officials=official)
        GameresultFactory(gameinfo=gi, team=teams[0], fh=2, sh=1, pa=2, isHome=True)
        GameresultFactory(gameinfo=gi, team=teams[1], fh=1, sh=1, pa=3)
        gi = GameinfoFactory(gameday=gameday, stage=stage, standing=standing, status=status, officials=official)
        GameresultFactory(gameinfo=gi, team=teams[1], fh=1, sh=1, pa=1, isHome=True)
        GameresultFactory(gameinfo=gi, team=teams[2], fh=1, sh=0, pa=2)
        gi = GameinfoFactory(gameday=gameday, stage=stage, standing=standing, status=status, officials=official)
        GameresultFactory(gameinfo=gi, team=teams[2], fh=1, sh=0, pa=3, isHome=True)
        GameresultFactory(gameinfo=gi, team=teams[0], fh=2, sh=1, pa=1)
        if number_teams > 3:
            gi = GameinfoFactory(gameday=gameday, stage=stage, standing=standing, status=status, officials=official)
            GameresultFactory(gameinfo=gi, team=teams[3], fh=0, sh=0, pa=3, isHome=True)
            GameresultFactory(gameinfo=gi, team=teams[0], fh=2, sh=1, pa=0)
            gi = GameinfoFactory(gameday=gameday, stage=stage, standing=standing, status=status, officials=official)
            GameresultFactory(gameinfo=gi, team=teams[1], fh=1, sh=1, pa=0, isHome=True)
            GameresultFactory(gameinfo=gi, team=teams[3], fh=0, sh=0, pa=2)
            gi = GameinfoFactory(gameday=gameday, stage=stage, standing=standing, status=status, officials=official)
            GameresultFactory(gameinfo=gi, team=teams[3], fh=0, sh=0, pa=1, isHome=True)
            GameresultFactory(gameinfo=gi, team=teams[2], fh=1, sh=0, pa=0)
        if number_teams > 4:
            gi = GameinfoFactory(gameday=gameday, stage=stage, standing=standing, status=status, officials=official)
            GameresultFactory(gameinfo=gi, team=teams[4], fh=0, sh=0, pa=3, isHome=True)
            GameresultFactory(gameinfo=gi, team=teams[0], fh=2, sh=1, pa=0)
            gi = GameinfoFactory(gameday=gameday, stage=stage, standing=standing, status=status, officials=official)
            GameresultFactory(gameinfo=gi, team=teams[1], fh=1, sh=1, pa=0, isHome=True)
            GameresultFactory(gameinfo=gi, team=teams[4], fh=0, sh=0, pa=2)
            gi = GameinfoFactory(gameday=gameday, stage=stage, standing=standing, status=status, officials=official)
            GameresultFactory(gameinfo=gi, team=teams[4], fh=0, sh=0, pa=1, isHome=True)
            GameresultFactory(gameinfo=gi, team=teams[2], fh=1, sh=0, pa=0)
            gi = GameinfoFactory(gameday=gameday, stage=stage, standing=standing, status=status, officials=official)
            GameresultFactory(gameinfo=gi, team=teams[3], fh=1, sh=0, pa=0, isHome=True)
            GameresultFactory(gameinfo=gi, team=teams[4], fh=0, sh=0, pa=1)
        return teams

    def create_teams(self, name, number_teams):
        teams = []
        for i in range(number_teams):
            teams.append(TeamFactory(name=(name + str(i + 1))))
        return teams

    def create_playoff_placeholder_teams(self):
        TeamFactory(name='P3 Gruppe 2')
        TeamFactory(name='P3 Gruppe 1')
        TeamFactory(name='P2 Gruppe 2')
        TeamFactory(name='P2 Gruppe 1')
        TeamFactory(name='P1 Gruppe 2')
        TeamFactory(name='P1 Gruppe 1')
        TeamFactory(name='Gewinner HF1')
        TeamFactory(name='Gewinner HF2')
        TeamFactory(name='Gewinner P3')
        TeamFactory(name='Verlierer HF1')
        TeamFactory(name='Verlierer HF2')

    def create_finalround_game(self, gameday, standing, status, home, away):
        if status == 'beendet':
            gi = GameinfoFactory(gameday=gameday, stage='Finalrunde', standing=standing, status=status)
            GameresultFactory(gameinfo=gi, team=home, fh=1, sh=1, pa=3, isHome=True)
            GameresultFactory(gameinfo=gi, team=away, fh=2, sh=1, pa=2)
            return gi
        else:
            gi = GameinfoFactory(gameday=gameday, stage='Finalrunde', standing=standing, status=status)
            GameresultFactory(gameinfo=gi, team=home, isHome=True)
            GameresultFactory(gameinfo=gi, team=away)
            return gi

    def create_empty_gameday(self, season=None) -> Gameday:
        if season is None:
            gameday = GamedayFactory()
        else:
            gameday = GamedayFactory(season=season)
        return gameday

    def create_main_round_gameday(self, status='', number_teams=5) -> Gameday:
        gameday = self.create_empty_gameday()
        self.create_group(gameday=gameday, name='A', stage='Hauptrunde', standing='Gruppe 1',
                          status=status, number_teams=number_teams)
        return gameday

    def create_officials(self, gameinfo):
        officials_positions = ['referee', 'scorecard jude', 'down judge', 'field judge', 'side judge']
        for position in officials_positions:
            GameOfficialFactory(gameinfo=gameinfo, position=position)

    def create_teamlog_home_and_away(self, home=None, away=None, gameinfo=None) -> Gameinfo:
        if home is None:
            home = TeamFactory(name='Home')
        if away is None:
            away = TeamFactory(name='Away')
        # score home: 21 + 20
        # score away: 3 and 2 cop
        if gameinfo is None:
            gameday = GamedayFactory()
            gameinfo = GameinfoFactory(gameday=gameday, stage='Hauptrunde', standing='Gruppe 1')
            GameresultFactory(gameinfo=gameinfo, team=home, fh=2, sh=1, pa=2, isHome=True)
            GameresultFactory(gameinfo=gameinfo, team=away, fh=1, sh=1, pa=3)
        self.create_teamlog_home(gameinfo, home)
        self.create_teamlog_away(gameinfo, away)
        return gameinfo

    def create_teamlog_home(self, gameinfo, home):
        TeamLogFactory(gameinfo=gameinfo, team=None, sequence=0, event='Spiel gestartet', value=6, half=0)
        TeamLogFactory(gameinfo=gameinfo, team=home, sequence=1, player=19, event='Touchdown', value=6, half=1)
        TeamLogFactory(gameinfo=gameinfo, team=home, sequence=2, player=19, event='Touchdown', value=6, half=1)
        TeamLogFactory(gameinfo=gameinfo, team=home, sequence=2, player=7, event='2-Extra-Punkte', value=2, half=1)
        TeamLogFactory(gameinfo=gameinfo, team=home, sequence=3, player=19, event='Touchdown', value=6, half=1)
        TeamLogFactory(gameinfo=gameinfo, team=home, sequence=3, player=7, event='1-Extra-Punkt', value=1, half=1)
        TeamLogFactory(gameinfo=gameinfo, team=home, sequence=5, player=19, event='Touchdown', value=6, half=2)
        TeamLogFactory(gameinfo=gameinfo, team=home, sequence=8, player=19, event='Touchdown', value=6, half=2)
        TeamLogFactory(gameinfo=gameinfo, team=home, sequence=8, player=7, event='2-Extra-Punkte', value=2, half=2)
        TeamLogFactory(gameinfo=gameinfo, team=home, sequence=9, player=19, event='Touchdown', value=6, half=2)
        TeamLogFactory(gameinfo=gameinfo, team=home, sequence=9, event='1-Extra-Punkt', value=1, half=2)

    def create_teamlog_away(self, gameinfo, away):
        TeamLogFactory(gameinfo=gameinfo, team=None, sequence=0, event='2. Halbzeit gestartet', value=2, half=2)
        TeamLogFactory(gameinfo=gameinfo, team=away, sequence=4, player=7, event='Safety', value=2, half=2)
        TeamLogFactory(gameinfo=gameinfo, team=away, sequence=6, event='Turnover', cop=True, half=2)
        TeamLogFactory(gameinfo=gameinfo, team=away, sequence=7, player=7, event='Safety', value=1, half=2)
        TeamLogFactory(gameinfo=gameinfo, team=away, sequence=10, event='Turnover', cop=True, half=2)
        TeamLogFactory(gameinfo=gameinfo, team=away, sequence=0, event='Spielzeit', input='12:10', value=0, half=2)
        TeamLogFactory(gameinfo=gameinfo, team=away, sequence=10, event='Auszeit', input='00:01', value=0, half=2)
        TeamLogFactory(gameinfo=gameinfo, team=None, sequence=0, event='Spiel beendet', half=2)

    def create_gamesetup(self, gameinfo):
        return GameSetupFactory(gameinfo=gameinfo, ctResult='won', direction='arrow_forward', fhPossession='AWAY')

    def get_token_header(self, user=None):
        if user is None:
            user = User.objects.first()
        from knox.models import AuthToken
        token = AuthToken.objects.create(user)
        return {
            'Content-Type': 'application/json',
            'Authorization': 'Token ' + token[1],
        }

    def create_new_user(self):
        return UserFactory(username='another_user')
