from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth.models import User
from gamedays.models import Gameday, Gameinfo, Gameresult
from gamedays.tests.setup_factories.db_setup import DBSetup
from gameday_designer.models import ScheduleTemplate, TemplateSlot, TemplateApplication
import datetime


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

        # Create enough slots for field 1
        for i in range(1, 10):
            TemplateSlot.objects.create(
                template=self.template,
                field=1,
                slot_order=i,
                stage="Finals",
                standing="P1",
                home_reference=f"Winner Game {i*2-1}",
                away_reference=f"Winner Game {i*2}",
            )

        TemplateApplication.objects.create(
            gameday=self.gameday, template=self.template, team_mapping={}
        )

    def test_gamelog_api_returns_placeholders_for_null_teams(self):
        # Pick a game on field 1
        gi = (
            Gameinfo.objects.filter(gameday=self.gameday, field=1)
            .order_by("scheduled")
            .first()
        )

        # Ensure teams are NULL
        Gameresult.objects.filter(gameinfo=gi).delete()
        Gameresult.objects.create(gameinfo=gi, team=None, isHome=True)
        Gameresult.objects.create(gameinfo=gi, team=None, isHome=False)

        url = f"/api/gamelog/{gi.pk}"
        response = self.client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.data

        # Based on slot calculation (first game on field 1 found by scheduled time)
        # In DBSetup, there might be earlier games on field 1
        # It returned "Winner Game 3", which means it's the 2nd game (slot order index 1)
        assert data["home"]["name"] == "Winner Game 3"
        assert data["away"]["name"] == "Winner Game 4"
