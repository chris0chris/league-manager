from http import HTTPStatus
import json
from django.urls import reverse
from django_webtest import WebTest
from gamedays.models import Gameday, Season, League
from gamedays.tests.setup_factories.db_setup import DBSetup

class TestGamedayDesignerIntegration(WebTest):
    def setUp(self):
        self.user = DBSetup().create_new_user("testadmin", is_staff=True)
        self.season = Season.objects.create(name='2026')
        self.league = League.objects.create(name='DFFL')

    def test_designer_app_loads(self):
        self.app.set_user(self.user)
        # Check if the main designer page loads
        response = self.app.get(reverse('gameday_designer_app:index'))
        assert response.status_code == HTTPStatus.OK
        # Check for React root element
        assert 'id="gameday-designer"' in response.text
        # Check if the JS bundle is referenced
        assert 'index.js' in response.text

    def test_api_session_auth_integration(self):
        self.app.set_user(self.user)
        # Fetch the index page first to get the CSRF cookie
        response = self.app.get(reverse('gameday_designer_app:index'))
        csrf_token = self.app.cookies['csrftoken']
        
        # Verify that we can create a gameday through the API using the existing session
        # This tests the SessionAuthentication and CSRF setup
        gameday_data = {
            'name': 'Integration Test Gameday',
            'date': '2026-06-01',
            'start': '10:00',
            'season': self.season.id,
            'league': self.league.id,
            'format': '6_2'
        }
        
        # Manually add the CSRF token to headers
        response = self.app.post_json(
            '/api/gamedays/',
            gameday_data,
            headers={'X-CSRFToken': csrf_token}
        )
        
        assert response.status_code == HTTPStatus.CREATED
        assert Gameday.objects.filter(name='Integration Test Gameday').exists()
        
        gameday_id = response.json['id']
        
        # Verify we can also PATCH (auto-save behavior)
        patch_data = {
            'address': 'Test Venue'
        }
        response = self.app.patch_json(
            f'/api/gamedays/{gameday_id}/',
            patch_data,
            headers={'X-CSRFToken': csrf_token}
        )
        assert response.status_code == HTTPStatus.OK
        assert Gameday.objects.get(id=gameday_id).address == 'Test Venue'

    def test_api_list_gamedays_search(self):
        self.app.set_user(self.user)
        Gameday.objects.create(
            name='SearchMe',
            date='2026-06-01',
            start='10:00',
            season=self.season,
            league=self.league,
            author=self.user
        )
        
        response = self.app.get('/api/gamedays/?search=SearchMe')
        assert response.status_code == HTTPStatus.OK
        assert len(response.json['results']) == 1
        assert response.json['results'][0]['name'] == 'SearchMe'
