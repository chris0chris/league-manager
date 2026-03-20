from django.test import TestCase

from gamedays.service.wrapper.gameinfo_wrapper import GameinfoWrapper
from gamedays.tests.setup_factories.factories import GameinfoFactory
from league_table.models import LeagueGroup
from league_table.tests.setup_factories.factories_leaguetable import LeagueGroupFactory


class TestGameinfoWrapperWithLeagueTableDependencies(TestCase):
    def test_delete_by_gameday(self):
        group: LeagueGroup = LeagueGroupFactory.create()
        gameinfo = GameinfoFactory.create()
        assert gameinfo.league_group is None
        assert gameinfo.standing == ""
        gameinfo_wrapper = GameinfoWrapper(gameinfo)
        gameinfo_wrapper.update_standing(group.pk)
        gameinfo.refresh_from_db()
        assert gameinfo.standing == group.name
        assert gameinfo.league_group == group
