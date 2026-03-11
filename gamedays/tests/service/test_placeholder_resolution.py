from django.test import TestCase
from gamedays.models import Gameday, Gameinfo, Gameresult
from gamedays.service.model_wrapper import GamedayModelWrapper
from gamedays.tests.setup_factories.db_setup import DBSetup
from gameday_designer.models import ScheduleTemplate, TemplateSlot, TemplateApplication


class TestPlaceholderResolution(TestCase):
    def setUp(self):
        self.db_setup = DBSetup()
        self.db_setup.g62_status_empty()
        self.gameday = Gameday.objects.first()
        from gamedays.models import Team

        self.team_a = Team.objects.create(name="Team A")

        # Setup Designer Template and Application
        self.template = ScheduleTemplate.objects.create(
            name="Test Template", num_teams=6, num_fields=2
        )

        # Create a slot with a reference
        self.slot = TemplateSlot.objects.create(
            template=self.template,
            field=1,
            slot_order=1,
            stage="Finals",
            standing="P1",
            home_reference="Winner Game 1",
            away_reference="Winner Game 2",
        )

        TemplateApplication.objects.create(
            gameday=self.gameday, template=self.template, team_mapping={}
        )

    def test_resolve_placeholders_fills_team_names_from_references(self):
        # Clear existing games to have a clean field
        Gameinfo.objects.filter(gameday=self.gameday).delete()

        # Create our specific game
        gi = Gameinfo.objects.create(
            gameday=self.gameday,
            field=1,
            scheduled="10:00",
            stage="Finals",
            standing="P1",
            officials=self.team_a,
        )

        # Create results with NULL teams
        Gameresult.objects.filter(gameinfo=gi).delete()
        Gameresult.objects.create(gameinfo=gi, team=None, isHome=True)
        Gameresult.objects.create(gameinfo=gi, team=None, isHome=False)

        gmw = GamedayModelWrapper(self.gameday.pk)
        df = gmw._games_with_result

        game_results = df[df["gameinfo"] == gi.pk]
        home_result = game_results[game_results["isHome"] == True].iloc[0]
        away_result = game_results[game_results["isHome"] == False].iloc[0]

        assert home_result["team__name"] == "Winner Game 1"
        assert away_result["team__name"] == "Winner Game 2"

    def test_get_game_placeholder_group_team(self):
        # Ensure we have a game on field 1
        gi = Gameinfo.objects.create(
            gameday=self.gameday,
            field=1,
            scheduled="12:00",
            stage="Preliminary",
            standing="Gruppe 1",
            officials=Gameinfo.objects.first().officials,
        )

        from gameday_designer.models import TemplateSlot

        # Clear existing slots to avoid index confusion
        TemplateSlot.objects.filter(template=self.template, field=1).delete()

        # Create 5 slots because DBSetup created 4 games + our 1 new game
        for i in range(1, 6):
            TemplateSlot.objects.create(
                template=self.template,
                field=1,
                slot_order=i,
                stage="Preliminary",
                standing="Gruppe 1",
                home_group=0,
                home_team=i - 1,
                away_group=0,
                away_team=i,
            )

        from gamedays.service.schedule_resolution_service import (
            GamedayScheduleResolutionService,
        )

        home_placeholder = GamedayScheduleResolutionService.get_game_placeholder(
            gi.pk, is_home=True
        )
        # For the 5th game, home_team was i-1 = 4
        assert home_placeholder == "G1_T5"
