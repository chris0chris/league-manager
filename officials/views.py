import json
from datetime import datetime

from django.conf import settings
from django.contrib import messages
from django.contrib.auth.mixins import UserPassesTestMixin, LoginRequiredMixin
from django.core.paginator import Paginator, PageNotAnInteger, EmptyPage
from django.db.models import Subquery, OuterRef, Q
from django.http import HttpResponse
from django.shortcuts import render, redirect
from django.urls import reverse
from django.utils.decorators import method_decorator
from django.utils.safestring import mark_safe
from django.views import View
from django.views.decorators.cache import cache_page

from gamedays.models import Team, Gameinfo, GameOfficial, Gameresult
from league_manager.utils.view_utils import PermissionHelper
from officials.api.serializers import GameOfficialAllInfoSerializer, OfficialSerializer, OfficialGamelistSerializer
from officials.forms import AddInternalGameOfficialEntryForm, MoodleLoginForm
from officials.models import Official
from officials.service.moodle.moodle_api import MoodleApiException
from officials.service.moodle.moodle_service import MoodleService
from officials.service.official_service import OfficialService
from officials.service.signup_service import OfficialSignupService, DuplicateSignupError, MaxSignupError

MOODLE_LOGGED_IN_USER = 'moodle_logged_in_user'


class OfficialsTeamListView(View):
    model = Official
    template_name = 'officials/officials_list.html'

    def get(self, request, **kwargs):
        team_id = kwargs.get('pk')
        year = kwargs.get('season', datetime.today().year)
        official_service = OfficialService()
        return render(
            request,
            self.template_name,
            official_service.get_all_officials_with_team_infos(
                team_id,
                year,
                PermissionHelper.has_staff_or_user_permission(request, team_id)
            )
        )

    def is_user_allowed_to_see_official_names(self, team_id):
        team: Team = Team.objects.get(pk=team_id)
        if self.request.user.is_staff:
            return True
        return self.request.user.username == team.name


class AllOfficialsListView(View):
    template_name = 'officials/all_officials_list.html'

    @method_decorator(cache_page(60 * 60 * 24))
    def get(self, request, **kwargs):
        all_teams = Team.objects.all().exclude(location='dummy').order_by('description')
        context = {'object_list': all_teams}
        return render(request, self.template_name, context)


class GameOfficialListView(View):
    template_name = 'officials/game_officials_list.html'

    @method_decorator(cache_page(60 * 60 * 24))
    def get(self, request, **kwargs):
        year_str = kwargs.get('season', datetime.today().year)
        year = int(year_str) if year_str else None
        team_id = kwargs.get('pk')
        try:
            team_id = int(team_id) if team_id else None
        except ValueError:
            team_id = None
        game_officials = (
            GameOfficial.objects.filter(gameinfo__gameday__date__year=year)
            .exclude(position='Scorecard Judge')
        )
        if team_id:
            team = Team.objects.get(pk=team_id).description
            game_officials = game_officials.filter(
                Q(gameinfo__officials__pk=team_id, official=None) |
                Q(official__team__pk=team_id)
            )
            years = GameOfficial.objects.filter(Q(gameinfo__officials__pk=team_id, official=None) |
                                                Q(official__team__pk=team_id)).values_list(
                'gameinfo__gameday__date__year', flat=True).distinct()
        else:
            years = GameOfficial.objects.all().values_list('gameinfo__gameday__date__year', flat=True).distinct()
            team = None
        game_officials = game_officials.order_by('gameinfo__gameday__date')
        is_staff = request.user.is_staff
        team_name = request.user.username

        paginator = Paginator(game_officials, 1000)
        page = request.GET.get('page')
        try:
            game_officials_page = paginator.page(page)
        except PageNotAnInteger:
            game_officials_page = paginator.page(1)
        except EmptyPage:
            game_officials_page = paginator.page(paginator.num_pages)
        game_officials_object_list = game_officials_page.object_list.annotate(
            home=self._get_subquery(is_home=True),
            away=self._get_subquery(is_home=False),
        )
        from officials.urls import OFFICIALS_GAME_OFFICIALS_APPEARANCE_FOR_TEAM_AND_YEAR
        context = {
            'season': year,
            'team': team,
            'team_id': team_id,
            'years': sorted(years, reverse=True),
            'url_pattern': OFFICIALS_GAME_OFFICIALS_APPEARANCE_FOR_TEAM_AND_YEAR,
            'pk': team_id,
            'object_list':
                GameOfficialAllInfoSerializer(
                    instance=game_officials_object_list.values(*GameOfficialAllInfoSerializer.ALL_VALUE_FIELDS),
                    display_names_for_team=team_name,
                    is_staff=is_staff,
                    many=True
                ).data,
            'page_obj': game_officials_page,
        }
        return render(request, self.template_name, context)

    # noinspection PyMethodMayBeStatic
    def _get_subquery(self, is_home: bool):
        return Subquery(
            Gameresult.objects.filter(
                gameinfo=OuterRef('gameinfo'),
                isHome=is_home
            ).values('team__description')[:1]
        )


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
            while all_lines:
                current_line = all_lines.pop(0)
                result = [x.strip() for x in current_line.split(',')]
                created_entries += OfficialService.create_game_official_entry(result) + '<br>'
        except (TypeError, ValueError) as error:
            error_message = error.args[0]
            all_lines = [current_line] + all_lines
            if 'positional arguments' in error_message:
                form.add_error('entries', 'Zu viele Einträge in der ersten Zeile! Maximal 3 erlaubt.')
            else:
                form.add_error('entries', error_message)
        # noinspection PyUnresolvedReferences
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


class LicenseCheckForOfficials(LoginRequiredMixin, UserPassesTestMixin, View):
    template_name = 'officials/license_check.html'

    def get(self, request, *args, **kwargs):
        year = kwargs.get('year', datetime.today().year)
        course_id = kwargs.get('course_id')
        official_service = OfficialService()
        context = {
            'season': year,
            'officials_list': official_service.get_game_count_for_license(year, course_id)
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
        course_ids = request.GET.get('ids')
        moodle_service = MoodleService()
        result = moodle_service.update_licenses(course_ids)
        context = {
            'time': result[1],
            'result': json.dumps(result[0], indent=4)
        }
        return render(request, self.template_name, context)

    def test_func(self):
        return self.request.user.is_staff


class OfficialProfileLicenseView(View):
    template_name = 'officials/profile_license.html'

    def get(self, request, *args, **kwargs):
        license_id = kwargs.get('pk')
        official = Official.objects.get(id=license_id)
        return render(
            request,
            self.template_name,
            {
                'official_info': OfficialSerializer(instance=official, is_staff=self.request.user.is_staff).data}
        )


class OfficialProfileGamelistView(View):
    template_name = 'officials/profile_gamelist.html'

    def get(self, request, *args, **kwargs):
        year = datetime.today().year
        season = kwargs.get('season', year)
        license_id = kwargs.get('pk')
        official = Official.objects.get(id=license_id)
        official_info = OfficialGamelistSerializer(
            instance=official,
            season=season,
            is_staff=PermissionHelper.has_staff_or_user_permission(request, official.team.pk)).data
        from officials.urls import OFFICIALS_PROFILE_GAMELIST
        return render(
            request,
            self.template_name,
            context={
                "url_pattern": OFFICIALS_PROFILE_GAMELIST,
                "pk": license_id,
                "team_id": official.team_id,
                "current_year": year,
                "years": official.gameofficial_set.all().values_list(
                    'gameinfo__gameday__date__year', flat=True).order_by('-gameinfo__gameday__date__year').distinct(),
                "season": season,
                "official_info": official_info,
                "needed_games_for_license": 4 - (
                        official_info['external_games']['number_games'] + official_info['dffl_games']['number_games'])
            }
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


class MoodleLoginView(View):
    template_name = 'officials/signup/moodle_login.html'
    form_class = MoodleLoginForm

    def get(self, request, *args, **kwargs):
        return render(
            request,
            self.template_name,
            {'form': MoodleLoginForm()}
        )

    def post(self, request, *args, **kwargs):
        form = MoodleLoginForm(request.POST)
        try:
            if form.is_valid():
                username = form.cleaned_data['username']
                password = form.cleaned_data['password']
                moodle_service = MoodleService()
                official_id = moodle_service.login(username, password)
                request.session[MOODLE_LOGGED_IN_USER] = official_id

                from officials.urls import OFFICIALS_SIGN_UP_LIST
                return redirect(reverse(OFFICIALS_SIGN_UP_LIST))
        except MoodleApiException as error:
            form.add_error('', f'{error}')
        return render(request, self.template_name, {'form': form})


class OfficialSignUpListView(View):
    template_name = 'officials/signup/sign_up_list.html'

    def get(self, request, *args, **kwargs):
        official_id = request.session.get(MOODLE_LOGGED_IN_USER)
        if official_id is None:
            if settings.DEBUG:
                official_id = 1
            else:
                from officials.urls import OFFICIALS_MOODLE_LOGIN
                return redirect(reverse(OFFICIALS_MOODLE_LOGIN))
        request.session.set_expiry(600)
        league = request.GET.get('league')
        from gamedays.urls import LEAGUE_GAMEDAY_DETAIL
        from officials.urls import OFFICIALS_SIGN_UP_FOR_GAMEDAY, OFFICIALS_PROFILE_LICENSE, OFFICIALS_SIGN_UP_LIST, \
            OFFICIALS_SIGN_UP_CANCEL_FOR_GAMEDAY
        context = {
            **OfficialSignupService.get_signup_data(official_id, league),
            'official_id': official_id,
            'url_pattern_gameday': LEAGUE_GAMEDAY_DETAIL,
            'url_pattern_signup': OFFICIALS_SIGN_UP_FOR_GAMEDAY,
            'url_pattern_signup_list': OFFICIALS_SIGN_UP_LIST,
            'url_pattern_official': OFFICIALS_PROFILE_LICENSE,
            'url_pattern_signup_cancel': OFFICIALS_SIGN_UP_CANCEL_FOR_GAMEDAY,
        }
        return render(request, self.template_name, context)


class CheckMoodleSessionMixin:
    def get_official_id(self, request):
        official_id = request.session.get(MOODLE_LOGGED_IN_USER)
        if official_id is None:
            messages.error(request, 'Die Session der Moodle-Anmeldung ist ausgelaufen. Bitte erneut anmelden.')
            from officials.urls import OFFICIALS_MOODLE_LOGIN
            return redirect(reverse(OFFICIALS_MOODLE_LOGIN))
        return official_id


class OfficialSignUpView(CheckMoodleSessionMixin, View):
    def get(self, request, **kwargs):
        gameday_id = kwargs.get('gameday')
        official_id = self.get_official_id(request)
        if isinstance(official_id, HttpResponse):
            # redirect to login page
            return official_id
        try:
            OfficialSignupService.create_signup(gameday_id=gameday_id, official_id=official_id)
        except DuplicateSignupError as exception:
            messages.error(request, f'Du bist bereits für den Spieltag gemeldet: {exception}')
        except MaxSignupError as exception:
            messages.error(request, f'{exception}')
        from officials.urls import OFFICIALS_SIGN_UP_LIST
        return redirect(reverse(OFFICIALS_SIGN_UP_LIST))


class OfficialSignUpCancelView(CheckMoodleSessionMixin, View):
    def get(self, request, **kwargs):
        gameday_id = kwargs.get('gameday')
        official_id = self.get_official_id(request)
        if isinstance(official_id, HttpResponse):
            # redirect to login page
            return official_id
        OfficialSignupService.cancel_signup(gameday_id=gameday_id, official_id=official_id)
        from officials.urls import OFFICIALS_SIGN_UP_LIST
        return redirect(reverse(OFFICIALS_SIGN_UP_LIST))
