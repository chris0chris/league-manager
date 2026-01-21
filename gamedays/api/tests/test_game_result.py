import pytest
from django_webtest import WebTest
from http import HTTPStatus
from rest_framework.reverse import reverse
from gamedays.models import Gameday, Gameinfo
from gamedays.tests.setup_factories.db_setup import DBSetup


class TestGameResult(WebTest):
    def test_update_halftime_score_success(self):
        gameday = DBSetup().g62_status_empty()
        # Publish first
        gameday.status = Gameday.STATUS_PUBLISHED
        gameday.save()

        game = Gameinfo.objects.filter(gameday=gameday).first()

        url = reverse("api-game-result", kwargs={"pk": game.pk})
        score_data = {"halftime_score": {"home": 14, "away": 6}}
        response = self.app.patch_json(
            url, score_data, headers=DBSetup().get_token_header()
        )

        assert response.status_code == HTTPStatus.OK

        game.refresh_from_db()
        assert game.halftime_score == {"home": 14, "away": 6}
        assert game.status == Gameinfo.STATUS_IN_PROGRESS

        gameday.refresh_from_db()
        assert gameday.status == Gameday.STATUS_IN_PROGRESS

    def test_update_final_score_success(self):
        gameday = DBSetup().g62_status_empty()
        gameday.status = Gameday.STATUS_PUBLISHED
        gameday.save()

        game = Gameinfo.objects.filter(gameday=gameday).first()

        url = reverse("api-game-result", kwargs={"pk": game.pk})
        score_data = {"final_score": {"home": 28, "away": 12}}
        response = self.app.patch_json(
            url, score_data, headers=DBSetup().get_token_header()
        )

        assert response.status_code == HTTPStatus.OK

        game.refresh_from_db()
        assert game.final_score == {"home": 28, "away": 12}
        assert game.status == Gameinfo.STATUS_COMPLETED

    def test_gameday_completed_when_all_games_finished(self):
        gameday = DBSetup().g62_status_empty()
        gameday.status = Gameday.STATUS_PUBLISHED
        gameday.save()

        games = Gameinfo.objects.filter(gameday=gameday)

        for game in games:
            url = reverse("api-game-result", kwargs={"pk": game.pk})
            self.app.patch_json(
                url,
                {"final_score": {"home": 0, "away": 0}},
                headers=DBSetup().get_token_header(),
            )

        gameday.refresh_from_db()
        assert gameday.status == Gameday.STATUS_COMPLETED
