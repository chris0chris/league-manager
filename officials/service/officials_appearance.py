from django.db.models import QuerySet, Count

from officials.api.serializers import OfficialSerializer
from officials.models import Official, OfficialLicenseHistory


class OfficialAppearanceTeamListEntry:
    def __init__(self, official: Official, year):
        self.official = official
        self.year = year

    def as_json(self):
        game_officials: QuerySet = self.official.gameofficial_set.filter(gameinfo__gameday__date__year=self.year)
        external_games_by_official: QuerySet = self.official.officialexternalgames_set.filter(date__year=self.year)
        e = \
        self.official.officialexternalgames_set.filter(date__year=self.year).aggregate(num_games=Count('number_games'))[
            'num_games']
        official_license: OfficialLicenseHistory = self.official.officiallicensehistory_set.get(
            created_at__year=self.year)
        team = self.official.team
        entry = OfficialSerializer(self.official).data
        referee_ext = external_games_by_official.filter(position='Referee').aggregate(num_games=Count('number_games'))[
            'num_games']
        down_judge_ext = \
        external_games_by_official.filter(position='Down Judge').aggregate(num_games=Count('number_games'))['num_games']
        field_judge_ext = \
        external_games_by_official.filter(position='Field Judge').aggregate(num_games=Count('number_games'))[
            'num_games']
        side_judge_ext = \
        external_games_by_official.filter(position='Side Judge').aggregate(num_games=Count('number_games'))['num_games']
        mix_ext = external_games_by_official.filter(position='Mix').aggregate(num_games=Count('number_games'))[
            'num_games']
        overall_ext = external_games_by_official.aggregate(num_games=Count('number_games'))['num_games']
        entry.update(
            {
                'license': official_license.license.name,
                'team': team.name,
                'team_id': team.pk,
                'referee': game_officials.filter(position='Referee').count(),
                'referee_ext': referee_ext,
                'down_judge': game_officials.filter(position='Down Judge').count(),
                'down_judge_ext': down_judge_ext,
                'field_judge': game_officials.filter(position='Field Judge').count(),
                'field_judge_ext': field_judge_ext,
                'side_judge': game_officials.filter(position='Side Judge').count(),
                'side_judge_ext': side_judge_ext,
                'mix_ext': mix_ext,
                'overall': game_officials.exclude(position='Scorecard Judge').count(),
                'overall_ext': overall_ext,
            }
        )
        return entry


class OfficialAppearanceTeamList(object):
    def __init__(self, team_id, year):
        self.team_id = team_id
        self.year = year

    def as_json(self, are_names_obfuscated=True):
        return {
            'year': self.year,
            'officials_list': self.get_officials_list()
        }

    def get_officials_list(self):
        officials = Official.objects.filter(team_id=self.team_id).order_by('last_name', 'first_name')
        officials_result_list = []
        for current_official in officials:
            try:
                officials_result_list += [
                    OfficialAppearanceTeamListEntry(current_official, self.year).as_json()
                ]
            except OfficialLicenseHistory.DoesNotExist:
                # no official found with a license for the year ... skip it
                continue
        return officials_result_list
