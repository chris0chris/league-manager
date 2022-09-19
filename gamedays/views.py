from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.forms import Form
from django.urls import reverse
from django.views.generic import ListView, DetailView, UpdateView, CreateView

from gamedays.management.schedule_manager import ScheduleCreator, Schedule, TeamNotExistent, ScheduleTeamMismatchError
from teammanager.models import Gameday
from .forms import GamedayCreateForm, GamedayUpdateForm
from .service.gameday_service import GamedayService


class GamedayListView(ListView):
    model = Gameday
    template_name = 'gamedays/gameday_list.html'

    ordering = ['-date']


class GamedayDetailView(DetailView):
    model = Gameday
    template_name = 'gamedays/gameday_detail.html'

    def get_context_data(self, **kwargs):
        context = super(GamedayDetailView, self).get_context_data()
        gs = GamedayService.create(context['gameday'].pk)
        render_configs = {
            'index': False,
            'classes': ['table', 'table-hover', 'table-condensed', 'table-responsive', 'text-center'],
            'border': 0,
            'justify': 'left',
            'escape': False,
            'table_id': 'schedule',
        }
        context['info'] = {
            'schedule': gs.get_schedule().to_html(**render_configs),
            'qualify_table': gs.get_qualify_table().to_html(**render_configs),
            'final_table': gs.get_final_table().to_html(**render_configs)
        }
        return context


class GamedayCreateView(LoginRequiredMixin, CreateView):
    form_class = GamedayCreateForm
    template_name = 'gamedays/gameday_form.html'
    model = Gameday
    pk = None

    def form_valid(self, form):
        form.author = self.request.user
        return super(GamedayCreateView, self).form_valid(form)

    def get_success_url(self):
        return reverse('league-gameday-detail', kwargs={'pk': self.object.pk})


class GamedayUpdateView(LoginRequiredMixin, UserPassesTestMixin, UpdateView):
    form_class = GamedayUpdateForm
    template_name = 'gamedays/gameday_form.html'
    model = Gameday

    def form_valid(self, form: Form):
        groups = [list for list in [
            self._format_array(form.cleaned_data['group1']),
            self._format_array(form.cleaned_data['group2']),
            self._format_array(form.cleaned_data['group3']),
            self._format_array(form.cleaned_data['group4'])] if list != ['']]

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
        except (IndexError, ScheduleTeamMismatchError):
            form.add_error(None,
                           'Spielplan konnte nicht erstellt werden, '
                           'da die Kombination #Teams und #Format nicht zum Spielplan passen')
            return super(GamedayUpdateView, self).form_invalid(form)
        except TeamNotExistent as err:
            form.add_error(None,
                           f'Spielplan konnte nicht erstellt werden, da dass Team "{err}" nicht gefunden wurde.')
            return super(GamedayUpdateView, self).form_invalid(form)

        return super(GamedayUpdateView, self).form_valid(form)

    def get_success_url(self):
        return reverse('league-gameday-detail', kwargs={'pk': self.object.pk})

    def test_func(self):
        return self.request.user.is_staff

    def _format_array(self, data):
        return [value.strip() for value in data.split(',')]
