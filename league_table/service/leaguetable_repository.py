from typing import Any

from django.db.models import QuerySet

from league_table.models import LeagueSeasonConfig


class LeagueTableRepository:
    @staticmethod
    def get_league_season_config(
        league_slug: str, season_slug: str | None
    ) -> LeagueSeasonConfig:
        qs = LeagueSeasonConfig.objects.filter(league__slug=league_slug)

        if season_slug is None:
            return qs.latest("season__pk")

        return qs.get(season__slug=season_slug)

    @classmethod
    def get_league_list(cls) -> QuerySet[LeagueSeasonConfig, Any]:
        return LeagueSeasonConfig.objects.all().order_by("league__name").values("league__slug", "league__name")
