from django.contrib.messages import get_messages
from django.test import Client, TestCase
from django.urls import reverse

from gamedays.models import GameOfficial
from gamedays.tests.setup_factories.factories import (
    GamedayFactory,
    GameinfoFactory,
    GameOfficialFactory,
    TeamFactory,
)
from officials.constants import MOODLE_LOGGED_IN_USER
from officials.tests.setup_factories.factories_officials import OfficialFactory

LIST_URL_NAME = "view-officials-game-officials-appearance"
CLAIM_URL_NAME = "view-officials-selfservice-claim"


def _game_with_row(official=None, name="Max Mustermann", position="Referee"):
    gameday = GamedayFactory(date="2026-05-01", name="Spieltag Einsätze")
    gameinfo = GameinfoFactory(gameday=gameday)
    row = GameOfficialFactory(
        gameinfo=gameinfo, official=official, name=name, position=position
    )
    return gameinfo, row


class SelfServiceTestBase(TestCase):
    def setUp(self):
        self.team = TeamFactory(name="Test Team")
        self.official = OfficialFactory(
            first_name="Max", last_name="Mustermann", team=self.team
        )
        self.other = OfficialFactory(
            first_name="Erika", last_name="Musterfrau", team=self.team
        )
        self.client = Client()

    def login_moodle(self, official=None, client=None):
        client = client or self.client
        session = client.session
        session[MOODLE_LOGGED_IN_USER] = (official or self.official).pk
        session.save()
        return client

    def messages(self, response):
        return [str(message) for message in get_messages(response.wsgi_request)]


class TestClaimAssignment(SelfServiceTestBase):
    def test_claim_confirm_shows_name_and_game(self):
        gameinfo, row = _game_with_row()
        self.login_moodle()

        response = self.client.get(reverse(CLAIM_URL_NAME, kwargs={"pk": row.pk}))

        assert response.status_code == 200
        content = response.content.decode()
        assert "Max Mustermann" in content
        assert "Spieltag Einsätze" in content
        assert "Referee" in content

    def test_claim_unmapped_row(self):
        gameinfo, row = _game_with_row()
        self.login_moodle()

        response = self.client.post(
            reverse(CLAIM_URL_NAME, kwargs={"pk": row.pk}), follow=True
        )

        assert response.status_code == 200
        row.refresh_from_db()
        assert row.official == self.official
        assert row.name == "Max Mustermann"

    def test_claim_already_mapped_fails(self):
        gameinfo, row = _game_with_row(official=self.other)
        self.login_moodle()

        response = self.client.post(
            reverse(CLAIM_URL_NAME, kwargs={"pk": row.pk}), follow=True
        )

        row.refresh_from_db()
        assert row.official == self.other
        assert any("bereits zugeordnet" in m for m in self.messages(response))

    def test_claim_race_single_winner(self):
        gameinfo, row = _game_with_row()
        client_two = self.login_moodle(client=Client())
        self.login_moodle()

        self.client.post(reverse(CLAIM_URL_NAME, kwargs={"pk": row.pk}))
        response = client_two.post(
            reverse(CLAIM_URL_NAME, kwargs={"pk": row.pk}), follow=True
        )

        row.refresh_from_db()
        assert response.status_code == 200
        assert row.official == self.official
        assert any("bereits zugeordnet" in m for m in self.messages(response))

    def test_moodle_claim_other_row_allowed(self):
        # Decision 1: any unmapped row may be claimed, no name check.
        gameinfo, row = _game_with_row(name="Someone Else")
        self.login_moodle()

        self.client.post(reverse(CLAIM_URL_NAME, kwargs={"pk": row.pk}))

        row.refresh_from_db()
        assert row.official == self.official

    def test_anonymous_claim_redirects(self):
        gameinfo, row = _game_with_row()

        response = self.client.get(reverse(CLAIM_URL_NAME, kwargs={"pk": row.pk}))

        assert response.status_code == 302
        assert response.url.startswith(reverse("view-officials-moodle-login"))
        assert "next=" in response.url
        row.refresh_from_db()
        assert row.official is None

    def test_staff_claim_requires_official(self):
        gameinfo, row = _game_with_row()
        staff = self.login_moodle(official=None)
        staff.force_login(_staff_user())

        response = staff.post(
            reverse(CLAIM_URL_NAME, kwargs={"pk": row.pk}), follow=True
        )

        row.refresh_from_db()
        assert row.official is None
        assert any("Offizielle" in m for m in self.messages(response))

    def test_staff_claim_assigns_posted_official(self):
        gameinfo, row = _game_with_row()
        client = Client()
        client.force_login(_staff_user())

        client.post(
            reverse(CLAIM_URL_NAME, kwargs={"pk": row.pk}),
            {"official_id": str(self.other.pk)},
        )

        row.refresh_from_db()
        assert row.official == self.other


def _staff_user():
    from gamedays.tests.setup_factories.db_setup import DBSetup

    return DBSetup().create_new_user("staff", is_staff=True)


class TestEinsaetzeHighlightAndFilter(SelfServiceTestBase):
    def test_mine_filter(self):
        gameinfo, own_row = _game_with_row(official=self.official)
        gameinfo, other_row = _game_with_row(official=self.other, name=None)
        gameinfo, matching_open = _game_with_row(name="Max Mustermann")
        gameinfo, foreign_open = _game_with_row(name="Jemand Anders")
        self.login_moodle()

        response = self.client.get(reverse(LIST_URL_NAME), {"mine": "1"})

        content = response.content.decode()
        assert f'<th scope="row">{own_row.pk}</th>' in content
        assert f'<th scope="row">{matching_open.pk}</th>' in content
        assert f'<th scope="row">{other_row.pk}</th>' not in content
        assert f'<th scope="row">{foreign_open.pk}</th>' not in content

    def test_null_name_row_renders_for_anonymous(self):
        GameOfficial.objects.create(
            gameinfo=_game_with_row()[0],
            official=None,
            name=None,
            position="Referee",
        )

        response = self.client.get(reverse(LIST_URL_NAME))

        assert response.status_code == 200

    def test_own_rows_are_highlighted_and_reveal_the_name(self):
        gameinfo, own_row = _game_with_row(official=self.official)
        self.login_moodle()

        content = self.client.get(reverse(LIST_URL_NAME)).content.decode()

        assert "table-info" in content
        assert "Max Mustermann" in content

    def test_unmapped_name_match_is_highlighted_with_claim_link(self):
        gameinfo, row = _game_with_row(name="Max Mustermann")
        self.login_moodle()

        content = self.client.get(reverse(LIST_URL_NAME)).content.decode()

        assert "Mir zuordnen" in content
        assert reverse(CLAIM_URL_NAME, kwargs={"pk": row.pk}) in content


class TestNameMatcher(TestCase):
    def test_matches_own_name_in_any_case_and_with_punctuation(self):
        from officials.selfservice import name_matches_official

        official = OfficialFactory(
            first_name="Max", last_name="Mustermann", team=TeamFactory(name="Test Team")
        )

        assert name_matches_official("max mustermann", official) is True
        assert name_matches_official("Mustermann, Max", official) is True
        assert name_matches_official("Max", official) is True

    def test_does_not_match_a_different_person(self):
        from officials.selfservice import name_matches_official

        official = OfficialFactory(
            first_name="Max", last_name="Mustermann", team=TeamFactory(name="Test Team")
        )

        assert name_matches_official("Erika Musterfrau", official) is False
        assert name_matches_official("", official) is False
        assert name_matches_official(None, official) is False
