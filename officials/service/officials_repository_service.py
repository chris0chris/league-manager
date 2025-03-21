from datetime import datetime, timedelta

from django.db.models import Sum, Count, Q, OuterRef, Subquery, Value, FloatField, CharField, F
from django.db.models.functions import Coalesce

from officials.models import Official, OfficialLicenseHistory, OfficialExternalGames
from officials.service.funcs import GroupConcat


class OfficialsRepositoryService:
    # noinspection PyMethodMayBeStatic
    def get_officials_game_count_for_license(self, latest_date: datetime, external_ids: list[str],
                                             license_ids: list[int] = (1, 3)):
        officials = (
            Official.objects
            .filter(external_id__in=external_ids)
            # .extra(select={"license_years": license_ids_sql})
            .annotate(
                license_years=Coalesce(
                    Subquery(
                        OfficialLicenseHistory.objects
                        .filter(
                            official=OuterRef('pk'),
                            license_id__in=license_ids
                        )
                        .annotate(year=F('created_at__year'))
                        .values('official')
                        .annotate(years=GroupConcat(F('year'), ordering='created_at ASC'))
                        .values('years'),
                        output_field=CharField()
                    ),
                    Value('-', output_field=CharField())
                ),
                license_name=Coalesce(Subquery(self._license_name_subquery(latest_date.year)), Value('-')),
                license_id=Subquery(self._license_id_subquery(latest_date.year)),
                total_games=Subquery(self._internal_games_subquery(latest_date)) + Subquery(
                    self._external_games_subquery(latest_date)),
                total_season_games=Subquery(self._current_season_external_subquery(latest_date)) + Subquery(
                    self._current_season_internal_subquery(latest_date)
                )
            ).order_by('last_name')
        )

        return officials

    @classmethod
    def _generic_games_subquery_with_calculation(cls, query_filter: Q):
        """
        Subquery that calculates and sums `calculated_number_games` for official external games.
        """
        calculated_number_games = OfficialExternalGames.calculated_games_expression('officialexternalgames__')

        return Official.objects.filter(pk=OuterRef('pk')).annotate(
            games=Coalesce(
                Sum(calculated_number_games, filter=query_filter, output_field=FloatField()),
                Value(0), output_field=FloatField()
            )
        ).values('games')[:1]

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
        return OfficialsRepositoryService._license_subquery(year=year - 1, field='license__name')

    @staticmethod
    def _license_id_subquery(year: int):
        return OfficialsRepositoryService._license_subquery(year=year - 1, field='license__pk')

    @staticmethod
    def _generic_games_subquery(field: str, aggregation, query_filter: Q,
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
            query_filter &= ~Q(gameofficial__position='Scorecard Judge')

        return Official.objects.filter(pk=OuterRef('pk')).annotate(
            games=Coalesce(
                aggregation(field, filter=query_filter),
                Value(0)
            )
        ).values('games')[:1]

    @classmethod
    def _external_games_subquery(cls, date: datetime):
        return cls._generic_games_subquery_with_calculation(
            query_filter=Q(officialexternalgames__date__lte=date)
        )

    @classmethod
    def _current_season_external_subquery(cls, date: datetime):
        return cls._generic_games_subquery_with_calculation(
            query_filter=(
                    Q(officialexternalgames__date__lte=date) &
                    Q(officialexternalgames__date__gte=OfficialsRepositoryService.sub_one_year_from(date))
            )
        )

    @classmethod
    def sub_one_year_from(cls, date: datetime):
        return date - timedelta(days=365)

    @classmethod
    def _internal_games_subquery(cls, date: datetime):
        return cls._generic_games_subquery(
            field='gameofficial',
            query_filter=Q(gameofficial__gameinfo__gameday__date__lte=date),
            aggregation=Count,
            exclude_scorecard_judge=True,
        )

    @classmethod
    def _current_season_internal_subquery(cls, date: datetime):
        return cls._generic_games_subquery(
            field='gameofficial',
            query_filter=(Q(gameofficial__gameinfo__gameday__date__lte=date) & Q(
                gameofficial__gameinfo__gameday__date__gte=OfficialsRepositoryService.sub_one_year_from(date))),
            aggregation=Count,
            exclude_scorecard_judge=True,
        )

    # noinspection PyMethodMayBeStatic
    def get_all_years_with_team_official_licenses(self, team):
        return OfficialLicenseHistory.objects.filter(official__team=team).values_list(
            'created_at__year', flat=True).distinct()
