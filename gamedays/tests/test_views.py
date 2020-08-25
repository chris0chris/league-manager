from http import HTTPStatus

from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from django_webtest import WebTest
from django_webtest.response import DjangoWebtestResponse
from webtest.forms import Form

from gamedays.models import Gameday, Gameinfo, Gameresult


class TestGamedayCreateView(WebTest):
    fixtures = ['testdata.json']

    def test_create_gameday(self):
        self.app.set_user(User.objects.all().first())
        response: DjangoWebtestResponse = self.app.get(reverse('league-gameday-create'))
        self.assertEqual(response.status_code, HTTPStatus.OK)
        self.assertFalse(Gameday.objects.filter(pk=4).exists())
        response: DjangoWebtestResponse = response.form.submit().follow()
        self.assertEqual(response.status_code, HTTPStatus.OK)
        gameday_set = Gameday.objects.filter(pk=4)
        self.assertTrue(gameday_set.exists())
        self.assertURLEqual(response.request.path, reverse('league-gameday-detail', args=[gameday_set.first().pk]))


class TestGamedayDetailView(TestCase):
    fixtures = ['testdata.json']
    EXISTING_GAMEDAY = 1
    EMPTY_GAMEDAY = 3
    NOT_EXISTENT_GAMEDAY = 999

    def test_detail_view_with_finished_gameday(self):
        resp = self.client.get(reverse('league-gameday-detail', args=[self.EXISTING_GAMEDAY]))
        self.assertEqual(resp.status_code, HTTPStatus.OK)
        context = resp.context_data
        self.assertEqual(context['object'].pk, self.EXISTING_GAMEDAY)
        self.assertIsNotNone(context['info']['schedule'])
        self.assertIsNotNone(context['info']['final_table'])
        self.assertNotContains(resp, 'Spielplan wurde noch nicht erstellt.')
        self.assertNotContains(resp, 'Abschlusstabelle wird berechnet, sobald alle Spiele fertig sind.')

    def test_detail_view_with_empty_gameday(self):
        resp = self.client.get(reverse('league-gameday-detail', args=[self.EMPTY_GAMEDAY]))
        self.assertEqual(resp.status_code, HTTPStatus.OK)
        context = resp.context_data
        self.assertEqual(context['object'].pk, self.EMPTY_GAMEDAY)
        self.assertIsNone(context['info']['schedule'])
        self.assertIsNone(context['info']['final_table'])
        self.assertContains(resp, 'Spielplan wurde noch nicht erstellt.')
        self.assertContains(resp, 'Abschlusstabelle wird berechnet, sobald alle Spiele fertig sind.')

    def test_detail_view_gameday_not_available(self):
        resp = self.client.get(reverse('league-gameday-detail', args=[self.NOT_EXISTENT_GAMEDAY]))
        self.assertEqual(resp.status_code, HTTPStatus.NOT_FOUND)


class TestGamedayUpdateView(WebTest):
    fixtures = ['testdata.json']

    def setUp(self) -> None:
        self.gameday_id = 3
        self.app.set_user(User.objects.all().first())
        self.form: Form = self.app.get(reverse('league-gameday-update', args=[self.gameday_id])).form

    def test_creates_schedule(self):
        assert not Gameinfo.objects.filter(gameday_id=self.gameday_id).exists()
        form = self.form
        form['group1'] = 'Team A, Team B, Team C'
        form['group2'] = 'Team D, Team E, Team F'
        resp = form.submit().follow()
        assert resp.status_code == HTTPStatus.OK
        assert resp.request.path == reverse('league-gameday-detail', args=[self.gameday_id])
        gameinfo_set = Gameinfo.objects.filter(gameday_id=self.gameday_id)
        assert gameinfo_set.count() == 11
        assert Gameresult.objects.filter(gameinfo_id=gameinfo_set.first().pk).count() == 2

    def test_handle_non_existent_schedule_creation(self):
        form = self.form
        form['group1'] = 'too few teams'
        resp = form.submit()
        self.assertFormError(resp, 'form', None, [
            'Spielplan konnte nicht erstellt werden, da es die Kombination #Teams und #Felder nicht gibt'])
        assert not Gameinfo.objects.filter(gameday_id=self.gameday_id).exists()
