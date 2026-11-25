"""Self-service access rules for officials.

One gate decides who may write: staff, or the official the Moodle session is
logged in as. Moodle users are always fixed to their own ``Official`` row - a
posted ``official_id`` is ignored for them - so a crafted form cannot write to
another official's data. Every write view added on top of this mixin inherits
that rule instead of repeating it.
"""

from urllib.parse import urlencode, urlsplit

import re

from django.contrib import messages
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.views import View

from gamedays.models import GameOfficial
from officials.constants import MOODLE_LOGGED_IN_USER, MOODLE_REMEMBER_COOKIE
from officials.models import Official
from officials.service.remember_me import RememberMeService, RestoreResult

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
    are sent to the Moodle login with ``?next=`` pointing back here.
    """

    def dispatch(self, request, *args, **kwargs):
        if request.user.is_authenticated and request.user.is_staff:
            return super().dispatch(request, *args, **kwargs)
        if acting_official_id(request) is None:
            restored = restore_moodle_session(request)
            if restored.official_id is not None:
                request.session[MOODLE_LOGGED_IN_USER] = restored.official_id
        if acting_official_id(request) is None:
            return redirect(login_url_for(request))
        return super().dispatch(request, *args, **kwargs)

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


class ClaimGameOfficialView(SelfServiceWriteMixin, View):
    """Claim an unassigned (``?``) row for oneself (staff: for any official).

    The write is ``UPDATE … WHERE official IS NULL``, so two people claiming
    the same row at the same moment produce exactly one winner; the loser gets
    a message and no exception. The typed name is kept as it was - it is the
    sheet's text, not a name field of the official.
    """

    template_name = "officials/selfservice/claim_confirm.html"

    def get(self, request, pk):
        row = get_object_or_404(GameOfficial, pk=pk)
        return render(request, self.template_name, self._context(request, row))

    def post(self, request, pk):
        row = get_object_or_404(GameOfficial, pk=pk)
        try:
            target = self.target_official(request)
        except Official.DoesNotExist:
            messages.error(request, "Bitte eine Offizielle-ID angeben.")
            return redirect(request.get_full_path())

        claimed = GameOfficial.objects.filter(pk=row.pk, official__isnull=True).update(
            official=target
        )
        if claimed:
            messages.success(
                request,
                f"Einsatz für {target.first_name} {target.last_name} zugeordnet.",
            )
        else:
            messages.error(request, RECLAIM_ERROR)
        return redirect(assignments_return_url(request))

    def _context(self, request, row):
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
            **selfservice_banner_context(request),
        }
