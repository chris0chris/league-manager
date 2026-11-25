import pytest

from gamedays.models import Association
from gamedays.tests.setup_factories.factories import TeamFactory
from officials.api.serializers import OfficialExternalGamesSerializer
from officials.models import OfficialExternalGames
from officials.service.association_resolution import (
    ASSOCIATION_ALIASES,
    UnknownAssociationError,
    resolve_association,
)
from officials.service.game_official_entries import ExternalGameOfficialEntry
from officials.tests.setup_factories.db_setup_officials import (
    PRODUCTION_ASSOCIATIONS,
    DbSetupOfficials,
)
from officials.tests.setup_factories.factories_officials import (
    OfficialExternalGamesFactory,
    OfficialFactory,
)

# Every distinct value found in the production dump's free-text association
# column, mapped onto the association it must resolve to (user-fixed mapping:
# no new association rows are created).
PRODUCTION_VALUES = [
    ("OHNE", "OHNE"),
    ("AFCVBB", "AFCVBB"),
    ("AFCVBW", "AFCVBW"),
    ("AFVBY", "AFVBY"),
    ("AFVH", "AFVH"),
    ("AFCVMV", "AFCVMV"),
    ("AFCVN", "AFCVN"),
    ("AFVS", "AFVS"),
    ("AFCVNRW", "AFCVNRW"),
    ("AFCVT", "AFCVT"),
    ("AFCVSH", "AFCVSH"),
    ("AFVSA", "AFVSA"),
    ("AFCVHH", "AFCVHH"),
    ("AFCVNORD", "AFCVNORD"),
    ("AFCVRLP", "AFCVRLP"),
    ("AFCVSAA", "AFCVSAA"),
    ("AFCVTH", "AFCVT"),
    ("Spielverbund Nord", "AFCVNORD"),
    ("Ausland", "OHNE"),
    ("Scrimmage", "OHNE"),
    ("Natio", "OHNE"),
]


@pytest.fixture
def associations(db):
    DbSetupOfficials.create_production_associations()


class TestAssociationResolution:
    @pytest.mark.parametrize("value,expected_abbr", PRODUCTION_VALUES)
    def test_every_production_value_maps(self, associations, value, expected_abbr):
        assert resolve_association(value).abbr == expected_abbr

    def test_name_fallback(self, associations):
        assert resolve_association("Hamburg").abbr == "AFCVHH"

    def test_alias_map_is_exactly_the_documented_one(self):
        assert ASSOCIATION_ALIASES == {
            "AFCVTH": "AFCVT",
            "Spielverbund Nord": "AFCVNORD",
            "Ausland": "OHNE",
            "Scrimmage": "OHNE",
            "Natio": "OHNE",
        }

    def test_unknown_raises(self, associations):
        with pytest.raises(UnknownAssociationError):
            resolve_association("Fantasie-Verband")

    @pytest.mark.parametrize("value", ["", "   ", None])
    def test_empty_raises(self, db, value):
        with pytest.raises(UnknownAssociationError):
            resolve_association(value)

    def test_unknown_error_is_a_value_error(self):
        assert issubclass(UnknownAssociationError, ValueError)


class TestExternalGameAssociationIntegration:
    """The column used to be free text; entry save and the API have to keep
    working with both the old string inputs and the new FK."""

    def _entry(self, official, association):
        return ExternalGameOfficialEntry(
            official_id=official.pk,
            number_games=2,
            date="2024-05-01",
            position="Referee",
            association=association,
            halftime_duration=20,
        )

    def test_entry_save_resolves_association_string(self, associations):
        team = TeamFactory(name="Test Team")
        official = OfficialFactory(first_name="Franzi", last_name="Fedora", team=team)

        self._entry(official, "AFCVTH").save()

        assert OfficialExternalGames.objects.get().association.abbr == "AFCVT"

    def test_entry_save_unknown_association_raises(self, associations):
        team = TeamFactory(name="Test Team")
        official = OfficialFactory(first_name="Franzi", last_name="Fedora", team=team)

        with pytest.raises(UnknownAssociationError):
            self._entry(official, "Fantasie").save()

        assert OfficialExternalGames.objects.count() == 0

    def test_serializer_keeps_abbr_wire_format(self, associations):
        team = TeamFactory(name="Test Team")
        official = OfficialFactory(first_name="Franzi", last_name="Fedora", team=team)
        row = OfficialExternalGamesFactory(
            official=official,
            number_games=2,
            date="2024-05-01",
            notification_date="2024-05-01",
            position="Referee",
            association=Association.objects.get(abbr="OHNE"),
            halftime_duration=20,
            has_clockcontrol=False,
            is_international=False,
            reporter_name="",
            comment="",
        )

        data = OfficialExternalGamesSerializer(instance=row).data

        assert data["association"] == "OHNE"
