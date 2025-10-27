from http import HTTPStatus

import pytest
from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from django_webtest import WebTest
from django_webtest.response import DjangoWebtestResponse

from gamedays.constants import LEAGUE_GAMEDAY_DETAIL, LEAGUE_GAMEDAY_LIST, LEAGUE_GAMEDAY_CREATE, LEAGUE_GAMEDAY_DELETE, \
    LEAGUE_GAMEDAY_UPDATE, LEAGUE_GAMEDAY_GAMEINFOS_UPDATE, LEAGUE_GAMEDAY_GAMEINFOS_DELETE, \
    LEAGUE_GAMEDAY_GAMEINFOS_WIZARD
from gamedays.forms import (
    GamedayForm,
    GamedayGaminfoFieldsAndGroupsForm,
    GamedayFormatForm,
    GameinfoForm,
)
from gamedays.models import Gameday, League, Gameinfo
from gamedays.service.gameday_service import (
    EmptySchedule,
    EmptyFinalTable,
    EmptyQualifyTable,
)
from gamedays.tests.setup_factories.db_setup import DBSetup
from gamedays.tests.setup_factories.factories import UserFactory, GamedayFactory
from gamedays.wizard import FIELD_GROUP_STEP, GAMEDAY_FORMAT_STEP, GAMEINFO_STEP


class TestGamedayCreateView(WebTest):

    def test_create_gameday(self):
        DBSetup().create_empty_gameday()
        league = League.objects.first()
        non_existent_gameday = Gameday.objects.last().pk + 1
        self.app.set_user(User.objects.all().first())
        response: DjangoWebtestResponse = self.app.get(reverse(LEAGUE_GAMEDAY_CREATE))
        assert response.status_code == HTTPStatus.OK
        form = response.forms["gameday-form"]
        form["name"] = "New Test Gameday"
        form["date"] = "2021-07-22"
        form["league"] = league.pk
        form["address"] = "some address"
        response: DjangoWebtestResponse = form.submit().follow()
        assert response.status_code == HTTPStatus.OK
        Gameday.objects.get(pk=non_existent_gameday)
        assert response.request.path == reverse(
            LEAGUE_GAMEDAY_DETAIL, args=[non_existent_gameday]
        )

    def test_only_staff_user_can_create_gameday(self):
        response = self.app.get(reverse(LEAGUE_GAMEDAY_CREATE))
        assert response.status_code == HTTPStatus.FOUND
        assert response.url.index("login/?next=")

        some_user = UserFactory(is_staff=False)
        self.app.set_user(some_user)
        response = self.app.get(reverse(LEAGUE_GAMEDAY_CREATE), status=403)
        assert response.status_code == HTTPStatus.FORBIDDEN


class TestGamedayDetailView(TestCase):

    def test_detail_view_with_finished_gameday(self):
        gameday = DBSetup().g62_finished()
        resp = self.client.get(
            reverse(LEAGUE_GAMEDAY_DETAIL, kwargs={"pk": gameday.pk})
        )
        assert resp.status_code == HTTPStatus.OK
        context = resp.context_data
        assert context["object"].pk == gameday.pk
        assert context["info"]["schedule"] != ""
        assert context["info"]["qualify_table"] != ""
        assert context["info"]["final_table"] != ""

    def test_detail_view_with_empty_gameday(self):
        gameday = DBSetup().create_empty_gameday()
        resp = self.client.get(
            reverse(LEAGUE_GAMEDAY_DETAIL, kwargs={"pk": gameday.pk})
        )
        assert resp.status_code == HTTPStatus.OK
        context = resp.context_data
        assert context["object"].pk == gameday.pk
        assert context["info"]["schedule"] == EmptySchedule.to_html()
        assert context["info"]["qualify_table"] == EmptyQualifyTable.to_html()
        assert context["info"]["final_table"] == EmptyFinalTable.to_html()

    def test_detail_view_gameday_not_available(self):
        resp = self.client.get(reverse(LEAGUE_GAMEDAY_DETAIL, args=[00]))
        assert resp.status_code == HTTPStatus.NOT_FOUND


class TestGamedayUpdateView(WebTest):
    def test_staff_user_can_access_update_view(self):
        staff_user = UserFactory(is_staff=True)
        self.app.set_user(staff_user)
        gameday = GamedayFactory(address="some gameday address")

        url = reverse(LEAGUE_GAMEDAY_UPDATE, kwargs={"pk": gameday.pk})
        response = self.app.get(url)

        assert response.status_code == HTTPStatus.OK
        assert isinstance(response.context["form"], GamedayForm)

        form = response.forms["gameday-form"]
        form["name"] = "Updated Gameday"
        submitted = form.submit().follow()
        assert submitted.status_code == HTTPStatus.OK
        assert submitted.request.path == reverse(
            LEAGUE_GAMEDAY_DETAIL, kwargs={"pk": gameday.pk}
        )

        gameday.refresh_from_db()
        assert gameday.name == "Updated Gameday"
        assert gameday.author == staff_user

    def test_non_staff_user_forbidden(self):
        user = UserFactory(is_staff=False)
        self.app.set_user(user)
        gameday = GamedayFactory()

        url = reverse(LEAGUE_GAMEDAY_UPDATE, kwargs={"pk": gameday.pk})
        self.app.get(url, status=403)

    def test_anonymous_user_redirects_to_login(self):
        gameday = GamedayFactory()
        url = reverse(LEAGUE_GAMEDAY_UPDATE, kwargs={"pk": gameday.pk})

        response = self.app.get(url, expect_errors=True)
        assert response.status_code == HTTPStatus.FOUND
        assert response.url.index("login/?next=")


class TestStaffDeleteView(WebTest):
    def test_non_staff_user_forbidden(self):
        user = UserFactory(is_staff=False)
        self.app.set_user(user)
        gameday = GamedayFactory()

        url = reverse(LEAGUE_GAMEDAY_DELETE, kwargs={"pk": gameday.pk})
        self.app.get(url, status=403)

    def test_anonymous_user_redirects_to_login(self):
        gameday = GamedayFactory()
        url = reverse(LEAGUE_GAMEDAY_GAMEINFOS_DELETE, kwargs={"pk": gameday.pk})

        response = self.app.get(url, expect_errors=True)
        assert response.status_code == HTTPStatus.FOUND
        assert response.url.index("login/?next=")


class TestGamedayDeleteView(WebTest):
    csrf_checks = False

    def test_staff_user_can_access_update_view(self):
        staff_user = UserFactory(is_staff=True)
        self.app.set_user(staff_user)
        gameday = GamedayFactory(address="some gameday address")

        url = reverse(LEAGUE_GAMEDAY_DELETE, kwargs={"pk": gameday.pk})
        response = self.app.post(url).follow()

        assert response.status_code == HTTPStatus.OK
        assert response.request.path == reverse(LEAGUE_GAMEDAY_LIST)

        with pytest.raises(Gameday.DoesNotExist):
            gameday.refresh_from_db()


class TestGameinfoDeleteView(WebTest):
    csrf_checks = False

    def test_staff_user_can_access_update_view(self):
        staff_user = UserFactory(is_staff=True)
        self.app.set_user(staff_user)
        gameday = DBSetup().g62_finished()

        assert gameday.gameinfo_set.count() == 11
        url = reverse(LEAGUE_GAMEDAY_GAMEINFOS_DELETE, kwargs={"pk": gameday.pk})
        response = self.app.post(url).follow()

        assert response.status_code == HTTPStatus.OK
        assert response.request.path == reverse(
            LEAGUE_GAMEDAY_DETAIL, kwargs={"pk": gameday.pk}
        )

        gameday.refresh_from_db()
        assert gameday.gameinfo_set.count() == 0


class TestGameinfoWizard(WebTest):
    def test_staff_user_can_access_first_step(self):
        user = UserFactory(is_staff=True)
        self.app.set_user(user)
        gameday = GamedayFactory()

        url = reverse(LEAGUE_GAMEDAY_GAMEINFOS_WIZARD, kwargs={"pk": gameday.pk})
        response = self.app.get(url)

        assert response.status_code == HTTPStatus.OK
        assert isinstance(response.context["form"], GamedayGaminfoFieldsAndGroupsForm)

    def test_non_staff_user_forbidden(self):
        user = UserFactory(is_staff=False)
        self.app.set_user(user)
        gameday = GamedayFactory()

        url = reverse(LEAGUE_GAMEDAY_GAMEINFOS_WIZARD, kwargs={"pk": gameday.pk})
        self.app.get(url, status=403)

    def test_anonymous_redirects_to_login(self):
        gameday = GamedayFactory()
        url = reverse(LEAGUE_GAMEDAY_GAMEINFOS_WIZARD, kwargs={"pk": gameday.pk})

        response = self.app.get(url, expect_errors=True)
        assert response.status_code == HTTPStatus.FOUND
        assert response.url.index("login/?next=")

    def test_wizard_renders_all_steps_with_gameday_format_step(self):
        teams = DBSetup().create_teams(name="GroupTeam", number_teams=3)
        user = UserFactory(is_staff=True)
        self.app.set_user(user)
        gameday = GamedayFactory()

        field_group_step = self.app.get(
            reverse(LEAGUE_GAMEDAY_GAMEINFOS_WIZARD, kwargs={"pk": gameday.pk})
        )
        assert isinstance(
            field_group_step.context["form"], GamedayGaminfoFieldsAndGroupsForm
        )

        field_group_step_form = field_group_step.forms["fields-groups-form"]
        field_group_step_form[f"{FIELD_GROUP_STEP}-format"] = "3_1"
        field_group_step_form[f"{FIELD_GROUP_STEP}-number_fields"] = 1
        field_group_step_form[f"{FIELD_GROUP_STEP}-number_groups"] = 1

        gameday_format_step = field_group_step_form.submit()
        assert gameday_format_step.status_code == HTTPStatus.OK
        assert isinstance(gameday_format_step.context["form"][0], GamedayFormatForm)

        gameday_format_step_form = gameday_format_step.forms["gamedays-format-form"]
        gameday_format_step_form[f"{GAMEDAY_FORMAT_STEP}-0-group"]._forced_values = [
            team.pk for team in teams
        ]

        gameinfo_update_page = gameday_format_step_form.submit().follow()
        assert gameinfo_update_page.status_code == HTTPStatus.OK
        assert gameinfo_update_page.request.path == reverse(
            LEAGUE_GAMEDAY_GAMEINFOS_UPDATE, kwargs={"pk": gameday.pk}
        )
        assert isinstance(gameinfo_update_page.context["form"][0], GameinfoForm)

    def test_wizard_renders_all_steps_with_custom_gameday_format(self):
        teams = DBSetup().create_teams(name="GroupTeam", number_teams=3)
        user = UserFactory(is_staff=True)
        self.app.set_user(user)
        gameday = GamedayFactory()

        field_group_step = self.app.get(
            reverse(LEAGUE_GAMEDAY_GAMEINFOS_WIZARD, kwargs={"pk": gameday.pk})
        )
        assert field_group_step.status_code == HTTPStatus.OK
        assert isinstance(
            field_group_step.context["form"], GamedayGaminfoFieldsAndGroupsForm
        )

        field_group_step_form = field_group_step.forms["fields-groups-form"]
        field_group_step_form[f"{FIELD_GROUP_STEP}-format"] = "CUSTOM"
        field_group_step_form[f"{FIELD_GROUP_STEP}-number_fields"] = 1
        field_group_step_form[f"{FIELD_GROUP_STEP}-number_groups"] = 1

        gameinfo_step = field_group_step_form.submit()
        assert gameinfo_step.status_code == HTTPStatus.OK
        assert isinstance(gameinfo_step.context["form"][0], GameinfoForm)

        gameinfo_step_form = gameinfo_step.forms["gameinfos-form"]
        gameinfo_step_form[f"{GAMEINFO_STEP}-0-home"]._forced_value = teams[0].pk
        gameinfo_step_form[f"{GAMEINFO_STEP}-0-away"]._forced_value = teams[1].pk
        gameinfo_step_form[f"{GAMEINFO_STEP}-0-officials"]._forced_value = teams[2].pk
        gameinfo_step_form[f"{GAMEINFO_STEP}-0-scheduled"] = "05:07"

        gameday_detail_page = gameinfo_step_form.submit().follow()
        assert gameday_detail_page.status_code == HTTPStatus.OK
        assert gameday_detail_page.request.path == reverse(
            LEAGUE_GAMEDAY_DETAIL, kwargs={"pk": gameday.pk}
        )

        gameinfo = Gameinfo.objects.first()

        assert gameinfo.officials == teams[2]
        assert f"{gameinfo.scheduled}" == "05:07:00"
        assert gameinfo.gameresult_set.get(isHome=True).team == teams[0]
        assert gameinfo.gameresult_set.get(isHome=False).team == teams[1]

    def test_format_steps_warns_for_incorrect_number_of_teams(self):
        teams = DBSetup().create_teams(name="TooManyTeams", number_teams=4)
        user = UserFactory(is_staff=True)
        self.app.set_user(user)
        gameday = GamedayFactory()

        field_group_step = self.app.get(
            reverse(LEAGUE_GAMEDAY_GAMEINFOS_WIZARD, kwargs={"pk": gameday.pk})
        )
        assert isinstance(
            field_group_step.context["form"], GamedayGaminfoFieldsAndGroupsForm
        )

        field_group_step_form = field_group_step.forms["fields-groups-form"]
        field_group_step_form[f"{FIELD_GROUP_STEP}-format"] = "3_1"
        field_group_step_form[f"{FIELD_GROUP_STEP}-number_fields"] = 1
        field_group_step_form[f"{FIELD_GROUP_STEP}-number_groups"] = 1

        gameday_format_step = field_group_step_form.submit()
        assert gameday_format_step.status_code == HTTPStatus.OK
        assert isinstance(gameday_format_step.context["form"][0], GamedayFormatForm)

        gameday_format_step_form = gameday_format_step.forms["gamedays-format-form"]
        gameday_format_step_form[f"{GAMEDAY_FORMAT_STEP}-0-group"]._forced_values = [team.pk for team in teams]
        gameday_format_step_with_error = gameday_format_step_form.submit()
        self.assertFormError(
            gameday_format_step_with_error.context["form"][0],
            "group",
            ["Bitte genau 3 Teams auswählen."],
        )


class TestGameinfoUpdateView(WebTest):
    csrf_checks = False

    def test_non_staff_user_forbidden(self):
        user = UserFactory(is_staff=False)
        self.app.set_user(user)
        gameday = GamedayFactory()

        url = reverse(LEAGUE_GAMEDAY_GAMEINFOS_UPDATE, kwargs={"pk": gameday.pk})
        self.app.get(url, status=403)

    def test_anonymous_user_redirects_to_login(self):
        gameday = GamedayFactory()
        url = reverse(LEAGUE_GAMEDAY_GAMEINFOS_UPDATE, kwargs={"pk": gameday.pk})

        response = self.app.get(url, expect_errors=True)
        assert response.status_code == HTTPStatus.FOUND
        assert response.url.index("login/?next=")

    def test_redirect_to_wizard_if_gameday_has_no_gameinfos(self):
        staff_user = UserFactory(is_staff=True)
        self.app.set_user(staff_user)
        gameday = GamedayFactory(address="some redirect gameday address")

        url = reverse(LEAGUE_GAMEDAY_GAMEINFOS_UPDATE, kwargs={"pk": gameday.pk})
        response = self.app.get(url).follow()
        assert response.status_code == HTTPStatus.OK
        assert response.request.path == reverse(
            LEAGUE_GAMEDAY_GAMEINFOS_WIZARD, kwargs={"pk": gameday.pk}
        )

    def test_can_access_update_view_and_submit_form(self):
        staff_user = UserFactory(is_staff=True)
        self.app.set_user(staff_user)
        teams = DBSetup().create_teams(name="GiUpdateTeam", number_teams=3)
        gameday = DBSetup().g62_status_empty()

        url = reverse(LEAGUE_GAMEDAY_GAMEINFOS_UPDATE, kwargs={"pk": gameday.pk})
        gameinfo_update_page = self.app.get(url)

        assert gameinfo_update_page.status_code == HTTPStatus.OK
        assert isinstance(gameinfo_update_page.context["form"][0], GameinfoForm)

        gameinfo_step_form = gameinfo_update_page.forms["gameinfos-form"]
        gameinfo_step_form[f"{GAMEINFO_STEP}-0-home"]._forced_value = teams[0].pk
        gameinfo_step_form[f"{GAMEINFO_STEP}-0-away"]._forced_value = teams[1].pk
        gameinfo_step_form[f"{GAMEINFO_STEP}-0-officials"]._forced_value = teams[2].pk
        gameinfo_step_form[f"{GAMEINFO_STEP}-0-scheduled"] = "05:07"

        gameday_detail_page = gameinfo_step_form.submit().follow()
        assert gameday_detail_page.status_code == HTTPStatus.OK
        assert gameday_detail_page.request.path == reverse(
            LEAGUE_GAMEDAY_DETAIL, kwargs={"pk": gameday.pk}
        )

        gameinfo = Gameinfo.objects.first()

        assert gameinfo.officials == teams[2]
        assert f"{gameinfo.scheduled}" == "05:07:00"
        assert gameinfo.gameresult_set.get(isHome=True).team == teams[0]
        assert gameinfo.gameresult_set.get(isHome=False).team == teams[1]

    def test_go_to_gameinfo_wizard_via_reset_button(self):
        staff_user = UserFactory(is_staff=True)
        self.app.set_user(staff_user)

        gameday = DBSetup().g62_status_empty()

        url = reverse(LEAGUE_GAMEDAY_GAMEINFOS_UPDATE, kwargs={"pk": gameday.pk})
        post_data = {"wizard_goto_step": "reset_gameinfos"}

        gameinfo_wizard_page = self.app.post(url, post_data).follow()

        assert gameinfo_wizard_page.status_code == HTTPStatus.OK
        assert gameinfo_wizard_page.request.path == reverse(
            LEAGUE_GAMEDAY_GAMEINFOS_WIZARD, kwargs={"pk": gameday.pk}
        )
