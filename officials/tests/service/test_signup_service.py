import pytest
from django.test import TestCase

from gamedays.tests.setup_factories.db_setup import DBSetup
from officials.models import Official, OfficialGamedaySignup
from officials.service.signup_service import MaxSignupError, OfficialSignupService, DuplicateSignupError
from officials.tests.setup_factories.db_setup_officials import DbSetupOfficials


class TestOfficialSignupService(TestCase):
    def test_create_signup_allows_only_maximum_entries(self):
        gameday = DBSetup().create_empty_gameday()
        gameday.format = '1_1'
        gameday.save()
        team = DbSetupOfficials().create_officials_and_team()
        DbSetupOfficials().create_multiple_officials(5, team)
        all_officials = Official.objects.all()
        for i in range(6):
            OfficialGamedaySignup.objects.create(gameday=gameday, official=all_officials[i])
        with pytest.raises(MaxSignupError):
            OfficialSignupService.create_signup(gameday_id=gameday.pk, official_id=all_officials[6].pk)

    def test_create_signup_does_not_allow_duplicates(self):
        gameday = DBSetup().create_empty_gameday()
        DbSetupOfficials().create_officials_and_team()
        official = Official.objects.first()
        OfficialGamedaySignup.objects.create(gameday=gameday, official=official)
        with pytest.raises(DuplicateSignupError):
            OfficialSignupService.create_signup(gameday_id=gameday.pk, official_id=official.pk)

    def test_successfully_signed_up(self):
        gameday = DBSetup().create_empty_gameday()
        DbSetupOfficials().create_officials_and_team()
        official = Official.objects.first()
        OfficialSignupService.create_signup(gameday_id=gameday.pk, official_id=official.pk)
        signup = OfficialGamedaySignup.objects.first()
        assert signup.gameday == gameday
        assert signup.official == official

