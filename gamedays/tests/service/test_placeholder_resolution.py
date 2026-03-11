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
        
        # Setup Designer Template and Application
        self.template = ScheduleTemplate.objects.create(
            name="Test Template",
            num_teams=6,
            num_fields=2
        )
        
        # Create a slot with a reference
        self.slot = TemplateSlot.objects.create(
            template=self.template,
            field=1,
            slot_order=1,
            stage="Finals",
            standing="P1",
            home_reference="Winner Game 1",
            away_reference="Winner Game 2"
        )
        
        TemplateApplication.objects.create(
            gameday=self.gameday,
            template=self.template,
            team_mapping={}
        )

    def test_resolve_placeholders_fills_team_names_from_references(self):
        # Update first game to match our slot
        gi = Gameinfo.objects.filter(gameday=self.gameday, field=1).order_by('scheduled').first()
        gi.stage = "Finals"
        gi.standing = "P1"
        gi.save()
        
        # Create results with NULL teams
        Gameresult.objects.filter(gameinfo=gi).delete()
        Gameresult.objects.create(gameinfo=gi, team=None, isHome=True)
        Gameresult.objects.create(gameinfo=gi, team=None, isHome=False)
        
        gmw = GamedayModelWrapper(self.gameday.pk)
        df = gmw._games_with_result
        
        game_results = df[df['gameinfo'] == gi.pk]
        home_result = game_results[game_results['isHome'] == True].iloc[0]
        away_result = game_results[game_results['isHome'] == False].iloc[0]
        
        assert home_result['team__name'] == "Winner Game 1"
        assert away_result['team__name'] == "Winner Game 2"
