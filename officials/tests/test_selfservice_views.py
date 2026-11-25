from django.contrib.messages import get_messages
from django.test import Client, TestCase
from django.urls import reverse

from gamedays.models import Gameinfo, GameOfficial
from gamedays.tests.setup_factories.factories import (
    GamedayFactory,
    GameinfoFactory,
    GameOfficialFactory,
    TeamFactory,
)
from officials.constants import MOODLE_LOGGED_IN_USER, MOODLE_REMEMBER_COOKIE
from officials.tests.setup_factories.db_setup_officials import DbSetupOfficials
from officials.tests.setup_factories.factories_officials import OfficialFactory

LIST_URL_NAME = "view-officials-game-officials-appearance"
CLAIM_URL_NAME = "view-officials-selfservice-claim"


def _game_with_row(official=None, name="Max Mustermann", position="Referee"):
    gameday = GamedayFactory(date="2026-05-01", name="Spieltag Einsätze")
    gameinfo = GameinfoFactory(gameday=gameday)
    row = GameOfficialFactory(
        gameinfo=gameinfo, official=official, name=name, position=position
    )
    return gameinfo, row


class SelfServiceTestBase(TestCase):
    def setUp(self):
        self.team = TeamFactory(name="Test Team")
        self.official = OfficialFactory(
            first_name="Max", last_name="Mustermann", team=self.team
        )
        self.other = OfficialFactory(
            first_name="Erika", last_name="Musterfrau", team=self.team
        )
        self.client = Client()

    def login_moodle(self, official=None, client=None):
        client = client or self.client
        session = client.session
        session[MOODLE_LOGGED_IN_USER] = (official or self.official).pk
        session.save()
        return client

    def messages(self, response):
        return [str(message) for message in get_messages(response.wsgi_request)]


class TestClaimAssignment(SelfServiceTestBase):
    def test_claim_confirm_shows_name_and_game(self):
        gameinfo, row = _game_with_row()
        self.login_moodle()

        response = self.client.get(reverse(CLAIM_URL_NAME, kwargs={"pk": row.pk}))

        assert response.status_code == 200
        content = response.content.decode()
        assert "Max Mustermann" in content
        assert "Spieltag Einsätze" in content
        assert "Referee" in content

    def test_claim_unmapped_row(self):
        gameinfo, row = _game_with_row()
        self.login_moodle()

        response = self.client.post(
            reverse(CLAIM_URL_NAME, kwargs={"pk": row.pk}), follow=True
        )

        assert response.status_code == 200
        row.refresh_from_db()
        assert row.official == self.official
        assert row.name == "Max Mustermann"

    def test_claim_already_mapped_fails(self):
        gameinfo, row = _game_with_row(official=self.other)
        self.login_moodle()

        response = self.client.post(
            reverse(CLAIM_URL_NAME, kwargs={"pk": row.pk}), follow=True
        )

        row.refresh_from_db()
        assert row.official == self.other
        assert any("bereits zugeordnet" in m for m in self.messages(response))

    def test_claim_race_single_winner(self):
        gameinfo, row = _game_with_row()
        client_two = self.login_moodle(client=Client())
        self.login_moodle()

        self.client.post(reverse(CLAIM_URL_NAME, kwargs={"pk": row.pk}))
        response = client_two.post(
            reverse(CLAIM_URL_NAME, kwargs={"pk": row.pk}), follow=True
        )

        row.refresh_from_db()
        assert response.status_code == 200
        assert row.official == self.official
        assert any("bereits zugeordnet" in m for m in self.messages(response))

    def test_moodle_claim_other_row_allowed(self):
        # Decision 1: any unmapped row may be claimed, no name check.
        gameinfo, row = _game_with_row(name="Someone Else")
        self.login_moodle()

        self.client.post(reverse(CLAIM_URL_NAME, kwargs={"pk": row.pk}))

        row.refresh_from_db()
        assert row.official == self.official

    def test_anonymous_claim_redirects(self):
        gameinfo, row = _game_with_row()

        response = self.client.get(reverse(CLAIM_URL_NAME, kwargs={"pk": row.pk}))

        assert response.status_code == 302
        assert response.url.startswith(reverse("view-officials-moodle-login"))
        assert "next=" in response.url
        row.refresh_from_db()
        assert row.official is None

    def test_staff_claim_requires_official(self):
        gameinfo, row = _game_with_row()
        staff = self.login_moodle(official=None)
        staff.force_login(_staff_user())

        response = staff.post(
            reverse(CLAIM_URL_NAME, kwargs={"pk": row.pk}), follow=True
        )

        row.refresh_from_db()
        assert row.official is None
        assert any("Offizielle" in m for m in self.messages(response))

    def test_staff_claim_assigns_posted_official(self):
        gameinfo, row = _game_with_row()
        client = Client()
        client.force_login(_staff_user())

        client.post(
            reverse(CLAIM_URL_NAME, kwargs={"pk": row.pk}),
            {"official_id": str(self.other.pk)},
        )

        row.refresh_from_db()
        assert row.official == self.other


def _staff_user():
    from gamedays.tests.setup_factories.db_setup import DBSetup

    return DBSetup().create_new_user("staff", is_staff=True)


class TestEinsaetzeHighlightAndFilter(SelfServiceTestBase):
    def test_mine_filter(self):
        gameinfo, own_row = _game_with_row(official=self.official)
        gameinfo, other_row = _game_with_row(official=self.other, name=None)
        gameinfo, matching_open = _game_with_row(name="Max Mustermann")
        gameinfo, foreign_open = _game_with_row(name="Jemand Anders")
        self.login_moodle()

        response = self.client.get(reverse(LIST_URL_NAME), {"mine": "1"})

        content = response.content.decode()
        assert f'<th scope="row">{own_row.pk}</th>' in content
        assert f'<th scope="row">{matching_open.pk}</th>' in content
        assert f'<th scope="row">{other_row.pk}</th>' not in content
        assert f'<th scope="row">{foreign_open.pk}</th>' not in content

    def test_null_name_row_renders_for_anonymous(self):
        GameOfficial.objects.create(
            gameinfo=_game_with_row()[0],
            official=None,
            name=None,
            position="Referee",
        )

        response = self.client.get(reverse(LIST_URL_NAME))

        assert response.status_code == 200

    def test_own_rows_are_highlighted_and_reveal_the_name(self):
        gameinfo, own_row = _game_with_row(official=self.official)
        self.login_moodle()

        content = self.client.get(reverse(LIST_URL_NAME)).content.decode()

        assert "table-info" in content
        assert "Max Mustermann" in content

    def test_unmapped_name_match_is_highlighted_with_claim_link(self):
        gameinfo, row = _game_with_row(name="Max Mustermann")
        self.login_moodle()

        content = self.client.get(reverse(LIST_URL_NAME)).content.decode()

        assert "Mir zuordnen" in content
        assert reverse(CLAIM_URL_NAME, kwargs={"pk": row.pk}) in content


class TestNameMatcher(TestCase):
    def test_matches_own_name_in_any_case_and_with_punctuation(self):
        from officials.selfservice import name_matches_official

        official = OfficialFactory(
            first_name="Max", last_name="Mustermann", team=TeamFactory(name="Test Team")
        )

        assert name_matches_official("max mustermann", official) is True
        assert name_matches_official("Mustermann, Max", official) is True
        assert name_matches_official("Max", official) is True

    def test_does_not_match_a_different_person(self):
        from officials.selfservice import name_matches_official

        official = OfficialFactory(
            first_name="Max", last_name="Mustermann", team=TeamFactory(name="Test Team")
        )

        assert name_matches_official("Erika Musterfrau", official) is False
        assert name_matches_official("", official) is False
        assert name_matches_official(None, official) is False


ASSIGNMENT_URL_NAME = "view-officials-selfservice-add-assignment"
UNASSIGN_URL_NAME = "view-officials-selfservice-unassign"


class TestAddAssignment(SelfServiceTestBase):
    def setUp(self):
        super().setUp()
        self.gameday = GamedayFactory(date="2026-06-01", name="Spieltag Nachtragen")
        self.gameinfo = GameinfoFactory(gameday=self.gameday)

    def _post(self, client=None, **data):
        client = client or self.client
        payload = {
            "gameday": str(self.gameday.pk),
            "gameinfo": str(self.gameinfo.pk),
            "position": "Referee",
        }
        payload.update(data)
        return client.post(reverse(ASSIGNMENT_URL_NAME), payload, follow=True)

    def test_add_assignment_creates_row(self):
        self.login_moodle()

        response = self._post()

        row = GameOfficial.objects.get(gameinfo=self.gameinfo)
        assert response.status_code == 200
        assert row.official == self.official
        assert row.position == "Referee"

    def test_add_blocked_when_official_already_on_game(self):
        GameOfficialFactory(
            gameinfo=self.gameinfo, official=self.official, position="Side Judge"
        )
        self.login_moodle()

        response = self._post()

        assert GameOfficial.objects.filter(gameinfo=self.gameinfo).count() == 1
        assert any("bereits" in m for m in self.messages(response))

    def test_add_blocked_when_position_occupied(self):
        GameOfficialFactory(gameinfo=self.gameinfo, official=None, position="Referee")
        self.login_moodle()

        response = self._post()

        assert GameOfficial.objects.filter(gameinfo=self.gameinfo).count() == 1
        assert any("besetzt" in m for m in self.messages(response))

    def test_staff_add_requires_official_picker(self):
        client = Client()
        client.force_login(_staff_user())

        response = self._post(client=client)

        assert GameOfficial.objects.filter(gameinfo=self.gameinfo).count() == 0
        assert any("Offizielle" in m for m in self.messages(response))

    def test_staff_add_uses_posted_official(self):
        client = Client()
        client.force_login(_staff_user())

        self._post(client=client, official_id=str(self.other.pk))

        row = GameOfficial.objects.get(gameinfo=self.gameinfo)
        assert row.official == self.other

    def test_moodle_add_ignores_posted_official(self):
        self.login_moodle()

        self._post(official_id=str(self.other.pk))

        row = GameOfficial.objects.get(gameinfo=self.gameinfo)
        assert row.official == self.official

    def test_position_choices_exclude_scorecard_judge(self):
        self.login_moodle()

        content = self.client.get(
            reverse(ASSIGNMENT_URL_NAME), {"gameday": str(self.gameday.pk)}
        ).content.decode()

        assert "Referee" in content
        assert "Scorecard Judge" not in content

    def test_unknown_position_is_rejected(self):
        self.login_moodle()

        response = self._post(position="Scorecard Judge")

        assert GameOfficial.objects.filter(gameinfo=self.gameinfo).count() == 0
        assert any("Position" in m for m in self.messages(response))


class TestUnassign(SelfServiceTestBase):
    def test_unassign_staff_only(self):
        gameinfo, row = _game_with_row(official=self.other)
        client = Client()
        client.force_login(_staff_user())

        client.post(reverse(UNASSIGN_URL_NAME, kwargs={"pk": row.pk}), follow=True)

        row.refresh_from_db()
        assert row.official is None
        assert row.name == "Max Mustermann"

    def test_moodle_user_cannot_unassign(self):
        gameinfo, row = _game_with_row(official=self.official)
        self.login_moodle()

        response = self.client.post(
            reverse(UNASSIGN_URL_NAME, kwargs={"pk": row.pk}), follow=True
        )

        row.refresh_from_db()
        assert row.official == self.official
        assert response.status_code == 200

    def test_anonymous_unassign_redirects_to_login(self):
        gameinfo, row = _game_with_row(official=self.other)

        response = self.client.post(reverse(UNASSIGN_URL_NAME, kwargs={"pk": row.pk}))

        assert response.status_code == 302
        assert response.url.startswith(reverse("view-officials-moodle-login"))


EXTERNAL_EDIT_URL_NAME = "view-officials-selfservice-external-edit"
EXTERNAL_DELETE_URL_NAME = "view-officials-selfservice-external-delete"


def _external_entry(official, association_abbr="AFCVHH", date="2026-05-24"):
    from officials.models import OfficialExternalGames
    from gamedays.models import Association

    association, _created = Association.objects.get_or_create(
        abbr=association_abbr, defaults={"name": association_abbr}
    )
    return OfficialExternalGames.objects.create(
        official=official,
        number_games=2,
        date=date,
        notification_date=date,
        position="Referee",
        association=association,
        halftime_duration=20,
        has_clockcontrol=True,
        is_international=False,
        reporter_name="Melder",
        comment="",
    )


def _external_form_data(**overrides):
    from gamedays.models import Association

    association = Association.objects.get(abbr="AFCVT")
    data = {
        "date": "2026-06-02",
        "number_games": "3",
        "position": "Side Judge",
        "association": str(association.pk),
        "halftime_duration": "25",
        "comment": "geändert",
    }
    data.update(overrides)
    return data


class TestExternalGameEdit(SelfServiceTestBase):
    def setUp(self):
        super().setUp()
        DbSetupOfficials.create_production_associations()
        self.entry = _external_entry(self.official)

    def test_owner_edits_external_entry(self):
        self.login_moodle()

        response = self.client.post(
            reverse(EXTERNAL_EDIT_URL_NAME, kwargs={"pk": self.entry.pk}),
            _external_form_data(),
            follow=True,
        )

        self.entry.refresh_from_db()
        assert response.status_code == 200
        assert self.entry.number_games == 3
        assert self.entry.position == "Side Judge"
        assert self.entry.association.abbr == "AFCVT"
        assert self.entry.comment == "geändert"
        assert self.entry.is_international is False

    def test_other_official_cannot_edit(self):
        self.login_moodle(self.other)

        response = self.client.post(
            reverse(EXTERNAL_EDIT_URL_NAME, kwargs={"pk": self.entry.pk}),
            _external_form_data(),
        )

        self.entry.refresh_from_db()
        assert response.status_code == 403
        assert self.entry.number_games == 2

    def test_anonymous_redirects(self):
        response = self.client.get(
            reverse(EXTERNAL_EDIT_URL_NAME, kwargs={"pk": self.entry.pk})
        )

        assert response.status_code == 302
        assert response.url.startswith(reverse("view-officials-moodle-login"))

    def test_staff_edits_any(self):
        client = Client()
        client.force_login(_staff_user())

        client.post(
            reverse(EXTERNAL_EDIT_URL_NAME, kwargs={"pk": self.entry.pk}),
            _external_form_data(),
        )

        self.entry.refresh_from_db()
        assert self.entry.number_games == 3

    def test_staff_can_reassign_official(self):
        client = Client()
        client.force_login(_staff_user())

        client.post(
            reverse(EXTERNAL_EDIT_URL_NAME, kwargs={"pk": self.entry.pk}),
            _external_form_data(official_id=str(self.other.pk)),
        )

        self.entry.refresh_from_db()
        assert self.entry.official == self.other

    def test_owner_form_hides_staff_fields(self):
        self.login_moodle()

        content = self.client.get(
            reverse(EXTERNAL_EDIT_URL_NAME, kwargs={"pk": self.entry.pk})
        ).content.decode()

        assert 'name="notification_date"' not in content
        assert 'name="reporter_name"' not in content
        assert 'name="official_id"' not in content

    def test_association_is_a_dropdown(self):
        from django import forms

        from officials.forms_selfservice import ExternalGameForm

        field = ExternalGameForm().fields["association"]

        assert isinstance(field, forms.ModelChoiceField)

    def test_free_text_association_is_rejected(self):
        self.login_moodle()

        response = self.client.post(
            reverse(EXTERNAL_EDIT_URL_NAME, kwargs={"pk": self.entry.pk}),
            _external_form_data(association="Fantasie-Verband"),
        )

        self.entry.refresh_from_db()
        assert response.status_code == 200
        assert "association" in response.context["form"].errors
        assert self.entry.number_games == 2


class TestExternalGameDelete(SelfServiceTestBase):
    def setUp(self):
        super().setUp()
        DbSetupOfficials.create_production_associations()
        self.entry = _external_entry(self.official)

    def test_delete_owner(self):
        self.login_moodle()

        confirm = self.client.get(
            reverse(EXTERNAL_DELETE_URL_NAME, kwargs={"pk": self.entry.pk})
        )
        assert confirm.status_code == 200
        assert "24.05.2026" in confirm.content.decode()

        self.client.post(
            reverse(EXTERNAL_DELETE_URL_NAME, kwargs={"pk": self.entry.pk})
        )

        from officials.models import OfficialExternalGames

        assert not OfficialExternalGames.objects.filter(pk=self.entry.pk).exists()

    def test_delete_other_forbidden(self):
        self.login_moodle(self.other)

        response = self.client.post(
            reverse(EXTERNAL_DELETE_URL_NAME, kwargs={"pk": self.entry.pk})
        )

        from officials.models import OfficialExternalGames

        assert response.status_code == 403
        assert OfficialExternalGames.objects.filter(pk=self.entry.pk).exists()

    def test_delete_staff(self):
        client = Client()
        client.force_login(_staff_user())

        client.post(reverse(EXTERNAL_DELETE_URL_NAME, kwargs={"pk": self.entry.pk}))

        from officials.models import OfficialExternalGames

        assert not OfficialExternalGames.objects.filter(pk=self.entry.pk).exists()


DFFL_DELETE_URL_NAME = "view-officials-selfservice-dffl-delete"


class TestDfflGameDelete(SelfServiceTestBase):
    def test_owner_deletes_dffl_entry(self):
        gameinfo, row = _game_with_row(official=self.official)
        self.login_moodle()

        response = self.client.post(
            reverse(DFFL_DELETE_URL_NAME, kwargs={"pk": row.pk}), follow=True
        )

        assert response.status_code == 200
        assert not GameOfficial.objects.filter(pk=row.pk).exists()
        assert Gameinfo.objects.filter(pk=gameinfo.pk).exists()

    def test_other_official_forbidden(self):
        gameinfo, row = _game_with_row(official=self.other)
        self.login_moodle()

        response = self.client.post(
            reverse(DFFL_DELETE_URL_NAME, kwargs={"pk": row.pk})
        )

        assert response.status_code == 403
        assert GameOfficial.objects.filter(pk=row.pk).exists()

    def test_anonymous_redirects(self):
        gameinfo, row = _game_with_row(official=self.official)

        response = self.client.get(reverse(DFFL_DELETE_URL_NAME, kwargs={"pk": row.pk}))

        assert response.status_code == 302
        assert response.url.startswith(reverse("view-officials-moodle-login"))

    def test_staff_deletes_any(self):
        gameinfo, row = _game_with_row(official=self.other)
        client = Client()
        client.force_login(_staff_user())

        client.post(reverse(DFFL_DELETE_URL_NAME, kwargs={"pk": row.pk}))

        assert not GameOfficial.objects.filter(pk=row.pk).exists()

    def test_future_game_delete_shows_warning(self):
        future_gameday = GamedayFactory(date="2027-05-01", name="Zukunftsspieltag")
        future_game = GameinfoFactory(gameday=future_gameday)
        future_row = GameOfficialFactory(
            gameinfo=future_game, official=self.official, position="Referee"
        )
        gameinfo, past_row = _game_with_row(official=self.official)
        self.login_moodle()

        future_content = self.client.get(
            reverse(DFFL_DELETE_URL_NAME, kwargs={"pk": future_row.pk})
        ).content.decode()
        past_content = self.client.get(
            reverse(DFFL_DELETE_URL_NAME, kwargs={"pk": past_row.pk})
        ).content.decode()

        assert "Zukunft" in future_content
        assert "Scorecard" in future_content
        assert "Zukunft" not in past_content


MULTI_ADD_URL_NAME = "view-officials-selfservice-external-multi-add"


def _formset_data(rows, **overrides):
    from gamedays.models import Association

    association = Association.objects.get(abbr="AFCVT")
    data = {
        "form-TOTAL_FORMS": str(len(rows)),
        "form-INITIAL_FORMS": "0",
        "form-MIN_NUM_FORMS": "0",
        "form-MAX_NUM_FORMS": "1000",
    }
    for index, row in enumerate(rows):
        values = {
            "date": "2026-06-02",
            "number_games": "2",
            "position": "Referee",
            "association": str(association.pk),
            "halftime_duration": "20",
            "comment": "",
        }
        values.update(row)
        for field, value in values.items():
            data[f"form-{index}-{field}"] = value
    data.update(overrides)
    return data


class TestExternalGameMultiAdd(SelfServiceTestBase):
    def setUp(self):
        super().setUp()
        DbSetupOfficials.create_production_associations()

    def test_multi_add_three_rows_atomic(self):
        self.login_moodle()

        response = self.client.post(
            reverse(MULTI_ADD_URL_NAME),
            _formset_data(
                [
                    {"number_games": "2"},
                    {"number_games": "3", "position": "Mix"},
                    {"number_games": "4", "comment": "letzte Zeile"},
                ]
            ),
            follow=True,
        )

        from datetime import date

        from officials.models import OfficialExternalGames

        entries = OfficialExternalGames.objects.filter(official=self.official)
        assert response.status_code == 200
        assert entries.count() == 3
        assert sorted(entries.values_list("number_games", flat=True)) == [2, 3, 4]
        assert all(entry.notification_date == date.today() for entry in entries)
        assert all(entry.reporter_name == "Max Mustermann" for entry in entries)

    def test_invalid_row_rolls_back_all(self):
        self.login_moodle()

        response = self.client.post(
            reverse(MULTI_ADD_URL_NAME),
            _formset_data(
                [{"number_games": "2"}, {"position": "Unfug"}],
            ),
        )

        from officials.models import OfficialExternalGames

        assert response.status_code == 200
        assert OfficialExternalGames.objects.count() == 0
        assert response.context["formset"].errors

    def test_add_row_grows_formset(self):
        self.login_moodle()

        response = self.client.post(
            reverse(MULTI_ADD_URL_NAME),
            _formset_data([{"number_games": "7"}], add_row="1"),
        )

        from officials.models import OfficialExternalGames

        assert response.status_code == 200
        assert len(response.context["formset"].forms) == 2
        assert response.context["formset"].forms[0]["number_games"].value() == "7"
        assert OfficialExternalGames.objects.count() == 0

    def test_staff_requires_official_picker(self):
        client = Client()
        client.force_login(_staff_user())

        response = client.post(
            reverse(MULTI_ADD_URL_NAME), _formset_data([{"number_games": "2"}])
        )

        from officials.models import OfficialExternalGames

        assert OfficialExternalGames.objects.count() == 0
        assert any("Offizielle" in m for m in self.messages(response))

    def test_staff_uses_posted_official(self):
        client = Client()
        client.force_login(_staff_user())

        client.post(
            reverse(MULTI_ADD_URL_NAME),
            _formset_data([{"number_games": "2"}], official_id=str(self.other.pk)),
        )

        from officials.models import OfficialExternalGames

        entry = OfficialExternalGames.objects.get()
        assert entry.official == self.other
        assert entry.reporter_name == "staff"

    def test_moodle_target_fixed_to_self(self):
        self.login_moodle()

        self.client.post(
            reverse(MULTI_ADD_URL_NAME),
            _formset_data([{"number_games": "2"}], official_id=str(self.other.pk)),
        )

        from officials.models import OfficialExternalGames

        assert OfficialExternalGames.objects.get().official == self.official

    def test_association_dropdown_in_every_row(self):
        self.login_moodle()

        content = self.client.get(reverse(MULTI_ADD_URL_NAME)).content.decode()

        assert content.count('name="form-0-association"') == 1
        assert "<select" in content


class TestStaffExternalFormValues(SelfServiceTestBase):
    def test_staff_form_shows_the_current_values(self):
        DbSetupOfficials.create_production_associations()
        entry = _external_entry(self.official)
        entry.notification_date = "2026-05-26"
        entry.reporter_name = "Melder Max"
        entry.save()
        client = Client()
        client.force_login(_staff_user())

        content = client.get(
            reverse(EXTERNAL_EDIT_URL_NAME, kwargs={"pk": entry.pk})
        ).content.decode()

        assert 'value="2026-05-26"' in content
        assert 'value="Melder Max"' in content
        assert f'value="{self.official.pk}"' in content


class TestStaffExternalFieldsAreSaved(SelfServiceTestBase):
    def test_staff_edit_saves_notification_date_and_reporter_name(self):
        DbSetupOfficials.create_production_associations()
        entry = _external_entry(self.official)
        client = Client()
        client.force_login(_staff_user())

        client.post(
            reverse(EXTERNAL_EDIT_URL_NAME, kwargs={"pk": entry.pk}),
            _external_form_data(
                notification_date="2026-06-03", reporter_name="Staff Melder"
            ),
        )

        entry.refresh_from_db()
        assert str(entry.notification_date) == "2026-06-03"
        assert entry.reporter_name == "Staff Melder"


class TestOwnOpenRowHighlight(SelfServiceTestBase):
    def test_only_the_matching_open_row_is_highlighted(self):
        gameinfo, matching = _game_with_row(name="Max Mustermann")
        gameinfo, foreign = _game_with_row(name="Jemand Anders")
        self.login_moodle()

        content = self.client.get(reverse(LIST_URL_NAME)).content.decode()

        assert content.count("table-info") == 1
        own_marker = f'<tr class="table-info">'
        after_marker = content.split(own_marker, 1)[1]
        assert f'<th scope="row">{matching.pk}</th>' in after_marker[:80]
        assert f'<th scope="row">{foreign.pk}</th>' not in after_marker[:80]


class TestRememberCookieRotationOnWriteViews(SelfServiceTestBase):
    def test_write_view_rotates_the_remember_cookie(self):
        from officials.service.remember_me import RememberMeService

        client = Client()
        client.cookies[MOODLE_REMEMBER_COOKIE] = RememberMeService.issue(
            self.official.pk
        )

        response = client.get(reverse(ASSIGNMENT_URL_NAME))

        assert client.session.get(MOODLE_LOGGED_IN_USER) == self.official.pk
        rotated = response.cookies[MOODLE_REMEMBER_COOKIE]
        assert rotated.value
        assert rotated["path"] == "/officials/"


class TestAddAssignmentInputRobustness(SelfServiceTestBase):
    def test_unknown_gameday_parameter_does_not_crash(self):
        self.login_moodle()

        response = self.client.get(reverse(ASSIGNMENT_URL_NAME), {"gameday": "abc"})

        assert response.status_code == 200


class TestSelfServiceButtons(SelfServiceTestBase):
    def test_claim_button_fills_width_and_has_no_cancel_link(self):
        DbSetupOfficials.create_production_associations()
        gameinfo, row = _game_with_row()
        self.login_moodle()

        content = self.client.get(
            reverse(CLAIM_URL_NAME, kwargs={"pk": row.pk})
        ).content.decode()

        assert 'btn btn-primary w-100" type="submit">Einsatz übernehmen' in content
        assert ">Abbrechen<" not in content

    def test_cancel_links_use_outline_danger(self):
        DbSetupOfficials.create_production_associations()
        client = Client()
        client.force_login(_staff_user())

        for url in (
            reverse(ASSIGNMENT_URL_NAME) + "?gameday=930",
            reverse(MULTI_ADD_URL_NAME),
        ):
            content = client.get(url).content.decode()
            assert ">Abbrechen<" in content
            assert "btn btn-outline-danger" in content, url
