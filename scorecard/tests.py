from django.urls import reverse
from django_webtest import WebTest


class TestScorecardView(WebTest):
    def test_scorecard_is_rendered(self):
        response = self.app.get(reverse('scorecard-home'))
        assert 'LeagueSphere - Scorecard' in response.text
