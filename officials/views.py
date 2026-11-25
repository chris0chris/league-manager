import json
import logging
from datetime import date, datetime, timedelta

from django.conf import settings
from django.contrib import messages
from django.contrib.auth.mixins import UserPassesTestMixin, LoginRequiredMixin
from django.core.cache import cache
from django.core.paginator import Paginator, PageNotAnInteger, EmptyPage
from django.db import Error as DatabaseError
from django.db.models import Subquery, OuterRef, Q
from django.http import Http404, HttpResponse, JsonResponse
from django.shortcuts import render, redirect
from django.urls import reverse
from django.utils.html import format_html, format_html_join
from django.views import View
from django.views.decorators.cache import cache_page

from gamedays.constants import LEAGUE_GAMEDAY_DETAIL
from gamedays.models import Team, Gameinfo, GameOfficial, Gameresult
from league_manager.utils.serializer_utils import Obfuscator
from league_manager.utils.view_utils import PermissionHelper
from officials.api.serializers import (
    GameOfficialAllInfoSerializer,
    OfficialSerializer,
    OfficialGamelistSerializer,
    prefetch_official_license_history,
)
from officials.constants import (
    MOODLE_LOGGED_IN_USER,
    MOODLE_REMEMBER_COOKIE,
    OFFICIALS_STATISTICS_FOR_SEASON,
    REMEMBER_COOKIE_PATH,
)
from officials.forms import (
    AddExternalGameOfficialEntryForm,
    AddInternalGameOfficialEntryForm,
    GameOfficialImportUploadForm,
    MoodleLoginForm,
)
from officials.models import Official, OfficialLicenseHistory
from officials.service.association_resolution import UnknownAssociationError
from officials.service.boff_license_calculation import LicenseStrategy
from officials.service.game_official_entries import AmbiguousGameOfficialError
from officials.service.game_official_import import (
    ImportColumnError,
    build_import_result,
    parse_uploaded_file,
)
from officials.service.moodle.moodle_api import MoodleApiException
from officials.service.moodle.moodle_service import MoodleService
from officials.service.official_service import OfficialService
from officials.service.officials_repository_service import OfficialsRepositoryService
from officials.service.signup_service import (
    OfficialSignupService,
    DuplicateSignupError,
    MaxSignupError,
)
from officials.service.remember_me import RememberMeService, REMEMBER_ME_MAX_AGE
from officials.selfservice import (
    ADD_ASSIGNMENT_URL_NAME,
    CLAIM_URL_NAME,
    UNASSIGN_URL_NAME,
    acting_official_id,
    can_edit_official,
    delete_remember_cookie,
    name_matches_official,
    restore_moodle_session,
    safe_next,
    selfservice_banner_context,
    set_remember_cookie,
)

logger = logging.getLogger(__name__)

NO_OFFICIAL_FOR_MOODLE_USER = (
    "Für diesen Moodle-Account ist kein Official hinterlegt. "
    "Bitte wende dich an die Turnierleitung."
)


_set_remember_cookie = set_remember_cookie
_delete_remember_cookie = delete_remember_cookie


class AllTeamsCardListView(View):
    template_name = "officials/all_teams_card_list.html"

    def get(self, request, **kwargs):
        context = OfficialService().get_all_teams_with_license_breakdown()
        return render(request, self.template_name, context)


class OfficialsStatisticsView(View):
    template_name = "officials/statistics.html"
    YEARS_CACHE_KEY = "officials_statistics_years"

    def get(self, request, **kwargs):
        season = kwargs.get("season", datetime.today().year)
        is_staff = request.user.is_staff
        officials_repository_service = OfficialsRepositoryService()
        statistics = officials_repository_service.get_officials_statistics_for_season(
            season
        )
        officials_without_external = statistics["without_external"]
        officials_with_external = statistics["with_external"]

        # An official can appear in both lists (they're the same
        # underlying rows, just re-ranked/re-cut), so set this once per
        # list rather than trying to de-duplicate - harmless either way.
        for official in officials_without_external + officials_with_external:
            official.display_name = Obfuscator.reveal_unless_obfuscated(
                is_staff, official.first_name, official.last_name
            )
        years = self._get_years()

        return render(
            request,
            self.template_name,
            {
                "season": season,
                "years": years,
                "url_pattern": OFFICIALS_STATISTICS_FOR_SEASON,
                "officials_list_without_external": officials_without_external,
                "officials_list_with_external": officials_with_external,
            },
        )

    @classmethod
    def _get_years(cls):
        """
        Distinct years with at least one recorded GameOfficial - only
        used to populate the year-picker, so it's cached at the query
        level (not a full-page cache_page, since the page's content
        itself varies by is_staff) to avoid an unfiltered full-table
        scan on every single request to this public page.
        """
        years = cache.get(cls.YEARS_CACHE_KEY)
        if years is None:
            years = sorted(
                GameOfficial.objects.all()
                .values_list("gameinfo__gameday__date__year", flat=True)
                .distinct(),
                reverse=True,
            )
            cache.set(cls.YEARS_CACHE_KEY, years, timeout=60 * 60 * 24)
        return years


class OfficialsTeamListView(View):
    model = Official
    template_name = "officials/officials_list.html"

    def get(self, request, **kwargs):
        team_id = kwargs.get("pk")
        year = kwargs.get("season", datetime.today().year)
        official_service = OfficialService()
        try:
            context = official_service.get_all_officials_with_team_infos(
                team_id,
                year,
                PermissionHelper.has_staff_or_user_permission(request, team_id),
            )
        except Team.DoesNotExist:
            raise Http404("Team does not exist.")

        # Officiated-games section: visible to any logged-in user other than
        # someone in the middle of the separate Moodle-officials-login
        # session flow (MOODLE_LOGGED_IN_USER) - no team-account matching,
        # no staff exclusion. The (comparatively expensive - see
        # officiated_games_service's module docstring) query work only runs
        # when the section will actually be shown.
        context["show_officiated_games"] = (
            request.user.is_authenticated
            and not request.session.get(MOODLE_LOGGED_IN_USER)
        )
        if context["show_officiated_games"]:
            from matchreport.constants import REPORT_TABLE_RENDER_CONFIG
            from officials.service.officiated_games_service import (
                get_team_officiated_games,
            )

            context["officiated_games"] = get_team_officiated_games(
                team_id, year, REPORT_TABLE_RENDER_CONFIG
            )

        return render(
            request,
            self.template_name,
            context,
        )

    def is_user_allowed_to_see_official_names(self, team_id):
        team: Team = Team.objects.get(pk=team_id)
        if self.request.user.is_staff:
            return True
        return self.request.user.username == team.name


GAME_OFFICIALS_LIST_CACHE_SECONDS = 60 * 60 * 24


class GameOfficialListView(View):
    template_name = "officials/game_officials_list.html"

    def get(self, request, **kwargs):
        # Only the logged-out page may come from the shared cache. Everything
        # with a session (staff, Moodle official, team account) or a
        # remember-me cookie is rendered per visitor, so one visitor's
        # banner/buttons can never be stored and served to another.
        if (
            request.user.is_authenticated
            or request.session.get(MOODLE_LOGGED_IN_USER)
            or request.COOKIES.get(MOODLE_REMEMBER_COOKIE)
        ):
            return self._render(request, **kwargs)
        return cache_page(GAME_OFFICIALS_LIST_CACHE_SECONDS)(self._render)(
            request, **kwargs
        )

    def _render(self, request, **kwargs):
        restored = restore_moodle_session(request)
        if restored.official_id is not None:
            # Sliding ~2h session on the self-service pages.
            request.session.set_expiry(7200)
            request.session.modified = True
        year_str = kwargs.get("season", datetime.today().year)
        year = int(year_str) if year_str else None
        team_id = kwargs.get("pk")
        try:
            team_id = int(team_id) if team_id else None
        except ValueError:
            team_id = None
        game_officials = GameOfficial.objects.filter(
            gameinfo__gameday__date__year=year
        ).exclude(position="Scorecard Judge")
        if team_id:
            team = Team.objects.get(pk=team_id).description
            game_officials = game_officials.filter(
                Q(gameinfo__officials__pk=team_id, official=None)
                | Q(official__team__pk=team_id)
            )
            years = (
                GameOfficial.objects.filter(
                    Q(gameinfo__officials__pk=team_id, official=None)
                    | Q(official__team__pk=team_id)
                )
                .values_list("gameinfo__gameday__date__year", flat=True)
                .distinct()
            )
        else:
            years = (
                GameOfficial.objects.all()
                .values_list("gameinfo__gameday__date__year", flat=True)
                .distinct()
            )
            team = None
        acting = acting_official_id(request)
        acting_official = (
            Official.objects.filter(pk=acting).first() if acting is not None else None
        )
        mine = request.GET.get("mine") == "1" and acting_official is not None
        if mine:
            # Own mapped rows plus unassigned rows whose typed name looks like
            # this official. The name match is a Python-side best effort (see
            # name_matches_official), so the SQL side only narrows by pk.
            matching_open_ids = [
                row.pk
                for row in game_officials.filter(official__isnull=True).only(
                    "pk", "name"
                )
                if name_matches_official(row.name, acting_official)
            ]
            game_officials = game_officials.filter(
                Q(official_id=acting_official.pk) | Q(pk__in=matching_open_ids)
            )
        game_officials = game_officials.order_by("gameinfo__gameday__date")
        is_staff = request.user.is_staff
        team_name = request.user.username

        paginator = Paginator(game_officials, 1000)
        page = request.GET.get("page")
        try:
            game_officials_page = paginator.page(page)
        except PageNotAnInteger:
            game_officials_page = paginator.page(1)
        except EmptyPage:
            game_officials_page = paginator.page(paginator.num_pages)
        game_officials_object_list = game_officials_page.object_list.annotate(
            home=self._get_subquery(is_home=True),
            away=self._get_subquery(is_home=False),
        )
        from officials.urls import (
            OFFICIALS_GAME_OFFICIALS_APPEARANCE_FOR_TEAM_AND_YEAR,
            OFFICIALS_GAME_OFFICIALS_APPEARANCE_FOR_YEAR,
        )

        context = {
            "season": year,
            "team": team,
            "team_id": team_id,
            "years": sorted(years, reverse=True),
            "url_pattern": (
                OFFICIALS_GAME_OFFICIALS_APPEARANCE_FOR_TEAM_AND_YEAR
                if team_id
                else OFFICIALS_GAME_OFFICIALS_APPEARANCE_FOR_YEAR
            ),
            "pk": team_id,
            "object_list": self._rows_with_flags(
                game_officials_object_list,
                team_name=team_name,
                is_staff=is_staff,
                acting_official=acting_official,
            ),
            "mine_filter": mine,
            "claim_url_name": CLAIM_URL_NAME,
            "add_assignment_url": reverse(ADD_ASSIGNMENT_URL_NAME),
            "unassign_url_name": UNASSIGN_URL_NAME,
            "page_obj": game_officials_page,
        }
        context.update(selfservice_banner_context(request))
        response = render(request, self.template_name, context)
        if restored.cookie_value:
            _set_remember_cookie(response, restored.cookie_value)
        return response

    @staticmethod
    def _rows_with_flags(
        game_officials_object_list, *, team_name, is_staff, acting_official
    ):
        raw_rows = list(
            game_officials_object_list.values(
                *GameOfficialAllInfoSerializer.ALL_VALUE_FIELDS
            )
        )
        rows = GameOfficialAllInfoSerializer(
            instance=raw_rows,
            display_names_for_team=team_name,
            is_staff=is_staff,
            many=True,
        ).data
        for raw, row in zip(raw_rows, rows):
            row_official_id = int(row["official_id"]) if row["official_id"] else None
            row["is_own_row"] = (
                acting_official is not None and row_official_id == acting_official.pk
            )
            # The typed name, not the obfuscated display name: matching the
            # obfuscated one ("M****M****") could never equal a real name.
            row["is_own_open_row"] = (
                acting_official is not None
                and row_official_id is None
                and name_matches_official(raw["name"], acting_official)
            )
            if row["is_own_row"]:
                # The visitor's own row shows the name; every other row keeps
                # the obfuscated form.
                row["name"] = (
                    f"{row['official_first_name']} {row['official_last_name']}"
                )
        return rows

    # noinspection PyMethodMayBeStatic
    def _get_subquery(self, is_home: bool):
        return Subquery(
            Gameresult.objects.filter(
                gameinfo=OuterRef("gameinfo"), isHome=is_home
            ).values("team__description")[:1]
        )


class AddInternalGameOfficialUpdateView(LoginRequiredMixin, UserPassesTestMixin, View):
    form_class = AddInternalGameOfficialEntryForm
    template_name = "officials/internal_gameofficial_form.html"

    def get(self, request):
        return render(
            request, self.template_name, {"form": AddInternalGameOfficialEntryForm()}
        )

    def post(self, request):
        entry_lines = []
        current_line = []
        form = AddInternalGameOfficialEntryForm(request.POST)
        data = form.data.copy()
        all_lines = data.get("entries").splitlines()
        try:
            while all_lines:
                current_line = all_lines.pop(0)
                result = [x.strip() for x in current_line.split(",")]
                entry_lines.append(OfficialService.create_game_official_entry(result))
        except (TypeError, ValueError) as error:
            error_message = error.args[0]
            all_lines = [current_line] + all_lines
            if "positional arguments" in error_message:
                form.add_error(
                    "entries",
                    "Zu viele Einträge in der ersten Zeile! Maximal 3 erlaubt.",
                )
            else:
                form.add_error("entries", error_message)
        # noinspection PyUnresolvedReferences
        except Gameinfo.DoesNotExist:
            all_lines = [current_line] + all_lines
            form.add_error("entries", "gameinfo_id nicht gefunden!")
        except Official.DoesNotExist:
            all_lines = [current_line] + all_lines
            form.add_error("entries", "official_id nicht gefunden!")

        if form.is_valid():
            messages.success(
                self.request,
                format_html(
                    "Folgende Einträge erzeugt:<br>{}",
                    format_html_join("<br>", "{}", ((line,) for line in entry_lines)),
                ),
            )
        data["entries"] = "\n".join(all_lines)
        form.data = data
        return render(request, self.template_name, {"form": form})

    def test_func(self):
        return self.request.user.is_staff


EXTERNAL_MANUAL_ENTRY_FIELDS = (
    "official_id",
    "number_games",
    "date",
    "position",
    "association",
    "halftime_duration",
)


class AddExternalGameOfficialUpdateView(LoginRequiredMixin, UserPassesTestMixin, View):
    """Manual, no-upload fallback for the "außerhalb DFFL" branch -
    mirrors AddInternalGameOfficialUpdateView's line-per-entry, per-line
    error handling exactly. Builds a dict (not a positional tuple) since
    OfficialService.create_external_official_entry takes one, unlike
    create_game_official_entry's positional list."""

    form_class = AddExternalGameOfficialEntryForm
    template_name = "officials/external_gameofficial_form.html"

    def test_func(self):
        return self.request.user.is_staff

    def get(self, request):
        return render(request, self.template_name, {"form": self.form_class()})

    def post(self, request):
        entry_lines = []
        current_line = []
        form = self.form_class(request.POST)
        data = form.data.copy()
        all_lines = data.get("entries").splitlines()
        official_service = OfficialService()
        try:
            while all_lines:
                current_line = all_lines.pop(0)
                values = [x.strip() for x in current_line.split(",")]
                if len(values) != len(EXTERNAL_MANUAL_ENTRY_FIELDS):
                    raise TypeError(
                        f"Zeile muss genau {len(EXTERNAL_MANUAL_ENTRY_FIELDS)} "
                        "Werte haben!"
                    )
                entry_lines.append(
                    official_service.create_external_official_entry(
                        dict(zip(EXTERNAL_MANUAL_ENTRY_FIELDS, values))
                    )
                )
        except (TypeError, ValueError, UnknownAssociationError) as error:
            all_lines = [current_line] + all_lines
            form.add_error("entries", _entry_error_message(error))
        except Official.DoesNotExist:
            all_lines = [current_line] + all_lines
            form.add_error("entries", "official_id nicht gefunden!")

        if form.is_valid():
            messages.success(
                self.request,
                format_html(
                    "Folgende Einträge erzeugt:<br>{}",
                    format_html_join("<br>", "{}", ((line,) for line in entry_lines)),
                ),
            )
        data["entries"] = "\n".join(all_lines)
        form.data = data
        return render(request, self.template_name, {"form": form})


OFFICIALS_IMPORT_SESSION_KEY = "officials_import"


def _external_suggestion_to_initial(suggestion) -> dict:
    return {
        "row_number": suggestion.row_number,
        "status": suggestion.status,
        "reason": suggestion.reason,
        "include_default": suggestion.include_default,
        "official_id": suggestion.official_id,
        "official_display": suggestion.official_display,
        "number_games": suggestion.number_games,
        "date": suggestion.date.isoformat() if suggestion.date else None,
        "position": suggestion.position,
        "association": suggestion.association,
        "halftime_duration": suggestion.halftime_duration,
        "has_clockcontrol": suggestion.has_clockcontrol,
        "is_international": suggestion.is_international,
        "reporter_name": suggestion.reporter_name,
        "notification_date": (
            suggestion.notification_date.isoformat()
            if suggestion.notification_date
            else None
        ),
        "comment": suggestion.comment,
    }


def _internal_fix_suggestion_to_initial(suggestion) -> dict:
    return {
        "row_number": suggestion.row_number,
        "status": suggestion.status,
        "reason": suggestion.reason,
        "action": suggestion.action,
        "current_official_display": suggestion.current_official_display,
        "include_default": suggestion.include_default,
        "gameinfo_id": suggestion.gameinfo_id,
        "official_id": suggestion.official_id,
        "official_display": suggestion.official_display,
        "position": suggestion.position,
    }


def _entry_error_message(error: Exception) -> str:
    """Maps the exceptions ExternalGameOfficialEntry/
    GameOfficialCorrectionEntry.save() can raise to a per-row message,
    mirroring AddInternalGameOfficialUpdateView's existing (gameinfo_id
    nicht gefunden! / official_id nicht gefunden!) conventions so both
    entry points read consistently to staff."""
    if isinstance(error, Gameinfo.DoesNotExist):
        return "gameinfo_id nicht gefunden!"
    if isinstance(error, Official.DoesNotExist):
        return "official_id nicht gefunden!"
    if isinstance(error, UnknownAssociationError):
        return "Unbekannter Verband - Zeile nicht importiert"
    if isinstance(error, DatabaseError):
        # Real production data has rows a model field can't hold as-is
        # (e.g. a free-text comment longer than 100 chars) - surfaced as
        # a per-row failure like any other, not a 500 that aborts the
        # whole batch. The driver's own text names schema internals
        # ("Data too long for column ..."), so ``_commit`` logs it with
        # the row number instead; the response stays generic (CWE-209).
        return "Datenbankfehler - Zeile vermutlich zu lang für ein Feld"
    if error.args:
        return str(error.args[0])
    return str(error)


class GameOfficialImportUploadView(LoginRequiredMixin, UserPassesTestMixin, View):
    """Step 1 of the officials self-report import: staff drop a .csv/.xlsx
    export of the Google Sheet. POST is called via fetch() (see the
    template's JS) so the browser can show a spinner while the file is
    parsed and classified, then render the result as a client-side
    stepper/tabs/pagination UI - GameOfficialImportConfirmView only ever
    sees which row_numbers ended up selected, never the classification
    itself, which stays server-authoritative in the session."""

    form_class = GameOfficialImportUploadForm
    template_name = "officials/gameofficial_import_upload.html"

    def test_func(self):
        return self.request.user.is_staff

    def get(self, request):
        return render(request, self.template_name, {"form": self.form_class()})

    def post(self, request):
        form = self.form_class(request.POST, request.FILES)
        if not form.is_valid():
            return JsonResponse({"errors": form.errors}, status=400)
        try:
            dataframe = parse_uploaded_file(form.cleaned_data["file"])
            result = build_import_result(dataframe)
        except ImportColumnError as error:
            logger.warning("Game official import rejected: %s", error)
            return JsonResponse(
                {"errors": {"file": ["Die Datei konnte nicht verarbeitet werden."]}},
                status=400,
            )

        external_items = [
            _external_suggestion_to_initial(suggestion)
            for suggestion in result.external
        ]
        internal_items = [
            _internal_fix_suggestion_to_initial(suggestion)
            for suggestion in result.internal_fix
        ]
        unclassified = [
            {"row_number": row.row_number, "reason": row.reason}
            for row in result.unclassified
        ]
        request.session[OFFICIALS_IMPORT_SESSION_KEY] = {
            "external": external_items,
            "internal_fix": internal_items,
            "unclassified": unclassified,
        }
        return JsonResponse(
            {
                "external": _group_by_status(external_items),
                "internal_fix": _group_by_status(internal_items),
                "unclassified": unclassified,
            }
        )


# Maps a suggestion's server-computed status onto the client's 3 tabs.
# "duplicate" only ever occurs on the external branch (see
# ExternalGameSuggestion/InternalFixSuggestion in game_official_import.py) -
# an internal-fix row simply never lands in that group.
STATUS_TO_GROUP = {
    "ready": "new",
    "duplicate": "duplicate",
    "needs_attention": "conflict",
}

# Bulk-committing thousands of selected rows can produce a handful of
# per-row failures (e.g. a stale Official deleted since parse time) - cap
# how many reasons get spelled out in the summary message so that a
# pathological file can't turn the message itself into another
# unbounded-size response.
IMPORT_ERROR_MESSAGE_LIMIT = 20


def _group_by_status(items: list) -> dict:
    """Buckets a branch's stored suggestion dicts into the 3 client tabs
    by their server-computed status - the client only ever uses this for
    display/selection-default purposes, never to decide what's trusted;
    GameOfficialImportConfirmView re-validates every selected row from
    scratch regardless of which tab it came from."""
    groups = {"new": [], "duplicate": [], "conflict": []}
    for item in items:
        group = STATUS_TO_GROUP.get(item.get("status"), "conflict")
        groups[group].append({k: v for k, v in item.items() if k != "status"})
    return groups


def _external_row_data(item: dict) -> dict:
    """Rebuilds the ExternalGameOfficialEntry kwargs from a stored
    suggestion dict (whose date/notification_date are ISO strings, see
    _external_suggestion_to_initial)."""
    return {
        "official_id": item.get("official_id"),
        "number_games": item.get("number_games"),
        "date": _parse_iso_date(item.get("date")),
        "position": item.get("position"),
        "association": item.get("association") or "",
        "halftime_duration": item.get("halftime_duration"),
        "has_clockcontrol": bool(item.get("has_clockcontrol")),
        "is_international": bool(item.get("is_international")),
        "reporter_name": item.get("reporter_name") or "",
        "notification_date": _parse_iso_date(item.get("notification_date")),
        "comment": item.get("comment") or "",
    }


def _internal_row_data(item: dict) -> dict:
    """GameOfficialCorrectionEntry kwargs from a stored internal-fix
    suggestion dict - see _external_row_data()'s docstring."""
    return {
        "gameinfo_id": item.get("gameinfo_id"),
        "official_id": item.get("official_id"),
        "position": item.get("position"),
    }


def _parse_iso_date(value):
    return date.fromisoformat(value) if value else None


def _selected_ids(request, field_name) -> set:
    """Reads a comma-joined string of row_numbers from a single POST
    field, not one field per row_number - a real import can have
    thousands of rows selected at once (see the template's JS), and one
    hidden <input> per row hit Django's DATA_UPLOAD_MAX_NUMBER_FIELDS
    ceiling well before that, exactly the same class of hard limit the
    original per-row formset rendering hit."""
    raw = request.POST.get(field_name, "")
    return {int(value) for value in raw.split(",") if value.strip().isdigit()}


class GameOfficialImportConfirmView(LoginRequiredMixin, UserPassesTestMixin, View):
    """Step 2: commits whichever row_numbers the client-side stepper/tabs
    UI ended up with selected (see gameofficial_import_upload.html's JS) -
    regardless of which tab (new/duplicate/conflict) a row started in,
    since that classification only ever drove the *default* checkbox
    state, not what's trusted. Every selected row is validated and saved
    from scratch via ExternalGameOfficialEntry/GameOfficialCorrectionEntry,
    never from the upload-time status/reason, so staleness between upload
    and confirm (an Official deleted, a second GameOfficial added, ...)
    surfaces as a per-row error instead of a stale write or a crash."""

    def test_func(self):
        return self.request.user.is_staff

    def get(self, request):
        from officials.urls import OFFICIALS_GAMEOFFICIAL_IMPORT_UPLOAD

        return redirect(reverse(OFFICIALS_GAMEOFFICIAL_IMPORT_UPLOAD))

    def post(self, request):
        session_data = request.session.get(OFFICIALS_IMPORT_SESSION_KEY, {})
        selected_external = _selected_ids(request, "external_rows")
        selected_internal = _selected_ids(request, "internal_rows")

        official_service = OfficialService()
        external_created, external_errors = self._commit(
            [
                item
                for item in session_data.get("external", [])
                if item.get("row_number") in selected_external
            ],
            official_service.create_external_official_entry,
            _external_row_data,
        )
        internal_created, internal_errors = self._commit(
            [
                item
                for item in session_data.get("internal_fix", [])
                if item.get("row_number") in selected_internal
            ],
            official_service.create_internal_fix_entry,
            _internal_row_data,
        )

        request.session.pop(OFFICIALS_IMPORT_SESSION_KEY, None)
        if request.headers.get("X-Requested-With") == "XMLHttpRequest":
            # The review UI keeps the reviewed rows client-side and marks
            # each one with its own outcome in place (see the template's
            # JS) - answering with per-row results instead of a redirect
            # means staff actually see what the confirm did, rather than
            # only a transient toast on an otherwise empty upload page.
            return JsonResponse(
                {
                    "external": {
                        "created": external_created,
                        "errors": external_errors,
                    },
                    "internal_fix": {
                        "created": internal_created,
                        "errors": internal_errors,
                    },
                    "summary": {
                        "external_created": len(external_created),
                        "internal_created": len(internal_created),
                        "error_count": len(external_errors) + len(internal_errors),
                    },
                }
            )

        self._report_results(
            request,
            external_created_count=len(external_created),
            internal_created_count=len(internal_created),
            errors=[
                f"Zeile {entry['row_number']}: {entry['message']}"
                for entry in external_errors + internal_errors
            ],
        )
        from officials.urls import OFFICIALS_GAMEOFFICIAL_IMPORT_UPLOAD

        return redirect(reverse(OFFICIALS_GAMEOFFICIAL_IMPORT_UPLOAD))

    @staticmethod
    def _commit(items, save_entry, build_row_data) -> tuple:
        """Saves every selected row's entry from scratch, isolating each
        failure (e.g. an Official deleted since upload time) in its own
        try/except and collecting it as a {row_number, message} result
        instead of aborting the rest of the batch. Row numbers let the
        AJAX response attach each outcome to the row it belongs to."""
        created = []
        errors = []
        for item in items:
            row_number = item.get("row_number")
            try:
                created.append(
                    {
                        "row_number": row_number,
                        "message": save_entry(build_row_data(item)),
                    }
                )
            except (
                TypeError,
                ValueError,
                Gameinfo.DoesNotExist,
                Official.DoesNotExist,
                AmbiguousGameOfficialError,
                UnknownAssociationError,
                DatabaseError,
            ) as error:
                if isinstance(error, DatabaseError):
                    logger.warning(
                        "Game official import row %s hit a database error",
                        row_number,
                        exc_info=error,
                    )
                errors.append(
                    {
                        "row_number": row_number,
                        "message": _entry_error_message(error),
                    }
                )
        return created, errors

    @staticmethod
    def _report_results(
        request, external_created_count, internal_created_count, errors
    ) -> None:
        """Reports the outcome as counts, not one message line per created
        row - a bulk import can create thousands of rows, and joining a
        line per row (the AddInternalGameOfficialUpdateView-style pattern
        used for small manual batches) would just recreate an
        unbounded-size response in the success message itself."""
        summary = (
            f"{external_created_count} externe Einsätze erstellt, "
            f"{internal_created_count} Korrekturen angewendet, "
            f"{len(errors)} Fehler."
        )
        if not errors:
            messages.success(request, summary)
            return
        capped = errors[:IMPORT_ERROR_MESSAGE_LIMIT]
        remaining = len(errors) - len(capped)
        detail = format_html_join("; ", "{}", ((line,) for line in capped))
        if remaining > 0:
            detail = format_html("{} (und {} weitere)", detail, remaining)
        messages.warning(request, format_html("{}<br>{}", summary, detail))


class LicenseCheckForOfficials(LoginRequiredMixin, UserPassesTestMixin, View):
    template_name = "officials/license_check.html"

    def get(self, request, *args, **kwargs):
        course_id = kwargs.get("course_id")
        official_service = OfficialService()
        from officials.urls import OFFICIALS_PROFILE_GAMELIST

        officials_list, course = official_service.get_game_count_for_license(course_id)
        license_id = course.get_license_id()
        context = {
            "license_requirements": LicenseStrategy.COURSE_MAPPING(license_id),
            "license_id": license_id,
            "course_date": course.get_date(),
            "year_before_course_date": course.get_date() - timedelta(days=365),
            "profile_url": OFFICIALS_PROFILE_GAMELIST,
            "officials_list": officials_list,
        }
        return render(request, self.template_name, context)

    def test_func(self):
        return self.request.user.is_staff or self.request.user.username == "offd"


class MoodleReportView(LoginRequiredMixin, UserPassesTestMixin, View):
    template_name = "officials/moodle_report.html"

    def get(self, request, *args, **kwargs):
        course_ids = request.GET.get("ids")
        ignore_year_raw = request.GET.get("ignoreYear", "false").lower()
        ignore_year = ignore_year_raw == "true"
        moodle_service = MoodleService()
        result = moodle_service.update_licenses(course_ids, ignore_year)
        context = {"time": result[1], "result": json.dumps(result[0], indent=4)}
        return render(request, self.template_name, context)

    def test_func(self):
        return self.request.user.is_staff or self.request.user.username == "offd"


class OfficialProfileLicenseView(View):
    template_name = "officials/profile_license.html"

    def get(self, request, *args, **kwargs):
        license_id = kwargs.get("pk")
        official = Official.objects.get(id=license_id)
        return render(
            request,
            self.template_name,
            {
                "official_info": OfficialSerializer(
                    instance=official, is_staff=self.request.user.is_staff
                ).data
            },
        )


class OfficialProfileGamelistView(View):
    template_name = "officials/profile_gamelist.html"

    def get(self, request, *args, **kwargs):
        restored = restore_moodle_session(request)
        if restored.official_id is not None:
            request.session.set_expiry(7200)
            request.session.modified = True
        year = datetime.today().year
        season = kwargs.get("season", year)
        license_id = kwargs.get("pk")
        official = Official.objects.get(id=license_id)
        official_info = OfficialGamelistSerializer(
            instance=official,
            season=season,
            is_staff=PermissionHelper.has_staff_or_user_permission(
                request, official.team.pk
            ),
        ).data
        from officials.urls import OFFICIALS_PROFILE_GAMELIST

        context = {
            "url_pattern": OFFICIALS_PROFILE_GAMELIST,
            "pk": license_id,
            "team_id": official.team_id,
            "current_year": year,
            "years": official.gameofficial_set.all()
            .values_list("gameinfo__gameday__date__year", flat=True)
            .order_by("-gameinfo__gameday__date__year")
            .distinct(),
            "season": season,
            "official_info": official_info,
            "needed_games_for_license": 4
            - (
                official_info["external_games"]["number_games"]
                + official_info["dffl_games"]["number_games"]
            ),
        }
        context.update(selfservice_banner_context(request, official))
        context["can_edit_profile"] = can_edit_official(request, official.pk)
        response = render(request, self.template_name, context)
        if restored.cookie_value:
            _set_remember_cookie(response, restored.cookie_value)
        return response


class OfficialAssociationListView(View):
    template_name = "officials/association_list.html"

    def get(self, request, *args, **kwargs):
        association_abbreviation = kwargs.get("abbr")
        year = datetime.today().year
        valid_licenses = OfficialLicenseHistory.objects.filter(
            created_at__gt=f"{year - 1}-04-01"
        ).exclude(license__id=4)
        officials_with_valid_licenses = valid_licenses.values("official").distinct()
        official_list = (
            Official.objects.filter(
                Q(
                    id__in=officials_with_valid_licenses,
                    team__association__abbr=association_abbreviation,
                )
                | Q(
                    id__in=officials_with_valid_licenses,
                    team=Official.OHNE_TEAM_ID,
                    association__abbr=association_abbreviation,
                )
            )
            .select_related("team__association", "association")
            .prefetch_related(prefetch_official_license_history())
            .order_by("team__description", "last_name")
        )
        return render(
            request,
            self.template_name,
            {
                "association": association_abbreviation,
                "result": OfficialSerializer(
                    instance=official_list,
                    is_staff=self.is_user_allowed_to_see_official_names(
                        association_abbreviation
                    ),
                    fetch_email=True,
                    many=True,
                ).data,
            },
        )

    def is_user_allowed_to_see_official_names(self, association):
        if self.request.user.is_staff:
            return True
        return self.request.user.username == association


class MoodleLoginView(View):
    template_name = "officials/signup/moodle_login.html"
    form_class = MoodleLoginForm

    def get(self, request, *args, **kwargs):
        return render(
            request,
            self.template_name,
            {"form": MoodleLoginForm(initial={"next": request.GET.get("next", "")})},
        )

    def post(self, request, *args, **kwargs):
        form = MoodleLoginForm(request.POST)
        try:
            if form.is_valid():
                username = form.cleaned_data["username"]
                password = form.cleaned_data["password"]
                moodle_service = MoodleService()
                official_id = moodle_service.login(username, password)
                request.session[MOODLE_LOGGED_IN_USER] = official_id

                response = redirect(safe_next(request))
                if form.cleaned_data.get("remember_me"):
                    _set_remember_cookie(response, RememberMeService.issue(official_id))
                return response
        except MoodleApiException as error:
            form.add_error("", f"{error}")
        except Official.DoesNotExist:
            form.add_error("", NO_OFFICIAL_FOR_MOODLE_USER)
        return render(request, self.template_name, {"form": form})


class OfficialSignUpListView(View):
    template_name = "officials/signup/sign_up_list.html"

    def get(self, request, *args, **kwargs):
        from officials.urls import OFFICIALS_MOODLE_LOGIN

        official_id = request.session.get(MOODLE_LOGGED_IN_USER)
        restored_cookie = None
        if official_id is None:
            restored = restore_moodle_session(request)
            if restored.official_id is not None:
                official_id = restored.official_id
                restored_cookie = restored.cookie_value
            else:
                response = redirect(reverse(OFFICIALS_MOODLE_LOGIN))
                if restored.matched:
                    _delete_remember_cookie(response)
                return response
        if settings.DEBUG:
            request.session.set_expiry(600000)
        else:
            request.session.set_expiry(600)
        league = request.GET.get("league")
        from officials.urls import (
            OFFICIALS_SIGN_UP_FOR_GAMEDAY,
            OFFICIALS_PROFILE_LICENSE,
            OFFICIALS_SIGN_UP_LIST,
            OFFICIALS_SIGN_UP_CANCEL_FOR_GAMEDAY,
        )

        context = {
            **OfficialSignupService.get_signup_data(official_id, league),
            "official_id": official_id,
            "url_pattern_gameday": LEAGUE_GAMEDAY_DETAIL,
            "url_pattern_signup": OFFICIALS_SIGN_UP_FOR_GAMEDAY,
            "url_pattern_signup_list": OFFICIALS_SIGN_UP_LIST,
            "url_pattern_official": OFFICIALS_PROFILE_LICENSE,
            "url_pattern_signup_cancel": OFFICIALS_SIGN_UP_CANCEL_FOR_GAMEDAY,
        }
        response = render(request, self.template_name, context)
        if restored_cookie:
            _set_remember_cookie(response, restored_cookie)
        return response


class OfficialSignOutView(View):
    def get(self, request, *args, **kwargs):
        RememberMeService.revoke(request.COOKIES.get(MOODLE_REMEMBER_COOKIE))
        request.session.pop(MOODLE_LOGGED_IN_USER, None)
        messages.success(request, "Du wurdest abgemeldet.")

        from officials.urls import OFFICIALS_MOODLE_LOGIN

        response = redirect(reverse(OFFICIALS_MOODLE_LOGIN))
        _delete_remember_cookie(response)
        return response


class CheckMoodleSessionMixin:
    def get_official_id(self, request):
        official_id = request.session.get(MOODLE_LOGGED_IN_USER)
        if official_id is None:
            messages.error(
                request,
                "Die Session der Moodle-Anmeldung ist ausgelaufen. Bitte erneut anmelden.",
            )
            from officials.urls import OFFICIALS_MOODLE_LOGIN

            return redirect(reverse(OFFICIALS_MOODLE_LOGIN))
        return official_id


class OfficialSignUpView(CheckMoodleSessionMixin, View):
    def get(self, request, **kwargs):
        gameday_id = kwargs.get("gameday")
        official_id = self.get_official_id(request)
        if isinstance(official_id, HttpResponse):
            # redirect to login page
            return official_id
        try:
            OfficialSignupService.create_signup(
                gameday_id=gameday_id, official_id=official_id
            )
        except DuplicateSignupError as exception:
            messages.error(
                request, f"Du bist bereits für den Spieltag gemeldet: {exception}"
            )
        except MaxSignupError as exception:
            messages.error(request, f"{exception}")
        from officials.urls import OFFICIALS_SIGN_UP_LIST

        return redirect(reverse(OFFICIALS_SIGN_UP_LIST))


class OfficialSignUpCancelView(CheckMoodleSessionMixin, View):
    def get(self, request, **kwargs):
        gameday_id = kwargs.get("gameday")
        official_id = self.get_official_id(request)
        if isinstance(official_id, HttpResponse):
            # redirect to login page
            return official_id
        OfficialSignupService.cancel_signup(
            gameday_id=gameday_id, official_id=official_id
        )
        from officials.urls import OFFICIALS_SIGN_UP_LIST

        return redirect(reverse(OFFICIALS_SIGN_UP_LIST))
