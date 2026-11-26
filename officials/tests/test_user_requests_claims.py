"""User-requested self-service changes: claim buttons, staff overwrite, DFFL
"Löschen", season-aware "Einsatz nachtragen", list links and German copy."""

import re
from datetime import date, datetime

from django.contrib.messages import get_messages
from django.template.loader import render_to_string
from django.test import Client, TestCase
from django.urls import reverse

from gamedays.models import GameOfficial
from gamedays.tests.setup_factories.factories import (
    GamedayFactory,
    GameinfoFactory,
    GameOfficialFactory,
    TeamFactory,
)
from gamedays.tests.setup_factories.db_setup import DBSetup
from officials.constants import MOODLE_LOGGED_IN_USER
from officials.tests.setup_factories.factories_officials import OfficialFactory

LIST_URL_NAME = "view-officials-game-officials-appearance"
LIST_FOR_YEAR_URL_NAME = "view-officials-game-officials-appearance-for-year"
CLAIM_URL_NAME = "view-officials-selfservice-claim"
ADD_URL_NAME = "view-officials-selfservice-add-assignment"
DFFL_DELETE_URL_NAME = "view-officials-selfservice-dffl-delete"
MOODLE_LOGIN_URL_NAME = "view-officials-moodle-login"
CURRENT_YEAR = datetime.today().year


def staff_user():
    return DBSetup().create_new_user("request-staff", is_staff=True)


class UserRequestTestBase(TestCase):
    def setUp(self):
        self.team = TeamFactory(name="Anfrage Team")
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

    def login_staff(self):
        client = Client()
        client.force_login(staff_user())
        return client

    @staticmethod
    def messages(response):
        return [str(message) for message in get_messages(response.wsgi_request)]

    @staticmethod
    def _row(year, name="Max Mustermann", official=None, position="Referee"):
        gameday = GamedayFactory(
            date=date(year, 5, 1), name=f"Spieltag {year}", author=staff_user()
        )
        gameinfo = GameinfoFactory(gameday=gameday)
        row = GameOfficialFactory(
            gameinfo=gameinfo, official=official, name=name, position=position
        )
        return gameday, gameinfo, row

    @staticmethod
    def _cells(content, row_pk):
        match = re.search(
            r'<tr[^>]*>\s*<th scope="row">' + str(row_pk) + r"</th>(.*?)</tr>",
            content,
            re.S,
        )
        assert match, f"row {row_pk} not found"
        return re.findall(r"<td[^>]*>(.*?)</td>", match.group(1), re.S)


class TestClaimConfirmCancelButton(UserRequestTestBase):
    def test_claim_confirm_has_outline_danger_cancel_back_to_the_list(self):
        _, _, row = self._row(CURRENT_YEAR)
        self.login_moodle()

        content = self.client.get(
            reverse(CLAIM_URL_NAME, kwargs={"pk": row.pk})
        ).content.decode()

        assert f'href="{reverse(LIST_URL_NAME)}"' in content
        assert re.search(
            r'class="btn btn-outline-danger[^"]*"[^>]*>\s*Abbrechen\s*</a>', content
        ), content

    def test_claim_and_cancel_share_one_row_below_the_form(self):
        _, _, row = self._row(CURRENT_YEAR)
        self.login_moodle()

        content = self.client.get(
            reverse(CLAIM_URL_NAME, kwargs={"pk": row.pk})
        ).content.decode()

        submit_at = content.index("Einsatz übernehmen")
        cancel_at = content.index(">Abbrechen<")
        row_start = content.rfind('<div class="row', 0, submit_at)
        assert row_start != -1
        shared = content[row_start : content.index("</div>", cancel_at)]
        assert 'class="btn btn-primary w-100"' in shared
        assert "btn btn-outline-danger" in shared


class TestStaffCanOverwriteMappedAssignments(UserRequestTestBase):
    def test_staff_get_shows_picker_for_mapped_row_with_foreign_name(self):
        _, _, row = self._row(CURRENT_YEAR, name="Jemand Anders", official=self.other)
        client = self.login_staff()

        response = client.get(reverse(CLAIM_URL_NAME, kwargs={"pk": row.pk}))

        content = response.content.decode()
        assert response.status_code == 200
        assert "Einsatz übernehmen" in content
        assert 'name="official_id"' in content
        assert "Dieser Einsatz ist einer anderen Person zugeordnet" not in content
        assert response.context["can_reclaim"] is True

    def test_staff_can_overwrite_mapped_row_with_the_picker(self):
        _, _, row = self._row(CURRENT_YEAR, name="Jemand Anders", official=self.other)
        client = self.login_staff()

        client.post(
            reverse(CLAIM_URL_NAME, kwargs={"pk": row.pk}),
            {"official_id": str(self.official.pk)},
        )

        row.refresh_from_db()
        assert row.official == self.official
        assert row.name == "Jemand Anders"

    def test_official_cannot_reclaim_a_row_of_someone_else(self):
        _, _, row = self._row(CURRENT_YEAR, name="Jemand Anders", official=self.other)
        self.login_moodle()

        response = self.client.get(reverse(CLAIM_URL_NAME, kwargs={"pk": row.pk}))
        assert "Dieser Einsatz ist einer anderen Person zugeordnet" in (
            response.content.decode()
        )

        posted = self.client.post(
            reverse(CLAIM_URL_NAME, kwargs={"pk": row.pk}), follow=True
        )
        row.refresh_from_db()
        assert row.official == self.other
        assert any("anderen Person" in m for m in self.messages(posted))


class TestDfflDeleteKeepsTheRow(UserRequestTestBase):
    def test_dffl_delete_only_clears_the_official(self):
        gameday, gameinfo, row = self._row(CURRENT_YEAR, official=self.official)
        self.login_moodle()

        self.client.post(reverse(DFFL_DELETE_URL_NAME, kwargs={"pk": row.pk}))

        row.refresh_from_db()
        assert GameOfficial.objects.filter(pk=row.pk).exists()
        assert row.official is None
        assert row.name == "Max Mustermann"
        assert row.position == "Referee"
        assert row.gameinfo_id == gameinfo.pk
        assert row.gameinfo.gameday_id == gameday.pk

    def test_dffl_delete_still_checks_ownership(self):
        _, _, row = self._row(CURRENT_YEAR, official=self.other)
        self.login_moodle()

        response = self.client.post(
            reverse(DFFL_DELETE_URL_NAME, kwargs={"pk": row.pk})
        )

        assert response.status_code == 403
        row.refresh_from_db()
        assert row.official == self.other


class TestAddAssignmentRespectsSeason(UserRequestTestBase):
    def test_list_links_to_add_assignment_with_the_shown_season(self):
        self._row(2022)
        self.login_moodle()

        content = self.client.get(
            reverse(LIST_FOR_YEAR_URL_NAME, kwargs={"season": 2022})
        ).content.decode()

        assert f'href="{reverse(ADD_URL_NAME)}?season=2022"' in content

    def test_add_assignment_only_offers_gamedays_of_the_requested_season(self):
        old_gameday, _, _ = self._row(2022)
        new_gameday, _, _ = self._row(2024)
        self.login_moodle()

        response = self.client.get(reverse(ADD_URL_NAME), {"season": "2022"})
        content = response.content.decode()

        assert response.status_code == 200
        assert list(
            response.context["form"]
            .fields["gameday"]
            .queryset.values_list("pk", flat=True)
        ) == [old_gameday.pk]
        assert old_gameday.name in content
        assert new_gameday.name not in content

    def test_add_assignment_defaults_to_the_current_year(self):
        _, _, _ = self._row(CURRENT_YEAR)
        old_gameday, _, _ = self._row(2022)
        self.login_moodle()

        response = self.client.get(reverse(ADD_URL_NAME))

        assert response.status_code == 200
        assert list(
            response.context["form"]
            .fields["gameday"]
            .queryset.values_list("pk", flat=True)
        ) != [old_gameday.pk]
        assert (
            response.context["form"]
            .fields["gameday"]
            .queryset.filter(date__year=CURRENT_YEAR)
            .exists()
        )

    def test_season_and_next_survive_the_gameday_step(self):
        self.login_moodle()

        content = self.client.get(
            reverse(ADD_URL_NAME),
            {"season": "2022", "next": "/officials/einsaetze/2022/"},
        ).content.decode()

        assert 'name="season" value="2022"' in content
        assert 'name="next" value="/officials/einsaetze/2022/"' in content

    def test_post_uses_the_requested_season(self):
        _, gameinfo, _ = self._row(2022)
        self._row(2024)
        self.login_moodle()
        before = GameOfficial.objects.count()

        response = self.client.post(
            reverse(ADD_URL_NAME) + "?season=2022",
            {
                "season": "2022",
                "gameday": str(gameinfo.gameday_id),
                "gameinfo": str(gameinfo.pk),
                "position": "Down Judge",
            },
            follow=True,
        )

        assert response.status_code == 200
        assert GameOfficial.objects.filter(
            gameinfo=gameinfo, position="Down Judge"
        ).exists()
        assert GameOfficial.objects.count() == before + 1

    def test_post_rejects_a_gameday_outside_the_requested_season(self):
        _, gameinfo, _ = self._row(2022)
        _, other_gameinfo, _ = self._row(2024)
        self.login_moodle()
        before = GameOfficial.objects.count()

        response = self.client.post(
            reverse(ADD_URL_NAME) + "?season=2022",
            {
                "season": "2022",
                "gameday": str(other_gameinfo.gameday_id),
                "gameinfo": str(other_gameinfo.pk),
                "position": "Down Judge",
            },
        )

        assert response.status_code == 200
        assert "gameday" in response.context["form"].errors
        assert GameOfficial.objects.count() == before


class TestEinsaetzeListLinkCells(UserRequestTestBase):
    def test_gameday_link_moved_from_spiel_to_spieltag_cell(self):
        gameday, gameinfo, row = self._row(CURRENT_YEAR)
        self.login_moodle()

        content = self.client.get(reverse(LIST_URL_NAME)).content.decode()
        cells = self._cells(content, row.pk)

        assert f'href="/gamedays/gameday/{gameday.pk}/"' in cells[1]
        assert "href=" not in cells[5]
        assert f"(#{gameinfo.pk})" in cells[5]


class TestNeutralGermanCopy(UserRequestTestBase):
    def test_einsaetze_list_has_no_personal_contact_address(self):
        self.login_moodle()

        content = self.client.get(reverse(LIST_URL_NAME)).content.decode()

        assert "c.kaempfe@afvd.de" not in content
        assert "Bei Fragen" in content

    def test_403_page_has_no_personal_contact_address(self):
        content = render_to_string("403.html")

        assert "c.kaempfe@afvd.de" not in content
        assert "403 - Unsportliches Verhalten" in content

    def test_moodle_login_heading_and_explanation(self):
        response = self.client.get(reverse(MOODLE_LOGIN_URL_NAME))
        content = response.content.decode()

        assert response.status_code == 200
        assert re.search(
            r"<legend[^>]*>\s*AFVD Flag Academy Login\s*</legend>", content
        ), content
        assert re.search(
            r"<p>\s*Bitte melde dich über den AFVD Flag Academy Logindaten von der "
            r'<a href="https://offd\.de/" target="_blank">offd\.de</a>-Seite an:\s*</p>',
            content,
        ), content
