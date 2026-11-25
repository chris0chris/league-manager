from http import HTTPStatus

import pytest
from django.contrib.auth.models import AnonymousUser
from django.core.cache import cache
from django.http import HttpResponse, HttpResponseForbidden
from django.test import Client, RequestFactory, TestCase
from django.urls import reverse
from django.views import View
from django_webtest import WebTest

from gamedays.tests.setup_factories.db_setup import DBSetup
from gamedays.tests.setup_factories.factories import (
    GamedayFactory,
    GameinfoFactory,
    GameOfficialFactory,
    TeamFactory,
)
from officials.constants import (
    MOODLE_LOGGED_IN_USER,
    MOODLE_REMEMBER_COOKIE,
    REMEMBER_COOKIE_PATH,
)
from officials.models import Official
from officials.selfservice import (
    SelfServiceWriteMixin,
    acting_official_id,
    can_edit_official,
    safe_next,
)
from officials.service.remember_me import RememberMeService
from officials.tests.setup_factories.factories_officials import OfficialFactory


class _ProbeWriteView(SelfServiceWriteMixin, View):
    """Minimal consumer of the gate, so the gate can be tested on its own
    before the real write views exist."""

    def post(self, request):
        official = self.target_official(request)
        return HttpResponse(f"target:{official.pk}")


class _ProbeEditView(SelfServiceWriteMixin, View):
    def post(self, request, official_id):
        if not can_edit_official(request, official_id):
            return HttpResponseForbidden("nein")
        return HttpResponse("ok")


def _request(method="post", path="/officials/einsaetze/", data=None, session=None):
    factory = RequestFactory()
    request = getattr(factory, method)(path, data or {})
    request.session = session if session is not None else {}
    request.user = AnonymousUser()
    return request


def _officials():
    team = TeamFactory(name="Test Team")
    one = OfficialFactory(first_name="Anna", last_name="Aachen", team=team)
    two = OfficialFactory(first_name="Ben", last_name="Berlin", team=team)
    return one, two


class TestPermissionGate(TestCase):
    def test_anonymous_write_redirects_to_login_with_next(self):
        request = _request()

        response = _ProbeWriteView().dispatch(request)

        assert response.status_code == HTTPStatus.FOUND
        assert response.url.startswith(reverse("view-officials-moodle-login"))
        assert "next=%2Fofficials%2Feinsaetze%2F" in response.url

    def test_anonymous_is_rejected_before_any_write(self):
        request = _request(data={"official_id": "1"})

        assert _ProbeEditView().dispatch(request, official_id=1).status_code == 302

    def test_moodle_user_cannot_edit_other_official(self):
        one, two = _officials()
        request = _request(session={MOODLE_LOGGED_IN_USER: one.pk})

        assert can_edit_official(request, one.pk) is True
        assert can_edit_official(request, two.pk) is False
        assert _ProbeEditView().dispatch(request, official_id=two.pk).status_code == 403

    def test_staff_can_edit_any(self):
        one, two = _officials()
        request = _request()
        request.user = DBSetup().create_new_user("staff", is_staff=True)

        assert can_edit_official(request, two.pk) is True
        assert _ProbeEditView().dispatch(request, official_id=two.pk).status_code == 200

    def test_moodle_target_ignores_posted_official_id(self):
        one, two = _officials()
        request = _request(
            data={"official_id": str(two.pk)},
            session={MOODLE_LOGGED_IN_USER: one.pk},
        )

        response = _ProbeWriteView().dispatch(request)

        assert response.content.decode() == f"target:{one.pk}"

    def test_staff_target_uses_posted_official_id(self):
        one, two = _officials()
        request = _request(data={"official_id": str(two.pk)})
        request.user = DBSetup().create_new_user("staff", is_staff=True)

        response = _ProbeWriteView().dispatch(request)

        assert response.content.decode() == f"target:{two.pk}"

    def test_staff_target_without_official_id_is_a_missing_target(self):
        _officials()
        request = _request(data={})
        request.user = DBSetup().create_new_user("staff", is_staff=True)

        with pytest.raises(Official.DoesNotExist):
            _ProbeWriteView().dispatch(request)

    def test_acting_official_id_comes_from_the_session(self):
        request = _request(session={MOODLE_LOGGED_IN_USER: 42})

        assert acting_official_id(request) == 42
        assert acting_official_id(_request()) is None


class TestSafeNext:
    def test_next_inside_officials_is_kept(self):
        request = _request("get", data={"next": "/officials/einsaetze/"})

        assert safe_next(request) == "/officials/einsaetze/"

    @pytest.mark.parametrize(
        "target",
        [
            "https://evil.example.com/",
            "//evil.example.com/",
            "/admin/",
            "http://127.0.0.1:8000/officials/einsaetze/",
            "",
        ],
    )
    def test_next_outside_officials_falls_back(self, target):
        request = _request("get", data={"next": target})

        assert safe_next(request) == reverse("view-officials-sign-up-list")


class TestLoginWiring(WebTest):
    def setUp(self):
        cache.clear()
        self.official, _ = _officials()

    def test_login_redirects_to_next(self):
        form = self.app.get(reverse("view-officials-moodle-login")).forms[0]
        form["username"] = "someone"
        form["password"] = "secret"
        form["next"] = "/officials/einsaetze/"

        with pytest.MonkeyPatch.context() as mp:
            mp.setattr(
                "officials.views.MoodleService.login",
                lambda *args, **kwargs: self.official.pk,
            )
            response = form.submit()

        assert response.status_code == HTTPStatus.FOUND
        assert response.url == "/officials/einsaetze/"

    def test_login_rejects_an_external_next(self):
        form = self.app.get(reverse("view-officials-moodle-login")).forms[0]
        form["username"] = "someone"
        form["password"] = "secret"
        form["next"] = "https://evil.example.com/"

        with pytest.MonkeyPatch.context() as mp:
            mp.setattr(
                "officials.views.MoodleService.login",
                lambda *args, **kwargs: self.official.pk,
            )
            response = form.submit()

        assert response.url == reverse("view-officials-sign-up-list")

    def test_cookie_restored_on_einsaetze(self):
        client = Client()
        client.cookies[MOODLE_REMEMBER_COOKIE] = RememberMeService.issue(
            self.official.pk
        )

        response = client.get(reverse("view-officials-game-officials-appearance"))

        assert client.session.get(MOODLE_LOGGED_IN_USER) == self.official.pk
        rotated = response.cookies[MOODLE_REMEMBER_COOKIE]
        assert rotated.value
        assert rotated["path"] == REMEMBER_COOKIE_PATH == "/officials/"


class TestEinsaetzePageCacheAndBanner(WebTest):
    def setUp(self):
        cache.clear()
        self.official, _ = _officials()
        self.url = reverse("view-officials-game-officials-appearance")

    def tearDown(self):
        cache.clear()

    def test_login_button_label_for_anonymous(self):
        content = self.app.get(self.url).content.decode()

        assert "Über offd.de anmelden" in content

    def test_cache_bypass(self):
        # The first anonymous request sets the csrf cookie, and the cached
        # variant is keyed on the cookies it was rendered with - so warm the
        # cache up with one request and take the second one as "the cached
        # page".
        self.app.get(self.url)
        cached = self.app.get(self.url).content.decode()
        assert "Über offd.de anmelden" in cached
        assert "Angemeldet als" not in cached

        # A gameday created after the anonymous page was cached must not show
        # up in the next anonymous response - that one comes from the cache.
        gameday = GamedayFactory(date="2026-05-01", name="CACHE-PROBE-SPIELTAG")
        gameinfo = GameinfoFactory(gameday=gameday)
        GameOfficialFactory(gameinfo=gameinfo, position="Referee")

        second_anonymous = self.app.get(self.url).content.decode()
        assert second_anonymous == cached
        assert "CACHE-PROBE-SPIELTAG" not in second_anonymous
        assert "Mir zuordnen" not in second_anonymous

        # A staff request bypasses the cache: it sees the row and the banner,
        # and it is not written into the shared cache entry. A brand-new
        # anonymous client must therefore still get the anonymous variant.
        self.app.set_user(DBSetup().create_new_user("staff", is_staff=True))
        staff_content = self.app.get(self.url).content.decode()
        assert "CACHE-PROBE-SPIELTAG" in staff_content
        assert "Angemeldet als" in staff_content
        assert "<strong>staff</strong>" in staff_content

        third_anonymous = Client().get(self.url).content.decode()
        assert "Angemeldet als" not in third_anonymous
        assert "Über offd.de anmelden" in third_anonymous

    def test_moodle_session_renders_banner_for_own_official(self):
        client = Client()
        session = client.session
        session[MOODLE_LOGGED_IN_USER] = self.official.pk
        session.save()

        content = client.get(self.url).content.decode()

        assert "Angemeldet als" in content
        assert (
            f"<strong>{self.official.first_name} {self.official.last_name}</strong>"
            in content
        )
        assert "Abmelden" in content
