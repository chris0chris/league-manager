import pytest
from django_webtest import WebTest
from http import HTTPStatus
from rest_framework.reverse import reverse
from gamedays.models import Gameday, Gameinfo
from gamedays.tests.setup_factories.db_setup import DBSetup


class TestGamedayPublish(WebTest):
    def test_publish_gameday_success(self):
        gameday = DBSetup().g62_status_empty()
        assert gameday.status == Gameday.STATUS_DRAFT

        # Ensure initial state is "Geplant" for the test
        Gameinfo.objects.filter(gameday=gameday).update(status="Geplant")

        # Verify all games are also in DRAFT (default "Geplant" in model)
        for game in Gameinfo.objects.filter(gameday=gameday):
            assert game.status == "Geplant"

        url = reverse("api-gameday-publish", kwargs={"pk": gameday.pk})
        response = self.app.post(url, headers=DBSetup().get_token_header())

        assert response.status_code == HTTPStatus.OK

        gameday.refresh_from_db()
        assert gameday.status == Gameday.STATUS_PUBLISHED
        assert gameday.published_at is not None

        # Verify all associated games are now PUBLISHED
        for game in Gameinfo.objects.filter(gameday=gameday):
            assert game.status == Gameinfo.STATUS_PUBLISHED

    def test_publish_already_published_fails(self):
        gameday = DBSetup().g62_status_empty()
        gameday.status = Gameday.STATUS_PUBLISHED
        gameday.save()

        url = reverse("api-gameday-publish", kwargs={"pk": gameday.pk})
        response = self.app.post(
            url, headers=DBSetup().get_token_header(), expect_errors=True
        )

        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert "already published" in response.json["detail"].lower()
