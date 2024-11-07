from django.db.models import Sum, Count, Q, OuterRef, Subquery, Value
from django.db.models.functions import Coalesce

from officials.models import Official, OfficialLicenseHistory


class OfficialsRepositoryService:
    EXCLUDE_SCORECARD_JUDGE = ~Q(gameofficial__position='Scorecard Judge')

    # noinspection PyMethodMayBeStatic
    def get_officials_game_count_for_license(self, year: int, external_ids: list[str], license_ids: list[int] = (1, 3)):
        license_ids_sql = self._construct_license_sql(license_ids)

        officials = (
            Official.objects
            .filter(external_id__in=external_ids)
            .extra(select={"license_years": license_ids_sql})
            .annotate(
                license_name=Coalesce(Subquery(self._license_name_subquery(year)), Value('-')),
                license_id=Subquery(self._license_id_subquery(year)),
                total_games=Subquery(self._internal_games_subquery(year)) + Subquery(self._external_games_subquery(year)),
                total_season_games=Subquery(self._current_season_external_subquery(year)) + Subquery(
                    self._current_season_internal_subquery(year)
                )
            ).order_by('last_name')
        )

        return officials

    @staticmethod
    def _construct_license_sql(license_ids: list[int]) -> str:
        license_ids_str = ', '.join(map(str, license_ids))
        return f"""
                IFNULL(
                    (
                        SELECT GROUP_CONCAT(YEAR(created_at) SEPARATOR ',')
                        FROM officials_officiallicensehistory
                        WHERE official_id = officials_official.id
                        AND license_id IN ({license_ids_str})
                    ),
                    '-'
                )
            """

    @staticmethod
    def _license_subquery(year: int, field: str):
        """
        Helper method to create subqueries for license name or ID in a specific year.

        :param year: The target year for the query filter.
        :param field: The specific field to retrieve (e.g., 'license__name' or 'license__pk').
        :return: Subquery to retrieve the desired field for the license in the specified year.
        """
        return OfficialLicenseHistory.objects.filter(
            official=OuterRef('pk'),
            created_at__year=year
        ).values(field)[:1]

    @staticmethod
    def _license_name_subquery(year: int):
        return OfficialsRepositoryService._license_subquery(year=year, field='license__name')

    @staticmethod
    def _license_id_subquery(year: int):
        return OfficialsRepositoryService._license_subquery(year=year, field='license__pk')

    @classmethod
    def _generic_games_subquery(cls, field: str, aggregation, query_filter: Q,
                                exclude_scorecard_judge: bool = False):
        """
        Helper method to generate subqueries for various game counts.

        :param field: The field to aggregate on.
        :param aggregation: Aggregation function (Sum, Count, etc.)
        :param query_filter: The query filter to filter down the aggregation.
        :param exclude_scorecard_judge: Boolean indicating if Scorecard Judge positions should be excluded.
        :return: Subquery for the aggregated games count.
        """
        if exclude_scorecard_judge:
            query_filter &= cls.EXCLUDE_SCORECARD_JUDGE

        return Official.objects.filter(pk=OuterRef('pk')).annotate(
            games=Coalesce(
                aggregation(field, filter=query_filter),
                Value(0)
            )
        ).values('games')[:1]

    @classmethod
    def _external_games_subquery(cls, year: int):
        return cls._generic_games_subquery(
            field='officialexternalgames__number_games',
            query_filter=Q(officialexternalgames__date__year__lte=year),
            aggregation=Sum,
            exclude_scorecard_judge=True,
        )

    @classmethod
    def _current_season_external_subquery(cls, year: int):
        return cls._generic_games_subquery(
            field='officialexternalgames__number_games',
            query_filter=Q(officialexternalgames__date__year=year),
            aggregation=Sum,
        )

    @classmethod
    def _internal_games_subquery(cls, year: int):
        return cls._generic_games_subquery(
            field='gameofficial',
            query_filter=Q(gameofficial__gameinfo__gameday__date__year__lte=year),
            aggregation=Count,
            exclude_scorecard_judge=True,
        )

    @classmethod
    def _current_season_internal_subquery(cls, year: int):
        return cls._generic_games_subquery(
            field='gameofficial',
            query_filter=Q(gameofficial__gameinfo__gameday__date__year=year),
            aggregation=Count,
            exclude_scorecard_judge=True,
        )

    # noinspection PyMethodMayBeStatic
    def get_all_years_with_team_official_licenses(self, team):
        return OfficialLicenseHistory.objects.filter(official__team=team).values_list(
            'created_at__year', flat=True).distinct()
