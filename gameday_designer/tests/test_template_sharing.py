import pytest
from django.contrib.auth.models import User
from gameday_designer.models import ScheduleTemplate
from gamedays.models import Association, Team, UserProfile
from rest_framework.test import APIRequestFactory, force_authenticate
from gameday_designer.views import ScheduleTemplateViewSet

@pytest.mark.django_db
class TestTemplateSharing:
    def setup_method(self):
        self.factory = APIRequestFactory()
        self.assoc1 = Association.objects.create(name="Assoc 1", abbr="A1")
        self.assoc2 = Association.objects.create(name="Assoc 2", abbr="A2")
        
        self.team1 = Team.objects.create(name="Team 1", description="T1", location="L", association=self.assoc1)
        self.team2 = Team.objects.create(name="Team 2", description="T2", location="L", association=self.assoc2)

        self.user1 = User.objects.create_user(username="user1")
        UserProfile.objects.create(user=self.user1, team=self.team1)
        
        self.user2 = User.objects.create_user(username="user2")
        UserProfile.objects.create(user=self.user2, team=self.team2)

    def test_get_queryset_filters_by_sharing_and_association(self):
        # Global template
        ScheduleTemplate.objects.create(
            name="Global", num_teams=2, num_fields=1, sharing='GLOBAL'
        )
        # Association template
        ScheduleTemplate.objects.create(
            name="Assoc 1 Template", num_teams=2, num_fields=1, 
            association=self.assoc1, sharing='ASSOCIATION'
        )
        # Private template
        ScheduleTemplate.objects.create(
            name="User 1 Private", num_teams=2, num_fields=1, 
            created_by=self.user1, sharing='PRIVATE'
        )
        # Other Assoc template
        ScheduleTemplate.objects.create(
            name="Assoc 2 Template", num_teams=2, num_fields=1, 
            association=self.assoc2, sharing='ASSOCIATION'
        )

        view = ScheduleTemplateViewSet()
        
        # Test for User 1
        request = self.factory.get('/api/templates/')
        force_authenticate(request, user=self.user1)
        
        from rest_framework.request import Request
        drf_request = Request(request)
        view.request = drf_request
        
        queryset = view.get_queryset()
        names = [t.name for t in queryset]
        
        assert "Global" in names
        assert "Assoc 1 Template" in names
        assert "User 1 Private" in names
        assert "Assoc 2 Template" not in names
