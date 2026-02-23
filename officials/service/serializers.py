from rest_framework.fields import CharField, IntegerField, SerializerMethodField
from rest_framework.serializers import Serializer

from officials.service.boff_license_calculation import (
    ParticipationValidator,
    LicenseStrategy,
)


class OfficialLicenseCheckSerializer(Serializer):
    LICENSE_ID_C = "license_id"
    LICENSE_YEARS_C = "license_years"
    TEAM_DESCRIPTION = "team__description"
    TOTAL_GAMES_C = "total_games"
    TOTAL_SEASON_GAMES_C = "total_season_games"

    ALL_FIELD_VALUES = [
        "external_id",
        "id",
        TEAM_DESCRIPTION,
        "last_name",
        "first_name",
        LICENSE_ID_C,
        "license_name",
        LICENSE_YEARS_C,
        TOTAL_GAMES_C,
        TOTAL_SEASON_GAMES_C,
    ]
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
        self.license_id = self.context.get("license_id")
        self.validator = ParticipationValidator(self.license_id)

    def get_validation_errors(self, obj):
        license_id = obj.get(self.LICENSE_ID_C)
        return {
            "no_license": self.validator.fails_current_license_requirement(license_id),
            "total_season_games": self.validator.fails_minimum_season_games(
                license_id, obj[self.TOTAL_SEASON_GAMES_C]
            ),
            "total_games": self.validator.fails_check_minimum_total_games(
                license_id, obj[self.TOTAL_GAMES_C]
            ),
            "minimum_consecutive_license_years": (
                False
                if self.context.get("license_id") != LicenseStrategy.F1_LICENSE
                else self.validator.fails_minimum_consecutive_license_years(
                    license_id, obj[self.LICENSE_YEARS_C]
                )
            ),
        }
