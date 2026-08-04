from datetime import timedelta

from django.utils import timezone

from journey.models import Journey


JOURNEY_CATEGORIES = {
    'discover': {
        'gameday_designer_opened',
        'template_library_opened',
        'gd_tour_save_template_started',
        'gd_tour_save_template_completed',
        'gd_tour_save_template_skipped',
        'gd_tour_manual_build_started',
        'gd_tour_manual_build_completed',
        'gd_tour_manual_build_skipped',
    },
    'create': {
        'gameday_created',
        'import_executed',
        'export_executed',
        'officials_group_added',
        'template_saved',
        'template_used',
    },
    'edit': {
        'gameday_edited',
    },
    'live': {
        'game_started',
        'game_completed',
        'game_event_recorded',
        'possession_recorded',
        'halftime_recorded',
        'second_half_started',
        'captain_confirmed',
    },
    'publish': {
        'gameday_published',
    },
}

CATEGORY_BY_EVENT = {
    event_name: category
    for category, event_names in JOURNEY_CATEGORIES.items()
    for event_name in event_names
}


def categorize_event(event_name):
    """Map an event name to a journey phase category, defaulting to 'other'."""
    return CATEGORY_BY_EVENT.get(event_name, 'other')


def _format_dt(value):
    return value.strftime('%Y-%m-%d %H:%M:%S')


def _serialize_session(journey, now):
    """Serialize one Journey into a session with ordered, categorized events."""
    events = []
    cat_counts = {}
    for event in journey.events.all():
        category = categorize_event(event.event_name)
        cat_counts[category] = cat_counts.get(category, 0) + 1
        events.append({
            'name': event.event_name,
            'category': category,
            'meta': event.metadata,
            'at': _format_dt(event.created_at),
        })

    started_at = journey.started_at
    ended_at = journey.ended_at
    duration_s = max(0, int(((ended_at if ended_at else now) - started_at).total_seconds()))

    return {
        'id': journey.id,
        'user': journey.user.username,
        'started_at': _format_dt(started_at),
        'ended_at': _format_dt(ended_at) if ended_at else None,
        'ongoing': ended_at is None,
        'duration_s': duration_s,
        'event_count': len(events),
        'cat_counts': cat_counts,
        'events': events,
    }


def build_session_report(days=7):
    """
    Reconstruct user journeys as per-session timelines from Journey/JourneyEvent
    records within the last `days` days.

    Returns a dict with:
      - sessions: newest first, each with ordered events, category counts and duration
      - summary: session/user/event totals, date range and top event frequencies
    """
    now = timezone.now()
    cutoff = now - timedelta(days=days)

    journeys = (
        Journey.objects.filter(started_at__gte=cutoff)
        .select_related('user')
        .prefetch_related('events')
        .order_by('-started_at')
    )

    sessions = [_serialize_session(journey, now) for journey in journeys]

    n_events = sum(session['event_count'] for session in sessions)

    top_counts = {}
    for session in sessions:
        for event in session['events']:
            top_counts[event['name']] = top_counts.get(event['name'], 0) + 1
    top_events = sorted(top_counts.items(), key=lambda pair: (-pair[1], pair[0]))[:10]

    return {
        'sessions': sessions,
        'summary': {
            'n_sessions': len(sessions),
            'n_users': len({session['user'] for session in sessions}),
            'users': sorted({session['user'] for session in sessions}),
            'n_events': n_events,
            'date_min': sessions[-1]['started_at'] if sessions else None,
            'date_max': sessions[0]['started_at'] if sessions else None,
            'top_events': [list(pair) for pair in top_events],
        },
    }
