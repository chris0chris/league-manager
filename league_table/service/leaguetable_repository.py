from gamedays.models import Season, League
from league_table.models import LeagueSeasonConfig


class LeagueTableRepository:
    @staticmethod
    def get_league_season_ruleset_as_dict(league: League, season: Season) -> dict:
        """
        Convert the ruleset DB entity into a simple config dict
        for use in the ranking engine.
        """
        ruleset = LeagueSeasonConfig.objects.get(season=season, league=league).ruleset
        return {
            "use_direct_comparison": ruleset.use_direct_comparison,
            "use_point_diff_direct": ruleset.use_point_diff_direct,
            "use_points_scored_direct": ruleset.use_points_scored_direct,
            "use_overall_point_diff": ruleset.use_overall_point_diff,
            "use_overall_points_scored": ruleset.use_overall_points_scored,
            "use_name_ascending": ruleset.use_name_ascending,
            "points_win_same_league": getattr(
                ruleset, "points_win_same_league", 1
            ),
            "points_win_other_league": getattr(
                ruleset, "points_win_other_league", 2
            ),
            "points_draw_same_league": getattr(
                ruleset, "points_draw_same_league", 0.5
            ),
            "points_draw_other_league": getattr(
                ruleset, "points_draw_other_league", 1
            ),
            "max_points_same_league": getattr(
                ruleset, "max_points_same_league", 1
            ),
            "max_points_other_league": getattr(
                ruleset, "max_points_other_league", 2
            ),
        }
