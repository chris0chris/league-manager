import time
from unittest.mock import patch, MagicMock

import pytest
from django.test import TestCase

from officials.models import Official, OfficialLicenseHistory
from officials.service.boff_license_calculation import LicenseCalculator, LicenseStrategy
from officials.service.moodle.moodle_api import MoodleApi, ApiCourse, ApiParticipants, ApiUserInfo, ApiUpdateUser, \
    ApiExams, ApiExamResult
from officials.service.moodle.moodle_service import MoodleService
from officials.tests.setup_factories.db_setup_officials import DbSetupOfficials
from officials.tests.setup_factories.factories_officials import OfficialLicenseHistoryFactory, OfficialLicenseFactory


class TestLicenseCalculator:
    @pytest.mark.parametrize("course_type, score, expected_license", [
        (LicenseStrategy.F1_LICENSE, 80, LicenseStrategy.F1_LICENSE),
        (LicenseStrategy.F1_LICENSE, 70, LicenseStrategy.F1_LICENSE),
        (LicenseStrategy.F1_LICENSE, 69, LicenseStrategy.F2_LICENSE),
        (LicenseStrategy.F1_LICENSE, 49, LicenseStrategy.F3_LICENSE),
        (LicenseStrategy.F1_LICENSE, 0, LicenseStrategy.NO_LICENSE),

        (LicenseStrategy.F2_LICENSE, 80, LicenseStrategy.F2_LICENSE),
        (LicenseStrategy.F2_LICENSE, 70, LicenseStrategy.F2_LICENSE),
        (LicenseStrategy.F2_LICENSE, 69, LicenseStrategy.F3_LICENSE),
        (LicenseStrategy.F2_LICENSE, 49, LicenseStrategy.NO_LICENSE),

        (LicenseStrategy.F3_LICENSE, 80, LicenseStrategy.F3_LICENSE),
        (LicenseStrategy.F3_LICENSE, 70, LicenseStrategy.F3_LICENSE),
        (LicenseStrategy.F3_LICENSE, 69, LicenseStrategy.F4_LICENSE),
        (LicenseStrategy.F3_LICENSE, 49, LicenseStrategy.NO_LICENSE),

        (LicenseStrategy.F4_LICENSE, 80, LicenseStrategy.F4_LICENSE),
        (LicenseStrategy.F4_LICENSE, 70, LicenseStrategy.F4_LICENSE),
        (LicenseStrategy.F4_LICENSE, 69, LicenseStrategy.NO_LICENSE),
    ])
    def test_calculate_license(self, course_type, score, expected_license):
        license_calculator = LicenseCalculator()
        assert license_calculator.calculate(course_type, score) == expected_license

    def test_get_license_name(self):
        assert LicenseCalculator.get_license_name(LicenseStrategy.F1_LICENSE) == 'F1'
        assert LicenseCalculator.get_license_name(LicenseStrategy.F2_LICENSE) == 'F2'
        assert LicenseCalculator.get_license_name(LicenseStrategy.F3_LICENSE) == 'F3'
        assert LicenseCalculator.get_license_name(LicenseStrategy.F4_LICENSE) == 'F4'
        assert LicenseCalculator.get_license_name(LicenseStrategy.NO_LICENSE) == '-'


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
        assert 'course name 4' in course_result['course']
        assert course_result['officials_count'] == 0
        assert len(course_result['officials']) == 0

    @patch.object(MoodleApi, 'update_user')
    @patch.object(MoodleApi, 'get_user_result_for_exam')
    @patch.object(MoodleApi, 'get_exams_for_course')
    @patch.object(MoodleApi, 'get_participants_for_course')
    def test_update_licenses_no_matching_teams(self, participants_mock: MagicMock,
                                               exams_mock: MagicMock, result_exams_mock: MagicMock,
                                               update_user_mock: MagicMock):
        user_id = 1
        user_id_2 = 2
        exam_id = 75
        course = ApiCourse({
            "id": 1,
            "categoryid": 2,
            "enddate": time.time(),
            "fullname": "course name 1",
        })
        participants_mock.return_value = ApiParticipants([
            {
                "id": user_id,
                'firstname': 'moodle insert last',
                'lastname': 'moodle insert last',
                'customfields': [
                    {
                        'shortname': 'teamname',
                        'value': 'teamname moodle'
                    },
                    {
                        'shortname': 'teamid',
                        'value': -1
                    },
                    {
                        'shortname': 'Landesverband',
                        'value': 'Ja.'
                    },
                    {
                        'shortname': 'LandesverbandAuswahl',
                        'value': 'Association name'
                    },
                ],
                "roles": [{"roleid": 5}],
            }, {
                "id": user_id_2,
                'firstname': 'moodle insert last',
                'lastname': 'moodle insert last',
                'customfields': [
                    {
                        'shortname': 'teamname',
                        'value': 'moodle teamname'
                    },
                    {
                        'shortname': 'teamid',
                        'value': -1
                    },
                    {
                        'shortname': 'Landesverband',
                        'value': 'Ja.'
                    },
                    {
                        'shortname': 'LandesverbandAuswahl',
                        'value': 'Association name'
                    },
                ],
                "roles": [{"roleid": 5}],
            },
        ])
        exams_mock.return_value = ApiExams({
            "quizzes": [
                {
                    "course": 1,
                    "grade": 100,
                    "id": 75,
                    "name": "Test - Lizenzprüfung / exam",
                }
            ],
            "warnings": []
        })
        result_exams_mock.side_effect = {
            (user_id, exam_id): ApiExamResult({"attempts": [{"sumgrades": 50.1, }], }),
            (user_id_2, exam_id): ApiExamResult({"attempts": [{"sumgrades": 70, }], }),
        }.get
        moodle_service = MoodleService()
        result = moodle_service.get_participants_from_course(course)
        assert participants_mock.call_count == 1
        team_name_set_index, missed_official_index, course_result_index = 0, 1, 2
        assert result[team_name_set_index] == {'moodle teamname', 'teamname moodle'}
        assert len(result[missed_official_index]) == 2
        course_result = result[course_result_index]
        assert 'course name 1' in course_result['course']
        assert course_result['officials_count'] == 0
        assert len(course_result['officials']) == 0
        update_user_mock.assert_not_called()

    @patch.object(MoodleApi, 'update_user')
    @patch.object(MoodleApi, 'get_user_result_for_exam')
    @patch.object(MoodleApi, 'get_exams_for_course')
    @patch.object(MoodleApi, 'get_participants_for_course')
    @patch.object(MoodleApi, 'get_user_info_by_id')
    def test_update_licenses_create_official(self, user_mock: MagicMock, participants_mock: MagicMock,
                                             exams_mock: MagicMock, result_exams_mock: MagicMock,
                                             update_user_mock: MagicMock):
        user_id = 82
        team = DbSetupOfficials().create_officials_and_team()
        course = ApiCourse({
            "id": 1,
            "categoryid": 4,
            "enddate": time.time(),
            "fullname": "course name",
        })
        participants_mock.return_value = ApiParticipants([
            {
                "id": user_id,
                'firstname': 'moodle insert last',
                'lastname': 'moodle insert last',
                'customfields': [
                    {
                        'shortname': 'teamname',
                        'value': team.description
                    },
                    {
                        'shortname': 'teamid',
                        'value': team.pk
                    },
                    {
                        'shortname': 'Landesverband',
                        'value': 'Ja.'
                    },
                    {
                        'shortname': 'LandesverbandAuswahl',
                        'value': 'Association name'
                    },
                ],
                "roles": [{"roleid": 5}],
            },
        ])
        exams_mock.return_value = ApiExams({
            "quizzes": [
                {
                    "course": 1,
                    "grade": 100,
                    "id": 75,
                    "name": "Test - Lizenzprüfung / exam",
                }
            ],
            "warnings": []
        })
        result_exams_mock.return_value = ApiExamResult({
            "attempts": [
                {
                    "sumgrades": 69.1,
                }
            ],
        })
        user_mock.side_effect = {
            user_id: ApiUserInfo([
                {
                    'firstname': 'moodle insert last',
                    'lastname': 'moodle insert last',
                    'id': user_id,
                    'customfields': [
                        {
                            'shortname': 'teamname',
                            'value': team.description
                        },
                        {
                            'shortname': 'teamid',
                            'value': team.pk
                        },
                        {
                            'shortname': 'Landesverband',
                            'value': 'Ja.'
                        },
                        {
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
        assert 'course name' in course_result['course']
        assert course_result['officials_count'] == 1
        assert len(course_result['officials']) == 1
        assert len(result[team_name_set_index]) == 0
        assert len(result[missed_official_index]) == 0
        actual_api_user_update: ApiUpdateUser = update_user_mock.call_args[0][0]
        assert actual_api_user_update.user_id == user_id
        assert actual_api_user_update.license_number == created_official.pk
        assert actual_api_user_update.license_name == 'F1'

    @patch.object(MoodleApi, 'update_user')
    @patch.object(MoodleApi, 'get_user_result_for_exam')
    @patch.object(MoodleApi, 'get_exams_for_course')
    @patch.object(MoodleApi, 'get_participants_for_course')
    def test_update_licenses_update_official(self, participants_mock: MagicMock,
                                             exams_mock: MagicMock, result_exams_mock: MagicMock,
                                             update_user_mock: MagicMock):
        team = DbSetupOfficials().create_officials_and_team()
        # id workaround need to be done due testdatabase ids are not reset
        official: Official = Official.objects.last()
        official.external_id = 7
        official.save()
        course = ApiCourse({
            "id": 1,
            "categoryid": 3,
            "enddate": time.time(),
            "fullname": "course name 2",
        })
        participants_mock.return_value = ApiParticipants([
            {
                "id": official.external_id,
                'firstname': 'first_name moodle insert last',
                'lastname': 'last_name moodle insert last',
                'customfields': [
                    {
                        'shortname': 'teamname',
                        'value': team.description
                    },
                    {
                        'shortname': 'teamid',
                        'value': team.pk
                    },
                    {
                        'shortname': 'Landesverband',
                        'value': 'Nein.'
                    },
                ],
                "roles": [{"roleid": 5}],
            },
        ])
        exams_mock.return_value = ApiExams({
            "quizzes": [
                {
                    "course": 1,
                    "grade": 100,
                    "id": 75,
                    "name": "Test - Lizenzprüfung / exam",
                }
            ],
            "warnings": []
        })
        result_exams_mock.return_value = ApiExamResult({
            "attempts": [
                {
                    "sumgrades": 69.9,
                }
            ],
        })
        moodle_service = MoodleService()
        result = moodle_service.get_participants_from_course(course)
        updated_official: Official = Official.objects.get(pk=official.pk)
        assert updated_official.last_name == 'last_name moodle insert last'
        assert updated_official.association is None
        assert OfficialLicenseHistory.objects.filter(official=updated_official).count() == 2
        assert OfficialLicenseHistory.objects.filter(official=updated_official).last().result == 70
        team_name_set_index, missed_official_index, course_result_index = 0, 1, 2
        course_result = result[course_result_index]
        assert 'course name 2' in course_result['course']
        assert course_result['officials_count'] == 1
        assert len(course_result['officials']) == 1
        assert len(result[team_name_set_index]) == 0
        assert len(result[missed_official_index]) == 0
        actual_api_user_update: ApiUpdateUser = update_user_mock.call_args[0][0]
        assert actual_api_user_update.user_id == updated_official.external_id
        assert actual_api_user_update.license_number == updated_official.pk
        assert actual_api_user_update.license_name == 'F2'

    @patch.object(MoodleApi, 'update_user')
    @patch.object(MoodleApi, 'get_user_result_for_exam')
    @patch.object(MoodleApi, 'get_exams_for_course')
    @patch.object(MoodleApi, 'get_participants_for_course')
    def test_update_licenses_and_dont_create_new_license_due_failing_exam_result(self, participants_mock: MagicMock,
                                             exams_mock: MagicMock, result_exams_mock: MagicMock,
                                             update_user_mock: MagicMock):
        team = DbSetupOfficials().create_officials_and_team()
        official: Official = Official.objects.last()
        OfficialLicenseHistoryFactory(official=official, license=OfficialLicenseFactory(id=2, name='F3'), result=60)
        course = ApiCourse({
            "id": 1,
            "categoryid": 3,
            "enddate": time.time(),
            "fullname": "course name 2",
        })
        participants_mock.return_value = ApiParticipants([
            {
                "id": official.external_id,
                'firstname': 'first_name moodle insert last',
                'lastname': 'last_name moodle insert last',
                'customfields': [
                    {
                        'shortname': 'teamname',
                        'value': team.description
                    },
                    {
                        'shortname': 'teamid',
                        'value': team.pk
                    },
                    {
                        'shortname': 'Landesverband',
                        'value': 'Nein.'
                    },
                ],
                "roles": [{"roleid": 5}],
            },
        ])
        exams_mock.return_value = ApiExams({
            "quizzes": [
                {
                    "course": 1,
                    "grade": 100,
                    "id": 75,
                    "name": "Test - Lizenzprüfung / exam",
                }
            ],
            "warnings": []
        })
        result_exams_mock.return_value = ApiExamResult({
            "attempts": [
                {
                    "sumgrades": 68.9,
                }
            ],
        })
        moodle_service = MoodleService()
        result = moodle_service.get_participants_from_course(course)
        updated_official: Official = Official.objects.get(pk=official.pk)
        assert updated_official.last_name == 'last_name moodle insert last'
        assert updated_official.association is None
        assert OfficialLicenseHistory.objects.filter(official=updated_official, license=LicenseStrategy.F3_LICENSE).count() == 1
        assert OfficialLicenseHistory.objects.filter(official=updated_official).last().result == 69
        team_name_set_index, missed_official_index, course_result_index = 0, 1, 2
        course_result = result[course_result_index]
        assert 'course name 2' in course_result['course']
        assert course_result['officials_count'] == 1
        assert len(course_result['officials']) == 1
        assert len(result[team_name_set_index]) == 0
        assert len(result[missed_official_index]) == 0
        actual_api_user_update: ApiUpdateUser = update_user_mock.call_args[0][0]
        assert actual_api_user_update.user_id == updated_official.external_id
        assert actual_api_user_update.license_number == updated_official.pk
        assert actual_api_user_update.license_name == 'F3'

    @patch.object(MoodleApi, 'update_user')
    @patch.object(MoodleApi, 'get_user_result_for_exam')
    @patch.object(MoodleApi, 'get_exams_for_course')
    @patch.object(MoodleApi, 'get_participants_for_course')
    def test_update_licenses_user_has_no_result(self, participants_mock: MagicMock, exams_mock: MagicMock,
                                                result_exams_mock: MagicMock, update_user_mock: MagicMock):
        team = DbSetupOfficials().create_officials_and_team()
        official: Official = Official.objects.last()
        official.external_id = 7
        official.save()
        course = ApiCourse({
            "id": 1,
            "categoryid": 3,
            "enddate": time.time(),
            "fullname": "course name 3",
        })
        participants_mock.return_value = ApiParticipants([
            {
                "id": official.external_id,
                'firstname': 'first_name moodle insert last',
                'lastname': 'last_name moodle insert last',
                'customfields': [
                    {
                        'shortname': 'teamname',
                        'value': team.description
                    },
                    {
                        'shortname': 'teamid',
                        'value': team.pk
                    },
                    {
                        'shortname': 'Landesverband',
                        'value': 'Nein.'
                    },
                ],
                "roles": [{"roleid": 5}],
            },
        ])
        exams_mock.return_value = ApiExams({
            "quizzes": [
                {
                    "course": 1,
                    "grade": 100,
                    "id": 75,
                    "name": "Test - Lizenzprüfung / exam",
                }
            ],
            "warnings": []
        })
        result_exams_mock.return_value = ApiExamResult({
            "attempts": [],
        })
        moodle_service = MoodleService()
        result = moodle_service.get_participants_from_course(course)
        update_user_mock.assert_not_called()
        team_name_set_index, missed_official_index, course_result_index = 0, 1, 2
        course_result = result[course_result_index]
        assert 'course name 3' in course_result['course']
        assert course_result['officials_count'] == 1
        assert 'XXX' in course_result['officials'][0]
        assert len(course_result['officials']) == 1
        assert len(result[team_name_set_index]) == 0
        assert len(result[missed_official_index]) == 0

    @patch.object(MoodleApi, 'get_participants_for_course')
    def test_get_all_users_for_course(self, participants_mock: MagicMock):
        course_id = 57
        participants_mock.return_value = ApiParticipants([
            {
                "id": 1,
                "customfields": [
                    {
                        "name": "Teamname",
                        "shortname": "teamname",
                        "type": "text",
                        "value": "Team 1"
                    },
                    {
                        "name": "Lizenzstufe",
                        "shortname": "Lizenzstufe",
                        "type": "menu",
                        "value": "F1"
                    },
                    {
                        "name": "Möchtest du für deinen Landesverband pfeifen?",
                        "shortname": "Landesverband",
                        "type": "menu",
                        "value": "Nein."
                    },
                    {
                        "name": "Zu welchem Landesverband gehörst du?",
                        "shortname": "LandesverbandAuswahl",
                        "type": "menu",
                        "value": "LV1"
                    },
                    {
                        "name": "Team-Id",
                        "shortname": "teamid",
                        "type": "text",
                        "value": "1"
                    }
                ],
                "roles": [{"roleid": 5}],
            },
            {
                "id": 5,
                "customfields": [
                    {
                        "name": "Teamname",
                        "shortname": "teamname",
                        "type": "text",
                        "value": "Team 2"
                    },
                    {
                        "name": "Lizenzstufe",
                        "shortname": "Lizenzstufe",
                        "type": "menu",
                        "value": "F1"
                    },
                    {
                        "name": "Möchtest du für deinen Landesverband pfeifen?",
                        "shortname": "Landesverband",
                        "type": "menu",
                        "value": "Ja."
                    },
                    {
                        "name": "Zu welchem Landesverband gehörst du?",
                        "shortname": "LandesverbandAuswahl",
                        "type": "menu",
                        "value": "LV2"
                    },
                    {
                        "name": "Team-Id",
                        "shortname": "teamid",
                        "type": "text",
                        "value": "2"
                    }
                ],
                "roles": [{"roleid": 5}],
            },
            {
                "id": 7,
                "customfields": [
                    {
                        "name": "Teamname",
                        "shortname": "teamname",
                        "type": "text",
                        "value": "Langenfeld Longhorns"
                    },
                    {
                        "name": "Lizenznummer",
                        "shortname": "Lizenznummer",
                        "type": "text",
                        "value": "220"
                    },
                    {
                        "name": "Lizenzstufe",
                        "shortname": "Lizenzstufe",
                        "type": "menu",
                        "value": "F1"
                    },
                    {
                        "name": "Möchtest du für deinen Landesverband pfeifen?",
                        "shortname": "Landesverband",
                        "type": "menu",
                        "value": "Ja."
                    },
                    {
                        "name": "Zu welchem Landesverband gehörst du?",
                        "shortname": "LandesverbandAuswahl",
                        "type": "menu",
                        "value": "Nordrhein-Westfalen"
                    },
                    {
                        "name": "Team-Id",
                        "shortname": "teamid",
                        "type": "text",
                        "value": "128"
                    }
                ],
                "roles": [{"roleid": 5}],
            },
        ])
        moodle_service = MoodleService()
        result = moodle_service.get_all_users_for_course(course_id)
        assert result == [1, 5, 7]

        participants_mock.assert_called_once_with(57)
