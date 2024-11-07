from officials.service.serializers import ParticipationValidator


class TestParticipationValidator:
    def test_fails_minimum_consecutive_license_years(self):
        validator_f1 = ParticipationValidator(ParticipationValidator.F1)
        assert validator_f1.fails_minimum_consecutive_license_years(ParticipationValidator.F1, "2023,2022") is False
        assert validator_f1.fails_minimum_consecutive_license_years(ParticipationValidator.F2,
                                                                    "2023,2022,2021,2020,2019") is False
        assert validator_f1.fails_minimum_consecutive_license_years(ParticipationValidator.F2,
                                                                    "2024,2023,2021,2020,2019") is True
        assert validator_f1.fails_minimum_consecutive_license_years(ParticipationValidator.F2,
                                                                    "2022,2021,2020,2019") is True

    def test_fails_current_license_requirement(self):
        validator_f1 = ParticipationValidator(ParticipationValidator.F1)
        assert validator_f1.fails_current_license_requirement(ParticipationValidator.F1) is False
        assert validator_f1.fails_current_license_requirement(ParticipationValidator.F2) is False
        assert validator_f1.fails_current_license_requirement(ParticipationValidator.F3) is True

        validator_f4 = ParticipationValidator(ParticipationValidator.F4)
        assert validator_f4.fails_current_license_requirement(None) is False
        assert validator_f4.fails_current_license_requirement(ParticipationValidator.F4) is True
