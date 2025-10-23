from http import HTTPStatus

from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from django_webtest import WebTest
from django_webtest.response import DjangoWebtestResponse

from gamedays.forms import GamedayForm
from gamedays.models import Gameday, League
from gamedays.service.gameday_service import EmptySchedule, EmptyFinalTable, EmptyQualifyTable
from gamedays.tests.setup_factories.db_setup import DBSetup
from gamedays.tests.setup_factories.factories import UserFactory, GamedayFactory
from gamedays.urls import (
    LEAGUE_GAMEDAY_CREATE,
    LEAGUE_GAMEDAY_DETAIL,
    LEAGUE_GAMEDAY_UPDATE,
)


class TestGamedayCreateView(WebTest):

    def test_create_gameday(self):
        DBSetup().create_empty_gameday()
        league = League.objects.first()
        non_existent_gameday = Gameday.objects.last().pk + 1
        self.app.set_user(User.objects.all().first())
        response: DjangoWebtestResponse = self.app.get(reverse(LEAGUE_GAMEDAY_CREATE))
        assert response.status_code == HTTPStatus.OK
        form = response.forms['gameday-form']
        form['name'] = 'New Test Gameday'
        form['date'] = '2021-07-22'
        form['league'] = league.pk
        form['address'] = 'some address'
        response: DjangoWebtestResponse = form.submit().follow()
        assert response.status_code == HTTPStatus.OK
        Gameday.objects.get(pk=non_existent_gameday)
        assert response.request.path == reverse(LEAGUE_GAMEDAY_DETAIL, args=[non_existent_gameday])

    def test_only_staff_user_can_create_gameday(self):
        response = self.app.get(reverse(LEAGUE_GAMEDAY_CREATE))
        assert response.status_code == HTTPStatus.FOUND
        assert response.url.index('login/?next=')

        some_user = UserFactory(is_staff=False)
        self.app.set_user(some_user)
        response = self.app.get(reverse(LEAGUE_GAMEDAY_CREATE), status=403)
        assert response.status_code == HTTPStatus.FORBIDDEN


class TestGamedayDetailView(TestCase):

    def test_detail_view_with_finished_gameday(self):
        gameday = DBSetup().g62_finished()
        resp = self.client.get(reverse(LEAGUE_GAMEDAY_DETAIL, args=[gameday.pk]))
        assert resp.status_code == HTTPStatus.OK
        context = resp.context_data
        assert context['object'].pk == gameday.pk
        assert context['info']['schedule'] != ''
        assert context['info']['qualify_table'] != ''
        assert context['info']['final_table'] != ''

    def test_detail_view_with_empty_gameday(self):
        gameday = DBSetup().create_empty_gameday()
        resp = self.client.get(reverse(LEAGUE_GAMEDAY_DETAIL, args=[gameday.pk]))
        assert resp.status_code == HTTPStatus.OK
        context = resp.context_data
        assert context['object'].pk == gameday.pk
        assert context['info']['schedule'] == EmptySchedule.to_html()
        assert context['info']['qualify_table'] == EmptyQualifyTable.to_html()
        assert context['info']['final_table'] == EmptyFinalTable.to_html()

    def test_detail_view_gameday_not_available(self):
        resp = self.client.get(reverse(LEAGUE_GAMEDAY_DETAIL, args=[00]))
        assert resp.status_code == HTTPStatus.NOT_FOUND


class TestGamedayUpdateView(WebTest):
    def test_staff_user_can_access_update_view(self):
        staff_user = UserFactory(is_staff=True)
        self.app.set_user(staff_user)
        gameday = GamedayFactory(address='some gameday address')

        url = reverse(LEAGUE_GAMEDAY_UPDATE, kwargs={"pk": gameday.pk})
        response = self.app.get(url)

        assert response.status_int == 200
        assert isinstance(response.context["form"], GamedayForm)

        form = response.forms["gameday-form"]
        form["name"] = "Updated Gameday"
        submitted = form.submit().follow()
        assert submitted.status_code == HTTPStatus.OK
        assert submitted.request.path == reverse(LEAGUE_GAMEDAY_DETAIL, args=[gameday.pk])

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
