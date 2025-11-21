from dataclasses import dataclass, field
from typing import Dict, Any

from league_table.models import LeagueSeasonConfig, LeagueRuleset


@dataclass
class TeamStats:
    team_id: int
    team_name: str
    points: int = 0
    pf: int = 0
    pa: int = 0
    diff: int = 0
    extras: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self):
        base = {
            "team_id": self.team_id,
            "team_name": self.team_name,
            "points": self.points,
            "pf": self.pf,
            "pa": self.pa,
            "diff": self.diff,
        }
        base.update(self.extras)
        return base


@dataclass
class LeagueConfigRuleset:
    league_points_map: dict
    tie_break_order: list[dict]
    game_points_map: dict
    excluded_league_id: int

    @classmethod
    def from_ruleset(cls, ruleset: LeagueRuleset):
        return cls(
            tie_break_order=ruleset.tie_break_order(),
            league_points_map=ruleset.league_points_map(),
            game_points_map=ruleset.game_points_map(),
            excluded_league_id=ruleset.exclude_main_league_for_league_points.pk,
        )


@dataclass
class LeagueConfig:
    ruleset: LeagueConfigRuleset
    team_point_adjustments_map: list[dict]
    excluded_gameday_ids: list[int]

    @classmethod
    def from_league_season_config(cls, league_season_config: LeagueSeasonConfig):
        ruleset = league_season_config.ruleset
        return cls(
            ruleset=LeagueConfigRuleset.from_ruleset(ruleset),
            team_point_adjustments_map=league_season_config.get_team_point_adjustment_map(),
            excluded_gameday_ids=league_season_config.get_excluded_gameday_ids(),
        )
