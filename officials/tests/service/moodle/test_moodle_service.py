import time
from unittest.mock import patch, MagicMock

from django.test import TestCase

from officials.models import Official, OfficialLicenseHistory, OfficialLicense
from officials.service.moodle.moodle_api import MoodleApi, ApiCourses, ApiParticipants, ApiUserInfo
from officials.service.moodle.moodle_service import MoodleService, LicenseCalculator
from officials.tests.setup_factories.db_setup_officials import DbSetupOfficials


class TestLicenseCalculator:

    def test_calculate_f1_license(self):
        license_calculator = LicenseCalculator()
        result = license_calculator.calculate(1, 70)
        assert result == 1

    def test_calculate_f1_license_next_rank(self):
        license_calculator = LicenseCalculator()
        result = license_calculator.calculate(1, 50)
        assert result == 3

    def test_calculate_f3_license_fail_exam(self):
        license_calculator = LicenseCalculator()
        result = license_calculator.calculate(1, 49)
        assert result == 4

    def test_calculate_f2_license(self):
        license_calculator = LicenseCalculator()
        result = license_calculator.calculate(3, 70)
        assert result == 3

    def test_calculate_f2_license_next_rank(self):
        license_calculator = LicenseCalculator()
        result = license_calculator.calculate(3, 50)
        assert result == 2

    def test_calculate_f2_license_fail_exam(self):
        license_calculator = LicenseCalculator()
        result = license_calculator.calculate(3, 49)
        assert result == 4

    def test_calculate_f3_license(self):
        license_calculator = LicenseCalculator()
        result = license_calculator.calculate(2, 70)
        assert result == 2

    def test_calculate_f3_license_next_rank(self):
        license_calculator = LicenseCalculator()
        result = license_calculator.calculate(2, 69)
        assert result == 4


class TestGameService(TestCase):

    @patch.object(MoodleApi, 'get_courses')
    @patch.object(MoodleApi, 'get_participants_for_course')
    @patch.object(MoodleApi, 'get_user_info')
    def test_update_licenses_with_no_matching_category_id(self, user_mock: MagicMock, participants_mock: MagicMock,
                                                          courses_mock: MagicMock):
        courses_mock.return_value = ApiCourses({
            "courses": [
                {
                    "id": 1,
                    "categoryid": 5,
                    "enddate": 0
                },
            ]
        })
        moodle_service = MoodleService()
        result = moodle_service.update_licenses()
        assert participants_mock.call_count == 0
        assert user_mock.call_count == 0
        assert len(result['missing_team_names']) == 0
        assert len(result['missed_officials']) == 0
        assert len(result['result_list']) == 0

    @patch.object(MoodleApi, 'get_courses')
    @patch.object(MoodleApi, 'get_participants_for_course')
    @patch.object(MoodleApi, 'get_user_info')
    def test_update_licenses_no_matching_teams(self, user_mock: MagicMock, participants_mock: MagicMock,
                                               courses_mock: MagicMock):
        user_id = 1
        user_id_2 = 2
        courses_mock.return_value = ApiCourses({
            "courses": [
                {
                    "id": 1,
                    "categoryid": 2,
                    "enddate": time.time()
                },
            ]
        })
        participants_mock.return_value = ApiParticipants({
            'usergrades': [
                {
                    'courseid': 5,
                    'userid': user_id,
                    'gradeitems': [{
                        'graderaw': 1,
                        'grademax': 10,
                    }],
                },
                {
                    'courseid': 5,
                    'userid': user_id_2,
                    'gradeitems': [{
                        'graderaw': 1,
                        'grademax': 10,
                    }],
                }
            ]
        })
        user_mock.side_effect = {
            user_id_2: ApiUserInfo([
                {
                    'firstname': 'first moodle',
                    'lastname': 'last moodle',
                    'id': user_id_2,
                    'customfields': [{
                        'name': 'Teamname',
                        'value': 'teamname moodle'
                    }]
                }]),
            user_id: ApiUserInfo([
                {
                    'firstname': 'moodle first',
                    'lastname': 'moodle last',
                    'id': user_id,
                    'customfields': [{
                        'name': 'Teamname',
                        'value': 'moodle teamname'
                    }]
                }]),
        }.get
        moodle_service = MoodleService()
        result = moodle_service.update_licenses()
        assert participants_mock.call_count == 1
        assert user_mock.call_count == 2
        assert result['missing_team_names'] == ['moodle teamname', 'teamname moodle']
        assert len(result['missed_officials']) == 2
        assert len(result['result_list']) == 0

    @patch.object(MoodleApi, 'get_courses')
    @patch.object(MoodleApi, 'get_participants_for_course')
    @patch.object(MoodleApi, 'get_user_info')
    def test_update_licenses_create_official(self, user_mock: MagicMock, participants_mock: MagicMock,
                                             courses_mock: MagicMock):
        user_id = 82
        team = DbSetupOfficials().create_officials_and_team()
        license_f1 = OfficialLicense.objects.get(name='F1')
        license_f1.id = 1
        license_f1.save()
        courses_mock.return_value = ApiCourses({
            "courses": [
                {
                    "id": 1,
                    "categoryid": 4,
                    "enddate": time.time()
                },
            ]
        })
        participants_mock.return_value = ApiParticipants({
            'usergrades': [
                {
                    'courseid': 5,
                    'userid': user_id,
                    'gradeitems': [{
                        'graderaw': 691,
                        'grademax': 1000,
                    }],
                }
            ]
        })
        user_mock.side_effect = {
            user_id: ApiUserInfo([
                {
                    'firstname': 'moodle insert last',
                    'lastname': 'moodle insert last',
                    'id': user_id,
                    'customfields': [{
                        'name': 'Teamname',
                        'value': team.description
                    }]
                }]),
        }.get
        moodle_service = MoodleService()
        result = moodle_service.update_licenses()
        created_official: Official = Official.objects.last()
        assert created_official.last_name == 'moodle insert last'
        assert OfficialLicenseHistory.objects.get(official=created_official).result == 70
        assert len(result['missing_team_names']) == 0
        assert len(result['missed_officials']) == 0
        assert len(result['result_list']) == 1

    @patch.object(MoodleApi, 'get_courses')
    @patch.object(MoodleApi, 'get_participants_for_course')
    @patch.object(MoodleApi, 'get_user_info')
    def test_update_licenses_update_official(self, user_mock: MagicMock, participants_mock: MagicMock,
                                             courses_mock: MagicMock):
        team = DbSetupOfficials().create_officials_and_team()
        # id workaround need to be done due testdatabase ids are not reset
        official: Official = Official.objects.last()
        official.external_id = 7
        official.save()
        official_license = OfficialLicense.objects.filter(name='F2').first()
        official_license.id = 3
        official_license.save()
        courses_mock.return_value = ApiCourses({
            "courses": [
                {
                    "id": 1,
                    "categoryid": 3,
                    "enddate": time.time()
                },
            ]
        })
        participants_mock.return_value = ApiParticipants({
            'usergrades': [
                {
                    'courseid': 5,
                    'userid': official.external_id,
                    'gradeitems': [{
                        'graderaw': 7,
                        'grademax': 10,
                    }],
                }
            ]
        })
        user_mock.side_effect = {
            official.external_id: ApiUserInfo([
                {
                    'firstname': 'moodle insert last',
                    'lastname': 'moodle insert last',
                    'id': official.external_id,
                    'customfields': [{
                        'name': 'Teamname',
                        'value': team.description
                    }]
                }]),
        }.get
        moodle_service = MoodleService()
        result = moodle_service.update_licenses()
        updated_official: Official = Official.objects.get(pk=official.pk)
        assert updated_official.last_name == 'moodle insert last'
        assert OfficialLicenseHistory.objects.filter(official=updated_official).count() == 2
        assert OfficialLicenseHistory.objects.filter(official=updated_official).last().result == 70
        assert len(result['missing_team_names']) == 0
        assert len(result['missed_officials']) == 0
        assert len(result['result_list']) == 1

    @patch.object(MoodleApi, 'get_courses')
    @patch.object(MoodleApi, 'get_participants_for_course')
    def test_update_licenses_user_has_no_result(self, participants_mock: MagicMock,
                                                courses_mock: MagicMock):
        user_id = 7
        courses_mock.return_value = ApiCourses({
            "courses": [
                {
                    "id": 1,
                    "categoryid": 3,
                    "enddate": time.time()
                },
            ]
        })
        participants_mock.return_value = ApiParticipants({
            'usergrades': [
                {
                    'courseid': 5,
                    'userid': user_id,
                    'gradeitems': [{
                        'graderaw': None,
                        'grademax': 10,
                    }],
                }
            ]
        })
        moodle_service = MoodleService()
        result = moodle_service.update_licenses()
        assert len(result['missing_team_names']) == 0
        assert len(result['missed_officials']) == 0
        assert len(result['result_list']) == 0