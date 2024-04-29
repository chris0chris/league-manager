import time
from unittest.mock import patch, MagicMock

from django.test import TestCase

from officials.models import Official, OfficialLicenseHistory, OfficialLicense
from officials.service.moodle.moodle_api import MoodleApi, ApiCourse, ApiParticipants, ApiUserInfo, ApiUpdateUser
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

    def test_get_license_name(self):
        assert LicenseCalculator.get_license_name(1) == 'F1'
        assert LicenseCalculator.get_license_name(3) == 'F2'
        assert LicenseCalculator.get_license_name(2) == 'F3'
        assert LicenseCalculator.get_license_name(4) == ''


class TestGameService(TestCase):
    @patch.object(MoodleApi, 'update_user')
    @patch.object(MoodleApi, 'get_participants_for_course')
    @patch.object(MoodleApi, 'get_user_info_by_id')
    def test_update_licenses_with_no_matching_category_id(self, user_mock: MagicMock, participants_mock: MagicMock,
                                                          update_user_mock: MagicMock):
        course = ApiCourse({
            "id": 1,
            "categoryid": 5,
            "enddate": time.time(),
            "fullname": "course name 4",
        })
        moodle_service = MoodleService()
        result = moodle_service.get_participants_from_course(course)
        participants_mock.assert_not_called()
        user_mock.assert_not_called()
        update_user_mock.assert_not_called()
        team_name_set_index, missed_official_index, course_result_index = 0, 1, 2
        assert len(result[team_name_set_index]) == 0
        assert len(result[missed_official_index]) == 0
        course_result = result[course_result_index]
        assert course_result['course'] == 'course name 4'
        assert course_result['officials_count'] == 0
        assert len(course_result['officials']) == 0

    @patch.object(MoodleApi, 'update_user')
    @patch.object(MoodleApi, 'get_participants_for_course')
    @patch.object(MoodleApi, 'get_user_info_by_id')
    def test_update_licenses_no_matching_teams(self, user_mock: MagicMock, participants_mock: MagicMock,
                                               update_user_mock: MagicMock):
        user_id = 1
        user_id_2 = 2
        course = ApiCourse({
            "id": 1,
            "categoryid": 2,
            "enddate": time.time(),
            "fullname": "course name 1",
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
                        'shortname': 'Team',
                        'value': 'teamname moodle'
                    }]
                }]),
            user_id: ApiUserInfo([
                {
                    'firstname': 'moodle first',
                    'lastname': 'moodle last',
                    'id': user_id,
                    'customfields': [{
                        'shortname': 'Team',
                        'value': 'moodle teamname'
                    }]
                }]),
        }.get
        moodle_service = MoodleService()
        result = moodle_service.get_participants_from_course(course)
        assert participants_mock.call_count == 1
        assert user_mock.call_count == 2
        team_name_set_index, missed_official_index, course_result_index = 0, 1, 2
        assert result[team_name_set_index] == {'moodle teamname', 'teamname moodle'}
        assert len(result[missed_official_index]) == 2
        course_result = result[course_result_index]
        assert course_result['course'] == 'course name 1'
        assert course_result['officials_count'] == 0
        assert len(course_result['officials']) == 0
        update_user_mock.assert_not_called()

    @patch.object(MoodleApi, 'update_user')
    @patch.object(MoodleApi, 'get_participants_for_course')
    @patch.object(MoodleApi, 'get_user_info_by_id')
    def test_update_licenses_create_official(self, user_mock: MagicMock, participants_mock: MagicMock,
                                             update_user_mock: MagicMock):
        user_id = 82
        team = DbSetupOfficials().create_officials_and_team()
        license_f1 = OfficialLicense.objects.get(name='F1')
        license_f1.id = 1
        license_f1.save()
        course = ApiCourse({
            "id": 1,
            "categoryid": 4,
            "enddate": time.time(),
            "fullname": "course name",
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
                    'customfields': [
                        {
                            'shortname': 'Team',
                            'value': team.description
                        }, {
                            'shortname': 'Landesverband',
                            'value': 'Ja.'
                        }, {
                            'shortname': 'LandesverbandAuswahl',
                            'value': 'Association name'
                        },
                    ]
                }]),
        }.get
        moodle_service = MoodleService()
        result = moodle_service.get_participants_from_course(course)
        created_official: Official = Official.objects.last()
        assert created_official.last_name == 'moodle insert last'
        assert created_official.association.name == 'Association name'
        assert OfficialLicenseHistory.objects.get(official=created_official).result == 70
        team_name_set_index, missed_official_index, course_result_index = 0, 1, 2
        course_result = result[course_result_index]
        assert course_result['course'] == 'course name'
        assert course_result['officials_count'] == 1
        assert len(course_result['officials']) == 1
        assert len(result[team_name_set_index]) == 0
        assert len(result[missed_official_index]) == 0
        actual_api_user_update: ApiUpdateUser = update_user_mock.call_args[0][0]
        assert actual_api_user_update.user_id == user_id
        assert actual_api_user_update.license_number == created_official.pk
        assert actual_api_user_update.license_name == 'F1'

    @patch.object(MoodleApi, 'update_user')
    @patch.object(MoodleApi, 'get_participants_for_course')
    @patch.object(MoodleApi, 'get_user_info_by_id')
    def test_update_licenses_update_official(self, user_mock: MagicMock, participants_mock: MagicMock,
                                             update_user_mock: MagicMock):
        team = DbSetupOfficials().create_officials_and_team()
        # id workaround need to be done due testdatabase ids are not reset
        official: Official = Official.objects.last()
        official.external_id = 7
        official.save()
        official_license = OfficialLicense.objects.filter(name='F2').first()
        official_license.id = 3
        official_license.save()
        course = ApiCourse({
            "id": 1,
            "categoryid": 3,
            "enddate": time.time(),
            "fullname": "course name 2",
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
                    'customfields': [
                        {
                            'shortname': 'Team',
                            'value': team.description,
                        },
                        {
                            'shortname': 'Landesverband',
                            'value': 'Nein.',
                        },
                    ]
                }]),
        }.get
        moodle_service = MoodleService()
        result = moodle_service.get_participants_from_course(course)
        updated_official: Official = Official.objects.get(pk=official.pk)
        assert updated_official.last_name == 'moodle insert last'
        assert updated_official.association is None
        assert OfficialLicenseHistory.objects.filter(official=updated_official).count() == 2
        assert OfficialLicenseHistory.objects.filter(official=updated_official).last().result == 70
        team_name_set_index, missed_official_index, course_result_index = 0, 1, 2
        course_result = result[course_result_index]
        assert course_result['course'] == 'course name 2'
        assert course_result['officials_count'] == 1
        assert len(course_result['officials']) == 1
        assert len(result[team_name_set_index]) == 0
        assert len(result[missed_official_index]) == 0
        actual_api_user_update: ApiUpdateUser = update_user_mock.call_args[0][0]
        assert actual_api_user_update.user_id == updated_official.external_id
        assert actual_api_user_update.license_number == updated_official.pk
        assert actual_api_user_update.license_name == 'F2'

    @patch.object(MoodleApi, 'update_user')
    @patch.object(MoodleApi, 'get_participants_for_course')
    @patch.object(MoodleApi, 'get_user_info_by_id')
    def test_update_licenses_user_has_no_result(self, user_mock: MagicMock, participants_mock: MagicMock,
                                                update_user_mock: MagicMock):
        user_id = 7
        course = ApiCourse({
            "id": 1,
            "categoryid": 3,
            "enddate": time.time(),
            "fullname": "course name 3",
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
        result = moodle_service.get_participants_from_course(course)
        user_mock.assert_not_called()
        update_user_mock.assert_not_called()
        team_name_set_index, missed_official_index, course_result_index = 0, 1, 2
        course_result = result[course_result_index]
        assert course_result['course'] == 'course name 3'
        assert course_result['officials_count'] == 0
        assert len(course_result['officials']) == 0
        assert len(result[team_name_set_index]) == 0
        assert len(result[missed_official_index]) == 0

    @patch.object(MoodleApi, 'get_participants_for_course')
    def test_get_all_users_for_course(self, participants_mock: MagicMock):
        course_id = 57
        participants_mock.return_value = ApiParticipants({
            'usergrades': [
                {
                    'courseid': course_id,
                    'userid': 1,
                    'gradeitems': [{
                        'graderaw': None,
                        'grademax': 10,
                    }],
                },
                {
                    'courseid': course_id,
                    'userid': 5,
                    'gradeitems': [{
                        'graderaw': None,
                        'grademax': 10,
                    }],
                },
                {
                    'courseid': course_id,
                    'userid': 7,
                    'gradeitems': [{
                        'graderaw': None,
                        'grademax': 10,
                    }],
                },
            ]
        })
        moodle_service = MoodleService()
        result = moodle_service.get_all_users_for_course(course_id)
        assert result == [1, 5, 7]

        participants_mock.assert_called_once_with(57)
