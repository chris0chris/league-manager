import json
import math
from datetime import datetime
from typing import List

import requests
from django.conf import settings

from officials.service.boff_license_calculation import LicenseStrategy


class FieldNotFoundException(Exception):
    def __init__(self, user_id, field, current_field):
        super().__init__(f'User-Id: {user_id} -> Field \'{field}\' not found. Instead got {json.dumps(current_field)}')


class ApiUserInfo:
    def __init__(self, user_info_json):
        if isinstance(user_info_json, list):
            user_info_json = user_info_json[0]
        self.first_name = user_info_json.get('firstname', '')
        self.last_name = user_info_json.get('lastname', '')
        self.custom_fields = user_info_json.get('customfields', [{}, {}, {}])
        self.id = user_info_json.get('id', -1)
        self.email = user_info_json.get('email', '')

    def get_first_name(self) -> str:
        return self.first_name

    def get_last_name(self) -> str:
        return self.last_name

    def get_id(self) -> int:
        return self.id

    def get_email(self) -> str:
        return self.email

    def get_team(self) -> str:
        return self._get_custom_field_value('teamname')

    def get_team_id(self) -> str:
        return self._get_custom_field_value('teamid')

    def get_association(self) -> str:
        return self._get_custom_field_value('LandesverbandAuswahl')

    def whistle_for_association(self) -> bool:
        value = self._get_custom_field_value('Landesverband')
        return value == 'Ja.'

    def _get_custom_field_value(self, expected_field_name):
        found_entry = {}
        try:
            for item in self.custom_fields:
                if item.get('shortname') == expected_field_name:
                    found_entry = item
                    break
        except IndexError:
            return ''
        if found_entry == {}:
            raise FieldNotFoundException(self.id, expected_field_name, self.custom_fields)
        return found_entry.get('value', '')

    def __str__(self):
        return f'{self.id}: {self.last_name}, {self.first_name} -> {self.get_team()} ({self.get_team_id()})'


class ApiCourse:
    def __init__(self, course_json):
        self.end_date = datetime.fromtimestamp(course_json['enddate'])
        self.license_id = self._map_category_to_license_id(course_json['categoryid'])
        self.course_id = course_json['id']
        self.name = course_json['fullname']

    def __str__(self):
        return f'{self.course_id}: license_id {self.license_id} # {self.end_date}'

    def __repr__(self):
        return f'ApiCourse(course_json={{"id": {self.course_id}, "enddate":{self.end_date}}})'

    # noinspection PyMethodMayBeStatic
    def _map_category_to_license_id(self, category_id):
        license_map = {
            4: 1,  # F1
            3: 3,  # F2
            2: 2,  # F3
            8: 5,  # F4
        }
        return license_map.get(category_id)

    def is_relevant(self):
        year = datetime.today().year
        if self.course_id == 15:
            return True
        return self.end_date.year == year and self.license_id in [LicenseStrategy.F1_LICENSE,
                                                                  LicenseStrategy.F2_LICENSE,
                                                                  LicenseStrategy.F3_LICENSE,
                                                                  LicenseStrategy.F4_LICENSE]

    def get_id(self):
        return self.course_id

    def get_year(self):
        return self.end_date.year

    def get_date(self):
        return self.end_date

    def get_license_id(self):
        if self.course_id == 15:
            return 1
        return self.license_id

    def get_name(self):
        return self.name


class ApiCourses:
    def __init__(self, courses_json):
        all_courses = courses_json.get('courses', [])
        self.courses = []
        for current_course in all_courses:
            self.courses += [ApiCourse(current_course)]

    def __str__(self):
        return f'Number courses: {len(self.courses)}'

    def get_all(self) -> List[ApiCourse]:
        return self.courses


class ApiExam:
    def __init__(self, quiz_json):
        self.id = quiz_json['id']
        self.course_id = quiz_json['course']
        self.grade = float(quiz_json['grade'])

    def get_id(self):
        return self.id

    def get_course_id(self):
        return self.course_id

    def get_grade(self):
        return self.grade

    def __str__(self):
        return f'{self.course_id}: quiz_id={self.id} -> grade: {self.grade}'

    def __repr__(self):
        return f'ApiExam(quiz_json={{"id": {self.id}, "course": {self.course_id}, "grade": {self.grade})}})'


class ApiExamResult:
    def __init__(self, exam_result_json):
        attempts = exam_result_json.get('attempts')
        if attempts is None or len(attempts) == 0:
            self.result = None
        else:
            self.result = float(exam_result_json.get('attempts')[0]['sumgrades'])

    def get_result(self):
        return self.result

    def __str__(self):
        return f'Result={self.result}'

    def __repr__(self):
        return f'ApiExamResult(exam_result_json={{"attempts: [{{"sumgrades": {self.result})}}]}})'

class EmptyApiExams:
    def get_all(self):
        return []

    def is_empty(self):
        return True

class ApiExams:
    def __init__(self, quizzes_json):
        quizzes = quizzes_json.get('quizzes', [])
        exam_keywords = ['Lizenzprüfung', 'exam']

        def is_exam(quiz):
            return any(keyword in quiz['name'] for keyword in exam_keywords)

        self.exams = [ApiExam(quiz) for quiz in quizzes if is_exam(quiz)]

    def get_all(self) -> list[ApiExam]:
        return self.exams

    def is_empty(self):
        return len(self.exams) == 0


class ApiParticipants:
    STUDENT_ROLE = 5

    def __init__(self, participants_json):
        all_students = [user for user in participants_json if
                        any(role["roleid"] == self.STUDENT_ROLE for role in user["roles"])]
        self.participants = []
        for current_participant in all_students:
            self.participants += [ApiUserInfo(current_participant)]

    def get_all(self) -> List[ApiUserInfo]:
        return self.participants


class ApiUpdateUser:
    def __init__(self, external_id, official_id, license_id):
        self.user_id = external_id
        self.license_number = official_id
        from officials.service.moodle.moodle_service import LicenseCalculator
        self.license_name = LicenseCalculator.get_license_name(license_id)

    def __repr__(self):
        return f'ApiUpdateUser(' \
               f'external_id={self.user_id},' \
               f'official_id={self.license_number}, ' \
               f'license_id={self.license_name})'


class MoodleApiException(Exception):
    pass


class MoodleAuth:
    def __init__(self, auth_json):
        self.error = auth_json.get('error')
        if self.error is not None:
            raise MoodleApiException(f'Moodle-Fehler: {self.error}')


class MoodleApi:
    def __init__(self):
        self.moodle_url = f'{settings.MOODLE_URL}/moodle/webservice/rest/server.php' \
                          f'?wstoken={settings.MOODLE_WSTOKEN}&moodlewsrestformat=json'

    def __str__(self):
        return f'{settings.MOODLE_URL}'

    def confirm_user_auth(self, username, password):
        return MoodleAuth(requests.get(f'{settings.MOODLE_URL}/moodle/login/token.php', {
            'username': username,
            'password': password,
            'service': 'moodle_mobile_app'
        }).json())

    def get_courses(self, ids: str = None) -> ApiCourses:
        if ids is None:
            return ApiCourses(self._send_request('&wsfunction=core_course_get_courses_by_field'))
        return ApiCourses(self._send_request(f'&wsfunction=core_course_get_courses_by_field&field=ids&value={ids}'))

    def get_participants_for_course(self, course_id: int) -> ApiParticipants:
        return ApiParticipants(self._send_request(
            f'&wsfunction=core_enrol_get_enrolled_users&courseid={course_id}'))

    def get_exams_for_course(self, course_id: int) -> ApiExams:
        return ApiExams(self._send_request(
            f'&wsfunction=mod_quiz_get_quizzes_by_courses&courseids[0]={course_id}'))

    def get_user_result_for_exam(self, user_id: int, exam_id: int) -> ApiExamResult:
        return ApiExamResult(self._send_request(
            f'&wsfunction=mod_quiz_get_user_attempts&quizid={exam_id}&userid={user_id}'))

    def get_user_info_by_id(self, user_id) -> ApiUserInfo:
        return self._get_user_info_by('id', user_id)

    def get_user_info_by_username(self, username) -> ApiUserInfo:
        return self._get_user_info_by('username', username)

    def get_user_info_by_email(self, email) -> ApiUserInfo:
        return self._get_user_info_by('email', email)

    def _get_user_info_by(self, fieldname, value) -> ApiUserInfo:
        return ApiUserInfo(self._send_request(
            f'&wsfunction=core_user_get_users_by_field&field={fieldname}&values[0]={value}'))

    def update_user(self, api_user: ApiUpdateUser):
        self._send_request(f'&wsfunction=core_user_update_users&users[0][id]={api_user.user_id}'
                           f'&users[0][customfields][0][type]=Lizenznummer'
                           f'&users[0][customfields][0][value]={api_user.license_number}'
                           f'&users[0][customfields][1][type]=Lizenzstufe'
                           f'&users[0][customfields][1][value]={api_user.license_name}')

    def _send_request(self, additional_params) -> dict:
        return requests.get(f'{self.moodle_url}{additional_params}').json()
