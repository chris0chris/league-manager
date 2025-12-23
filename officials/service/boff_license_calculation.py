from abc import ABC, abstractmethod


class LicenseStrategy(ABC):
    """Base class defining the interface for all license strategies."""

    NO_LICENSE = 4
    F1_LICENSE = 1
    F2_LICENSE = 3
    F3_LICENSE = 2
    F4_LICENSE = 5

    NONE_LICENSE = None

    COURSE_MAPPING = {
        F1_LICENSE: {
            'course_license': 'F1',
            'user_current_license': {
                F1_LICENSE: {
                    'name': 'F1',
                    'minimum_season_games': 5,
                    'minimum_total_games': 0,
                    'minimum_consecutive_license_years': 0,
                },
                F2_LICENSE: {
                    'name': 'F2',
                    'minimum_season_games': 8,
                    'minimum_total_games': 25,
                    'minimum_consecutive_license_years': 5,
                },
            },
        },
        F2_LICENSE: {
            'course_license': 'F2',
            'user_current_license': {
                F2_LICENSE: {
                    'name': 'F2',
                    'minimum_season_games': 5,
                    'minimum_total_games': 0,
                    'minimum_consecutive_license_years': 0,
                },
                F3_LICENSE: {
                    'name': 'F3',
                    'minimum_season_games': 5,
                    'minimum_total_games': 12,
                    'minimum_consecutive_license_years': 0,
                },
            },
        },
        F3_LICENSE: {
            'course_license': 'F3',
            'user_current_license': {
                F3_LICENSE: {
                    'name': 'F3',
                    'minimum_season_games': 4,
                    'minimum_total_games': 0,
                    'minimum_consecutive_license_years': 0,
                },
                F4_LICENSE: {
                    'name': 'F4',
                    'minimum_season_games': 4,
                    'minimum_total_games': 0,
                    'minimum_consecutive_license_years': 0,
                },
            },
        },
        F4_LICENSE: {
            'course_license': 'F4',
            'user_current_license': {
                NONE_LICENSE: {
                    'name': 'keine Lizenz',
                    'minimum_season_games': 0,
                    'minimum_total_games': 0,
                    'minimum_consecutive_license_years': 0,
                },
            },
        }
    }.get

    @abstractmethod
    def calculate_license(self, percentage: int) -> int:
        pass


class F1LicenseStrategy(LicenseStrategy):
    def calculate_license(self, percentage: int) -> int:
        if percentage >= 70:
            return self.F1_LICENSE
        elif percentage >= 50:
            return self.F2_LICENSE
        elif percentage > 0:
            return self.F3_LICENSE
        else:
            return self.NO_LICENSE


class F2LicenseStrategy(LicenseStrategy):
    def calculate_license(self, percentage: int) -> int:
        if percentage >= 70:
            return self.F2_LICENSE
        elif percentage >= 50:
            return self.F3_LICENSE
        else:
            return self.NO_LICENSE


class F3LicenseStrategy(LicenseStrategy):
    def calculate_license(self, percentage: int) -> int:
        if percentage >= 70:
            return self.F3_LICENSE
        elif percentage >= 50:
            return self.F4_LICENSE
        else:
            return self.NO_LICENSE


class F4LicenseStrategy(LicenseStrategy):
    def calculate_license(self, percentage: int) -> int:
        if percentage >= 70:
            return self.F4_LICENSE
        else:
            return self.NO_LICENSE


class LicenseCalculator:
    strategies = {
        LicenseStrategy.F1_LICENSE: F1LicenseStrategy(),
        LicenseStrategy.F2_LICENSE: F2LicenseStrategy(),
        LicenseStrategy.F3_LICENSE: F3LicenseStrategy(),
        LicenseStrategy.F4_LICENSE: F4LicenseStrategy(),
    }

    def calculate(self, course: int, percentage: int) -> int:
        strategy = self.strategies.get(course)
        if not strategy:
            return LicenseStrategy.NO_LICENSE
        return strategy.calculate_license(percentage)

    @classmethod
    def get_license_name(cls, course_license):
        course = LicenseStrategy.COURSE_MAPPING(course_license)
        if course is None:
            return '-'
        return course.get('course_license', '-')


class ParticipationValidator:
    def __init__(self, course_license):
        self.course = LicenseStrategy.COURSE_MAPPING(course_license).get('user_current_license')

    def fails_minimum_season_games(self, participant_license, minimum_season_games):
        return self._evaluate_requirement(participant_license, minimum_season_games, 'minimum_season_games')

    def fails_check_minimum_total_games(self, participant_license, minimum_total_games):
        return self._evaluate_requirement(participant_license, minimum_total_games, 'minimum_total_games')

    def fails_minimum_consecutive_license_years(self, participant_license: int, license_years: str):
        if license_years == '-':
            return True
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
