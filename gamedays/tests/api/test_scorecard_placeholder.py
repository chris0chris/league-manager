from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth.models import User
from gamedays.models import Gameday, Gameinfo, Gameresult, Team
from gamedays.tests.setup_factories.db_setup import DBSetup
from gameday_designer.models import ScheduleTemplate, TemplateSlot, TemplateApplication



class ScorecardPlaceholderTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_superuser(username="admin", password="password")
        self.client.force_authenticate(user=self.user)

        self.db_setup = DBSetup()
        self.db_setup.g62_status_empty()
        self.gameday = Gameday.objects.first()

        # Setup Designer Template and Application
        self.template = ScheduleTemplate.objects.create(
            name="Test Template", num_teams=6, num_fields=2
        )

        TemplateApplication.objects.create(
            gameday=self.gameday, template=self.template, team_mapping={}
        )

    def test_gamelog_api_returns_placeholders_for_null_teams(self):
        """Verify the gamelog API returns human-readable placeholders when teams are NULL."""
        officials = Team.objects.first()

        # Clear all games on field 1 to control the slot index precisely
        Gameinfo.objects.filter(gameday=self.gameday, field=1).delete()

        # Create a single game on field 1 — this will be slot_order=1
        gi = Gameinfo.objects.create(
            gameday=self.gameday,
            scheduled="10:00",
            field=1,
            stage="Finals",
            standing="P1",
            officials=officials,
        )

        # Create results with NULL teams (bracket game, teams not yet determined)
        Gameresult.objects.create(gameinfo=gi, team=None, isHome=True)
        Gameresult.objects.create(gameinfo=gi, team=None, isHome=False)

        # Create exactly one template slot for field 1 with known references
        TemplateSlot.objects.filter(template=self.template).delete()
        TemplateSlot.objects.create(
            template=self.template,
            field=1,
            slot_order=1,
            stage="Finals",
            standing="P1",
            home_reference="Winner SF1",
            away_reference="Winner SF2",
        )

        url = f"/api/gamelog/{gi.pk}"
        response = self.client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.data
        assert data['home']['name'] == "Winner SF1"
        assert data['away']['name'] == "Winner SF2"
