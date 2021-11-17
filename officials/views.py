# Create your views here.
from datetime import datetime

from django.shortcuts import render
from django.views import View

from officials.api.serializers import GameOfficialAllInfosSerializer
from officials.models import Official
from officials.service.official_service import OfficialService
from teammanager.models import Team, GameOfficial


class OfficialsTeamListView(View):
    model = Official
    template_name = 'officials/officials_list.html'

    def get(self, request, *args, **kwargs):
        team_id = kwargs.get('pk')
        year = kwargs.get('year')
        official_service = OfficialService()
        if self.is_user_allowed_to_see_official_names(team_id):
            context = {'object_list': official_service.get_officials_for(team_id, year, are_names_obfuscated=False)}
        else:
            context = {'object_list': official_service.get_officials_for(team_id, year)}

        return render(request, self.template_name, context)

    def is_user_allowed_to_see_official_names(self, team_id):
        team: Team = Team.objects.get(pk=team_id)
        if self.request.user.is_staff:
            return True
        return self.request.user.username == team.name


class AllOfficialsListView(View):
    template_name = 'officials/all_officials_list.html'

    def get(self, request, *args, **kwargs):
        year = kwargs.get('year')
        official_service = OfficialService()
        if self.request.user.is_staff:
            context = {'object_list': official_service.get_all_officials(year, are_names_obfuscated=False)}
        else:
            context = {'object_list': official_service.get_all_officials(year)}
        return render(request, self.template_name, context)


class GameOfficialListView(View):
    template_name = 'officials/game_officials_list.html'

    def get(self, request, *args, **kwargs):
        year = kwargs.get('year', datetime.today().year)
        team_id = kwargs.get('pk')
        game_officials = GameOfficial.objects.filter(gameinfo__gameday__date__year=year).exclude(
            position='Scorecard Judge')
        if team_id:
            game_officials = game_officials.filter(gameinfo__officials__pk=team_id)
        is_staff = request.user.is_staff
        team_name = request.user.username
        context = {
            'object_list': GameOfficialAllInfosSerializer(instance=game_officials, display_names_for_team=team_name,
                                                          is_staff=is_staff, many=True).data}
        return render(request, self.template_name, context)
