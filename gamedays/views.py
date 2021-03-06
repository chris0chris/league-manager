from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.forms import Form
from django.shortcuts import render
from django.urls import reverse
from django.views import View
from django.views.generic import ListView, DetailView, UpdateView, CreateView

from gamedays.management.schedule_manager import ScheduleCreator, Schedule, TeamNotExistent
from teammanager.models import Gameday
from .forms import GamedayCreateForm, GamedayUpdateForm
from .service.GamedaySpreadsheetService import GamedaySpreadsheetService
from .service.gameday_service import GamedayService


class GamespreadsDetailView(View):
    template_name = 'gamedays/gameday_detail.html'

    def get(self, request, *args, **kwargs):
        gss = GamedaySpreadsheetService(kwargs['index'])
        context = {'info': gss.get_spreadsheet(),
                   'object': gss.get_gameday(kwargs['index'])
                   }
        return render(request, self.template_name, context)


class GamespreadListView(View):
    template_name = 'gamedays/gameday_list.html'

    def get(self, request, *args, **kwargs):
        gss = GamedaySpreadsheetService()
        context = {'object_list': gss.get_gamedays_spreads()}
        return render(request, self.template_name, context)


class GamedayListView(ListView):
    model = Gameday
    template_name = 'gamedays/gameday_list.html'


class GamedayDetailView(DetailView):
    model = Gameday
    template_name = 'gamedays/gameday_detail.html'

    def get_context_data(self, **kwargs):
        context = super(GamedayDetailView, self).get_context_data()
        gs = GamedayService.create(context['gameday'].pk)
        # ToDo refactor, wenn Spreadsheet abgeschaltet sind
        context['info'] = {
            'schedule': gs.get_schedule().to_html(),
            'qualify_table': gs.get_qualify_table().to_html(),
            'final_table': gs.get_final_table().to_html()
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

        sc = ScheduleCreator(
            schedule=Schedule(format=self.object.format, groups=groups),
            gameday=self.object)
        try:
            sc.create()
        except FileNotFoundError:
            form.add_error(None,
                           'Spielplan konnte nicht erstellt werden, '
                           'da es das Format als Spielplan nicht gibt: "{0}"'.format(self.object.format))
            return super(GamedayUpdateView, self).form_invalid(form)
        except IndexError:
            form.add_error(None,
                           'Spielplan konnte nicht erstellt werden, '
                           'da die Kombination #Teams und #Felder nicht zum Spielplan passen')
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
