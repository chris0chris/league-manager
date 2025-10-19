from datetime import datetime

from django.conf import settings
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.db.models import Max
from django.db.models.functions import ExtractYear
from django.shortcuts import render, get_object_or_404, redirect
from django.urls import reverse
from django.views import View
from django.views.generic import DetailView, UpdateView, CreateView, FormView
from formtools.wizard.views import SessionWizardView

from gamedays.management.schedule_manager import ScheduleCreator, Schedule, TeamNotExistent, ScheduleTeamMismatchError
from league_table.models import LeagueGroup
from .forms import GamedayForm, GamedayGaminfoFieldsAndGroupsForm, \
    GameinfoForm, get_gameinfo_formset, get_gameday_format_formset, GamedayFormatForm
from .models import Gameday, Gameinfo
from .service.gameday_form_service import GamedayFormService
from .service.gameday_service import GamedayService


class GamedayListView(View):
    model = Gameday
    template_name = 'gamedays/gameday_list.html'

    def get(self, request, **kwargs):
        year = kwargs.get('season', datetime.today().year)
        league = kwargs.get('league')
        gamedays = Gameday.objects.filter(date__year=year).order_by('-date')
        gamedays_filtered_by_league = gamedays.filter(league__name=league) if league else gamedays
        from gamedays.urls import LEAGUE_GAMEDAY_LIST_AND_YEAR_AND_LEAGUE, LEAGUE_GAMEDAY_LIST_AND_YEAR
        return render(
            request,
            self.template_name,
            {
                "gamedays": gamedays_filtered_by_league,
                "years": Gameday.objects.annotate(year=ExtractYear('date')).values_list('year',
                                                                                        flat=True).distinct().order_by(
                    '-year'),
                "season": year,
                "leagues": gamedays.values_list('league__name', flat=True).distinct().order_by(
                    '-league__name'),
                "current_league": league,
                "season_year_pattern": LEAGUE_GAMEDAY_LIST_AND_YEAR,
                "season_year_league_pattern": LEAGUE_GAMEDAY_LIST_AND_YEAR_AND_LEAGUE,
            }
        )


class GamedayDetailView(DetailView):
    model = Gameday
    template_name = 'gamedays/gameday_detail.html'

    def get_context_data(self, **kwargs):
        context = super(GamedayDetailView, self).get_context_data()
        pk = context['gameday'].pk
        gs = GamedayService.create(pk)
        render_configs = {
            'index': False,
            'classes': ['table', 'table-hover', 'table-condensed', 'table-responsive', 'text-center'],
            'border': 0,
            'justify': 'left',
            'escape': False,
            'table_id': 'schedule',
        }
        qualify_table = gs.get_qualify_table().to_html(**render_configs)
        if 'officials' in settings.INSTALLED_APPS:
            show_official_names = False
            if self.request.user.is_staff:
                show_official_names = True
            elif self.request.user.username:
                show_official_names = self.request.user.username in qualify_table
            from officials.service.signup_service import OfficialSignupService
            officials = OfficialSignupService.get_signed_up_officials(pk, show_official_names)
            from officials.urls import OFFICIALS_PROFILE_LICENSE
            url_pattern_official = OFFICIALS_PROFILE_LICENSE
            from officials.urls import OFFICIALS_SIGN_UP_LIST
            url_pattern_official_signup = OFFICIALS_SIGN_UP_LIST
        else:
            officials = []
            url_pattern_official = ''
            url_pattern_official_signup = ''
        context['info'] = {
            'schedule': gs.get_schedule().to_html(**render_configs),
            'qualify_table': qualify_table,
            'final_table': gs.get_final_table().to_html(**render_configs),
            'officials': officials,
            'url_pattern_official': url_pattern_official,
            'url_pattern_official_signup': url_pattern_official_signup,
        }
        return context


class GamedayCreateView(LoginRequiredMixin, UserPassesTestMixin, CreateView):
    form_class = GamedayForm
    template_name = 'gamedays/gameday_form.html'
    model = Gameday
    pk = None

    def form_valid(self, form):
        form.author = self.request.user
        return super(GamedayCreateView, self).form_valid(form)

    def get_success_url(self):
        from gamedays.urls import LEAGUE_GAMEDAY_DETAIL, LEAGUE_GAMEDAY_GAMEINFO_WIZARD, LEAGUE_GAMEDAY_GAMEINFOS_UPDATE
        action_map = {
            "gameinfos_create": LEAGUE_GAMEDAY_GAMEINFO_WIZARD,
            "gameinfos_update": LEAGUE_GAMEDAY_GAMEINFOS_UPDATE,
        }

        post_action = self.request.POST.get("action")
        kwargs = {"pk": self.object.pk}

        url_name = action_map.get(post_action, LEAGUE_GAMEDAY_DETAIL)
        return reverse(url_name, kwargs=kwargs)

    def test_func(self):
        return self.request.user.is_staff


class GamedayUpdateView(LoginRequiredMixin, UserPassesTestMixin, UpdateView):
    form_class = GamedayForm
    template_name = 'gamedays/gameday_form.html'
    model = Gameday

    def form_valid(self, form):
        form.author = self.request.user
        return super(GamedayUpdateView, self).form_valid(form)

    def get_success_url(self):
        return reverse('league-gameday-detail', kwargs={'pk': self.object.pk})

    def test_func(self):
        return self.request.user.is_staff


FIELD_GROUP_STEP = 'field-group-step'
GAMEDAY_FORMAT_STEP = 'gameday-format'
GAMEINFO_STEP = 'gameinfo-step'

FORMS = [
    (FIELD_GROUP_STEP, GamedayGaminfoFieldsAndGroupsForm),
    (GAMEDAY_FORMAT_STEP, GamedayFormatForm),
    (GAMEINFO_STEP, GameinfoForm),
]

TEMPLATES = {
    GAMEDAY_FORMAT_STEP: 'gamedays/wizard_form/gamedays_format.html',
    FIELD_GROUP_STEP: 'gamedays/wizard_form/fields_groups.html',
    GAMEINFO_STEP: 'gamedays/wizard_form/gameinfos.html',
}


class GameinfoWizard(LoginRequiredMixin, UserPassesTestMixin, SessionWizardView):
    form_list = FORMS

    def get_template_names(self):
        return [TEMPLATES[self.steps.current]]

    def _extra(self):
        if not hasattr(self.storage, 'extra_data'):
            self.storage.extra_data = {}
        return self.storage.extra_data

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        gameday = Gameday.objects.get(pk=self.kwargs['pk'])
        from gamedays.urls import LEAGUE_GAMEDAY_DETAIL
        context['cancel_url'] = reverse(LEAGUE_GAMEDAY_DETAIL, kwargs={'pk': gameday.pk})
        return context

    def get_form_list(self):
        form_list = super().get_form_list()

        extra = self._extra()
        field_group_step = extra.get(FIELD_GROUP_STEP, {})
        format_value = field_group_step.get("format")

        if format_value == "CUSTOM":
            form_list = {key: val for key, val in form_list.items() if key != GAMEDAY_FORMAT_STEP}

        return form_list

    def get_form(self, step=None, data=None, files=None):
        step = step or self.steps.current
        form = super().get_form(step, data, files)
        extra = self._extra()
        gameday_id = extra.get('gameday_id')
        if gameday_id is None:
            gameday_id = self.kwargs.get('pk')
            extra.update({'gameday_id': gameday_id})
        gameday = Gameday.objects.get(pk=gameday_id)
        if step == FIELD_GROUP_STEP:
            groups = gameday.season.groups_season.filter(season=gameday.season, league=gameday.league)
            form.fields['group_names'].choices = [(g.id, g.name) for g in groups]
        if step == GAMEDAY_FORMAT_STEP:
            field_group_step = extra.get(FIELD_GROUP_STEP, {})
            number_groups = field_group_step.get('number_groups')
            group_array = field_group_step.get('group_names') or []

            extra_forms = int(number_groups) if number_groups else len(group_array)

            GamedayFormatFormSet = get_gameday_format_formset(extra=extra_forms)
            form = GamedayFormatFormSet(data, prefix='gameday_format')
            if number_groups:
                group_names = [f'Gruppe {n}' for n in range(1, number_groups + 1)]
            else:
                group_names = LeagueGroup.objects.filter(id__in=group_array).values_list('name', flat=True)
            for index, current_form in enumerate(form):
                current_form.fields['group'].label = group_names[index]

        if step == GAMEINFO_STEP:
            extra = self._extra()
            field_group_step = extra.get(FIELD_GROUP_STEP) or {}
            number_fields = int(field_group_step.get('number_fields', 1))
            number_groups = field_group_step.get('number_groups')
            group_names = field_group_step.get('group_names')
            if number_groups:
                number_groups = int(number_groups)
                group_choices = [(f'Gruppe {n}', f'Gruppe {n}') for n in range(1, number_groups + 1)]
            else:
                groups = LeagueGroup.objects.filter(id__in=group_names)
                group_choices = [(f'{currentGroup.pk}', f'{currentGroup.name}') for currentGroup in groups]

            field_choices = [(f'{n}', f'Feld {n}') for n in range(1, number_fields + 1)]

            form_kwargs = {'group_choices': group_choices, 'field_choices': field_choices}
            qs = Gameinfo.objects.filter(gameday=gameday)
            extra_forms = 1 if not qs.exists() else 0
            GameinfoFormSet = get_gameinfo_formset(extra=extra_forms)
            if data is not None:
                form = GameinfoFormSet(data, queryset=qs, prefix='games', form_kwargs=form_kwargs)
            else:
                form = GameinfoFormSet(queryset=qs, prefix='games', form_kwargs=form_kwargs)

        form._gameday_instance = gameday
        return form

    def get_form_instance(self, step):
        if not hasattr(self, '_gameday_instance'):
            pk = self.kwargs.get('pk')
            if pk:
                try:
                    self._gameday_instance = Gameday.objects.get(pk=pk)
                except Gameday.DoesNotExist:
                    self._gameday_instance = None
            else:
                self._gameday_instance = None

        # Attach the same instance to all forms that are based on Gameday
        if step in [FIELD_GROUP_STEP, 'edit', 'type']:
            return self._gameday_instance

        return None

    def process_step(self, form):
        step = self.steps.current

        if step == 'create':
            gameday = form.save()
            gameday.format = getattr(gameday, 'format', '') or ''
            gameday.save()
            self._extra()['gameday_id'] = gameday.pk
            return super().process_step(form)

        if step == FIELD_GROUP_STEP:
            self._extra()[FIELD_GROUP_STEP] = form.cleaned_data
            gameday_id = self._extra().get('gameday_id')
            if gameday_id:
                gameday = Gameday.objects.get(pk=gameday_id)
                data = self._extra().get(FIELD_GROUP_STEP)
                gameday.format = f'{gameday.league.name}_Gruppen{data.get('number_groups')}_Felder{data.get('number_fields')}'
                gameday.save()
            return super().process_step(form)

        if step == GAMEDAY_FORMAT_STEP and form.is_valid():
            # TODO die Entität übergeben und nicht den Namen
            grouped_teams = [
                [team.name for team in f.cleaned_data['group']]
                for f in form
                if f.cleaned_data.get('group')
            ]
            field_group_step = self._extra().get(FIELD_GROUP_STEP) or {}
            format = field_group_step.get('format', '6_2')
            try:
                sc = ScheduleCreator(
                    schedule=Schedule(gameday_format=format, groups=grouped_teams),
                    gameday=form._gameday_instance
                )
                sc.create()
            except FileNotFoundError:
                form.add_error(None, 'Spielplan konnte nicht erstellt werden, '
                                     f'da es das Format "{form.cleaned_data["format"]}" nicht gibt.')
            except ScheduleTeamMismatchError:
                form.add_error(None, 'Spielplan konnte nicht erstellt werden, '
                                     'da die Kombination aus #Teams und #Format nicht passt.')
            except TeamNotExistent as err:
                form.add_error(None, f'Spielplan konnte nicht erstellt werden, '
                                     f'da das Team "{err}" nicht gefunden wurde.')

        if step == GAMEINFO_STEP:
            formset = form
            if formset.is_valid():
                gameday_form_service = GamedayFormService(formset._gameday_instance)
                for current_form in formset:
                    if current_form.has_changed():
                        gameday_form_service.handle_gameinfo_and_gameresult(current_form.cleaned_data,
                                                                            current_form.instance)
                self._extra()['gameinfo_saved'] = True
            return super().process_step(formset)

        return super().process_step(form)

    def done(self, form_list, **kwargs):
        gameday_id = self._extra().get('gameday_id')
        from gamedays.urls import LEAGUE_GAMEDAY_DETAIL
        return redirect(reverse(LEAGUE_GAMEDAY_DETAIL, kwargs={'pk': gameday_id}))

    def test_func(self):
        return self.request.user.is_staff


class GameinfoUpdateView(LoginRequiredMixin, UserPassesTestMixin, FormView):
    form_class = None
    template_name = 'gamedays/wizard_form/gameinfos.html'

    def get_form_class(self):
        return get_gameinfo_formset(extra=0)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        gameday = Gameday.objects.get(pk=self.kwargs['pk'])
        from gamedays.urls import LEAGUE_GAMEDAY_DETAIL
        context['cancel_url'] = reverse(LEAGUE_GAMEDAY_DETAIL, kwargs={'pk': gameday.pk})
        return context

    def get(self, request, *args, **kwargs):
        gameday = get_object_or_404(Gameday, pk=self.kwargs['pk'])
        qs = Gameinfo.objects.filter(gameday=gameday)

        if not qs.exists():
            from gamedays.urls import LEAGUE_GAMEDAY_GAMEINFO_WIZARD
            return redirect(reverse(LEAGUE_GAMEDAY_GAMEINFO_WIZARD, kwargs={'pk': gameday.pk}))

        return super().get(request, *args, **kwargs)

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        gameday = get_object_or_404(Gameday, pk=self.kwargs['pk'])
        qs = Gameinfo.objects.filter(gameday=gameday)

        group_choices = {
            (g.league_group.id, g.league_group.name) if g.league_group else (g.standing, g.standing)
            for g in qs if g.league_group or g.standing
        }
        number_fields = qs.aggregate(Max('field'))['field__max'] or 1

        field_choices = [(f'{n}', f'Feld {n}') for n in range(1, number_fields + 1)]

        kwargs.update({
            'queryset': qs,
            'prefix': 'games',
            'form_kwargs': {
                'group_choices': group_choices,
                'field_choices': field_choices
            }
        })
        return kwargs

    def form_valid(self, formset):
        gameday = get_object_or_404(Gameday, pk=self.kwargs['pk'])
        gameday_form_service = GamedayFormService(gameday)

        for current_form in formset:
            if current_form.has_changed():
                gameday_form_service.handle_gameinfo_and_gameresult(
                    current_form.cleaned_data, current_form.instance
                )

        return redirect(reverse('league-gameday-detail', kwargs={'pk': gameday.pk}))

    def test_func(self):
        return self.request.user.is_staff
