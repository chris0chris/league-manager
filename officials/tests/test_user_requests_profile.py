"""Regression tests for the profile / self-service UI requests.

Covers the DFFL gameday link, the DFFL delete copy, the "Spiele melden"
button placement, own-profile name reveal and the mobile formset spacing.
"""

import re
from datetime import date

from django.contrib.auth.models import User
from django.test import Client, TestCase
from django.urls import reverse

from gamedays.tests.setup_factories.factories import (
    GameresultFactory,
    GamedayFactory,
    GameinfoFactory,
    GameOfficialFactory,
    TeamFactory,
)
from officials.api.serializers import OfficialGamelistSerializer
from officials.constants import MOODLE_LOGGED_IN_USER
from officials.tests.setup_factories.db_setup_officials import DbSetupOfficials
from officials.tests.setup_factories.factories_officials import (
    OfficialExternalGamesFactory,
    OfficialFactory,
)

PROFILE_URL_NAME = "view-officials-profile-gamelist"
DFFL_DELETE_URL_NAME = "view-officials-selfservice-dffl-delete"
EXTERNAL_DELETE_URL_NAME = "view-officials-selfservice-external-delete"
MULTI_ADD_URL_NAME = "view-officials-selfservice-external-multi-add"
SEASON = date.today().year


class ProfileUiTestBase(TestCase):
    def setUp(self):
        DbSetupOfficials.create_production_associations()
        self.team = TeamFactory(name="Profil Team")
        self.own = OfficialFactory(
            first_name="Max", last_name="Mustermann", team=self.team
        )
        self.other = OfficialFactory(
            first_name="Erika", last_name="Musterfrau", team=self.team
        )
        self.client = Client()
        self.login(self.own)

    def login(self, official):
        session = self.client.session
        session[MOODLE_LOGGED_IN_USER] = official.pk
        session.save()

    def logout_moodle(self):
        session = self.client.session
        session.pop(MOODLE_LOGGED_IN_USER, None)
        session.save()

    def profile_url(self, official=None):
        return reverse(
            PROFILE_URL_NAME,
            kwargs={"pk": (official or self.own).pk, "season": SEASON},
        )

    def profile_content(self, official=None):
        return self.client.get(self.profile_url(official)).content.decode()

    def dffl_row(self, official=None, day=None):
        gameday = GamedayFactory(date=day or date(SEASON, 5, 1), name="Spieltag Profil")
        gameinfo = GameinfoFactory(gameday=gameday)
        GameresultFactory(gameinfo=gameinfo, team=TeamFactory(name="Heim"), isHome=True)
        GameresultFactory(
            gameinfo=gameinfo, team=TeamFactory(name="Gast"), isHome=False
        )
        row = GameOfficialFactory(
            gameinfo=gameinfo,
            official=official or self.own,
            name="Max Mustermann",
            position="Referee",
        )
        return gameday, row

    def external_entry(self, official=None, reporter_name="Eva Beispiel"):
        return OfficialExternalGamesFactory(
            official=official or self.own,
            number_games=2,
            date=date(SEASON, 5, 2),
            notification_date=date(SEASON, 5, 3),
            position="Referee",
            association=DbSetupOfficials.create_production_associations()["AFCVT"],
            halftime_duration=20,
            reporter_name=reporter_name,
            comment="",
        )


class TestDfflGamedayLink(ProfileUiTestBase):
    def test_serializer_exposes_gameday_id_without_changing_other_fields(self):
        gameday, _ = self.dffl_row()

        data = OfficialGamelistSerializer(instance=self.own, season=SEASON).data
        game = data["dffl_games"]["all_games"][0]

        assert game["gameday_id"] == gameday.pk
        assert set(game) == {
            "position",
            "game_official_id",
            "gameinfo_id",
            "gameday_id",
            "gameday",
            "date",
            "vs",
            "standing",
        }

    def test_spieltag_cell_links_to_gameday_detail(self):
        gameday, _ = self.dffl_row()

        content = self.profile_content()

        assert (
            f'<a href="/gamedays/gameday/{gameday.pk}/">{gameday.name}</a>' in content
        )


class TestDfflDeleteCopy(ProfileUiTestBase):
    def test_confirm_says_assignment_is_removed_and_entry_stays(self):
        _, row = self.dffl_row()

        content = self.client.get(
            reverse(DFFL_DELETE_URL_NAME, kwargs={"pk": row.pk})
        ).content.decode()

        assert "Der Eintrag bleibt" in content
        assert "Namen" in content
        assert "Zuordnung aufheben" in content
        assert "Endgültig löschen" not in content
        assert "Achtung" not in content

    def test_future_game_needs_no_scorecard_warning_because_row_is_kept(self):
        _, row = self.dffl_row(day=date(SEASON + 1, 5, 1))

        content = self.client.get(
            reverse(DFFL_DELETE_URL_NAME, kwargs={"pk": row.pk})
        ).content.decode()

        assert "Der Eintrag bleibt" in content
        assert "Achtung" not in content

    def test_external_game_delete_copy_is_unchanged(self):
        entry = self.external_entry()

        content = self.client.get(
            reverse(EXTERNAL_DELETE_URL_NAME, kwargs={"pk": entry.pk})
        ).content.decode()

        assert "Endgültig löschen" in content
        assert "Einsatz entfernen" not in content


class TestSpieleMeldenButton(ProfileUiTestBase):
    def test_button_is_full_width_directly_below_external_games_table(self):
        content = self.profile_content()

        table_end = content.index(
            "</table>", content.index("Spiele außerhalb der DFFL")
        )
        button_at = content.index("Spiele melden")

        assert button_at > table_end
        assert re.search(
            r'class="btn btn-primary w-100"[^>]*>\s*Spiele melden', content
        ), content

    def test_button_is_hidden_on_somebody_elses_profile(self):
        self.login(self.other)

        content = self.profile_content(self.own)

        assert "Spiele melden" not in content


class TestProfileNameReveal(ProfileUiTestBase):
    def test_own_profile_shows_own_and_reporter_name_unobfuscated(self):
        self.external_entry()

        response = self.client.get(self.profile_url())
        content = response.content.decode()

        assert response.context["official_info"]["name"] == "Max Mustermann"
        assert "Eva Beispiel" in content
        assert "E****B****" not in content

    def test_serializer_reveals_names_when_self_without_staff(self):
        self.external_entry()

        data = OfficialGamelistSerializer(
            instance=self.own, season=SEASON, is_staff=False, is_self=True
        ).data

        assert data["name"] == "Max Mustermann"
        assert data["external_games"]["all_games"][0]["reporter_name"] == "Eva Beispiel"

    def test_somebody_elses_profile_stays_obfuscated(self):
        self.external_entry(official=self.other)

        content = self.profile_content(self.other)

        assert "E****M****" in content
        assert "E****B****" in content
        assert "Erika Musterfrau" not in content
        assert "Eva Beispiel" not in content

    def test_anonymous_profile_stays_obfuscated(self):
        self.logout_moodle()
        self.external_entry()

        content = self.profile_content()

        assert "M****M****" in content
        assert "E****B****" in content
        assert "Max Mustermann" not in content
        assert "Eva Beispiel" not in content

    def test_staff_still_sees_names(self):
        User.objects.create(username="profile-staff", is_staff=True)
        self.client.force_login(User.objects.get(username="profile-staff"))
        self.external_entry(official=self.other)

        content = self.profile_content(self.other)

        assert "Erika Musterfrau" in content
        assert "Eva Beispiel" in content


class TestMultiAddMobileSpacing(ProfileUiTestBase):
    LABELS = (
        "Datum:",
        "#Spiele:",
        "Position:",
        "Verband:",
        "Halbzeitdauer:",
        "Clock Control:",
        "International:",
        "Kommentar:",
    )

    def test_mobile_labels_and_inputs_share_a_spaced_wrapper(self):
        content = self.client.get(reverse(MULTI_ADD_URL_NAME)).content.decode()

        for label in self.LABELS:
            with self.subTest(label=label):
                marker = f'<span class="d-md-none fw-bold d-block">{label}</span>'
                assert marker in content
                start = content.index(marker)
                wrapper_start = content.rfind('<div class="mb-2">', 0, start)
                wrapper_end = content.index("</div>", start)
                assert wrapper_start != -1
                assert 'name="form-0-' in content[wrapper_start:wrapper_end]

    def test_add_row_button_is_full_width_with_extra_vertical_space(self):
        content = self.client.get(reverse(MULTI_ADD_URL_NAME)).content.decode()

        assert re.search(
            r'<button class="btn btn-outline-secondary w-100"[^>]*>\s*'
            r"Weitere Zeile hinzufügen",
            content,
        ), content
        add_at = content.index("Weitere Zeile hinzufügen")
        row_start = content.rfind('<div class="row', 0, add_at)
        row_end = content.index("</div>", add_at)
        add_row = content[row_start:row_end]
        assert "mb-4" in add_row
        assert "Alle speichern" not in add_row
        assert add_at < content.index("Alle speichern")
