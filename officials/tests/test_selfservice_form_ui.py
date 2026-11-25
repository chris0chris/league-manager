"""UI and validation rules for the external-game self-service forms."""

from datetime import date, timedelta

from django.test import Client, TestCase
from django.urls import reverse

from gamedays.models import Association
from gamedays.tests.setup_factories.factories import TeamFactory
from officials.constants import MOODLE_LOGGED_IN_USER
from officials.forms_selfservice import ExternalGameForm
from officials.models import OfficialExternalGames
from officials.tests.setup_factories.db_setup_officials import DbSetupOfficials
from officials.tests.setup_factories.factories_officials import OfficialFactory

MULTI_ADD_URL_NAME = "view-officials-selfservice-external-multi-add"
EXTERNAL_EDIT_URL_NAME = "view-officials-selfservice-external-edit"


class SelfServiceFormTestBase(TestCase):
    def setUp(self):
        DbSetupOfficials.create_production_associations()
        self.team = TeamFactory(name="Test Team")
        self.official = OfficialFactory(
            first_name="Max", last_name="Mustermann", team=self.team
        )
        self.client = Client()
        session = self.client.session
        session[MOODLE_LOGGED_IN_USER] = self.official.pk
        session.save()

    def _form_data(self, **overrides):
        data = {
            "date": (date.today() - timedelta(days=30)).isoformat(),
            "number_games": "2",
            "position": "Referee",
            "association": str(Association.objects.get(abbr="AFCVT").pk),
            "halftime_duration": "20",
            "comment": "",
        }
        data.update(overrides)
        return data

    def _formset_data(self, rows, **overrides):
        data = {
            "form-TOTAL_FORMS": str(len(rows)),
            "form-INITIAL_FORMS": "0",
            "form-MIN_NUM_FORMS": "0",
            "form-MAX_NUM_FORMS": "1000",
        }
        for index, row in enumerate(rows):
            values = self._form_data()
            values.update(row)
            for field, value in values.items():
                data[f"form-{index}-{field}"] = value
        data.update(overrides)
        return data

    def _external_entry(self):
        return OfficialExternalGames.objects.create(
            official=self.official,
            number_games=2,
            date=date.today() - timedelta(days=30),
            notification_date=date.today() - timedelta(days=29),
            position="Referee",
            association=Association.objects.get(abbr="AFCVT"),
            halftime_duration=20,
            reporter_name="Max Mustermann",
            comment="",
        )

    @staticmethod
    def _buttons_share_row(content, first, second):
        first_at = content.index(first)
        second_at = content.index(second)
        row_start = content.rfind('<div class="row', 0, first_at)
        row_end = content.find("</div>", second_at)
        assert row_start != -1 and row_end != -1
        return content[row_start:row_end]


class TestExternalGameChoices(SelfServiceFormTestBase):
    def test_association_option_shows_name_and_abbreviation(self):
        rendered = ExternalGameForm()["association"].as_widget()

        assert "Thüringen (AFCVT)" in rendered

    def test_association_empty_choice_says_bitte_auswaehlen(self):
        rendered = ExternalGameForm()["association"].as_widget()

        assert 'value="" selected>Bitte auswählen</option>' in rendered

    def test_position_has_empty_choice_but_stays_required(self):
        form = ExternalGameForm()

        assert (
            'value="" selected>Bitte auswählen</option>' in form["position"].as_widget()
        )
        assert form.fields["position"].required is True
        invalid = ExternalGameForm(data=self._form_data(position=""))
        assert not invalid.is_valid()
        assert "position" in invalid.errors


class TestExternalGameValidation(SelfServiceFormTestBase):
    def test_future_date_is_rejected_with_german_message(self):
        future = (date.today() + timedelta(days=1)).isoformat()

        form = ExternalGameForm(data=self._form_data(date=future))

        assert not form.is_valid()
        assert "Das Datum darf nicht in der Zukunft liegen." in form.errors.as_text()

    def test_today_is_an_allowed_date(self):
        form = ExternalGameForm(data=self._form_data(date=date.today().isoformat()))

        assert form.is_valid(), form.errors.as_text()

    def test_halftime_below_five_is_rejected(self):
        form = ExternalGameForm(data=self._form_data(halftime_duration="4"))

        assert not form.is_valid()
        assert "5 und 35 Minuten" in form.errors.as_text()

    def test_halftime_above_thirty_five_is_rejected(self):
        form = ExternalGameForm(data=self._form_data(halftime_duration="36"))

        assert not form.is_valid()
        assert "5 und 35 Minuten" in form.errors.as_text()

    def test_halftime_boundaries_are_allowed(self):
        for duration in ("5", "35"):
            with self.subTest(duration=duration):
                form = ExternalGameForm(
                    data=self._form_data(halftime_duration=duration)
                )
                assert form.is_valid(), form.errors.as_text()


class TestMultiAddUi(SelfServiceFormTestBase):
    def test_table_is_responsive_and_field_labels_are_visible(self):
        content = self.client.get(reverse(MULTI_ADD_URL_NAME)).content.decode()

        assert "table-responsive" in content
        assert "Datum:" in content
        assert "Position:" in content
        assert "Verband:" in content

    def test_errors_use_bootstrap_styling(self):
        future = (date.today() + timedelta(days=1)).isoformat()

        response = self.client.post(
            reverse(MULTI_ADD_URL_NAME),
            self._formset_data(
                [
                    {
                        "date": future,
                        "halftime_duration": "40",
                        "position": "",
                    }
                ]
            ),
        )
        content = response.content.decode()

        assert response.status_code == 200
        assert "text-danger" in content
        assert "is-invalid" in content
        assert "Das Datum darf nicht in der Zukunft liegen." in content
        assert "5 und 35 Minuten" in content

    def test_add_row_button_is_on_its_own_row(self):
        content = self.client.get(reverse(MULTI_ADD_URL_NAME)).content.decode()

        add_row_at = content.index("Weitere Zeile hinzufügen")
        save_at = content.index("Alle speichern")
        assert add_row_at < save_at
        row_start = content.rfind('<div class="row', 0, add_row_at)
        row_end = content.find("</div>", add_row_at)
        own_row = content[row_start:row_end]
        assert "Weitere Zeile hinzufügen" in own_row
        assert "Alle speichern" not in own_row
        assert "Abbrechen" not in own_row

    def test_save_and_cancel_share_one_row(self):
        content = self.client.get(reverse(MULTI_ADD_URL_NAME)).content.decode()

        shared = self._buttons_share_row(content, "Alle speichern", "Abbrechen")

        assert "btn btn-primary w-100" in shared
        assert "btn btn-outline-danger" in shared


class TestExternalEditUi(SelfServiceFormTestBase):
    def test_save_and_cancel_share_one_row(self):
        entry = self._external_entry()

        content = self.client.get(
            reverse(EXTERNAL_EDIT_URL_NAME, kwargs={"pk": entry.pk})
        ).content.decode()

        shared = self._buttons_share_row(content, "Speichern", "Abbrechen")

        assert "btn btn-primary w-100" in shared
        assert "btn btn-outline-danger" in shared
