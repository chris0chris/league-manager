from django.conf import settings
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.forms import Form
from django.urls import reverse
from django.views.generic import ListView, DetailView, UpdateView, CreateView

from gamedays.management.schedule_manager import ScheduleCreator, Schedule, TeamNotExistent, ScheduleTeamMismatchError
from .forms import GamedayCreateForm, GamedayUpdateForm
from .models import Gameday
from .service.gameday_service import GamedayServiceDeprecated


class GamedayListView(ListView):
    model = Gameday
    template_name = 'gamedays/gameday_list.html'

    ordering = ['-date']


class GamedayDetailView(DetailView):
    model = Gameday
    template_name = 'gamedays/gameday_detail.html'

    def get_context_data(self, **kwargs):
        context = super(GamedayDetailView, self).get_context_data()
        pk = context['gameday'].pk
        gs = GamedayServiceDeprecated.create(pk)
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
    form_class = GamedayCreateForm
    template_name = 'gamedays/gameday_form.html'
    model = Gameday
    pk = None

    def form_valid(self, form):
        form.author = self.request.user
        return super(GamedayCreateView, self).form_valid(form)

    def get_success_url(self):
        return reverse('league-gameday-detail', kwargs={'pk': self.object.pk})

    def test_func(self):
        return self.request.user.is_staff


class GamedayUpdateView(LoginRequiredMixin, UserPassesTestMixin, UpdateView):
    form_class = GamedayUpdateForm
    template_name = 'gamedays/gameday_form.html'
    model = Gameday

    def form_valid(self, form: Form):
        groups = [group_list for group_list in [
            self._format_array(form.cleaned_data['group1']),
            self._format_array(form.cleaned_data['group2']),
            self._format_array(form.cleaned_data['group3']),
            self._format_array(form.cleaned_data['group4'])] if group_list != ['']]

        try:
            sc = ScheduleCreator(
                schedule=Schedule(gameday_format=self.object.format, groups=groups),
                gameday=self.object)
            sc.create()
        except FileNotFoundError:
            form.add_error(None,
                           'Spielplan konnte nicht erstellt werden, '
                           'da es das Format als Spielplan nicht gibt: "{0}"'.format(self.object.format))
            return super(GamedayUpdateView, self).form_invalid(form)
        except ScheduleTeamMismatchError:
            form.add_error(None,
                           'Spielplan konnte nicht erstellt werden, '
                           'da die Kombination #Teams und #Format nicht zum Spielplan passen')
            return super(GamedayUpdateView, self).form_invalid(form)
        except TeamNotExistent as err:
            form.add_error(None,
                           f'Spielplan konnte nicht erstellt werden, da das Team "{err}" nicht gefunden wurde.')
            return super(GamedayUpdateView, self).form_invalid(form)

        return super(GamedayUpdateView, self).form_valid(form)

    def get_success_url(self):
        return reverse('league-gameday-detail', kwargs={'pk': self.object.pk})

    def test_func(self):
        return self.request.user.is_staff

    # noinspection PyMethodMayBeStatic
    def _format_array(self, data):
        return [value.strip() for value in data.split(',')]
