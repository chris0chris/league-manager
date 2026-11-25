import pytest

from gamedays.models import Association
from officials.service.association_resolution import (
    ASSOCIATION_ALIASES,
    UnknownAssociationError,
    resolve_association,
)

# The 19 association rows that exist in production (abbr, name).
ASSOCIATIONS = [
    ("AFVBY", "Bayern"),
    ("OHNE", "-"),
    ("AFCVBW", "Baden-Württemberg"),
    ("AFCVBB", "Berlin-Brandenburg"),
    ("AFCVHH", "Hamburg"),
    ("AFCVMV", "Mecklenburg-Vorpommern"),
    ("AFCVN", "Niedersachsen"),
    ("AFCVNORD", "Nord"),
    ("AFCVNRW", "Nordrhein-Westfalen"),
    ("AFCVRLP", "Rheinland-Pfalz"),
    ("AFCVSAA", "Saarland"),
    ("AFCVSH", "Schleswig-Holstein"),
    ("AFCVT", "Thüringen"),
    ("AFVH", "Hessen"),
    ("AFVS", "Sachsen"),
    ("AFVSA", "Sachsen-Anhalt"),
    ("LUX", "Luxemburg"),
    ("SAFV", "Schweiz"),
    ("BAFL", "Belgien"),
]

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
    for abbr, name in ASSOCIATIONS:
        Association.objects.create(abbr=abbr, name=name)


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
