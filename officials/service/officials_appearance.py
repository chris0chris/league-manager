from django.db.models import QuerySet, Sum

from officials.api.serializers import OfficialSerializer
from officials.models import Official, OfficialLicenseHistory
from teammanager.wrapper.team_wrapper import TeamWrapper


class OfficialAppearanceTeamListEntry:
    def __init__(self, official: Official, year):
        self.official = official
        self.year = year

    def as_json(self):
        game_officials: QuerySet = self.official.gameofficial_set.filter(gameinfo__gameday__date__year=self.year)
        external_games_by_official: QuerySet = self.official.officialexternalgames_set.filter(date__year=self.year)
        official_license: OfficialLicenseHistory = self.official.officiallicensehistory_set.get(
            created_at__year=self.year)
        team = self.official.team
        entry = OfficialSerializer(instance=self.official).data
        referee_ext = external_games_by_official.filter(position='Referee').aggregate(num_games=Sum('number_games'))[
            'num_games']
        down_judge_ext = \
            external_games_by_official.filter(position='Down Judge').aggregate(num_games=Sum('number_games'))[
                'num_games']
        field_judge_ext = \
            external_games_by_official.filter(position='Field Judge').aggregate(num_games=Sum('number_games'))[
                'num_games']
        side_judge_ext = \
            external_games_by_official.filter(position='Side Judge').aggregate(num_games=Sum('number_games'))[
                'num_games']
        overall_ext = external_games_by_official.aggregate(num_games=Sum('number_games'))['num_games']
        entry.update(
            {
                'license': official_license.license.name,
                'team': team.name,
                'team_id': team.pk,
                'referee': game_officials.filter(position='Referee').count(),
                'referee_ext': 0 if referee_ext is None else referee_ext,
                'down_judge': game_officials.filter(position='Down Judge').count(),
                'down_judge_ext': 0 if down_judge_ext is None else down_judge_ext,
                'field_judge': game_officials.filter(position='Field Judge').count(),
                'field_judge_ext': 0 if field_judge_ext is None else field_judge_ext,
                'side_judge': game_officials.filter(position='Side Judge').count(),
                'side_judge_ext': 0 if side_judge_ext is None else side_judge_ext,
                'overall': game_officials.exclude(position='Scorecard Judge').count(),
                'overall_ext': 0 if overall_ext is None else overall_ext,
            }
        )
        return entry


class OfficialAppearanceTeamList(object):
    def __init__(self, team_id, year):
        self.team = TeamWrapper(team_id)
        self.year = year

    def as_json(self):
        return {
            'year': self.year,
            'team': self.team.get_team_description(),
            'officials_list': self.get_officials_list()
        }

    def get_officials_list(self):
        officials = Official.objects.filter(team_id=self.team.get_id()).order_by('last_name', 'first_name')
        officials_result_list = []
        years_set = set()
        for current_official in officials:
            years_set.update(
                list(current_official.officiallicensehistory_set.all().values_list('created_at__year', flat=True)))
            try:
                officials_result_list += [
                    OfficialAppearanceTeamListEntry(current_official, self.year).as_json()
                ]
            except OfficialLicenseHistory.DoesNotExist:
                # no official found with a license for the year ... skip it
                continue
        return {
            'years': sorted(years_set, reverse=True),
            'list': officials_result_list
        }
