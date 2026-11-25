"""Registry of in-app help topics.

Topics are described here (not parsed from filenames) so grouping and order
stay explicit. Content lives next to this module in ``content/`` as
``<slug>.<lang>.md``. Adding a topic means adding an entry here plus a German
Markdown file; an English file can follow later with no code changes.
"""

from dataclasses import dataclass
from typing import Dict, Optional

DEFAULT_LANGUAGE = "de"


@dataclass(frozen=True)
class HelpTopic:
    slug: str
    group: str
    title: Dict[str, str]
    summary: Dict[str, str]
    icon: str
    order: int
    video: Optional[str] = None
    tutorial: Optional[str] = None
    featured: bool = False
    # Staff-only topics are hidden from everyone else: no index card, no
    # sidebar entry, and the topic URL returns 404. Content may contain
    # internal details (hosts, credentials handling) that must not be public.
    staff_only: bool = False


HELP_GROUPS: Dict[str, Dict[str, object]] = {
    "neu": {
        "title": {"de": "Neu in 2026", "en": "New in 2026"},
        "order": 5,
    },
    "getting-started": {
        "title": {"de": "Erste Schritte", "en": "Getting started"},
        "order": 10,
    },
    "spielbetrieb": {
        "title": {"de": "Spielbetrieb", "en": "Running your league"},
        "order": 20,
    },
    "funktionen": {
        "title": {"de": "Funktionen", "en": "Features"},
        "order": 30,
    },
    "staff": {
        "title": {"de": "Nur für Staff", "en": "Staff only"},
        "order": 40,
    },
}


HELP_TOPICS = [
    HelpTopic(
        slug="whats-new-2026",
        group="neu",
        title={"de": "Was ist neu 2026", "en": "What's New 2026"},
        summary={
            "de": "Die wichtigsten neuen Funktionen seit Ende 2025 im Überblick.",
            "en": "A roundup of the major new features since late 2025.",
        },
        icon="bi-stars",
        order=10,
        featured=True,
    ),
    HelpTopic(
        slug="startseite",
        group="getting-started",
        title={"de": "Startseite", "en": "Home"},
        summary={
            "de": "Deine Seite nach der Anmeldung: nächster Spieltag, offene Aufgaben und Wege in den Rest der Plattform.",
            "en": "Your page after signing in: next gameday, open tasks and ways into the rest of the platform.",
        },
        icon="bi-house-door",
        order=5,
    ),
    HelpTopic(
        slug="getting-started",
        group="getting-started",
        title={"de": "Erste Schritte", "en": "Getting started"},
        summary={
            "de": "Was LeagueSphere ist, welche Rollen es gibt und wie du dich anmeldest.",
            "en": "What LeagueSphere is, which roles exist and how to sign in.",
        },
        icon="bi-rocket",
        order=10,
    ),
    HelpTopic(
        slug="spieltage",
        group="spielbetrieb",
        title={"de": "Spieltage", "en": "Gamedays"},
        summary={
            "de": "Spielpläne, Ergebnisse und der Tagesstatus eines Spieltags.",
            "en": "Schedules, results and the day status of a gameday.",
        },
        icon="bi-calendar-event",
        order=10,
    ),
    HelpTopic(
        slug="ligatabellen",
        group="spielbetrieb",
        title={"de": "Ligatabellen", "en": "League tables"},
        summary={
            "de": "Platzierungen je Liga und Saison, automatisch berechnet.",
            "en": "Standings per league and season, calculated automatically.",
        },
        icon="bi-table",
        order=20,
    ),
    HelpTopic(
        slug="teams-offizielle",
        group="spielbetrieb",
        title={"de": "Teams & Offizielle", "en": "Teams & Officials"},
        summary={
            "de": "Kader, Pässe und Schiedsrichter-Einsätze.",
            "en": "Rosters, passes and officials assignments.",
        },
        icon="bi-people",
        order=30,
    ),
    HelpTopic(
        slug="share-widget",
        group="funktionen",
        title={"de": "Website einbinden", "en": "Embed on your website"},
        summary={
            "de": "Spielplan, Ergebnisse und Tabellen per Widget auf der eigenen Website zeigen.",
            "en": "Show fixtures, results and tables on your own site with the widget.",
        },
        icon="bi-code-slash",
        order=20,
        video="https://www.youtube.com/embed/PzINW_SXlDU",
        tutorial="https://github.com/dachrisch/leaguesphere/blob/master/docs/topics/features/share-widget/overview.md",
    ),
    HelpTopic(
        slug="gameday-designer",
        group="funktionen",
        title={"de": "Gameday Designer", "en": "Gameday Designer"},
        summary={
            "de": "Spielpläne mit geführtem Start und wiederverwendbaren Vorlagen erstellen.",
            "en": "Build schedules with a guided start and reusable templates.",
        },
        icon="bi-diagram-3",
        order=30,
        video="https://www.youtube.com/embed/Ek3yec2hqK0",
        tutorial="https://github.com/dachrisch/leaguesphere/blob/master/docs/topics/features/gameday-designer/gameday-designer.md",
    ),
    HelpTopic(
        slug="referee-import",
        group="funktionen",
        title={
            "de": "Schiedsrichter-Meldungen importieren",
            "en": "Referee report import",
        },
        summary={
            "de": "Selbst gemeldete Spiele der Offiziellen prüfen und importieren.",
            "en": "Review and import officials' self-reported games.",
        },
        icon="bi-file-earmark-arrow-up",
        order=40,
        video="https://www.youtube.com/embed/AUg1Jn_jy1E",
    ),
    HelpTopic(
        slug="live-status",
        group="funktionen",
        title={"de": "Live-Status heute", "en": "Today's live status"},
        summary={
            "de": "Auf einen Blick sehen, welche Spieltage heute anstehen oder gerade laufen.",
            "en": "See at a glance which gamedays are upcoming or live today.",
        },
        icon="bi-broadcast",
        order=50,
        video="https://www.youtube.com/embed/NO2BNJ38jc8",
    ),
    HelpTopic(
        slug="liga-verwalten",
        group="spielbetrieb",
        title={"de": "Liga & Spieltag verwalten", "en": "Running a gameday"},
        summary={
            "de": "Einen Spieltag mit dem Gameday Designer anlegen, Teams und Felder festlegen und den Spielplan veröffentlichen.",
            "en": "Create a gameday with the Gameday Designer, set teams and fields, and publish the schedule.",
        },
        icon="bi-clipboard-plus",
        order=5,
        video="https://www.youtube.com/embed/Ek3yec2hqK0",
    ),
    HelpTopic(
        slug="ergebnisse-erfassen",
        group="spielbetrieb",
        title={"de": "Ergebnisse erfassen", "en": "Recording results"},
        summary={
            "de": "Auf dem Platz Ergebnisse eintragen: Offizielle, Spielzüge, Halbzeit und Abschluss.",
            "en": "Enter results on game day: officials, plays, halftime and finalization.",
        },
        icon="bi-clipboard-check",
        order=35,
        video="https://www.youtube.com/embed/lW-sky-op6M",
    ),
    HelpTopic(
        slug="spieltag-v2",
        group="spielbetrieb",
        title={"de": "Scorecard v2", "en": "Scorecard v2"},
        summary={
            "de": "Beta: die neue Erfassung am Feld – vom Spieltag über die Vorbereitung bis zum Ergebnis, auch offline.",
            "en": "Beta: the new field app – from the gameday through preparation to the result, offline included.",
        },
        icon="bi-clipboard2-check",
        order=36,
    ),
    HelpTopic(
        slug="offizielle-statistik",
        group="spielbetrieb",
        title={
            "de": "Offizielle: Übersicht & Statistik",
            "en": "Officials: overview & stats",
        },
        summary={
            "de": "Wer welche Spiele geleitet hat – Übersicht, Bestenliste und alle Einsätze.",
            "en": "Who officiated what – overview, leaderboard and all assignments.",
        },
        icon="bi-bar-chart",
        order=40,
        video="https://www.youtube.com/embed/g9QuDwGZhK8",
    ),
    HelpTopic(
        slug="offizielle-einsaetze",
        group="spielbetrieb",
        title={"de": "Einsätze selbst verwalten", "en": "Manage your own duties"},
        summary={
            "de": "Offene Einsätze übernehmen, fehlende Spiele nachtragen und eigene Meldungen pflegen.",
            "en": "Claim open assignments, add missing games and maintain your own reports.",
        },
        icon="bi-person-check",
        order=42,
    ),
    HelpTopic(
        slug="dbaccess",
        group="staff",
        title={"de": "Temporärer Datenbankzugang", "en": "Temporary database access"},
        summary={
            "de": "Befristeten Produktionszugang beantragen, freigeben lassen und in DBeaver verbinden.",
            "en": "Request temporary production access, get it approved and connect with DBeaver.",
        },
        icon="bi-database-lock",
        order=10,
        staff_only=True,
    ),
]


def get_topic(slug: str) -> Optional[HelpTopic]:
    for topic in HELP_TOPICS:
        if topic.slug == slug:
            return topic
    return None


def localized(value: Dict[str, str], lang: str) -> str:
    return value.get(lang) or value[DEFAULT_LANGUAGE]


def ordered_topics():
    group_order = {key: meta["order"] for key, meta in HELP_GROUPS.items()}
    return sorted(
        HELP_TOPICS,
        key=lambda topic: (group_order.get(topic.group, 999), topic.order),
    )


def featured_topics():
    return [topic for topic in ordered_topics() if topic.featured]


def visible_to(topic: HelpTopic, user) -> bool:
    """Staff-only topics exist only for staff users."""
    return not topic.staff_only or bool(getattr(user, "is_staff", False))
