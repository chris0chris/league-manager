from django.test import TestCase
from gamedays.models import Gameinfo, Gameday, Season, League, Team, Association
from django.contrib.auth.models import User
from django.utils import timezone


class GameStateModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", password="password")
        self.association = Association.objects.create(
            name="Test Association", abbr="TA"
        )
        self.season = Season.objects.create(name="Test Season")
        self.league = League.objects.create(name="Test League")
        self.team = Team.objects.create(
            name="Test Team",
            description="Test Description",
            location="Test Location",
            association=self.association,
        )
        self.gameday = Gameday.objects.create(
            name="Test Gameday",
            date=timezone.now().date(),
            start=timezone.now().time(),
            season=self.season,
            league=self.league,
            author=self.user,
        )

    def test_gameinfo_has_status_field(self):
        game = Gameinfo.objects.create(
            gameday=self.gameday,
            scheduled="10:00",
            field=1,
            stage="Preliminary",
            standing="Group A",
            officials=self.team,
            status="DRAFT",
        )

        self.assertTrue(hasattr(Gameinfo, "STATUS_DRAFT"))
        self.assertTrue(hasattr(Gameinfo, "STATUS_PUBLISHED"))
        self.assertTrue(hasattr(Gameinfo, "STATUS_IN_PROGRESS"))
        self.assertTrue(hasattr(Gameinfo, "STATUS_COMPLETED"))

        self.assertEqual(game.status, "DRAFT")

    def test_gameinfo_has_score_fields(self):
        game = Gameinfo.objects.create(
            gameday=self.gameday,
            scheduled="11:00",
            field=1,
            stage="Preliminary",
            standing="Group A",
            officials=self.team,
        )

        self.assertIsNone(game.halftime_score)
        self.assertIsNone(game.final_score)

        game.halftime_score = {"home": 7, "away": 0}
        game.final_score = {"home": 14, "away": 7}
        game.save()

        game.refresh_from_db()
        self.assertEqual(game.halftime_score, {"home": 7, "away": 0})
        self.assertEqual(game.final_score, {"home": 14, "away": 7})

    def test_gameinfo_has_is_locked_field(self):
        game = Gameinfo.objects.create(
            gameday=self.gameday,
            scheduled="12:00",
            field=1,
            stage="Preliminary",
            standing="Group A",
            officials=self.team,
        )
        self.assertFalse(game.is_locked)

        game.is_locked = True
        game.save()
        self.assertTrue(game.is_locked)
