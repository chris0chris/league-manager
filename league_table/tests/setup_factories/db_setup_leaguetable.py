from league_table.service.datatypes import LeagueConfigRuleset, LeaguePoints, LeagueConfig


class DbSetupLeagueTable:
    pass


LEAGUE_TABLE_TEST_RULESET = LeagueConfigRuleset(
    league_points=LeaguePoints(
        max_points_other_league=2.0,
        max_points_same_league=1.0,
        points_draw_other_league=1.0,
        points_draw_same_league=0.5,
        points_win_other_league=2.0,
        points_win_same_league=1.0,
        points_loss_other_league=0,
        points_loss_same_league=0,
    ),
    tie_break_order=[
        {"is_ascending": False, "key": "league_quotient"},
        {"is_ascending": False, "key": "direct_wins"},
        {"is_ascending": False, "key": "direct_point_diff"},
        {"is_ascending": False, "key": "direct_points_scored"},
        {"is_ascending": False, "key": "overall_point_diff"},
        {"is_ascending": False, "key": "overall_points_scored"},
        {"is_ascending": True, "key": "name_ascending"},
    ],
    league_quotient_precision=3,
)
LEAGUE_TABLE_TEST_LEAGUE_CONFIG = LeagueConfig(
    ruleset=LEAGUE_TABLE_TEST_RULESET,
    team_point_adjustments_map=[],
    excluded_gameday_ids=[],
    leagues_for_league_points_ids=[]
)
