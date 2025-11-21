from league_table.models import LeagueSeasonConfig


class LeagueTableRepository:
    @staticmethod
    def get_league_season_config(
        league_slug: str, season_slug: str
    ) -> LeagueSeasonConfig:
        return LeagueSeasonConfig.objects.get(
            season__slug=season_slug, league__slug=league_slug
        )
