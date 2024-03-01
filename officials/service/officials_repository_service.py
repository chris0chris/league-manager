from django.db.models import Sum, QuerySet

from gamedays.models import GameOfficial
from officials.models import Official, OfficialExternalGames, OfficialLicenseHistory


class OfficialsRepositoryService:
    # noinspection PyMethodMayBeStatic
    def get_officials_game_count_for_license(self, year, external_ids):
        if not external_ids:
            return []
        else:
            officials = Official.objects.filter(external_id__in=external_ids)
        all_officials = []
        official: Official
        for official in officials:
            external_ids.remove(int(official.external_id))
            official_qs = GameOfficial.objects.filter(official=official).exclude(position='Scorecard Judge')
            external_official_qs = OfficialExternalGames.objects.filter(official=official)
            all_officials += [OfficialGameCount(
                year,
                official,
                official_qs,
                external_official_qs,
            ).as_json()]
        for missing_external_id in external_ids:
            all_officials += [
                {
                    'external_id': missing_external_id,
                    'team': 'Person hat noch nie an einem Kurs teilgenommen',
                    'last_name': '',
                    'first_name': '',
                    'last_license': 'Keine',
                    'license_year': '-',
                    'current_season': 0,
                    'overall': 0,
                }
            ]
        return all_officials

    # noinspection PyMethodMayBeStatic
    def get_all_years_with_team_official_licenses(self, team):
        return OfficialLicenseHistory.objects.filter(official__team=team).values_list(
            'created_at__year', flat=True).distinct()


class OfficialGameCount:
    def __init__(self, year: int, official: Official, official_query_set: QuerySet,
                 external_official_query_set: QuerySet):
        self.year = year
        self.official = official
        self.official_query_set = official_query_set
        self.external_official_query_set = external_official_query_set

    def get_all_internal_games(self) -> int:
        return self.official_query_set.count()

    def get_all_external_games(self) -> int:
        return self.aggregate_games(self.external_official_query_set)

    def get_current_season_internal(self) -> int:
        return self.official_query_set.filter(gameinfo__gameday__date__year=self.year).count()

    def get_current_season_external(self) -> int:
        return self.aggregate_games(self.external_official_query_set.filter(date__year=self.year))

    def aggregate_games(self, external_official_qs) -> int:
        all_external_games_count = external_official_qs.aggregate(num_games=Sum('number_games')).get('num_games',
                                                                                                     0) or 0
        return all_external_games_count

    def __repr__(self):
        return f'OfficialGameCount(year={self.year}, ' \
               f'official={self.official}, ' \
               f'official_query_set={self.official_query_set}, ' \
               f'external_official_query_set={self.external_official_query_set})'

    def as_json(self):
        license_history: OfficialLicenseHistory = self.official.officiallicensehistory_set.last()
        return {
            'external_id': self.official.external_id,
            'team': self.official.team.description,
            'last_name': self.official.last_name,
            'first_name': self.official.first_name,
            'last_license': license_history.license.name if license_history else 'Keine',
            'license_year': license_history.created_at.year if license_history else '-',
            'current_season': self.get_current_season_internal() + self.get_current_season_external(),
            'overall': self.get_all_internal_games() + self.get_all_external_games(),
        }
