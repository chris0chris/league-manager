# Create your views here.
from datetime import datetime

from django.contrib import messages
from django.contrib.auth.mixins import UserPassesTestMixin, LoginRequiredMixin
from django.shortcuts import render
from django.utils.safestring import mark_safe
from django.views import View

from officials.api.serializers import GameOfficialAllInfosSerializer
from officials.forms import AddInternalGameOfficialEntryForm
from officials.models import Official
from officials.service.official_service import OfficialService
from teammanager.models import Team, GameOfficial, Gameinfo


class OfficialsTeamListView(View):
    model = Official
    template_name = 'officials/officials_list.html'

    def get(self, request, **kwargs):
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

    def get(self, request, **kwargs):
        year = kwargs.get('year')
        official_service = OfficialService()
        if self.request.user.is_staff:
            context = {'object_list': official_service.get_all_officials(year, are_names_obfuscated=False)}
        else:
            context = {'object_list': official_service.get_all_officials(year)}
        return render(request, self.template_name, context)


class GameOfficialListView(View):
    template_name = 'officials/game_officials_list.html'

    def get(self, request, **kwargs):
        year = kwargs.get('year', datetime.today().year)
        team_id = kwargs.get('pk')
        game_officials = GameOfficial.objects.filter(gameinfo__gameday__date__year=year).exclude(
            position='Scorecard Judge')
        if team_id:
            game_officials_with_no_official = game_officials.filter(gameinfo__officials__pk=team_id, official=None)
            game_officials_with_official_link = game_officials.filter(official__team__pk=team_id)
            game_officials = game_officials_with_no_official.union(game_officials_with_official_link)
        is_staff = request.user.is_staff
        team_name = request.user.username
        context = {
            'object_list': GameOfficialAllInfosSerializer(instance=game_officials, display_names_for_team=team_name,
                                                          is_staff=is_staff, many=True).data}
        return render(request, self.template_name, context)


class AddInternalGameOfficialUpdateView(LoginRequiredMixin, UserPassesTestMixin, View):
    form_class = AddInternalGameOfficialEntryForm
    template_name = 'officials/internal_gameofficial_form.html'

    def get(self, request):
        return render(request, self.template_name, {'form': AddInternalGameOfficialEntryForm()})

    def post(self, request):
        created_entries = 'Folgende Einträge erzeugt: <br>'
        current_line = []
        form = AddInternalGameOfficialEntryForm(request.POST)
        data = form.data.copy()
        all_lines = data.get('entries').splitlines()
        try:
            official_service = OfficialService()
            while all_lines:
                current_line = all_lines.pop(0)
                result = [x.strip() for x in current_line.split(',')]
                created_entries += official_service.create_game_official_entry(result) + '<br>'
        except (TypeError, ValueError) as error:
            error_message = error.args[0]
            all_lines = [current_line] + all_lines
            if 'positional arguments' in error_message:
                form.add_error('entries', 'Zu viele Einträge in der ersten Zeile! Maximal 3 erlaubt.')
            else:
                form.add_error('entries', error_message)
        except Gameinfo.DoesNotExist:
            all_lines = [current_line] + all_lines
            form.add_error('entries', 'gameinfo_id nicht gefunden!')
        except Official.DoesNotExist:
            all_lines = [current_line] + all_lines
            form.add_error('entries', 'official_id nicht gefunden!')

        if form.is_valid():
            messages.success(self.request, mark_safe(created_entries))
        data['entries'] = '\n'.join(all_lines)
        form.data = data
        return render(request, self.template_name, {'form': form})

    def test_func(self):
        return self.request.user.is_staff
