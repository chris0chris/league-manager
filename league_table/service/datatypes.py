from dataclasses import dataclass, field
from typing import Dict, Any

from league_table.models import LeagueSeasonConfig, LeagueRuleset


@dataclass
class LeaguePoints:
    max_points_other_league: float
    max_points_same_league: float
    points_draw_other_league: float
    points_draw_same_league: float
    points_win_other_league: float
    points_win_same_league: float
    points_loss_other_league: float
    points_loss_same_league: float

    @classmethod
    def from_ruleset(cls, ruleset: LeagueRuleset):
        return cls(
            max_points_other_league=float(ruleset.max_points_other_league),
            max_points_same_league=float(ruleset.max_points_same_league),
            points_draw_other_league=float(ruleset.points_draw_other_league),
            points_draw_same_league=float(ruleset.points_draw_same_league),
            points_win_other_league=float(ruleset.points_win_other_league),
            points_win_same_league=float(ruleset.points_win_same_league),
            points_loss_other_league=float(ruleset.points_loss_other_league),
            points_loss_same_league=float(ruleset.points_loss_same_league),
        )


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
    league_points: LeaguePoints
    league_quotient_precision: int
    tie_break_order: list[dict]
    excluded_league_id: int

    @classmethod
    def from_ruleset(cls, ruleset: LeagueRuleset):
        return cls(
            tie_break_order=ruleset.tie_break_order(),
            league_points=LeaguePoints.from_ruleset(ruleset),
            league_quotient_precision=ruleset.league_quotient_precision,
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
