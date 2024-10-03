from scorecard2.tests.setup_factories.factories import ScorecardConfigFactory


class DbSetupScorecard:

    @staticmethod
    def create_full_scorecard_config(league=None):
        if league:
            scorecard_config = ScorecardConfigFactory(leagues=[league])
        else:
            scorecard_config = ScorecardConfigFactory()

        return scorecard_config
