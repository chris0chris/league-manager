import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from gamedays.models import Gameday, Season, League
from django.contrib.auth.models import User
from datetime import date

class GamedayViewSetTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_superuser(username='admin', password='password', email='admin@test.com')
        self.client.force_authenticate(user=self.user)
        self.season = Season.objects.create(name='2026')
        self.league = League.objects.create(name='DFFL')
        self.gameday1 = Gameday.objects.create(
            name='Test Gameday 1',
            date=date(2026, 1, 18),
            start='10:00',
            season=self.season,
            league=self.league,
            status='DRAFT'
        )
        self.gameday2 = Gameday.objects.create(
            name='Another Gameday',
            date=date(2026, 1, 19),
            start='11:00',
            season=self.season,
            league=self.league,
            status='PUBLISHED'
        )

    def test_list_gamedays_plural(self):
        # This is what we want to support
        url = '/api/gamedays/'
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        # Check if it's paginated
        assert 'results' in response.data
        assert len(response.data['results']) == 2

    def test_search_gamedays(self):
        url = '/api/gamedays/?search=Another'
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['name'] == 'Another Gameday'

    def test_filter_season(self):
        url = '/api/gamedays/?search=season:2026'
        # The ViewSet uses queryset = Gameday.objects.all().order_by("-date")
        # gameday2 (Jan 19) comes before gameday1 (Jan 18)
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 2

    def test_filter_status(self):
        url = '/api/gamedays/?search=status:published'
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['status'] == 'PUBLISHED'

    def test_publish_gameday(self):
        url = f'/api/gamedays/{self.gameday1.id}/publish/'
        response = self.client.post(url)
        assert response.status_code == status.HTTP_200_OK
        self.gameday1.refresh_from_db()
        assert self.gameday1.status == 'PUBLISHED'
        assert self.gameday1.published_at is not None
