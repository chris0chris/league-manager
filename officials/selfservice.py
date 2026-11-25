"""Self-service access rules for officials.

One gate decides who may write: staff, or the official the Moodle session is
logged in as. Moodle users are always fixed to their own ``Official`` row - a
posted ``official_id`` is ignored for them - so a crafted form cannot write to
another official's data. Every write view added on top of this mixin inherits
that rule instead of repeating it.
"""

import re
from datetime import date, datetime
from urllib.parse import urlencode, urlsplit

from django.conf import settings
from django.contrib import messages
from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.views import View

from gamedays.models import GameOfficial
from officials.constants import (
    MOODLE_LOGGED_IN_USER,
    MOODLE_REMEMBER_COOKIE,
    REMEMBER_COOKIE_PATH,
)
from officials.forms_selfservice import (
    AddAssignmentForm,
    ExternalGameForm,
    ExternalGameFormSet,
)
from officials.models import Official, OfficialExternalGames
from officials.service.remember_me import (
    REMEMBER_ME_MAX_AGE,
    RememberMeService,
    RestoreResult,
)


def set_remember_cookie(response, value) -> None:
    """Issue/rotate the remember-me cookie. Lives here so both the list views
    (via ``views.py``) and this module's gate can set it."""
    response.set_cookie(
        MOODLE_REMEMBER_COOKIE,
        value,
        max_age=int(REMEMBER_ME_MAX_AGE.total_seconds()),
        httponly=True,
        secure=not settings.DEBUG,
        samesite="Lax",
        path=REMEMBER_COOKIE_PATH,
    )


def delete_remember_cookie(response) -> None:
    response.delete_cookie(MOODLE_REMEMBER_COOKIE, path=REMEMBER_COOKIE_PATH)


RECLAIM_ERROR = "Dieser Eintrag wurde bereits zugeordnet."


def acting_official_id(request) -> int | None:
    """The Official the Moodle session is logged in as, if any."""
    return request.session.get(MOODLE_LOGGED_IN_USER)


def _tokens(value: str | None) -> set:
    return {
        token.casefold()
        for token in re.split(r"[^\w]+|_", value or "")
        if token.strip()
    }


def name_matches_official(name: str | None, official: Official) -> bool:
    """Best-effort: does a typed ``?`` row name look like this official?

    Casefolded, punctuation-split token comparison in either direction, so
    "Mustermann, Max" as well as a bare "Mustermann" matches "Max Mustermann".
    Used for highlighting and the "Nur meine Einträge" filter only - never for
    authorization, because a typed name proves nothing.
    """
    if not name:
        return False
    official_tokens = _tokens(f"{official.first_name} {official.last_name}")
    row_tokens = _tokens(name)
    if not official_tokens or not row_tokens:
        return False
    return official_tokens <= row_tokens or row_tokens <= official_tokens


def can_edit_official(request, official_id: int) -> bool:
    """Staff may edit anyone; a Moodle user only their own row.

    Team accounts (a Django user named after a team) get read access through
    the name-revealing serializers but no write access, so they fall through
    to False here.
    """
    if request.user.is_authenticated and request.user.is_staff:
        return True
    return acting_official_id(request) == official_id


def restore_moodle_session(request) -> RestoreResult:
    """Put the remembered official back into the session.

    Returns the restore result so the caller can rotate the cookie (or drop a
    cookie that no longer matches) exactly like the sign-up list does.
    """
    session_official_id = acting_official_id(request)
    if session_official_id is not None:
        return RestoreResult(
            official_id=session_official_id, cookie_value=None, matched=True
        )
    result = RememberMeService.restore(request.COOKIES.get(MOODLE_REMEMBER_COOKIE))
    if result.official_id is not None:
        request.session[MOODLE_LOGGED_IN_USER] = result.official_id
    return result


def safe_next(request, default: str | None = None) -> str:
    """The ``next`` target if it is a page inside ``/officials/``, else the
    sign-up list.

    Anything absolute (``https://…``, protocol-relative ``//host``) or outside
    the app (``/admin/``) is discarded, so the login page cannot be used as an
    open redirect.
    """
    fallback = default or reverse("view-officials-sign-up-list")
    target = (request.POST.get("next") or request.GET.get("next") or "").strip()
    if not target.startswith("/officials/") or target.startswith("//"):
        return fallback
    parsed = urlsplit(target)
    if parsed.scheme or parsed.netloc:
        return fallback
    return target


def login_url_for(request) -> str:
    """The Moodle login URL, remembering the page the visitor came from."""
    query = urlencode({"next": request.get_full_path()})
    return f"{reverse('view-officials-moodle-login')}?{query}"


def selfservice_banner_context(request, official: Official | None = None) -> dict:
    """Banner data for the two list pages (login button / logged-in state)."""
    moodle_official_id = acting_official_id(request)
    acting_name = None
    if request.user.is_authenticated and request.user.is_staff:
        acting_name = request.user.username
    elif moodle_official_id is not None:
        official = official or Official.objects.filter(pk=moodle_official_id).first()
        if official is not None:
            acting_name = f"{official.first_name} {official.last_name}"
    return {
        "moodle_official_id": moodle_official_id,
        "is_staff": request.user.is_staff,
        "acting_name": acting_name,
        "login_url": login_url_for(request),
        "logout_url": reverse("view-officials-sign-out"),
    }


class SelfServiceWriteMixin:
    """Gate every self-service write: staff, or a Moodle-logged-in official.

    Anonymous visitors - and team accounts, which only ever had read access -
    are sent to the Moodle login with ``?next=`` pointing back here. Set
    ``staff_only = True`` on a view that even a logged-in official may not use.
    """

    staff_only = False

    def dispatch(self, request, *args, **kwargs):
        if request.user.is_authenticated and request.user.is_staff:
            return super().dispatch(request, *args, **kwargs)
        restored = RestoreResult(official_id=None, cookie_value=None, matched=False)
        if acting_official_id(request) is None:
            restored = restore_moodle_session(request)
            if restored.official_id is not None:
                request.session[MOODLE_LOGGED_IN_USER] = restored.official_id
        if acting_official_id(request) is None:
            response = redirect(login_url_for(request))
        elif self.staff_only:
            messages.error(request, "Nur Staff kann diese Aktion ausführen.")
            response = redirect(assignments_return_url(request))
        else:
            response = super().dispatch(request, *args, **kwargs)
        if restored.cookie_value:
            # The restore already rotated the token server-side; hand the new
            # value back or the browser keeps a validator that no longer matches.
            set_remember_cookie(response, restored.cookie_value)
        return response

    def target_official(self, request) -> Official:
        """The official a write applies to.

        Moodle users are pinned to themselves no matter what the form posted;
        staff choose the target explicitly and get ``Official.DoesNotExist``
        when the posted id is missing or unusable, which the calling view turns
        into a form error.
        """
        if not (request.user.is_authenticated and request.user.is_staff):
            return Official.objects.get(pk=acting_official_id(request))
        raw_id = (request.POST.get("official_id") or "").strip()
        try:
            return Official.objects.get(pk=int(raw_id))
        except (TypeError, ValueError) as error:
            raise Official.DoesNotExist(
                "official_id fehlt oder ist ungültig"
            ) from error


CLAIM_URL_NAME = "view-officials-selfservice-claim"
ASSIGNMENTS_URL_NAME = "view-officials-game-officials-appearance"


def assignments_return_url(request) -> str:
    """Where a write started: the ``next`` passed along, else the list."""
    return safe_next(request, default=reverse(ASSIGNMENTS_URL_NAME))


def can_reclaim_official(request, row: GameOfficial, target: Official) -> bool:
    """May ``target`` take over an already-mapped row?

    For a Moodle official only when the typed scorecard name looks like them;
    otherwise this would be an open IDOR on other people's assignments. Staff
    may reassign anyone's row explicitly.
    """
    if request.user.is_authenticated and request.user.is_staff:
        return True
    return name_matches_official(row.name, target)


class ClaimGameOfficialView(SelfServiceWriteMixin, View):
    """Claim an unassigned ``?`` row - or take over a mapped row whose typed
    name matches the Moodle official (staff: any row, any official).

    Unassigned rows use ``UPDATE … WHERE official IS NULL`` so two concurrent
    claims have exactly one winner; mapped rows are updated conditionally on
    their old official id. The typed name is never changed.
    """

    template_name = "officials/selfservice/claim_confirm.html"

    def get(self, request, pk):
        row = get_object_or_404(GameOfficial, pk=pk)
        target = self._target_or_error(request)
        return render(
            request,
            self.template_name,
            self._context(
                request,
                row,
                can_reclaim=target is not None
                and (
                    row.official_id is None
                    or can_reclaim_official(request, row, target)
                ),
            ),
        )

    def post(self, request, pk):
        row = get_object_or_404(GameOfficial, pk=pk)
        target = self._target_or_error(request)
        if target is None:
            return redirect(request.get_full_path())
        is_mapped = row.official_id is not None
        if is_mapped and not can_reclaim_official(request, row, target):
            messages.error(
                request,
                "Dieser Eintrag ist einer anderen Person zugeordnet. "
                "Bitte wende dich an Staff.",
            )
            return redirect(assignments_return_url(request))

        if is_mapped:
            # Conditional on the old id: a concurrent change makes this
            # write a no-op instead of silently stealing the row.
            claimed = GameOfficial.objects.filter(
                pk=row.pk, official_id=row.official_id
            ).update(official=target)
        else:
            claimed = GameOfficial.objects.filter(
                pk=row.pk, official__isnull=True
            ).update(official=target)
        if claimed:
            messages.success(
                request,
                f"Einsatz für {target.first_name} {target.last_name} zugeordnet.",
            )
        else:
            messages.error(request, RECLAIM_ERROR)
        return redirect(assignments_return_url(request))

    def _target_or_error(self, request):
        try:
            return self.target_official(request)
        except Official.DoesNotExist:
            messages.error(request, "Bitte eine Offizielle-ID angeben.")
            return None

    def _context(self, request, row, can_reclaim=True):
        game = row.gameinfo
        return {
            "row": row,
            "game": game,
            "home": game.gameresult_set.filter(isHome=True)
            .values_list("team__description", flat=True)
            .first(),
            "away": game.gameresult_set.filter(isHome=False)
            .values_list("team__description", flat=True)
            .first(),
            "is_mapped": row.official_id is not None,
            "can_reclaim": can_reclaim,
            **selfservice_banner_context(request),
        }


ADD_ASSIGNMENT_URL_NAME = "view-officials-selfservice-add-assignment"
UNASSIGN_URL_NAME = "view-officials-selfservice-unassign"


def _form_error_message(form) -> str:
    """First field error with its label, so the message names the field."""
    for field_name, messages in form.errors.items():
        label = (
            form.fields[field_name].label if field_name in form.fields else field_name
        )
        return f"{label}: {messages[0]}".strip()
    return "Bitte Eingaben prüfen."


class AddAssignmentView(SelfServiceWriteMixin, View):
    """Put oneself (staff: any official) on a game that has no entry yet."""

    template_name = "officials/selfservice/add_assignment.html"

    def get(self, request):
        gameday_id = request.GET.get("gameday") or None
        form = AddAssignmentForm(season=datetime.today().year, gameday_id=gameday_id)
        return render(
            request, self.template_name, self._context(request, form, gameday_id)
        )

    def post(self, request):
        form = AddAssignmentForm(
            request.POST,
            season=datetime.today().year,
            gameday_id=request.POST.get("gameday") or None,
        )
        if not form.is_valid():
            messages.error(request, _form_error_message(form))
            return render(
                request,
                self.template_name,
                self._context(request, form, request.POST.get("gameday")),
            )

        gameinfo = form.cleaned_data["gameinfo"]
        position = form.cleaned_data["position"]
        try:
            target = self.target_official(request)
        except Official.DoesNotExist:
            messages.error(request, "Bitte eine Offizielle-ID angeben.")
            return render(
                request,
                self.template_name,
                self._context(request, form, request.POST.get("gameday")),
            )

        if GameOfficial.objects.filter(gameinfo=gameinfo, official=target).exists():
            messages.error(
                request, "Für dieses Spiel ist bereits ein Einsatz eingetragen."
            )
            return render(
                request,
                self.template_name,
                self._context(request, form, request.POST.get("gameday")),
            )
        if GameOfficial.objects.filter(gameinfo=gameinfo, position=position).exists():
            messages.error(
                request,
                "Diese Position ist bereits besetzt. "
                'Bitte übernimm den vorhandenen Eintrag über "Mir zuordnen".',
            )
            return render(
                request,
                self.template_name,
                self._context(request, form, request.POST.get("gameday")),
            )

        GameOfficial.objects.create(
            gameinfo=gameinfo, official=target, position=position
        )
        messages.success(
            request,
            f"Einsatz als {position} für {target.first_name} {target.last_name} nachgetragen.",
        )
        return redirect(assignments_return_url(request))

    def _context(self, request, form, gameday_id):
        return {
            "form": form,
            "gameday_id": gameday_id,
            **selfservice_banner_context(request),
        }


class UnassignGameOfficialView(SelfServiceWriteMixin, View):
    """Staff-only: clear the official of a row, keeping the typed name."""

    template_name = "officials/selfservice/unassign_confirm.html"
    staff_only = True

    def get(self, request, pk):
        row = get_object_or_404(GameOfficial, pk=pk)
        game = row.gameinfo
        return render(
            request,
            self.template_name,
            {
                "row": row,
                "home": game.gameresult_set.filter(isHome=True)
                .values_list("team__description", flat=True)
                .first(),
                "away": game.gameresult_set.filter(isHome=False)
                .values_list("team__description", flat=True)
                .first(),
                **selfservice_banner_context(request),
            },
        )

    def post(self, request, pk):
        row = get_object_or_404(GameOfficial, pk=pk)
        GameOfficial.objects.filter(pk=row.pk).update(official=None)
        messages.success(request, "Zuordnung aufgehoben - der Name bleibt erhalten.")
        return redirect(assignments_return_url(request))


EXTERNAL_EDIT_URL_NAME = "view-officials-selfservice-external-edit"
EXTERNAL_DELETE_URL_NAME = "view-officials-selfservice-external-delete"


def profile_gamelist_url(official: Official, season: int) -> str:
    return reverse(
        "view-officials-profile-gamelist",
        kwargs={"pk": official.pk, "season": season},
    )


class _ExternalEntryMixin(SelfServiceWriteMixin):
    """Shared lookup for the external-game write views: the owner or staff."""

    def get_entry(self, request, pk) -> OfficialExternalGames:
        entry = get_object_or_404(
            OfficialExternalGames.objects.select_related("official", "association"),
            pk=pk,
        )
        if not can_edit_official(request, entry.official_id):
            raise PermissionDenied("Dieser Eintrag gehört einer anderen Person.")
        return entry


class ExternalGameEditView(_ExternalEntryMixin, View):
    """Edit one external game. Owners see the subset of fields they may change;
    staff additionally get the official, the notification date and the
    reporter name."""

    template_name = "officials/selfservice/external_form.html"

    def get(self, request, pk):
        entry = self.get_entry(request, pk)
        return self._render(
            request,
            entry,
            ExternalGameForm(instance=entry, staff=request.user.is_staff),
        )

    def post(self, request, pk):
        entry = self.get_entry(request, pk)
        form = ExternalGameForm(
            request.POST, instance=entry, staff=request.user.is_staff
        )
        if form.is_valid():
            self._apply_staff_target(request, form)
        if form.errors:
            return self._render(request, entry, form)

        entry = form.save()
        if request.user.is_staff and form.cleaned_data.get("official_id"):
            entry.official_id = form.cleaned_data["official_id"]
            entry.save(update_fields=["official"])
        messages.success(request, "Eintrag gespeichert.")
        return redirect(profile_gamelist_url(entry.official, entry.date.year))

    @staticmethod
    def _apply_staff_target(request, form) -> None:
        posted_id = form.cleaned_data.get("official_id")
        if not posted_id:
            return
        if not Official.objects.filter(pk=posted_id).exists():
            form.add_error("official_id", "Offizielle-ID nicht gefunden.")

    def _render(self, request, entry, form):
        return render(
            request,
            self.template_name,
            {
                "form": form,
                "entry": entry,
                **selfservice_banner_context(request),
            },
        )


class ExternalGameDeleteView(_ExternalEntryMixin, View):
    """Hard-delete one external game (confirm first; no soft delete)."""

    template_name = "officials/selfservice/delete_confirm.html"

    def get(self, request, pk):
        entry = self.get_entry(request, pk)
        return render(
            request,
            self.template_name,
            {"entry": entry, **selfservice_banner_context(request)},
        )

    def post(self, request, pk):
        entry = self.get_entry(request, pk)
        official = entry.official
        season = entry.date.year
        entry.delete()
        messages.success(request, "Eintrag gelöscht.")
        return redirect(profile_gamelist_url(official, season))


DFFL_DELETE_URL_NAME = "view-officials-selfservice-dffl-delete"


class DfflGameDeleteView(SelfServiceWriteMixin, View):
    """Delete one of the official's own DFFL assignments.

    The scorecard stays authoritative: the row is deleted for real, and if the
    scorecard is saved for a future game afterwards it may create an empty slot
    again - the confirmation says so.
    """

    template_name = "officials/selfservice/delete_confirm.html"

    def get(self, request, pk):
        row = self._get_row(request, pk)
        game = row.gameinfo
        return render(
            request,
            self.template_name,
            {
                "row": row,
                "game": game,
                "home": game.gameresult_set.filter(isHome=True)
                .values_list("team__description", flat=True)
                .first(),
                "away": game.gameresult_set.filter(isHome=False)
                .values_list("team__description", flat=True)
                .first(),
                "future_warning": game.gameday.date > date.today(),
                **selfservice_banner_context(request),
            },
        )

    def post(self, request, pk):
        row = self._get_row(request, pk)
        official = row.official
        season = row.gameinfo.gameday.date.year
        row.delete()
        messages.success(request, "Einsatz gelöscht.")
        return redirect(profile_gamelist_url(official, season))

    @staticmethod
    def _get_row(request, pk) -> GameOfficial:
        row = get_object_or_404(
            GameOfficial.objects.select_related("gameinfo__gameday", "official"),
            pk=pk,
        )
        if not can_edit_official(request, row.official_id):
            raise PermissionDenied("Dieser Eintrag gehört einer anderen Person.")
        return row


MULTI_ADD_URL_NAME = "view-officials-selfservice-external-multi-add"


class ExternalGameMultiAddView(SelfServiceWriteMixin, View):
    """Report several external games in one submission, all-or-nothing.

    "Weitere Zeile hinzufügen" is a plain submit button that rebuilds the
    formset with one more row, so the whole flow works without JavaScript.
    """

    template_name = "officials/selfservice/external_multi_form.html"

    def get(self, request):
        return self._render(
            request, ExternalGameFormSet(form_kwargs={"staff": request.user.is_staff})
        )

    def post(self, request):
        data = request.POST
        if "add_row" in request.POST:
            data = request.POST.copy()
            try:
                total = int(data.get("form-TOTAL_FORMS") or 1)
            except (TypeError, ValueError):
                total = 1
            data["form-TOTAL_FORMS"] = str(total + 1)
            return self._render(
                request,
                ExternalGameFormSet(data, form_kwargs={"staff": request.user.is_staff}),
                adding_row=True,
            )

        formset = ExternalGameFormSet(
            data, form_kwargs={"staff": request.user.is_staff}
        )
        if not formset.is_valid():
            messages.error(request, "Bitte die markierten Zeilen prüfen.")
            return self._render(request, formset)

        filled = [form for form in formset if form.has_changed()]
        if not filled:
            messages.error(request, "Bitte mindestens eine Zeile ausfüllen.")
            return self._render(request, formset)

        try:
            target = self.target_official(request)
        except Official.DoesNotExist:
            messages.error(request, "Bitte eine Offizielle-ID angeben.")
            return self._render(request, formset)

        reporter = _reporter_name(request, target)
        with transaction.atomic():
            for form in filled:
                entry = form.save(commit=False)
                entry.official = target
                entry.notification_date = date.today()
                entry.reporter_name = reporter
                entry.save()
        messages.success(request, f"{len(filled)} Einträge gespeichert.")
        return redirect(profile_gamelist_url(target, date.today().year))

    def _render(self, request, formset, adding_row=False):
        return render(
            request,
            self.template_name,
            {
                "formset": formset,
                "adding_row": adding_row,
                **selfservice_banner_context(request),
            },
        )


def _reporter_name(request, target: Official) -> str:
    if request.user.is_authenticated and request.user.is_staff:
        return request.user.username
    return f"{target.first_name} {target.last_name}"
