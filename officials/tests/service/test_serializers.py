from officials.service.boff_license_calculation import (
    ParticipationValidator,
    LicenseStrategy,
)


class TestParticipationValidator:
    def test_fails_minimum_consecutive_license_years(self):
        validator_f1 = ParticipationValidator(LicenseStrategy.F1_LICENSE)
        assert (
            validator_f1.fails_minimum_consecutive_license_years(
                LicenseStrategy.F1_LICENSE, "2023,2022"
            )
            is False
        )
        assert (
            validator_f1.fails_minimum_consecutive_license_years(
                LicenseStrategy.F2_LICENSE, "2023,2022,2021,2020,2019"
            )
            is False
        )
        assert (
            validator_f1.fails_minimum_consecutive_license_years(
                LicenseStrategy.F2_LICENSE, "2024,2023,2021,2020,2019"
            )
            is True
        )
        assert (
            validator_f1.fails_minimum_consecutive_license_years(
                LicenseStrategy.F2_LICENSE, "2022,2021,2020,2019"
            )
            is True
        )

    def test_fails_current_license_requirement(self):
        validator_f1 = ParticipationValidator(LicenseStrategy.F1_LICENSE)
        assert (
            validator_f1.fails_current_license_requirement(LicenseStrategy.F1_LICENSE)
            is False
        )
        assert (
            validator_f1.fails_current_license_requirement(LicenseStrategy.F2_LICENSE)
            is False
        )
        assert (
            validator_f1.fails_current_license_requirement(LicenseStrategy.F3_LICENSE)
            is True
        )

        validator_f4 = ParticipationValidator(LicenseStrategy.F4_LICENSE)
        assert validator_f4.fails_current_license_requirement(None) is False
        assert (
            validator_f4.fails_current_license_requirement(LicenseStrategy.F4_LICENSE)
            is True
        )
