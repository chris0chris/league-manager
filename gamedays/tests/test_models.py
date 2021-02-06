from django.test import TestCase

from gamedays.models import GameOfficial, Gameinfo, TeamLog
from gamedays.tests.setup_factories.db_setup import DBSetup


class TestGameOfficials(TestCase):

    def test_officials_are_created(self):
        DBSetup().g62_status_empty()

        assert len(GameOfficial.objects.all()) == 0
        official = GameOfficial(gameinfo=Gameinfo.objects.all().first(), name='Horst', position='Scorecard')
        official.save()
        assert len(GameOfficial.objects.all()) == 1


class TestTeamlog(TestCase):

    def test_save_touchdown_with_PAT(self):
        DBSetup().g62_status_empty()
        teamlog = TeamLog(gameinfo=Gameinfo.objects.all().first(), number=1, sixPoints=19, onePoint=7)
        teamlog.save()
        assert len(TeamLog.objects.all()) == 1
        assert str(teamlog) == f'{teamlog.pk}__1 6: 19 2: None 1: 7'

    def test_save_with_empty_entries(self):
        DBSetup().g62_status_empty()
        teamlog = TeamLog(gameinfo=Gameinfo.objects.all().first(), number=1)
        teamlog.save()
        assert len(TeamLog.objects.all()) == 1

    def test_save_with_change_of_possession(self):
        DBSetup().g62_status_empty()
        teamlog = TeamLog(gameinfo=Gameinfo.objects.all().first(), number=1, cop=True)
        teamlog.save()
        assert len(TeamLog.objects.all()) == 1
        assert str(teamlog) == f'{teamlog.pk}__1 CoP: True'
