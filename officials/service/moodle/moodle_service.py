import concurrent
import math
import threading
from concurrent.futures import ThreadPoolExecutor
from time import time
from datetime import datetime

from django.conf import settings
from django.core.exceptions import MultipleObjectsReturned
from django.db.models import QuerySet
from django.urls import reverse

from gamedays.models import Association, Team
from officials.models import OfficialLicenseHistory, Official
from officials.service.boff_license_calculation import LicenseCalculator, LicenseStrategy
from officials.service.moodle.moodle_api import MoodleApi, ApiUserInfo, ApiCourses, ApiParticipants, ApiUpdateUser, \
    ApiCourse, FieldNotFoundException, EmptyApiExams, ApiExam


def measure_execution_time(func):
    def wrapper(*args, **kwargs):
        start_time = time()
        result = func(*args, **kwargs)
        end_time = time()
        execution_time = end_time - start_time
        minutes = int(execution_time // 60)
        seconds = int(execution_time % 60)
        formatted_time = f"{minutes:02d}:{seconds:02d}"
        return result, formatted_time

    return wrapper


class MoodleService:
    MOODLE_PROFILE = '/moodle/user/profile.php'
    MOODLE_COURSE = '/moodle/course/edit.php'

    def __init__(self):
        self.moodle_api = MoodleApi()
        self.license_history: QuerySet[OfficialLicenseHistory] = OfficialLicenseHistory.objects.none()
        self.license_calculator = LicenseCalculator()
        self.exams = EmptyApiExams()
        self._thread_local = threading.local()

    def set_exams(self, exams):
        self._thread_local.exams = exams

    def get_exams(self):
        return getattr(self._thread_local, 'exams', EmptyApiExams())

    def get_all_users_for_course(self, course_id) -> []:
        participants: ApiParticipants = self.moodle_api.get_participants_for_course(course_id)
        participants_ids = []
        for current_participant in participants.get_all():
            participants_ids += [current_participant.get_id()]
        return participants_ids

    def get_course_by_id(self, course_id) -> ApiCourse:
        return self.moodle_api.get_courses(course_id).get_all()[0]

    @measure_execution_time
    def update_licenses(self, course_ids: str = None):
        courses: ApiCourses = self.moodle_api.get_courses(course_ids)
        missing_team_names = set()
        result_list = []
        missed_officials_list = []
        with ThreadPoolExecutor(max_workers=10) as executor:
            # Submit each course update task to the thread pool
            futures = {executor.submit(self.get_participants_from_course, current_course): current_course for
                       current_course in
                       courses.get_all()}

            for future in concurrent.futures.as_completed(futures):
                course = futures[future]
                team_name_set, missed_official, course_result = future.result()
                missing_team_names.update(team_name_set)
                missed_officials_list += missed_official
                result_list += [course_result]

        return {
            'items_result_list': len(result_list),
            'items_missed_officials': len(missed_officials_list),
            'result_list': result_list,
            'missed_officials': missed_officials_list,
            'missing_team_names': sorted(missing_team_names),
        }

    def get_participants_from_course(self, course: ApiCourse):
        result = self.get_participants_from_course_with_time_measure(course)
        team_name_set, missed_official, officials = result[0]
        formatted_time = result[1]
        course_result = {
            "course": self._get_ahref_for_course(course.get_id(), course.get_name()),
            "execution_time": formatted_time,
            "officials_count": len(officials),
            "officials": officials,
        }
        return team_name_set, missed_official, course_result

    @measure_execution_time
    def get_participants_from_course_with_time_measure(self, course: ApiCourse):
        if course.is_relevant():
            year = datetime.today().year
            self.license_history = OfficialLicenseHistory.objects.filter(created_at__year=year)
            exams = self.moodle_api.get_exams_for_course(course.get_id())
            if not exams.is_empty():
                self.set_exams(exams)
                return self.get_participants_from_relevant_course(course)
        return set(), [], []

    def get_participants_from_relevant_course(self, course):
        participants: ApiParticipants = self.moodle_api.get_participants_for_course(course.get_id())
        result_list = []
        missed_officials_list = []
        missing_teams_list = set()
        for current_participant in participants.get_all():
            team_name, missed_official, official = self.get_info_of_user_with_result(course, current_participant)
            if team_name is not None:
                missing_teams_list.add(team_name)
            missed_officials_list += missed_official
            result_list += official

        return missing_teams_list, missed_officials_list, result_list

    def get_info_of_user_with_result(self, course: ApiCourse, user_info: ApiUserInfo):
        try:
            team_description = user_info.get_team()
        except FieldNotFoundException as exception:
            missed_officials = [
                f'ERROR --- XXX -> {self._get_ahref_for_course(course.get_id())}: {self._get_ahref_for_moodle_profile(user_info.id)} - {user_info.get_last_name()} '
                f'-> {exception}']
            return None, missed_officials, []
        team: Team = self._get_first(Team.objects.filter(description=team_description))
        if team is None:
            missed_officials = [
                f'{self._get_ahref_for_moodle_profile(course.get_id())}: {self._get_ahref_for_moodle_profile(user_info.id)} - {user_info.get_last_name()} '
                f'-> fehlendes Team: {team_description}']
            return team_description, missed_officials, []
        else:
            official = self.create_new_or_update_existing_official(user_info)
        license_history = self.create_new_or_update_license_history(official, course, user_info)
        return None, [], [
            f'{'XXX / ' if license_history is None else str(license_history.result) + '% / '}{self._get_ahref_for_moodle_profile(official.external_id, str(official))} / Lizenz: {self._get_ahref_for_profile(official.pk)}']

    def create_new_or_update_license_history(self, official, course: ApiCourse,
                                             participant: ApiUserInfo) -> OfficialLicenseHistory | None:
        license_history_to_update: OfficialLicenseHistory = self._get_first(self.license_history.filter(
            official=official,
            created_at__year=course.get_year(),
            license_id__in=(course.get_license_id(), LicenseStrategy.NO_LICENSE),
        ))
        result = None
        exams = self.get_exams()
        exam: ApiExam
        for exam in exams.get_all():
            exam_result = self.moodle_api.get_user_result_for_exam(participant.get_id(), exam.get_id())
            if exam_result.get_result():
                result = int(math.ceil(exam_result.get_result() / exam.get_grade() * 100))
                break
        if result is None:
            return None
        if license_history_to_update is not None:
            if license_history_to_update.result < result:
                license_history_to_update.license_id = self.license_calculator.calculate(
                    course.get_license_id(),
                    result
                )
                license_history_to_update.result = result
        else:
            license_history_to_update = self.create_new_license_history(course, official, result)
        license_history_to_update.save()
        api_user = ApiUpdateUser(official.external_id, official.pk, license_history_to_update.license_id)
        self.moodle_api.update_user(api_user)
        return license_history_to_update

    def create_new_or_update_existing_official(self, user_info) -> Official:
        official = self._get_first(Official.objects.filter(external_id=user_info.get_id()))
        if official is None:
            official = Official()
            official.external_id = user_info.get_id()
        official.first_name = user_info.get_first_name()
        official.last_name = user_info.get_last_name()
        official.team = self._get_first(Team.objects.filter(description=user_info.get_team()))
        if user_info.whistle_for_association():
            official.association = Association.objects.get(name=user_info.get_association())
        official.save()
        return official

    def create_new_license_history(self, course, official, result) -> OfficialLicenseHistory:
        license_id = self.license_calculator.calculate(course.get_license_id(), result)
        return OfficialLicenseHistory(
            created_at=course.get_date(),
            license_id=license_id,
            official=official,
            result=result,
        )

    # noinspection PyMethodMayBeStatic
    def _get_first(self, query_set: QuerySet):
        if query_set.count() > 1:
            raise MultipleObjectsReturned(f'For the following QuerySet multiple items found {query_set} '
                                          f'with WHERE-clause {query_set.query.where}')
        return query_set.first()

    def get_user_info_by(self, external_id) -> ApiUserInfo:
        return self.moodle_api.get_user_info_by_id(external_id)

    def login(self, username, password) -> int:
        self.moodle_api.confirm_user_auth(username, password)
        user = self.moodle_api.get_user_info_by_username(username)
        if user == -1:
            user = self.moodle_api.get_user_info_by_email(username)
        return Official.objects.get(external_id=user.get_id()).pk

    def _get_ahref(self, resource_id, path, text=None) -> str:
        text = text or resource_id
        return f'<a href="{settings.MOODLE_URL}{path}?id={resource_id}" target="_blank">{text}</a>'

    def _get_ahref_for_moodle_profile(self, resource_id, text=None) -> str:
        return self._get_ahref(resource_id, self.MOODLE_PROFILE, text)

    def _get_ahref_for_profile(self, resource_id) -> str:
        from officials.urls import OFFICIALS_PROFILE_LICENSE
        return f'<a href="{reverse(OFFICIALS_PROFILE_LICENSE, kwargs={"pk": resource_id})}" target="_blank">{resource_id}</a>'

    def _get_ahref_for_course(self, resource_id, text=None) -> str:
        return self._get_ahref(resource_id, self.MOODLE_COURSE, text)
