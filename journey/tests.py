from django.test import TestCase, Client, RequestFactory
from django.contrib.auth.models import User
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APITestCase
from knox.models import AuthToken
from .models import Journey, JourneyEvent

class JourneyModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='pass')

    def test_create_journey(self):
        journey = Journey.objects.create(user=self.user)
        self.assertEqual(journey.user, self.user)
        self.assertIsNone(journey.ended_at)

    def test_journey_event_creation(self):
        journey = Journey.objects.create(user=self.user)
        event = JourneyEvent.objects.create(
            journey=journey,
            event_name='test_event',
            metadata={'key': 'value'}
        )
        self.assertEqual(event.journey, journey)
        self.assertEqual(event.event_name, 'test_event')
        self.assertIn(event, journey.events.all())

class JourneyAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='pass')
        self.token = AuthToken.objects.create(self.user)[1]

    def test_create_event(self):
        journey = Journey.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        response = self.client.post('/api/journey/events/', {
            'event_name': 'test_action',
            'metadata': {'test': True}
        }, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(JourneyEvent.objects.count(), 1)

    def test_get_stats(self):
        journey = Journey.objects.create(user=self.user)
        JourneyEvent.objects.create(journey=journey, event_name='event1')
        JourneyEvent.objects.create(journey=journey, event_name='event1')
        JourneyEvent.objects.create(journey=journey, event_name='event2')

        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        response = self.client.get('/api/journey/events/stats/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['total_events'], 3)

    def test_inactivity_boundary(self):
        """Test that a new journey is created after inactivity."""
        from django.test import override_settings
        from django.db import connection
        from django.db.models import F

        with override_settings(JOURNEY_INACTIVITY_MINUTES=1):
            # Create first journey and old event
            journey1 = Journey.objects.create(user=self.user)
            event1 = JourneyEvent.objects.create(
                journey=journey1,
                event_name='event1'
            )

            # Manually update the event's created_at to 2 minutes ago
            # We bypass auto_now_add by using raw SQL
            old_time = timezone.now() - timedelta(minutes=2)
            JourneyEvent.objects.filter(id=event1.id).update(created_at=old_time)

            # Verify the old event is there with past timestamp
            self.assertEqual(Journey.objects.filter(user=self.user).count(), 1)
            self.assertEqual(JourneyEvent.objects.count(), 1)
            event1.refresh_from_db()
            self.assertTrue(event1.created_at < timezone.now() - timedelta(minutes=1))

            # Create new event after inactivity period
            self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
            response = self.client.post('/api/journey/events/', {
                'event_name': 'event2',
                'metadata': {}
            }, format='json')

            self.assertEqual(response.status_code, 201)
            # Check how many journeys and events exist now
            journeys = Journey.objects.filter(user=self.user)
            events = JourneyEvent.objects.all()
            # A new journey should have been created due to inactivity
            self.assertEqual(journeys.count(), 2, f"Expected 2 journeys, got {journeys.count()}")
            self.assertEqual(events.count(), 2, f"Expected 2 events, got {events.count()}")
            # Old journey should be marked as ended
            journey1.refresh_from_db()
            self.assertIsNotNone(journey1.ended_at, "Old journey should have ended_at set")

    def test_filter_events_by_event_name(self):
        journey = Journey.objects.create(user=self.user)
        JourneyEvent.objects.create(journey=journey, event_name='gd_tour_manual_build_completed')
        JourneyEvent.objects.create(journey=journey, event_name='gameday_published')

        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        response = self.client.get('/api/journey/events/?event_name=gd_tour_manual_build_completed')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['event_name'], 'gd_tour_manual_build_completed')

    def test_filter_events_by_event_name_in(self):
        journey = Journey.objects.create(user=self.user)
        JourneyEvent.objects.create(journey=journey, event_name='gd_tour_manual_build_completed')
        JourneyEvent.objects.create(journey=journey, event_name='gd_tour_manual_build_skipped')
        JourneyEvent.objects.create(journey=journey, event_name='gameday_published')

        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        response = self.client.get(
            '/api/journey/events/?event_name__in=gd_tour_manual_build_completed,gd_tour_manual_build_skipped'
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 2)
        names = {e['event_name'] for e in data}
        self.assertEqual(names, {'gd_tour_manual_build_completed', 'gd_tour_manual_build_skipped'})

    def test_filter_events_by_event_name_scoped_to_requesting_user(self):
        other_user = User.objects.create_user(username='otheruser', password='pass')
        other_journey = Journey.objects.create(user=other_user)
        JourneyEvent.objects.create(journey=other_journey, event_name='gd_tour_manual_build_completed')

        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        response = self.client.get('/api/journey/events/?event_name=gd_tour_manual_build_completed')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])


class GamedayEventPersistenceTests(APITestCase):
    """
    Integration tests for gameday adoption tracking persistence
    Verifies that gameday_* events persist in JourneyEvent model
    """

    def setUp(self):
        self.user = User.objects.create_user(username='gamedayuser', password='pass')
        self.token = AuthToken.objects.create(self.user)[1]
        self.journey = Journey.objects.create(user=self.user)

    def test_gameday_designer_opened_event_persists(self):
        """
        Test: gameday_designer_opened event is stored in JourneyEvent model
        Expected: Event has correct event_name and metadata
        """
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        response = self.client.post('/api/journey/events/', {
            'event_name': 'gameday_designer_opened',
            'metadata': {
                'gameday_id': 'gd_123',
                'session_id': 'sess_456'
            }
        }, format='json')

        self.assertEqual(response.status_code, 201)
        event = JourneyEvent.objects.get(event_name='gameday_designer_opened')
        self.assertEqual(event.journey, self.journey)
        self.assertEqual(event.metadata['gameday_id'], 'gd_123')
        self.assertEqual(event.metadata['session_id'], 'sess_456')

    def test_gameday_created_event_persists(self):
        """
        Test: gameday_created event is stored with metadata
        Expected: Event persists with all metadata fields
        """
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        response = self.client.post('/api/journey/events/', {
            'event_name': 'gameday_created',
            'metadata': {
                'gameday_id': 'gd_789',
                'gameday_name': 'League Final 2024',
                'format': 'league'
            }
        }, format='json')

        self.assertEqual(response.status_code, 201)
        event = JourneyEvent.objects.get(event_name='gameday_created')
        self.assertEqual(event.metadata['gameday_id'], 'gd_789')
        self.assertEqual(event.metadata['gameday_name'], 'League Final 2024')
        self.assertEqual(event.metadata['format'], 'league')

    def test_gameday_edited_event_persists(self):
        """
        Test: gameday_edited event stores field modification info
        Expected: Metadata contains field_modified field
        """
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        response = self.client.post('/api/journey/events/', {
            'event_name': 'gameday_edited',
            'metadata': {
                'gameday_id': 'gd_789',
                'field_modified': 'teams'
            }
        }, format='json')

        self.assertEqual(response.status_code, 201)
        event = JourneyEvent.objects.get(event_name='gameday_edited')
        self.assertEqual(event.metadata['field_modified'], 'teams')

    def test_gameday_published_event_persists(self):
        """
        Test: gameday_published event stores publication info
        Expected: Event metadata contains publish timestamp
        """
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        response = self.client.post('/api/journey/events/', {
            'event_name': 'gameday_published',
            'metadata': {
                'gameday_id': 'gd_789',
                'published_at': '2024-01-15T10:30:00Z'
            }
        }, format='json')

        self.assertEqual(response.status_code, 201)
        event = JourneyEvent.objects.get(event_name='gameday_published')
        self.assertEqual(event.metadata['published_at'], '2024-01-15T10:30:00Z')

    def test_template_used_event_persists(self):
        """
        Test: template_used event is stored with template metadata
        Expected: Template ID and name stored in metadata
        """
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        response = self.client.post('/api/journey/events/', {
            'event_name': 'template_used',
            'metadata': {
                'template_id': 'tpl_league_final',
                'template_name': 'League Final Format'
            }
        }, format='json')

        self.assertEqual(response.status_code, 201)
        event = JourneyEvent.objects.get(event_name='template_used')
        self.assertEqual(event.metadata['template_id'], 'tpl_league_final')
        self.assertEqual(event.metadata['template_name'], 'League Final Format')

    def test_metadata_stored_correctly(self):
        """
        Test: Complex metadata is stored and retrieved correctly
        Expected: Nested objects and arrays preserved in JSON
        """
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        complex_metadata = {
            'gameday_id': 'gd_complex',
            'teams': ['Team A', 'Team B', 'Team C'],
            'settings': {
                'auto_calculate': True,
                'timezone': 'Europe/Berlin'
            }
        }
        response = self.client.post('/api/journey/events/', {
            'event_name': 'gameday_created',
            'metadata': complex_metadata
        }, format='json')

        self.assertEqual(response.status_code, 201)
        event = JourneyEvent.objects.get(event_name='gameday_created',
                                         **{'metadata__gameday_id': 'gd_complex'})
        self.assertEqual(event.metadata['teams'], ['Team A', 'Team B', 'Team C'])
        self.assertEqual(event.metadata['settings']['auto_calculate'], True)
        self.assertEqual(event.metadata['settings']['timezone'], 'Europe/Berlin')

    def test_events_queryable_by_event_name(self):
        """
        Test: Events can be queried by event_name
        Expected: Correct events returned when filtering by name
        """
        # Create multiple different event types
        journey = Journey.objects.create(user=self.user)
        JourneyEvent.objects.create(journey=journey, event_name='gameday_designer_opened')
        JourneyEvent.objects.create(journey=journey, event_name='gameday_designer_opened')
        JourneyEvent.objects.create(journey=journey, event_name='gameday_created')
        JourneyEvent.objects.create(journey=journey, event_name='gameday_published')

        opened_events = JourneyEvent.objects.filter(event_name='gameday_designer_opened')
        created_events = JourneyEvent.objects.filter(event_name='gameday_created')
        published_events = JourneyEvent.objects.filter(event_name='gameday_published')

        self.assertEqual(opened_events.count(), 2)
        self.assertEqual(created_events.count(), 1)
        self.assertEqual(published_events.count(), 1)

    def test_events_queryable_by_user(self):
        """
        Test: Events can be queried by user through journey
        Expected: Only events for specific user returned
        """
        user2 = User.objects.create_user(username='anotheruser', password='pass')
        journey1 = Journey.objects.create(user=self.user)
        journey2 = Journey.objects.create(user=user2)

        JourneyEvent.objects.create(journey=journey1, event_name='gameday_designer_opened')
        JourneyEvent.objects.create(journey=journey1, event_name='gameday_created')
        JourneyEvent.objects.create(journey=journey2, event_name='gameday_designer_opened')

        user1_events = JourneyEvent.objects.filter(journey__user=self.user)
        user2_events = JourneyEvent.objects.filter(journey__user=user2)

        self.assertEqual(user1_events.count(), 2)
        self.assertEqual(user2_events.count(), 1)

    def test_event_ordering_by_created_at(self):
        """
        Test: Events are ordered by created_at timestamp
        Expected: Events returned in chronological order
        """
        journey = Journey.objects.create(user=self.user)

        # Create events with specific timestamps
        event1 = JourneyEvent.objects.create(
            journey=journey,
            event_name='gameday_designer_opened'
        )
        event2 = JourneyEvent.objects.create(
            journey=journey,
            event_name='gameday_created'
        )
        event3 = JourneyEvent.objects.create(
            journey=journey,
            event_name='gameday_published'
        )

        # Query events ordered by created_at
        ordered_events = list(JourneyEvent.objects.filter(
            journey=journey
        ).order_by('created_at'))

        # Verify order matches creation order
        self.assertEqual(ordered_events[0].id, event1.id)
        self.assertEqual(ordered_events[1].id, event2.id)
        self.assertEqual(ordered_events[2].id, event3.id)

    def test_full_gameday_lifecycle_persistence(self):
        """
        Test: Complete gameday lifecycle is persisted correctly
        Expected: All events in sequence with correct metadata
        """
        journey = Journey.objects.create(user=self.user)

        events_to_create = [
            ('gameday_designer_opened', {'gameday_id': 'gd_full', 'session_id': 'sess_1'}),
            ('gameday_created', {'gameday_id': 'gd_full', 'gameday_name': 'Test Gameday'}),
            ('gameday_edited', {'gameday_id': 'gd_full', 'field_modified': 'teams'}),
            ('template_used', {'template_id': 'tpl_1', 'template_name': 'Default'}),
            ('gameday_published', {'gameday_id': 'gd_full', 'status': 'live'}),
        ]

        for event_name, metadata in events_to_create:
            JourneyEvent.objects.create(
                journey=journey,
                event_name=event_name,
                metadata=metadata
            )

        # Verify all events persisted
        persisted_events = JourneyEvent.objects.filter(journey=journey).order_by('created_at')
        self.assertEqual(persisted_events.count(), 5)

        # Verify event names match in order
        event_names = [e.event_name for e in persisted_events]
        expected_names = [e[0] for e in events_to_create]
        self.assertEqual(event_names, expected_names)

        # Verify metadata preserved
        first_event = persisted_events.first()
        self.assertEqual(first_event.event_name, 'gameday_designer_opened')
        self.assertEqual(first_event.metadata['session_id'], 'sess_1')

    def test_event_creation_timestamp_accuracy(self):
        """
        Test: created_at timestamp is set accurately
        Expected: Timestamp is close to current time
        """
        journey = Journey.objects.create(user=self.user)
        before = timezone.now()
        event = JourneyEvent.objects.create(
            journey=journey,
            event_name='gameday_designer_opened'
        )
        after = timezone.now()

        self.assertGreaterEqual(event.created_at, before)
        self.assertLessEqual(event.created_at, after)

    def test_empty_metadata_handled(self):
        """
        Test: Events with empty metadata are handled correctly
        Expected: Empty dict stored and retrieved
        """
        journey = Journey.objects.create(user=self.user)
        event = JourneyEvent.objects.create(
            journey=journey,
            event_name='gameday_designer_opened',
            metadata={}
        )

        retrieved_event = JourneyEvent.objects.get(id=event.id)
        self.assertEqual(retrieved_event.metadata, {})


class JourneyMenuTestCase(TestCase):
    """Test cases for Journey Dashboard menu authorization and display"""

    def setUp(self):
        self.factory = RequestFactory()
        self.User = get_user_model()

    def test_menu_shows_for_staff_user(self):
        """Menu item should appear for staff users"""
        user = self.User.objects.create_user(
            username='staffuser',
            email='user@example.com',
            password='pass',
            is_staff=True
        )
        request = self.factory.get('/')
        request.user = user

        from journey.menu import JourneyMenu
        menu = JourneyMenu()
        items = menu.get_menu_items(request)

        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]['name'], 'Journey Dashboard')
        self.assertEqual(items[0]['url'], reverse('journey-dashboard'))

    def test_menu_hidden_for_non_staff_user(self):
        """Menu item should not appear for non-staff users"""
        user = self.User.objects.create_user(
            username='regularuser',
            email='user@example.com',
            password='pass',
            is_staff=False
        )
        request = self.factory.get('/')
        request.user = user

        from journey.menu import JourneyMenu
        menu = JourneyMenu()
        items = menu.get_menu_items(request)

        self.assertEqual(len(items), 0)

    def test_menu_hidden_for_unauthenticated_user(self):
        """Menu item should not appear for anonymous users"""
        request = self.factory.get('/')
        request.user = None

        from journey.menu import JourneyMenu
        menu = JourneyMenu()
        items = menu.get_menu_items(request)

        self.assertEqual(len(items), 0)

    def test_menu_name_is_analytics(self):
        """Menu group name should be 'Analytics'"""
        from journey.menu import JourneyMenu
        menu = JourneyMenu()

        self.assertEqual(menu.get_name(), 'Analytics')


class JourneyDashboardViewTestCase(TestCase):
    """Test cases for Journey Dashboard view authorization"""

    def setUp(self):
        self.client = Client()
        self.url = reverse('journey-dashboard')

    def test_view_accessible_for_staff_user(self):
        """View should return 200 for staff users."""
        user = User.objects.create_user(
            username='staffuser',
            email='user@example.com',
            password='testpass123',
            is_staff=True
        )
        self.client.login(username='staffuser', password='testpass123')

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)

    def test_view_forbidden_for_non_staff_user(self):
        """View should return 403 for non-staff users."""
        user = User.objects.create_user(
            username='regularuser',
            email='user@example.com',
            password='testpass123',
            is_staff=False
        )
        self.client.login(username='regularuser', password='testpass123')

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 403)

    def test_view_redirects_unauthenticated_to_login(self):
        """View should redirect anonymous users to login."""
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 302)
        self.assertIn('login', response.url)


class JourneyPermissionTests(APITestCase):
    """Test cases for journey permissions and data visibility (staff vs regular user)"""
    def setUp(self):
        self.staff_user = User.objects.create_user(username='staff', password='pass', is_staff=True)
        self.regular_user = User.objects.create_user(username='regular', password='pass', is_staff=False)
        self.other_user = User.objects.create_user(username='other', password='pass', is_staff=False)

        self.staff_token = AuthToken.objects.create(self.staff_user)[1]
        self.regular_token = AuthToken.objects.create(self.regular_user)[1]

        self.journey_reg = Journey.objects.create(user=self.regular_user)
        self.journey_oth = Journey.objects.create(user=self.other_user)

        JourneyEvent.objects.create(journey=self.journey_reg, event_name='gameday_designer_opened')
        JourneyEvent.objects.create(journey=self.journey_oth, event_name='passcheck_started')

    def test_stats_visibility_regular_user(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.regular_token}')
        response = self.client.get('/api/journey/events/stats/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['total_events'], 2)
        # Verify both event types are present in global stats
        event_names = [item['event_name'] for item in response.data['stats']]
        self.assertIn('gameday_designer_opened', event_names)
        self.assertIn('passcheck_started', event_names)

    def test_stats_visibility_staff_user(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.staff_token}')
        response = self.client.get('/api/journey/events/stats/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['total_events'], 2)

    def test_adoption_access_denied_regular_user(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.regular_token}')
        response = self.client.get('/api/journey/events/adoption/')
        self.assertEqual(response.status_code, 403)

    def test_adoption_access_granted_staff_user(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.staff_token}')
        response = self.client.get('/api/journey/events/adoption/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['gameday']['opens'], 1)
        self.assertEqual(response.data['passcheck']['opens'], 1)

    def test_get_queryset_visibility(self):
        # Regular user should only see their own events
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.regular_token}')
        response = self.client.get('/api/journey/events/')
        self.assertEqual(len(response.data), 1)
        
        # Staff user should see all events
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.staff_token}')
        response = self.client.get('/api/journey/events/')
        self.assertEqual(len(response.data), 2)


class GameProgressViewTests(TestCase):
    """Tests for GameProgressPageView template resolution."""

    def test_game_progress_view_template_exists(self):
        """Verify GameProgressPageView references an existing template."""
        from journey.progress_view import GameProgressPageView
        from django.template.loader import get_template

        view = GameProgressPageView()
        template_name = view.template_name

        # Should not raise TemplateDoesNotExist
        try:
            template = get_template(template_name)
            self.assertIsNotNone(template)
        except Exception as e:
            self.fail(f"Template {template_name} not found: {e}")

    def test_game_progress_view_correct_template(self):
        """Verify GameProgressPageView uses journey_dashboard template, not gameday_designer."""
        from journey.progress_view import GameProgressPageView

        view = GameProgressPageView()
        # Should reference journey_dashboard, not gameday_designer
        self.assertIn("journey_dashboard", view.template_name)
        self.assertNotIn("gameday_designer/progress", view.template_name)

    def test_anonymous_user_can_access_progress_page(self):
        """Page must be reachable without authentication (public status page)."""
        response = self.client.get(reverse("game-progress-page"))
        self.assertEqual(response.status_code, 200)


class GamedayProgressSerializerTests(TestCase):
    """Tests for GamedayProgressSerializer status computation."""

    def setUp(self):
        from gamedays.models import Season, League
        self.author = User.objects.create_user(username='author', password='pass')
        self.season = Season.objects.create(name='2026', slug='2026')
        self.league = League.objects.create(name='Test League', slug='test-league')

    def test_empty_gameday_status_with_completed_games(self):
        """When Gameday.status is empty and all games are completed, serializer returns COMPLETED."""
        from gamedays.models import Gameday, Gameinfo, Team
        from journey.api.progress_serializers import GamedayProgressSerializer
        from datetime import date, time

        team = Team.objects.create(name='Test Team', description='Test Team Desc', location='Test')
        gameday = Gameday.objects.create(
            name='Test Gameday',
            season=self.season,
            league=self.league,
            date=date(2026, 5, 17),
            start=time(10, 0),
            author=self.author,
            status=''  # Empty status
        )

        # Create a completed game
        gameinfo = Gameinfo.objects.create(
            gameday=gameday,
            scheduled=time(10, 0),
            field=1,
            officials=team,
            status='beendet',  # Completed
            stage='Group',
            standing='1st'
        )

        serializer = GamedayProgressSerializer(gameday)
        data = serializer.data

        # Should have computed status of COMPLETED since all games are finished
        self.assertEqual(data['computed_status'], 'COMPLETED')

    def test_empty_gameday_status_with_pending_games(self):
        """When Gameday.status is empty and has pending games, serializer returns PUBLISHED."""
        from gamedays.models import Gameday, Gameinfo, Team
        from journey.api.progress_serializers import GamedayProgressSerializer
        from datetime import date, time

        team = Team.objects.create(name='Test Team 2', description='Test Team 2 Desc', location='Test')
        gameday = Gameday.objects.create(
            name='Test Gameday 2',
            season=self.season,
            league=self.league,
            date=date(2026, 5, 18),
            start=time(10, 0),
            author=self.author,
            status=''  # Empty status
        )

        # Create a pending game
        gameinfo = Gameinfo.objects.create(
            gameday=gameday,
            scheduled=time(10, 0),
            field=1,
            officials=team,
            status='Geplant',  # Planned
            stage='Group',
            standing='1st'
        )

        serializer = GamedayProgressSerializer(gameday)
        data = serializer.data

        # Should have computed status of PUBLISHED since there are pending games
        self.assertEqual(data['computed_status'], 'PUBLISHED')

    def test_gameday_with_explicit_status_preserved(self):
        """When Gameday.status is set, it should be preserved (not computed)."""
        from gamedays.models import Gameday, Gameinfo, Team
        from journey.api.progress_serializers import GamedayProgressSerializer
        from datetime import date, time

        team = Team.objects.create(name='Test Team 3', description='Test Team 3 Desc', location='Test')
        gameday = Gameday.objects.create(
            name='Test Gameday 3',
            season=self.season,
            league=self.league,
            date=date(2026, 5, 19),
            start=time(10, 0),
            author=self.author,
            status='DRAFT'  # Explicit status
        )

        gameinfo = Gameinfo.objects.create(
            gameday=gameday,
            scheduled=time(10, 0),
            field=1,
            officials=team,
            status='beendet',
            stage='Group',
            standing='1st'
        )

        serializer = GamedayProgressSerializer(gameday)
        data = serializer.data

        # Should preserve the explicit DRAFT status
        self.assertEqual(data['status'], 'DRAFT')


class GameProgressOrderingTests(APITestCase):
    """The progress list must return gamedays closest to today first, so today's
    games land on page 1 instead of being pushed off the end by the lookback
    window (regression: only the oldest 20 gamedays were ever returned)."""

    def setUp(self):
        from gamedays.models import Season, League
        self.author = User.objects.create_user(username='order-author', password='pass')
        self.season = Season.objects.create(name='2026', slug='2026-order')
        self.league = League.objects.create(name='Order League', slug='order-league')
        self.today = timezone.now().date()

    def _create_gameday(self, day_offset):
        from gamedays.models import Gameday
        from datetime import time
        gameday_date = self.today + timedelta(days=day_offset)
        return Gameday.objects.create(
            name=f'GD {day_offset:+d}',
            season=self.season,
            league=self.league,
            date=gameday_date,
            start=time(10, 0),
            author=self.author,
            status='',
        )

    def test_orders_by_distance_from_today_closest_first(self):
        # Create out of order; distance-from-today must drive the result order.
        gd_minus5 = self._create_gameday(-5)
        gd_plus10 = self._create_gameday(10)
        gd_today = self._create_gameday(0)
        gd_plus2 = self._create_gameday(2)
        gd_minus1 = self._create_gameday(-1)

        response = self.client.get('/api/game-progress/')
        self.assertEqual(response.status_code, 200)

        returned_ids = [row['id'] for row in response.data['results']]
        expected_ids = [
            gd_today.id,    # distance 0
            gd_minus1.id,   # distance 1
            gd_plus2.id,    # distance 2
            gd_minus5.id,   # distance 5
            gd_plus10.id,   # distance 10
        ]
        self.assertEqual(returned_ids, expected_ids)

    def test_distance_ties_break_by_date_ascending(self):
        # Equal distance (past vs future) must fall back to date ascending.
        gd_minus2 = self._create_gameday(-2)
        gd_plus2 = self._create_gameday(2)

        response = self.client.get('/api/game-progress/')
        self.assertEqual(response.status_code, 200)

        returned_ids = [row['id'] for row in response.data['results']]
        self.assertEqual(returned_ids, [gd_minus2.id, gd_plus2.id])
