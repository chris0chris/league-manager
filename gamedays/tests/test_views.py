from http import HTTPStatus

from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from django_webtest import WebTest
from django_webtest.response import DjangoWebtestResponse
from webtest.forms import Form

from gamedays.models import Gameday, Gameinfo, Gameresult
from gamedays.service.gameday_service import EmptySchedule, EmptyFinalTable, EmptyQualifyTable
from gamedays.tests.setup_factories.db_setup import DBSetup


class TestGamedayCreateView(WebTest):

    def test_create_gameday(self):
        DBSetup().create_empty_gameday()
        non_existent_gameday = Gameday.objects.last().pk + 1
        self.app.set_user(User.objects.all().first())
        response: DjangoWebtestResponse = self.app.get(reverse('league-gameday-create'))
        assert response.status_code == HTTPStatus.OK
        form = response.forms[1]
        form['name'] = 'New Test Gameday'
        form['date'] = '2021-07-22'
        response: DjangoWebtestResponse = form.submit().follow()
        assert response.status_code == HTTPStatus.OK
        Gameday.objects.get(pk=non_existent_gameday)
        assert response.request.path == reverse('league-gameday-detail', args=[non_existent_gameday])

    def test_only_authenticated_user_can_create_gameday(self):
        response = self.app.get(reverse('league-gameday-create'))
        assert response.status_code == HTTPStatus.FOUND
        assert response.url.index('login/?next=')


class TestGamedayDetailView(TestCase):

    def test_detail_view_with_finished_gameday(self):
        gameday = DBSetup().g62_finished()
        resp = self.client.get(reverse('league-gameday-detail', args=[gameday.pk]))
        assert resp.status_code == HTTPStatus.OK
        context = resp.context_data
        assert context['object'].pk == gameday.pk
        assert context['info']['schedule'] != ''
        assert context['info']['qualify_table'] != ''
        assert context['info']['final_table'] != ''

    def test_detail_view_with_empty_gameday(self):
        gameday = DBSetup().create_empty_gameday()
        resp = self.client.get(reverse('league-gameday-detail', args=[gameday.pk]))
        assert resp.status_code == HTTPStatus.OK
        context = resp.context_data
        assert context['object'].pk == gameday.pk
        assert context['info']['schedule'] == EmptySchedule.to_html()
        assert context['info']['qualify_table'] == EmptyQualifyTable.to_html()
        assert context['info']['final_table'] == EmptyFinalTable.to_html()

    def test_detail_view_gameday_not_available(self):
        resp = self.client.get(reverse('league-gameday-detail', args=[00]))
        assert resp.status_code == HTTPStatus.NOT_FOUND


class TestGamedayUpdateView(WebTest):

    def setUp(self) -> None:
        gameday = DBSetup().create_empty_gameday()
        self.gameday = gameday
        self.gameday_id = gameday.pk
        self.app.set_user(User.objects.all().first())
        self.form: Form = self.app.get(reverse('league-gameday-update', args=[self.gameday_id])).forms[1]
        self.form['address'] = 'some address'

    def test_creates_schedule(self):
        assert not Gameinfo.objects.filter(gameday_id=self.gameday_id).exists()
        DBSetup().create_playoff_placeholder_teams()
        DBSetup().create_teams('A', 3)
        DBSetup().create_teams('B', 3)
        form = self.form
        form['group1'] = 'A1, A2, A3'
        form['group2'] = 'B1, B2, B3'
        resp = form.submit().follow()
        assert resp.status_code == HTTPStatus.OK
        assert resp.request.path == reverse('league-gameday-detail', args=[self.gameday_id])
        gameinfo_set = Gameinfo.objects.filter(gameday_id=self.gameday_id)
        assert gameinfo_set.count() == 11
        gameresult_set = Gameresult.objects.filter(gameinfo_id=gameinfo_set.first().pk)
        assert gameresult_set.count() == 2
        assert gameresult_set[1].team.name == 'A2'

    def test_handle_non_existent_schedule_creation(self):
        form = self.form
        form['group1'] = 'too few teams'
        resp = form.submit()
        self.assertFormError(resp.context['form'], None, [
            'Spielplan konnte nicht erstellt werden, da die Kombination #Teams und #Format nicht zum Spielplan passen'])
        assert not Gameinfo.objects.filter(gameday_id=self.gameday_id).exists()

    def test_team_not_found_while_creating_schedule(self):
        DBSetup().create_playoff_placeholder_teams()
        DBSetup().create_teams('A', 3)
        DBSetup().create_teams('B', 3)
        form = self.form
        form['group1'] = 'unknown team, A2, A3'
        form['group2'] = 'B1, B2, B3'
        resp = form.submit()
        assert resp.status_code == HTTPStatus.OK
        self.assertFormError(resp.context['form'], None, [
            'Spielplan konnte nicht erstellt werden, da das Team "unknown team" nicht gefunden wurde.'])
        assert Gameinfo.objects.all().count() == 0
