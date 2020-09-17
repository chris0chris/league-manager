from gamedays.models import Gameday
from gamedays.tests.testdata.factories import GameinfoFactory, GameresultFactory, UserFactory, GamedayFactory


class DBSetup:
    def g62_qualify_finished(self):
        return self._create_gameday()

    def g62_status_empty(self):
        return self._create_gameday(qualify='')

    def g62_finalround(self, sf='', p5='', p3='', p1=''):
        return self._create_gameday(sf=sf, p5=p5, p3=p3, p1=p1)

    def _create_gameday(self, qualify='beendet', sf='', p5='', p3='', p1='') -> Gameday:
        author = UserFactory()
        gameday = GamedayFactory(author=author)
        self.create_group(gameday=gameday, name="A", standing="Gruppe 1", status=qualify)
        self.create_group(gameday=gameday, name="B", standing="Gruppe 2", status=qualify)
        self._create_finalround_game(gameday=gameday, standing='HF', status=sf, home='B2', away='A1')
        self._create_finalround_game(gameday=gameday, standing='HF', status=sf, home='A2', away='B1')
        self._create_finalround_game(gameday=gameday, standing='P5', status=p5, home='A3', away='B3')
        self._create_finalround_game(gameday=gameday, standing='P3', status=p3, home='B2', away='A2')
        self._create_finalround_game(gameday=gameday, standing='P1', status=p1, home='A1', away='B1')
        return gameday

    def create_group(self, gameday, name, standing, status='beendet', four_teams=False):
        gi = GameinfoFactory(gameday=gameday, stage="Vorrunde", standing=standing, status=status)
        GameresultFactory(gameinfo=gi, team=name + '1', fh=2, sh=1, pa=2, isHome=True)
        GameresultFactory(gameinfo=gi, team=name + '2', fh=1, sh=1, pa=3)
        gi = GameinfoFactory(gameday=gameday, stage="Vorrunde", standing=standing, status=status)
        GameresultFactory(gameinfo=gi, team=name + '2', fh=1, sh=1, pa=1, isHome=True)
        GameresultFactory(gameinfo=gi, team=name + '3', fh=1, sh=0, pa=2)
        gi = GameinfoFactory(gameday=gameday, stage="Vorrunde", standing=standing, status=status)
        GameresultFactory(gameinfo=gi, team=name + '3', fh=1, sh=0, pa=3, isHome=True)
        GameresultFactory(gameinfo=gi, team=name + '1', fh=2, sh=1, pa=1)
        if four_teams:
            gi = GameinfoFactory(gameday=gameday, stage="Vorrunde", standing=standing, status=status)
            GameresultFactory(gameinfo=gi, team=name + '4', fh=0, sh=0, pa=3, isHome=True)
            GameresultFactory(gameinfo=gi, team=name + '1', fh=2, sh=1, pa=0)
            gi = GameinfoFactory(gameday=gameday, stage="Vorrunde", standing=standing, status=status)
            GameresultFactory(gameinfo=gi, team=name + '2', fh=1, sh=1, pa=0, isHome=True)
            GameresultFactory(gameinfo=gi, team=name + '4', fh=0, sh=0, pa=2)
            gi = GameinfoFactory(gameday=gameday, stage="Vorrunde", standing=standing, status=status)
            GameresultFactory(gameinfo=gi, team=name + '4', fh=0, sh=0, pa=1, isHome=True)
            GameresultFactory(gameinfo=gi, team=name + '3', fh=1, sh=0, pa=0)

    def _create_finalround_game(self, gameday, standing, status, home='', away=''):
        if status == 'beendet':
            gi = GameinfoFactory(gameday=gameday, stage='Finalrunde', standing=standing, status=status)
            GameresultFactory(gameinfo=gi, team=home, fh=1, sh=1, pa=3, isHome=True)
            GameresultFactory(gameinfo=gi, team=away, fh=2, sh=1, pa=2)
            return gi
        return GameinfoFactory(gameday=gameday, stage='Finalrunde', standing=standing, status=status)
