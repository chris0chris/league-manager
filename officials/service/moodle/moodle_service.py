from django.core.exceptions import MultipleObjectsReturned
from django.db.models import QuerySet

from gamedays.models import Association, Team
from officials.models import OfficialLicenseHistory, Official
from officials.service.moodle.moodle_api import MoodleApi, ApiUserInfo, ApiCourses, ApiParticipants, ApiUpdateUser


class LicenseCalculator:
    NO_LICENSE = 4
    F1_LICENSE = 1
    F2_LICENSE = 3
    F3_LICENSE = 2

    license_mapping = {
        F1_LICENSE: {
            'successful': 70,
            'min_next_license_rank': 50,
            'next_license_rank': F2_LICENSE,
        },
        F3_LICENSE: {
            'successful': 70,
            'min_next_license_rank': 0,
            'next_license_rank': NO_LICENSE
        },
        F2_LICENSE: {
            'successful': 70,
            'min_next_license_rank': 50,
            'next_license_rank': F3_LICENSE
        }
    }.get

    def calculate(self, course_license, participant_result):
        license_check = self.license_mapping(course_license)
        if license_check['successful'] <= participant_result:
            return course_license
        if license_check['min_next_license_rank'] <= participant_result:
            return license_check['next_license_rank']
        return self.NO_LICENSE

    @staticmethod
    def get_license_name(license_id):
        license_name_mapping = {
            LicenseCalculator.F1_LICENSE: 'F1',
            LicenseCalculator.F2_LICENSE: 'F2',
            LicenseCalculator.F3_LICENSE: 'F3'
        }.get
        return license_name_mapping(license_id, '')


class MoodleService:
    def __init__(self):
        self.moodle_api = MoodleApi()
        self.license_history: QuerySet[OfficialLicenseHistory] = OfficialLicenseHistory.objects.none()
        self.license_calculator = LicenseCalculator()

    def calculate_user_games_by_course(self, course_id) -> []:
        participants: ApiParticipants = self.moodle_api.get_participants_for_course(course_id)
        participants_ids = []
        for current_participant in participants.get_all():
            participants_ids += [current_participant.user_id]
        return participants_ids

    def update_licenses(self):
        courses: ApiCourses = self.moodle_api.get_courses()
        missing_team_names = set()
        result_list = []
        missed_officials_list = []
        for current_course in courses.get_all():
            team_name_set, missed_official, officials = self.get_participants_from_course(current_course)
            missing_team_names.update(team_name_set)
            missed_officials_list += missed_official
            result_list += officials

        return {
            'items_result_list': len(result_list),
            'items_missed_officials': len(missed_officials_list),
            'result_list': result_list,
            'missed_officials': missed_officials_list,
            'missing_team_names': sorted(missing_team_names)
        }

    def get_participants_from_course(self, course):
        if course.is_relevant():
            self.license_history = OfficialLicenseHistory.objects.filter(created_at__year=course.get_year())
            return self.get_participants_from_relevant_course(course)
        return set(), [], []

    def get_participants_from_relevant_course(self, course):
        participants: ApiParticipants = self.moodle_api.get_participants_for_course(course.get_id())
        result_list = []
        missed_officials_list = []
        missing_teams_list = set()
        for current_participant in participants.get_all():
            team_name, missed_official, official = self.get_info_of_user(course, current_participant)
            if team_name is not None:
                missing_teams_list.add(team_name)
            missed_officials_list += missed_official
            result_list += official

        return missing_teams_list, missed_officials_list, result_list

    def get_info_of_user(self, course, participant):
        if participant.has_result():
            return self.get_info_of_user_with_result(course, participant)
        return None, [], []

    def get_info_of_user_with_result(self, course, participant):
        user_info: ApiUserInfo = self.moodle_api.get_user_info(participant.get_user_id())
        team: Team = self._get_first(Team.objects.filter(description=user_info.get_team()))
        if team is None:
            missed_officials = [
                f'{course.get_id()}: {user_info.id} - {user_info.get_last_name()} '
                f'-> fehlendes Team: {user_info.get_team()}']
            return user_info.get_team(), missed_officials, []
        else:
            official = self.create_new_or_update_existing_official(user_info)
        self.create_new_or_update_license_history(official, course, participant)
        return None, [], [str(official)]

    def create_new_or_update_license_history(self, official, course, participant):
        license_history_to_update: OfficialLicenseHistory = self._get_first(self.license_history.filter(
            official=official,
            created_at__year=course.get_year()
        ))
        if license_history_to_update is not None:
            license_history_to_update.license_id = self.license_calculator.calculate(
                course.get_license_id(),
                participant.get_result()
            )
            license_history_to_update.result = participant.get_result()
        else:
            license_history_to_update = self.create_new_license_history(course, official, participant)
        license_history_to_update.save()
        api_user = ApiUpdateUser(official.pk, license_history_to_update.license_id)
        self.moodle_api.update_user(api_user)

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

    def create_new_license_history(self, course, official, participant) -> OfficialLicenseHistory:
        license_id = self.license_calculator.calculate(course.get_license_id(), participant.get_result())
        return OfficialLicenseHistory(
            created_at=course.get_date(),
            license_id=license_id,
            official=official,
            result=participant.get_result()
        )

    # noinspection PyMethodMayBeStatic
    def _get_first(self, query_set: QuerySet):
        if query_set.count() > 1:
            raise MultipleObjectsReturned(f'For the following QuerySet multiple items found {query_set} '
                                          f'with WHERE-clause {query_set.query.where}')
        return query_set.first()

    def get_user_info_by(self, external_id) -> ApiUserInfo:
        return self.moodle_api.get_user_info(external_id)
