import json
import math
from datetime import datetime
from typing import List

import requests
from django.conf import settings


class FieldNotFoundException(Exception):
    def __init__(self, field, current_field):
        super().__init__(f'Field \'{field}\' not found. Instead got {json.dumps(current_field)}')


class ApiUserInfo:
    def __init__(self, user_info_json):
        if not user_info_json:
            user_info_json = [{}]
        self.first_name = user_info_json[0].get('firstname', '')
        self.last_name = user_info_json[0].get('lastname', '')
        self.custom_fields = user_info_json[0].get('customfields', [{}, {}, {}])
        self.id = user_info_json[0].get('id', '')
        self.email = user_info_json[0].get('email', '')

    def get_first_name(self) -> str:
        return self.first_name

    def get_last_name(self) -> str:
        return self.last_name

    def get_id(self) -> int:
        return self.id

    def get_email(self) -> str:
        return self.email

    def get_team(self) -> str:
        return self._get_custom_field_value(0, 'Team')

    def get_association(self) -> str:
        return self._get_custom_field_value(2, 'LandesverbandAuswahl')

    def whistle_for_association(self) -> bool:
        value = self._get_custom_field_value(1, 'Landesverband')
        return value == 'Ja.'

    def _get_custom_field_value(self, custom_field_index: int, expected_field_name):
        try:
            custom_field = self.custom_fields[custom_field_index]
        except IndexError:
            return ''
        if custom_field.get('shortname', expected_field_name) != expected_field_name:
            raise FieldNotFoundException(expected_field_name, self.custom_fields)
        return custom_field.get('value', '')

    def __str__(self):
        return f'{self.id}: {self.last_name}, {self.first_name} -> {self.get_team()}'


class ApiCourse:
    def __init__(self, course_json):
        self.end_date = datetime.fromtimestamp(course_json['enddate'])
        self.license_id = self._map_category_to_license_id(course_json['categoryid'])
        self.course_id = course_json['id']

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
        }
        return license_map.get(category_id)

    def is_relevant(self):
        year = datetime.today().year
        if self.course_id == 15:
            return True
        return self.end_date.year == year and self.license_id in [1, 2, 3]

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


class ApiParticipant:
    def __init__(self, participant_json):
        gradeitem = participant_json['gradeitems'][0]
        self.grademax = gradeitem['grademax']
        self.graderaw = gradeitem['graderaw']
        self.user_id = participant_json['userid']

    def get_user_id(self):
        return self.user_id

    def has_result(self):
        if self.graderaw is not None and self.grademax is not None:
            return True
        return False

    def get_result(self):
        result = self.graderaw / self.grademax * 100
        return int(math.ceil(result))

    def __str__(self):
        return f'{self.user_id}: graderaw {self.graderaw} / {self.grademax} grademax'

    def __repr__(self):
        return f'ApiParticipant(participant_json=' \
               f'{{"gradeitems":[' \
               f'{{"grademax": {self.grademax}, "graderaw": {self.graderaw}, "user_id": {self.user_id}}}' \
               f']}})'


class ApiParticipants:
    def __init__(self, participants_json):
        all_participants = participants_json.get('usergrades', [])
        self.participants = []
        for current_participant in all_participants:
            self.participants += [ApiParticipant(current_participant)]

    def get_all(self) -> List[ApiParticipant]:
        return self.participants


class ApiUpdateUser:
    def __init__(self, user_id, license_number, license_id):
        self.user_id = user_id
        self.license_number = license_number
        from officials.service.moodle.moodle_service import LicenseCalculator
        self.license_name = LicenseCalculator.get_license_name(license_id)


class MoodleApi:
    def __init__(self):
        self.moodle_url = f'{settings.MOODLE_URL}/offd/moodle/webservice/rest/server.php' \
                          f'?wstoken={settings.MOODLE_WSTOKEN}&moodlewsrestformat=json'

    def __str__(self):
        return f'{settings.MOODLE_URL}'

    def get_courses(self) -> ApiCourses:
        return ApiCourses(self._send_request('&wsfunction=core_course_get_courses_by_field'))

    def get_participants_for_course(self, course_id) -> ApiParticipants:
        return ApiParticipants(self._send_request(
            f'&wsfunction=gradereport_user_get_grade_items&courseid={course_id}'))

    def get_user_info(self, user_id) -> ApiUserInfo:
        return ApiUserInfo(self._send_request(
            f'&wsfunction=core_user_get_users_by_field&field=id&values[0]={user_id}'))

    def update_user(self, api_user: ApiUpdateUser):
        self._send_request(f'&wsfunction=core_user_update_users&users[0][id]={api_user.user_id}'
                           f'&users[0][customfields][0][type]=Lizenznummer'
                           f'&users[0][customfields][0][value]={api_user.license_number}'
                           f'&users[0][customfields][1][type]=Lizenzstufe'
                           f'&users[0][customfields][1][value]={api_user.license_name}')

    def _send_request(self, additional_params) -> dict:
        return requests.get(f'{self.moodle_url}{additional_params}').json()
