import pytest
from django.test import TestCase

from gamedays.models import GameOfficial, Gameinfo
from gamedays.tests.setup_factories.db_setup import DBSetup
from gamedays.tests.setup_factories.factories import TeamFactory
from officials.models import Official, OfficialExternalGames
from officials.service.game_official_entries import (
    ALLOWED_POSITIONS,
    AmbiguousGameOfficialError,
    EXTERNAL_ALLOWED_POSITIONS,
    ExternalGameOfficialEntry,
    GameOfficialCorrectionEntry,
    InternalGameOfficialEntry,
    check_for_allowed_value,
    classify_match_count,
    convert_to_int,
    find_game_officials,
)
from officials.tests.setup_factories.db_setup_officials import DbSetupOfficials
from officials.tests.setup_factories.factories_officials import OfficialFactory


class TestInternalGameOfficialEntry(TestCase):
    def test_check_for_type_throws_error(self):
        with pytest.raises(TypeError, match="attribute_name muss eine Zahl sein"):
            convert_to_int("attribute_name", "string")

    def test_check_for_type_is_correct(self):
        assert convert_to_int("attribute_name", "7") == 7

    def test_check_for_correct_value_is_illegal(self):
        with pytest.raises(ValueError, match="Position muss genau einen"):
            check_for_allowed_value("referee")

    def test_internal_game_official_init_throws_exception_for_according_value(self):
        with pytest.raises(TypeError, match=r"gameinfo_id muss eine Zahl sein"):
            wrong_int_value = "string"
            InternalGameOfficialEntry(wrong_int_value, None, None)
        with pytest.raises(TypeError, match=r"official_id muss eine Zahl sein"):
            wrong_int_value = "string"
            InternalGameOfficialEntry(1, wrong_int_value, None)


class TestAllowedPositions(TestCase):
    def test_check_for_allowed_value_accepts_every_allowed_position(self):
        for position in ALLOWED_POSITIONS:
            assert check_for_allowed_value(position) == position

    def test_allowed_positions_are_the_four_official_roles(self):
        assert ALLOWED_POSITIONS == (
            "Referee",
            "Down Judge",
            "Field Judge",
            "Side Judge",
        )

    def test_external_allowed_positions_add_mix_to_the_four_official_roles(self):
        assert EXTERNAL_ALLOWED_POSITIONS == ALLOWED_POSITIONS + ("Mix",)


class TestExternalGameOfficialEntry(TestCase):
    def setUp(self):
        DbSetupOfficials.create_production_associations()

    def test_all_ten_fields_are_persisted_correctly_not_just_seven(self):
        # Regression test: ExternalGameOfficialEntry used to build
        # OfficialExternalGames(None, *self.constructor_values), passing
        # only 7 of 10 fields positionally - position landed in
        # notification_date's slot, association in reporter_name, etc.
        team = TeamFactory(name="Test Team")
        official = OfficialFactory(first_name="Franzi", last_name="Fedora", team=team)

        entry = ExternalGameOfficialEntry(
            official_id=official.pk,
            number_games=3,
            date="2024-05-01",
            position="Referee",
            association="Hamburg",
            halftime_duration=20,
            has_clockcontrol=True,
            is_international=True,
            reporter_name="Some Reporter",
            notification_date="2024-05-02",
            comment="a comment",
        )
        entry.save()

        saved = OfficialExternalGames.objects.get()
        assert saved.official_id == official.pk
        assert saved.number_games == 3
        assert str(saved.date) == "2024-05-01"
        assert saved.position == "Referee"
        assert saved.association.abbr == "AFCVHH"
        assert saved.halftime_duration == 20
        assert saved.has_clockcontrol is True
        assert saved.is_international is True
        assert saved.reporter_name == "Some Reporter"
        assert str(saved.notification_date) == "2024-05-02"
        assert saved.comment == "a comment"

    def test_defaults_are_applied_when_optional_fields_are_omitted(self):
        team = TeamFactory(name="Test Team")
        official = OfficialFactory(first_name="Franzi", last_name="Fedora", team=team)

        entry = ExternalGameOfficialEntry(
            official_id=official.pk,
            number_games=1,
            date="2024-05-01",
            position="Referee",
            association="Hamburg",
            halftime_duration=20,
        )
        entry.save()

        saved = OfficialExternalGames.objects.get()
        assert saved.has_clockcontrol is False
        assert saved.is_international is False
        assert saved.reporter_name == ""
        # OfficialExternalGames.comment has no null=True despite its
        # default=None (see migration 0008) - the DB column is NOT NULL,
        # so an omitted comment is normalized to "" rather than None.
        assert saved.comment == ""

    def test_official_not_found_raises_does_not_exist(self):
        entry = ExternalGameOfficialEntry(
            official_id=99999,
            number_games=1,
            date="2024-05-01",
            position="Referee",
            association="Hamburg",
            halftime_duration=20,
        )
        with pytest.raises(Official.DoesNotExist):
            entry.save()


class TestFindGameOfficials(TestCase):
    def test_returns_matching_game_officials_for_gameinfo_and_position(self):
        gameday = DBSetup().g62_status_empty()
        gameinfo = Gameinfo.objects.first()
        DBSetup().create_game_officials(gameinfo)

        matches = find_game_officials(gameinfo.pk, "Referee")

        assert len(matches) == 1
        assert matches[0].gameinfo_id == gameinfo.pk
        assert matches[0].position == "Referee"

    def test_returns_empty_list_when_no_game_official_exists_for_position(self):
        gameday = DBSetup().g62_status_empty()
        gameinfo = Gameinfo.objects.first()

        matches = find_game_officials(gameinfo.pk, "Referee")

        assert matches == []

    def test_returns_all_matches_when_more_than_one_exists(self):
        gameday = DBSetup().g62_status_empty()
        gameinfo = Gameinfo.objects.first()
        DBSetup().create_game_officials(gameinfo)
        GameOfficial.objects.create(gameinfo=gameinfo, position="Referee")

        matches = find_game_officials(gameinfo.pk, "Referee")

        assert len(matches) == 2


class TestClassifyMatchCount(TestCase):
    def test_zero_matches_is_create(self):
        assert classify_match_count([]) == "create"

    def test_one_match_is_update(self):
        assert classify_match_count(["a single match"]) == "update"

    def test_two_or_more_matches_is_ambiguous(self):
        assert classify_match_count(["match one", "match two"]) == "ambiguous"
        assert (
            classify_match_count(["match one", "match two", "match three"])
            == "ambiguous"
        )


class TestGameOfficialCorrectionEntry(TestCase):
    def test_init_validates_ids_and_position(self):
        with pytest.raises(TypeError, match=r"gameinfo_id muss eine Zahl sein"):
            GameOfficialCorrectionEntry("not-a-number", 1, "Referee")
        with pytest.raises(TypeError, match=r"official_id muss eine Zahl sein"):
            GameOfficialCorrectionEntry(1, "not-a-number", "Referee")
        with pytest.raises(ValueError, match="Position muss genau einen"):
            GameOfficialCorrectionEntry(1, 1, "referee")

    def test_gameinfo_not_found_raises_does_not_exist(self):
        DbSetupOfficials().create_officials_and_team()
        official = Official.objects.first()
        entry = GameOfficialCorrectionEntry(99999, official.pk, "Referee")
        with pytest.raises(Gameinfo.DoesNotExist):
            entry.save()

    def test_official_not_found_raises_does_not_exist(self):
        DBSetup().g62_status_empty()
        gameinfo = Gameinfo.objects.first()
        entry = GameOfficialCorrectionEntry(gameinfo.pk, 99999, "Referee")
        with pytest.raises(Official.DoesNotExist):
            entry.save()

    def test_zero_matches_creates_a_new_game_official(self):
        DBSetup().g62_status_empty()
        gameinfo = Gameinfo.objects.first()
        DbSetupOfficials().create_officials_and_team()
        official = Official.objects.first()

        entry = GameOfficialCorrectionEntry(gameinfo.pk, official.pk, "Referee")
        entry.save()

        created = GameOfficial.objects.get(gameinfo=gameinfo, position="Referee")
        assert created.official_id == official.pk

    def test_one_match_updates_the_existing_game_official(self):
        DBSetup().g62_status_empty()
        gameinfo = Gameinfo.objects.first()
        DBSetup().create_game_officials(gameinfo)
        DbSetupOfficials().create_officials_and_team()
        official = Official.objects.last()
        existing = GameOfficial.objects.get(gameinfo=gameinfo, position="Referee")
        assert existing.official is None

        entry = GameOfficialCorrectionEntry(gameinfo.pk, official.pk, "Referee")
        entry.save()

        existing.refresh_from_db()
        assert existing.official_id == official.pk
        assert (
            GameOfficial.objects.filter(gameinfo=gameinfo, position="Referee").count()
            == 1
        )

    def test_two_or_more_matches_raises_ambiguous_error(self):
        DBSetup().g62_status_empty()
        gameinfo = Gameinfo.objects.first()
        DBSetup().create_game_officials(gameinfo)
        GameOfficial.objects.create(gameinfo=gameinfo, position="Referee")
        DbSetupOfficials().create_officials_and_team()
        official = Official.objects.first()

        entry = GameOfficialCorrectionEntry(gameinfo.pk, official.pk, "Referee")
        with pytest.raises(AmbiguousGameOfficialError):
            entry.save()
