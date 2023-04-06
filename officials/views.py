import json
from datetime import datetime

from django.contrib import messages
from django.contrib.auth.mixins import UserPassesTestMixin, LoginRequiredMixin
from django.shortcuts import render
from django.utils.safestring import mark_safe
from django.views import View

from gamedays.models import Team, Gameinfo, GameOfficial
from officials.api.serializers import GameOfficialAllInfoSerializer, OfficialSerializer
from officials.forms import AddInternalGameOfficialEntryForm, AddExternalGameOfficialEntryForm
from officials.models import Official
from officials.service.moodle.moodle_service import MoodleService
from officials.service.official_service import OfficialService


class OfficialsTeamListView(View):
    model = Official
    template_name = 'officials/officials_list.html'

    def get(self, request, **kwargs):
        team_id = kwargs.get('pk')
        year = kwargs.get('year', datetime.today().year)
        official_service = OfficialService()
        need_names_to_be_obfuscated = not self.is_user_allowed_to_see_official_names(team_id)
        context = {
            'team_id': team_id,
            'object_list': official_service.get_officials_for(
                team_id, year,
                are_names_obfuscated=need_names_to_be_obfuscated)
        }
        return render(request, self.template_name, context)

    def is_user_allowed_to_see_official_names(self, team_id):
        team: Team = Team.objects.get(pk=team_id)
        if self.request.user.is_staff:
            return True
        return self.request.user.username == team.name


class AllOfficialsListView(View):
    template_name = 'officials/all_officials_list.html'

    def get(self, request, **kwargs):
        all_teams = Team.objects.all().exclude(location='dummy').order_by('description')
        context = {'object_list': all_teams}
        return render(request, self.template_name, context)


class GameOfficialListView(View):
    template_name = 'officials/game_officials_list.html'

    def get(self, request, **kwargs):
        year = kwargs.get('year', datetime.today().year)
        team_id = kwargs.get('pk')
        game_officials = GameOfficial.objects.filter(gameinfo__gameday__date__year=year).exclude(
            position='Scorecard Judge')
        game_officials = game_officials.order_by('gameinfo__gameday__date')
        if team_id:
            game_officials_with_no_official = game_officials.filter(gameinfo__officials__pk=team_id, official=None)
            game_officials_with_official_link = game_officials.filter(official__team__pk=team_id)
            game_officials = game_officials_with_no_official.union(game_officials_with_official_link)
        is_staff = request.user.is_staff
        team_name = request.user.username
        context = {
            'year': year,
            'object_list': GameOfficialAllInfoSerializer(instance=game_officials, display_names_for_team=team_name,
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


class AddExternalGameOfficialUpdateView(LoginRequiredMixin, UserPassesTestMixin, View):
    form_class = AddInternalGameOfficialEntryForm
    template_name = 'officials/external_gameofficial_form.html'

    def get(self, request):
        return render(request, self.template_name, {'form': AddExternalGameOfficialEntryForm()})

    def post(self, request):
        created_entries = 'Folgende Einträge erzeugt: <br>'
        current_line = []
        form = AddExternalGameOfficialEntryForm(request.POST)
        data = form.data.copy()
        all_lines = data.get('entries').splitlines()
        try:
            official_service = OfficialService()
            while all_lines:
                current_line = all_lines.pop(0)
                result = [x.strip() for x in current_line.split(',')]
                created_entries += official_service.create_external_official_entry(result) + '<br>'
        except (TypeError, ValueError) as error:
            error_message = error.args[0]
            all_lines = [current_line] + all_lines
            if 'positional arguments' in error_message:
                form.add_error('entries', 'Zu viele Einträge in der ersten Zeile! Maximal 7 erlaubt.')
            else:
                form.add_error('entries', error_message)
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


class GameCountOfficials(LoginRequiredMixin, UserPassesTestMixin, View):
    template_name = 'officials/game_count.html'

    def get(self, request, *args, **kwargs):
        year = kwargs.get('year', datetime.today().year)
        external_ids = request.GET.get('externalIds', '')
        external_ids = self.get_external_ids_as_int(external_ids)
        official_service = OfficialService()
        context = {
            'season': year,
            'officials_list': official_service.get_game_count(year, external_ids)
        }
        return render(request, self.template_name, context)

    def test_func(self):
        return self.request.user.is_staff

    def get_external_ids_as_int(self, external_ids):
        ids_as_array = external_ids.split(',')
        all_ids_as_int = []
        for current_id in ids_as_array:
            try:
                all_ids_as_int += [int(current_id)]
            except ValueError:
                continue
        return all_ids_as_int


class MoodleReportView(LoginRequiredMixin, UserPassesTestMixin, View):
    template_name = 'officials/moodle_report.html'

    def get(self, request, *args, **kwargs):
        moodle_service = MoodleService()
        result = moodle_service.update_licenses()
        context = {
            'result': json.dumps(result, indent=4)
        }
        return render(request, self.template_name, context)

    def test_func(self):
        return self.request.user.is_staff


class OfficialProfileView(View):
    template_name = 'officials/profile.html'

    def get(self, request, *args, **kwargs):
        license_id = kwargs.get('license_id')
        official = Official.objects.get(id=license_id)
        return render(
            request,
            self.template_name,
            OfficialSerializer(instance=official, is_staff=self.request.user.is_staff).data
        )


class OfficialAssociationListView(View):
    template_name = 'officials/association_list.html'

    def get(self, request, *args, **kwargs):
        association_abbreviation = kwargs.get('abbr')
        year = datetime.today().year
        official_list = Official.objects \
            .filter(association__abbr=association_abbreviation,
                    officiallicensehistory__created_at__year=year) \
            .exclude(officiallicensehistory__license_id=4) \
            .order_by('team__description', 'last_name')
        return render(
            request,
            self.template_name,
            {
                'association': association_abbreviation,
                'result': OfficialSerializer(
                    instance=official_list,
                    is_staff=self.is_user_allowed_to_see_official_names(association_abbreviation),
                    fetch_email=True,
                    many=True).data
            }
        )

    def is_user_allowed_to_see_official_names(self, association):
        if self.request.user.is_staff:
            return True
        return self.request.user.username == association
