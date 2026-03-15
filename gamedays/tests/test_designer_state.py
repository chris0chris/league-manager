from django.test import TestCase
from django.contrib.auth.models import User
from gamedays.models import Gameday, GamedayDesignerState
from gamedays.tests.setup_factories.db_setup import DBSetup


class TestGamedayDesignerState(TestCase):
    def setUp(self):
        self.db_setup = DBSetup()
        self.db_setup.g62_status_empty()
        self.gameday = Gameday.objects.first()
        self.user = User.objects.create_user(username="testuser")

    def test_create_designer_state(self):
        state = GamedayDesignerState.objects.create(
            gameday=self.gameday,
            state_data={"nodes": [], "edges": []},
            last_modified_by=self.user,
        )
        assert state.gameday == self.gameday
        assert state.state_data == {"nodes": [], "edges": []}
        assert state.last_modified_by == self.user
        assert self.gameday.designer_state == state
