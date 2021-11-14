# Create your views here.
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


# ToDo delete class when new season started
class GameOfficialListView(View):
    template_name = 'officials/game_officials_list.html'

    def get(self, request, *args, **kwargs):
        game_officials = GameOfficial.objects.exclude(position='Scorecard Judge')
        context = {'object_list': GameOfficialAllInfosSerializer(game_officials, many=True).data}
        return render(request, self.template_name, context)
