from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth.models import User
from gamedays.models import Gameday, GamedayDesignerState
from gamedays.tests.setup_factories.db_setup import DBSetup


class DesignerAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_superuser(username="admin", password="password")
        self.client.force_authenticate(user=self.user)
        self.db_setup = DBSetup()
        self.db_setup.g62_status_empty()
        self.gameday = Gameday.objects.first()

    def test_get_designer_state(self):
        GamedayDesignerState.objects.create(
            gameday=self.gameday, state_data={"nodes": [{"id": "1"}], "edges": []}
        )
        url = f"/api/gamedays/{self.gameday.id}/designer-state/"
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["state_data"]["nodes"][0]["id"] == "1"

    def test_update_designer_state(self):
        url = f"/api/gamedays/{self.gameday.id}/designer-state/"
        data = {"state_data": {"nodes": [{"id": "2"}], "edges": []}}
        response = self.client.put(url, data, format="json")
        assert response.status_code == status.HTTP_200_OK
        state = GamedayDesignerState.objects.get(gameday=self.gameday)
        assert state.state_data["nodes"][0]["id"] == "2"

    def test_get_designer_state_seeds_metadata_from_gameday_when_state_is_empty(self):
        """For a new gameday with no stored state_data, GET should return metadata
        seeded from the Gameday model so the designer form shows correct defaults."""
        url = f"/api/gamedays/{self.gameday.id}/designer-state/"
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        metadata = response.data["state_data"]["metadata"]
        assert metadata["name"] == self.gameday.name
        assert str(metadata["date"]) == str(self.gameday.date)
        assert metadata["status"] == self.gameday.status

    def test_publish_gameday(self):
        self.gameday.status = Gameday.STATUS_DRAFT
        self.gameday.save()
        url = f"/api/gamedays/{self.gameday.id}/publish/"
        response = self.client.post(url)
        assert response.status_code == status.HTTP_200_OK
        self.gameday.refresh_from_db()
        assert self.gameday.status == Gameday.STATUS_PUBLISHED
