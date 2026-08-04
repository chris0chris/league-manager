from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from knox.models import AuthToken
from rest_framework.test import APITestCase

from journey.models import Journey, JourneyEvent
from journey.api.session_report import build_session_report, categorize_event

User = get_user_model()


def _set_event_time(event, when):
    """Backdate a JourneyEvent's created_at (bypasses auto_now_add)."""
    JourneyEvent.objects.filter(id=event.id).update(created_at=when)


class CategorizeEventTests(TestCase):
    """Event names must map to the journey phase categories used by the report."""

    def test_known_event_categories(self):
        self.assertEqual(categorize_event('gameday_designer_opened'), 'discover')
        self.assertEqual(categorize_event('template_library_opened'), 'discover')
        self.assertEqual(categorize_event('gameday_created'), 'create')
        self.assertEqual(categorize_event('import_executed'), 'create')
        self.assertEqual(categorize_event('export_executed'), 'create')
        self.assertEqual(categorize_event('officials_group_added'), 'create')
        self.assertEqual(categorize_event('template_saved'), 'create')
        self.assertEqual(categorize_event('template_used'), 'create')
        self.assertEqual(categorize_event('gameday_edited'), 'edit')
        self.assertEqual(categorize_event('game_started'), 'live')
        self.assertEqual(categorize_event('possession_recorded'), 'live')
        self.assertEqual(categorize_event('game_event_recorded'), 'live')
        self.assertEqual(categorize_event('halftime_recorded'), 'live')
        self.assertEqual(categorize_event('second_half_started'), 'live')
        self.assertEqual(categorize_event('captain_confirmed'), 'live')
        self.assertEqual(categorize_event('game_completed'), 'live')
        self.assertEqual(categorize_event('gameday_published'), 'publish')

    def test_unknown_event_defaults_to_other(self):
        self.assertEqual(categorize_event('some_future_event'), 'other')
        self.assertEqual(categorize_event(''), 'other')


class SessionReportServiceTests(TestCase):
    """Unit tests for the session report builder."""

    def setUp(self):
        self.user = User.objects.create_user(username='alice', password='pass')
        self.other = User.objects.create_user(username='bob', password='pass')

    def _make_session(self, user, started_at, events):
        """Create a Journey backdated to started_at with the given (name, metadata) events."""
        journey = Journey.objects.create(user=user)
        Journey.objects.filter(id=journey.id).update(started_at=started_at)
        for index, (name, metadata) in enumerate(events):
            event = JourneyEvent.objects.create(journey=journey, event_name=name, metadata=metadata)
            _set_event_time(event, started_at + timedelta(seconds=index + 1))
        return journey

    def test_reconstructs_ordered_events_per_session(self):
        start = timezone.now() - timedelta(hours=1)
        self._make_session(
            self.user,
            start,
            [
                ('gameday_designer_opened', {'gameday_id': '1'}),
                ('gameday_created', {'gameday_id': '1'}),
                ('gameday_published', {'gameday_id': '1'}),
            ],
        )

        report = build_session_report(days=7)
        self.assertEqual(report['summary']['n_sessions'], 1)
        session = report['sessions'][0]
        self.assertEqual(session['user'], 'alice')
        self.assertEqual(session['event_count'], 3)
        self.assertEqual([e['name'] for e in session['events']], [
            'gameday_designer_opened',
            'gameday_created',
            'gameday_published',
        ])
        self.assertEqual(session['cat_counts'], {'discover': 1, 'create': 1, 'publish': 1})
        self.assertTrue(session['ongoing'])
        self.assertIsNone(session['ended_at'])
        self.assertEqual(session['events'][0]['meta'], {'gameday_id': '1'})

    def test_summary_totals_and_top_events(self):
        start = timezone.now() - timedelta(hours=2)
        self._make_session(self.user, start, [
            ('gameday_designer_opened', {}),
            ('gameday_created', {}),
            ('gameday_edited', {}),
        ])
        self._make_session(self.other, start, [
            ('gameday_designer_opened', {}),
            ('gameday_designer_opened', {}),
            ('game_completed', {}),
        ])

        report = build_session_report(days=7)
        summary = report['summary']
        self.assertEqual(summary['n_sessions'], 2)
        self.assertEqual(summary['n_users'], 2)
        self.assertEqual(summary['n_events'], 6)
        self.assertEqual(summary['users'], ['alice', 'bob'])
        self.assertEqual(summary['top_events'][0], ['gameday_designer_opened', 3])

    def test_days_window_filters_older_sessions(self):
        self._make_session(self.user, timezone.now() - timedelta(days=2), [
            ('gameday_designer_opened', {}),
        ])
        self._make_session(self.user, timezone.now() - timedelta(days=30), [
            ('gameday_designer_opened', {}),
        ])

        report = build_session_report(days=7)
        self.assertEqual(report['summary']['n_sessions'], 1)
        self.assertEqual(report['summary']['n_events'], 1)

    def test_duration_uses_ended_at_for_closed_sessions(self):
        start = timezone.now() - timedelta(minutes=10)
        journey = self._make_session(self.user, start, [
            ('gameday_designer_opened', {}),
        ])
        ended = start + timedelta(minutes=5)
        Journey.objects.filter(id=journey.id).update(ended_at=ended)

        report = build_session_report(days=7)
        session = report['sessions'][0]
        self.assertFalse(session['ongoing'])
        self.assertEqual(session['ended_at'], ended.strftime('%Y-%m-%d %H:%M:%S'))
        self.assertEqual(session['duration_s'], 300)

    def test_sessions_sorted_newest_first(self):
        older = timezone.now() - timedelta(days=3)
        newer = timezone.now() - timedelta(hours=1)
        self._make_session(self.user, older, [('gameday_designer_opened', {})])
        self._make_session(self.user, newer, [('gameday_designer_opened', {})])

        report = build_session_report(days=7)
        self.assertEqual(len(report['sessions']), 2)
        self.assertEqual(report['sessions'][0]['started_at'], report['summary']['date_max'])
        self.assertEqual(report['sessions'][1]['started_at'], report['summary']['date_min'])

    def test_empty_report(self):
        report = build_session_report(days=7)
        self.assertEqual(report['sessions'], [])
        self.assertEqual(report['summary']['n_sessions'], 0)
        self.assertEqual(report['summary']['n_users'], 0)
        self.assertEqual(report['summary']['top_events'], [])
        self.assertIsNone(report['summary']['date_min'])


class SessionReportAPITests(APITestCase):
    """Tests for the /api/journey/journeys/sessions/ endpoint."""

    def setUp(self):
        self.staff = User.objects.create_user(username='staff', password='pass', is_staff=True)
        self.regular = User.objects.create_user(username='regular', password='pass')
        self.staff_token = AuthToken.objects.create(self.staff)[1]
        self.regular_token = AuthToken.objects.create(self.regular)[1]

        journey = Journey.objects.create(user=self.regular)
        JourneyEvent.objects.create(journey=journey, event_name='gameday_designer_opened')
        JourneyEvent.objects.create(journey=journey, event_name='gameday_created')

    def test_access_denied_for_regular_user(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.regular_token}')
        response = self.client.get('/api/journey/journeys/sessions/')
        self.assertEqual(response.status_code, 403)

    def test_access_granted_for_staff_user(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.staff_token}')
        response = self.client.get('/api/journey/journeys/sessions/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['summary']['n_sessions'], 1)
        self.assertEqual(data['summary']['n_users'], 1)
        self.assertEqual(data['summary']['n_events'], 2)
        session = data['sessions'][0]
        self.assertEqual(session['user'], 'regular')
        self.assertEqual({e['category'] for e in session['events']}, {'discover', 'create'})

    def test_days_parameter(self):
        old_journey = Journey.objects.create(user=self.regular)
        Journey.objects.filter(id=old_journey.id).update(
            started_at=timezone.now() - timedelta(days=14)
        )
        JourneyEvent.objects.create(journey=old_journey, event_name='gameday_designer_opened')

        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.staff_token}')

        response = self.client.get('/api/journey/journeys/sessions/?days=7')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['summary']['n_sessions'], 1)

        response = self.client.get('/api/journey/journeys/sessions/?days=30')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['summary']['n_sessions'], 2)

    def test_invalid_days_falls_back_to_seven(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.staff_token}')
        response = self.client.get('/api/journey/journeys/sessions/?days=abc')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['summary']['n_sessions'], 1)
