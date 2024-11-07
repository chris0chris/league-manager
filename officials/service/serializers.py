from rest_framework.fields import CharField, IntegerField, SerializerMethodField
from rest_framework.serializers import Serializer


class ParticipationValidator:
    NO_LICENSE = 4
    F1 = 1
    F2 = 3
    F3 = 2
    F4 = 5

    course_mapping = {
        F1: {
            'course_license': 'F1',
            'user_current_license': {
                F1: {
                    'name': 'F1',
                    'minimum_season_games': 5,
                    'minimum_total_games': 0,
                    'minimum_consecutive_license_years': 0,
                },
                F2: {
                    'name': 'F2',
                    'minimum_season_games': 8,
                    'minimum_total_games': 25,
                    'minimum_consecutive_license_years': 5,
                },
            },
        },
        F2: {
            'course_license': 'F2',
            'user_current_license': {
                F2: {
                    'name': 'F2',
                    'minimum_season_games': 5,
                    'minimum_total_games': 0,
                    'minimum_consecutive_license_years': 0,
                },
                F3: {
                    'name': 'F3',
                    'minimum_season_games': 5,
                    'minimum_total_games': 12,
                    'minimum_consecutive_license_years': 0,
                },
            },
        },
        F3: {
            'course_license': 'F3',
            'user_current_license': {
                F3: {
                    'name': 'F3',
                    'minimum_season_games': 4,
                    'minimum_total_games': 0,
                    'minimum_consecutive_license_years': 0,
                },
                F4: {
                    'name': 'F4',
                    'minimum_season_games': 4,
                    'minimum_total_games': 0,
                    'minimum_consecutive_license_years': 0,
                },
            },
        },
        F4: {
            'course_license': 'F4',
            'user_current_license': {
                None: {
                    'name': 'keine Lizenz',
                    'minimum_season_games': 0,
                    'minimum_total_games': 0,
                    'minimum_consecutive_license_years': 0,
                },
            },
        }
    }.get

    def __init__(self, course_license):
        self.course = self.course_mapping(course_license).get('user_current_license')

    def fails_minimum_season_games(self, participant_license, minimum_season_games):
        return self._evaluate_requirement(participant_license, minimum_season_games, 'minimum_season_games')

    def fails_check_minimum_total_games(self, participant_license, minimum_total_games):
        return self._evaluate_requirement(participant_license, minimum_total_games, 'minimum_total_games')

    def fails_minimum_consecutive_license_years(self, participant_license: int, license_years: str):
        years = list(map(int, license_years.split(",")))
        years.sort(reverse=True)
        consecutive_count = 1  # Start count with the latest year
        for i in range(1, len(years)):
            if years[i] == years[i - 1] - 1:  # Check if the year is consecutive
                consecutive_count += 1
            else:
                break
        return self._evaluate_requirement(participant_license, consecutive_count,
                               'minimum_consecutive_license_years')

    def fails_current_license_requirement(self, participant_license):
        if participant_license is None and None not in self.course:
            return True
        if self.course.get(participant_license) is None:
            return True
        return False

    def _evaluate_requirement(self, participant_license, value, field_key):
        try:
            license_check = self.course.get(participant_license)
            if license_check.get(field_key) > value:
                return True
            return False
        except AttributeError:
            return True


class OfficialLicenseCheckSerializer(Serializer):
    LICENSE_ID_C = 'license_id'
    LICENSE_YEARS_C = 'license_years'
    TEAM_DESCRIPTION = 'team__description'
    TOTAL_GAMES_C = 'total_games'
    TOTAL_SEASON_GAMES_C = 'total_season_games'

    ALL_FIELD_VALUES = ['external_id', 'id', TEAM_DESCRIPTION, 'last_name', 'first_name', LICENSE_ID_C, 'license_name',
                        LICENSE_YEARS_C, TOTAL_GAMES_C, TOTAL_SEASON_GAMES_C, ]
    team = CharField(source=TEAM_DESCRIPTION)
    last_name = CharField()
    first_name = CharField()
    id = IntegerField()
    license_name = CharField()
    license_years = CharField()
    total_season_games = IntegerField()
    total_games = IntegerField()
    external_id = CharField()
    validation_errors = SerializerMethodField()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.license_id = self.context.get('license_id')
        self.validator = ParticipationValidator(self.license_id)

    def get_validation_errors(self, obj):
        license_id = obj.get(self.LICENSE_ID_C)
        return {
            'no_license': self.validator.fails_current_license_requirement(license_id),
            'total_season_games': self.validator.fails_minimum_season_games(license_id, obj[self.TOTAL_SEASON_GAMES_C]),
            'total_games': self.validator.fails_check_minimum_total_games(license_id, obj[self.TOTAL_GAMES_C]),
            'minimum_consecutive_license_years': False if self.context.get(
                'license_id') != ParticipationValidator.F1 else self.validator.fails_minimum_consecutive_license_years(license_id, obj[
                self.LICENSE_YEARS_C]),
        }
