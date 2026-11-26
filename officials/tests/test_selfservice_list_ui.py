import re
from datetime import date, datetime

from django.test import Client, TestCase
from django.urls import reverse

from gamedays.tests.setup_factories.factories import (
    GamedayFactory,
    GameinfoFactory,
    GameOfficialFactory,
    TeamFactory,
)
from officials.api.serializers import GameOfficialAllInfoSerializer
from officials.constants import MOODLE_LOGGED_IN_USER
from officials.tests.setup_factories.factories_officials import OfficialFactory

LIST_URL = reverse("view-officials-game-officials-appearance")
PROFILE_GAMELIST_URL_NAME = "view-officials-profile-gamelist"
ADD_ASSIGNMENT_URL = reverse("view-officials-selfservice-add-assignment")
DELETE_URL_NAME = "view-officials-selfservice-dffl-delete"
CLAIM_URL_NAME = "view-officials-selfservice-claim"
SEASON = datetime.today().year


class SelfServiceUiTestBase(TestCase):
    def setUp(self):
        self.team = TeamFactory(name="UI Test Team")
        self.official = OfficialFactory(
            first_name="Max", last_name="Mustermann", team=self.team
        )
        self.other = OfficialFactory(
            first_name="Erika", last_name="Musterfrau", team=self.team
        )
        self.client = Client()

    def login(self, official=None):
        session = self.client.session
        session[MOODLE_LOGGED_IN_USER] = (official or self.official).pk
        session.save()

    def make_row(self, official=None, name="Max Mustermann"):
        gameday = GamedayFactory(date=date(SEASON, 5, 1), name="Spieltag UI")
        gameinfo = GameinfoFactory(gameday=gameday)
        row = GameOfficialFactory(
            gameinfo=gameinfo, official=official, name=name, position="Referee"
        )
        return gameday, row


class TestGameOfficialSerializerGamedayId(TestCase):
    def test_gameday_id_is_exposed(self):
        row = {
            "id": 77,
            "name": "Julia Kuli",
            "position": "Referee",
            "gameinfo_id": 5,
            "gameinfo__gameday_id": 42,
            "gameinfo__standing": "group 1",
            "gameinfo__gameday__date": datetime.today(),
            "gameinfo__gameday__name": "Some Bowl Name",
            "gameinfo__officials_id": 7,
            "gameinfo__officials__description": "Some Team description",
            "gameinfo__officials__name": "Some Team name",
            "official__first_name": "Julia",
            "official__last_name": "Kuli",
            "official__team__name": "Some Official Team name",
            "home": "home team",
            "away": "away team",
        }

        data = GameOfficialAllInfoSerializer(instance=row).data

        assert data["gameday_id"] == "42"


class TestProfileGamelistUi(SelfServiceUiTestBase):
    def page(self):
        url = reverse(
            PROFILE_GAMELIST_URL_NAME,
            kwargs={"pk": self.official.pk, "season": SEASON},
        )
        return self.client.get(url).content.decode()

    def test_spiele_melden_is_a_primary_button(self):
        self.login()

        content = self.page()

        assert re.search(
            r'class="btn btn-primary[^"]*"[^>]*>\s*Spiele melden', content
        ), content

    def test_last_update_is_gone(self):
        self.login()

        content = self.page()

        assert "Letzte Aktualisierung" not in content

    def test_anmerkungen_section_is_gone(self):
        self.login()

        content = self.page()

        assert "Anmerkungen" not in content

    def test_missing_assignments_hint_links_to_einsaetze(self):
        self.login()

        content = self.page()

        assert "Fehlende Einsätze" in content
        assert 'href="/officials/einsaetze/"' in content
        assert content.index("Fehlende Einsätze") < content.index(
            "DFFL Spiele (und Ligen mit Scorecard)"
        )


class TestEinsaetzeListUi(SelfServiceUiTestBase):
    def page(self):
        return self.client.get(LIST_URL).content.decode()

    def test_own_mapped_row_offers_delete_instead_of_reclaim(self):
        _, own = self.make_row(official=self.official)
        self.login()

        content = self.page()

        assert reverse(DELETE_URL_NAME, kwargs={"pk": own.pk}) in content
        assert ">Löschen<" in content
        assert "Das war ich" not in content

    def test_foreign_mapped_row_with_match_keeps_reclaim(self):
        _, foreign = self.make_row(official=self.other)
        self.login()

        content = self.page()

        assert "Das war ich" in content
        assert reverse(CLAIM_URL_NAME, kwargs={"pk": foreign.pk}) in content
        assert reverse(DELETE_URL_NAME, kwargs={"pk": foreign.pk}) not in content

    def test_foreign_mapped_row_without_match_has_no_action(self):
        _, foreign = self.make_row(official=self.other, name="Jemand Anders")
        self.login()

        content = self.page()

        assert "Das war ich" not in content
        assert reverse(CLAIM_URL_NAME, kwargs={"pk": foreign.pk}) not in content
        assert reverse(DELETE_URL_NAME, kwargs={"pk": foreign.pk}) not in content

    def test_name_links_to_own_profile_gamelist(self):
        self.make_row(official=self.official)
        self.login()

        content = self.page()

        expected = f"/officials/profile/{self.official.pk}/gamelist/{SEASON}/"
        assert f'href="{expected}"' in content

    def test_unmapped_name_stays_unlinked(self):
        self.make_row(official=None, name=None)

        content = self.page()

        assert "/officials/profile/" not in content

    def test_game_cell_links_to_gameday_detail(self):
        gameday, _ = self.make_row(official=self.other)
        self.login()

        content = self.page()

        assert f'href="/gamedays/gameday/{gameday.pk}/"' in content

    def test_mine_filter_toggle_uses_canonical_url(self):
        self.login()

        content = self.page()

        assert 'href="/officials/einsaetze/meine/"' in content
        assert "Nur meine Einträge" in content


class TestAddAssignmentUi(SelfServiceUiTestBase):
    def test_submit_and_cancel_share_one_full_width_row(self):
        gameday = GamedayFactory(date=date(SEASON, 5, 1))
        self.login()

        content = self.client.get(
            ADD_ASSIGNMENT_URL, {"gameday": gameday.pk}
        ).content.decode()

        assert re.search(
            r'<div class="row[^"]*">.*?btn btn-primary w-100[^>]*>\s*Einsatz nachtragen'
            r".*?btn btn-outline-danger w-100[^>]*>\s*Abbrechen.*?</div>",
            content,
            re.S,
        ), content
