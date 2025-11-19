from datetime import datetime

from django.conf import settings
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.db.models import Max
from django.db.models.functions import ExtractYear
from django.shortcuts import render, get_object_or_404, redirect
from django.urls import reverse
from django.utils.functional import cached_property
from django.views import View
from django.views.generic import (
    DetailView,
    UpdateView,
    CreateView,
    FormView,
    DeleteView,
)
from formtools.wizard.views import SessionWizardView

from .constants import (
    LEAGUE_GAMEDAY_DETAIL,
    LEAGUE_GAMEDAY_LIST_AND_YEAR,
    LEAGUE_GAMEDAY_LIST,
    LEAGUE_GAMEDAY_GAMEINFOS_WIZARD,
    LEAGUE_GAMEDAY_GAMEINFOS_UPDATE,
    LEAGUE_GAMEDAY_LIST_AND_YEAR_AND_LEAGUE,
)
from .forms import (
    GamedayForm,
    GamedayGaminfoFieldsAndGroupsForm,
    GameinfoForm,
    get_gameinfo_formset,
    GamedayFormatForm,
    GamedayFormContext,
    SCHEDULE_MAP,
    SCHEDULE_CUSTOM_CHOICE_C,
)
from .models import Gameday, Gameinfo
from .service.gameday_form_service import GamedayFormService
from .service.gameday_service import GamedayService, GamedayGameService
from .wizard import (
    FIELD_GROUP_STEP,
    GAMEDAY_FORMAT_STEP,
    GAMEINFO_STEP,
    WizardStepHandler,
    WIZARD_STEP_HANDLER_MAP,
)


class GamedayListView(View):
    model = Gameday
    template_name = 'gamedays/gameday_list.html'

    def get(self, request, **kwargs):
        year = kwargs.get('season', datetime.today().year)
        league = kwargs.get('league')
        gamedays = Gameday.objects.filter(date__year=year).order_by('-date')
        gamedays_filtered_by_league = gamedays.filter(league__name=league) if league else gamedays
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
            'offense_table': gs.get_offense_player_statistics_table().to_html(**render_configs),
            'defense_table': gs.get_defense_player_statistic_table().to_html(**render_configs),
            'url_pattern_official': url_pattern_official,
            'url_pattern_official_signup': url_pattern_official_signup,
        }


        return context


class GamedayCreateView(LoginRequiredMixin, UserPassesTestMixin, CreateView):
    form_class = GamedayForm
    template_name = 'gamedays/gameday_form.html'
    model = Gameday
    pk = None

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['cancel_url'] = reverse(LEAGUE_GAMEDAY_LIST)
        context['action_label'] = 'Spieltag erstellen'
        return context

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        kwargs["context"] = GamedayFormContext(
            author=self.request.user,
            init_format=True
        )
        return kwargs

    def form_valid(self, form: GamedayForm):
        return super(GamedayCreateView, self).form_valid(form)

    def get_success_url(self):
        action_map = {
            "gameinfos_create": LEAGUE_GAMEDAY_GAMEINFOS_WIZARD,
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

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        gameday = Gameday.objects.get(pk=self.kwargs['pk'])
        context['cancel_url'] = reverse(LEAGUE_GAMEDAY_DETAIL, kwargs={'pk': gameday.pk})
        context['action_label'] = 'Spieltag aktualisieren'
        return context

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        kwargs["context"] = GamedayFormContext(
            author=self.request.user,
        )
        return kwargs

    def form_valid(self, form):
        return super(GamedayUpdateView, self).form_valid(form)

    def get_success_url(self):
        return reverse('league-gameday-detail', kwargs={'pk': self.object.pk})

    def test_func(self):
        return self.request.user.is_staff

    # noinspection PyMethodMayBeStatic
    def _format_array(self, data):
        return [value.strip() for value in data.split(',')]


class GamedayGameDetailView(DetailView):
    model = Gameinfo
    template_name = 'gamedays/games/game_detail.html'

    def get_context_data(self, **kwargs):
        context = super(GamedayGameDetailView, self).get_context_data()
        gameinfo = context['gameinfo']
        ggs = GamedayGameService(gameinfo.pk)
        render_configs = {
            'index': False,
            'border': 0,
            'justify': 'center',
            'escape': False,
            'table_id': 'team_log_events',
        }
        classes = ['table', 'table-hover', 'table-condensed', 'table-responsive', 'text-center']

        split_score_table, split_score_repaired = ggs.get_split_score_table()

        split_score_table_html = split_score_table.to_html(**{
            **render_configs,
            "classes": classes + ["game-split-score-table"]
        })

        if split_score_repaired:
            split_score_table_html = f"""{split_score_table_html}</ br>
<small>Die Aufteilung der Punkte je Halbzeit kann eventuell inkorrekt sein.</small>"""

        context['info'] = {
            'away_team': ggs.away_team_name,
            'home_team': ggs.home_team_name,
            'events_table': ggs.get_events_table().to_html(**{
                **render_configs,
                "classes": classes + ["game-log-table"],
            }),
            'split_score_table': split_score_table_html,
        }
        return context

class GameinfoWizard(LoginRequiredMixin, UserPassesTestMixin, SessionWizardView):
    form_list = [
        (FIELD_GROUP_STEP, GamedayGaminfoFieldsAndGroupsForm),
        (GAMEDAY_FORMAT_STEP, GamedayFormatForm),
        (GAMEINFO_STEP, GameinfoForm),
    ]

    TEMPLATES = {
        GAMEDAY_FORMAT_STEP: "gamedays/wizard_form/gamedays_format.html",
        FIELD_GROUP_STEP: "gamedays/wizard_form/fields_groups.html",
        GAMEINFO_STEP: "gamedays/wizard_form/gameinfos.html",
    }

    def get_template_names(self):
        return [self.TEMPLATES[self.steps.current]]

    @property
    def wizard_state(self):
        """Lazily create and return persistent extra data in wizard storage."""
        self.storage.extra_data = getattr(self.storage, "extra_data", {})
        return self.storage.extra_data

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['cancel_url'] = reverse(LEAGUE_GAMEDAY_DETAIL, kwargs={'pk': self.gameday.pk})
        context['action_label'] = 'Spielplan erstellen'
        if self.steps.current == GAMEDAY_FORMAT_STEP:
            field_group_step = self.wizard_state.get(FIELD_GROUP_STEP) or {}
            schedule_format = field_group_step.get(GamedayGaminfoFieldsAndGroupsForm.FORMAT_C)
            schedule_name = SCHEDULE_MAP.get(schedule_format, {}).get(
                "name", "ERROR - Name nicht gefunden für Format!"
            )
            context["action_label"] = f"Spielplan erstellen - {schedule_name}"
            context["schedule_name"] = schedule_name
        return context

    def get_form_list(self):
        form_list = super().get_form_list()

        field_group_step = self.wizard_state.get(FIELD_GROUP_STEP, {})
        format_value = field_group_step.get(GamedayGaminfoFieldsAndGroupsForm.FORMAT_C)

        if format_value == SCHEDULE_CUSTOM_CHOICE_C:
            form_list = {key: val for key, val in form_list.items() if key != GAMEDAY_FORMAT_STEP}
        else:
            form_list = {key: val for key, val in form_list.items() if key != GAMEINFO_STEP}

        return form_list

    def get_form(self, step=None, data=None, files=None):
        step = step or self.steps.current
        form = super().get_form(step, data, files)
        handler: WizardStepHandler = WIZARD_STEP_HANDLER_MAP.get(step)
        if handler:
            form = handler.handle_form(self, form, data)

        return form

    @cached_property
    def gameday(self):
        return get_object_or_404(Gameday, pk=self.kwargs["pk"])

    def process_step(self, form):
        handler: WizardStepHandler = WIZARD_STEP_HANDLER_MAP.get(self.steps.current)
        if handler:
            handler.handle_process_step(self, form)

        return super().process_step(form)

    def done(self, form_list, **kwargs):
        gameday_id = self.gameday.pk
        field_group_step = self.wizard_state.get(FIELD_GROUP_STEP, {})
        format_value = field_group_step.get(GamedayGaminfoFieldsAndGroupsForm.FORMAT_C)

        if format_value != SCHEDULE_CUSTOM_CHOICE_C:
            return redirect(reverse(LEAGUE_GAMEDAY_GAMEINFOS_UPDATE, kwargs={'pk': gameday_id}))
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
        context['cancel_url'] = reverse(LEAGUE_GAMEDAY_DETAIL, kwargs={'pk': gameday.pk})
        context['action_label'] = 'Spielplan aktualisieren'
        return context

    def get(self, request, *args, **kwargs):
        gameday = get_object_or_404(Gameday, pk=self.kwargs['pk'])
        qs = Gameinfo.objects.filter(gameday=gameday)

        if not qs.exists():
            return redirect(reverse(LEAGUE_GAMEDAY_GAMEINFOS_WIZARD, kwargs={'pk': gameday.pk}))

        return super().get(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        if request.POST.get('wizard_goto_step') == "reset_gameinfos":
            return redirect(reverse(LEAGUE_GAMEDAY_GAMEINFOS_WIZARD, kwargs={'pk': self.kwargs['pk']}))
        return super().post(request, *args, **kwargs)

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
            'prefix': GAMEINFO_STEP,
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

        return redirect(reverse(LEAGUE_GAMEDAY_DETAIL, kwargs={'pk': gameday.pk}))

    def test_func(self):
        return self.request.user.is_staff


class StaffDeleteView(LoginRequiredMixin, UserPassesTestMixin, DeleteView):
    """
    Generic delete view for staff users without a template.
    Subclasses must define:
        - model
    """
    template_name = None

    def test_func(self):
        return self.request.user.is_staff


class GamedayDeleteView(StaffDeleteView):
    model = Gameday

    def get_success_url(self):
        from django.contrib import messages
        messages.success(self.request, "Der Spieltag wurde erfolgreich gelöscht.")

        return reverse(LEAGUE_GAMEDAY_LIST)


class GameinfoDeleteView(StaffDeleteView):
    model = Gameday

    def form_valid(self, form):
        gameday: Gameday = self.get_object()

        Gameinfo.objects.filter(gameday=gameday).delete()

        from django.contrib import messages
        messages.success(self.request, "Der Spielplan für diesen Spieltag wurde erfolgreich gelöscht.")

        return redirect(LEAGUE_GAMEDAY_DETAIL, pk=gameday.pk)
