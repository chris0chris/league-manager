from datetime import date

from django.db import models
from django.db.models import QuerySet

from teammanager.models import Team


class Official(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    team: Team = models.ForeignKey(Team, on_delete=models.SET_NULL, null=True)
    external_id = models.CharField(max_length=100, null=True, default=None)

    objects: QuerySet = models.Manager()

    def get_license(self):
        return self.officiallicensehistory_set.first().license

    def get_officiated_games(self):
        all_officiated_games = self.gameofficial_set.all()
        result_list = []
        result_list2 = {}
        for current_game in all_officiated_games:
            result_list += [{
                'position': current_game.position,
                'year': current_game.gameinfo.gameday.date.year
            }]
            year = current_game.gameinfo.gameday.date.year
            position = current_game.position.replace(' ', '_')
            if result_list2.get(year):
                if result_list2[year].get(position):
                    result_list2[year][position] = result_list2[year][position] + 1
                else:
                    result_list2[year][position] = 1
            else:
                result_list2[year] = {
                    position: 1
                }
        return result_list2
        return {
            'referee': all_officiated_games.filter(position='Referee').count(),
            'down_judge': all_officiated_games.filter(position='Down Judge').count(),
            'field_judge': all_officiated_games.filter(position='Field Judge').count(),
            'side_judge': all_officiated_games.filter(position='Side Judge').count(),
            'overall': all_officiated_games.exclude(position='Scorecard Judge').count(),
        }

    def __str__(self):
        return f'{self.team.name}__{self.last_name}, {self.first_name}'


class OfficialLicense(models.Model):
    name = models.CharField(max_length=100)

    objects: QuerySet = models.Manager()

    def __str__(self):
        return f'{self.name}'


class OfficialLicenseHistory(models.Model):
    official: Official = models.ForeignKey(Official, on_delete=models.CASCADE)
    license = models.ForeignKey(OfficialLicense, on_delete=models.CASCADE)
    created_at = models.DateField(default=date.today)

    objects: QuerySet = models.Manager()

    def __str__(self):
        return f'{self.created_at}__{self.license} - {self.official.last_name}'
