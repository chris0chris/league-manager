from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.forms import Form
from django.shortcuts import render
from django.urls import reverse
from django.views import View
from django.views.generic import ListView, DetailView, UpdateView, CreateView

from gamedays.management.schedule_creator import ScheduleCreator, Schedule
from .forms import GamedayCreateForm, GamedayUpdateForm
from .models import Gameday
from .service.GamedayService import get_game_schedule_and_table
from .service.GamedaySpreadsheetService import GamedaySpreadsheetService


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


class GamedayDetailView(DetailView):
    model = Gameday

    def get_context_data(self, **kwargs):
        context = super(GamedayDetailView, self).get_context_data()
        context['info'] = get_game_schedule_and_table(context['gameday'].pk)
        return context


class GamedayCreateView(LoginRequiredMixin, CreateView):
    form_class = GamedayCreateForm
    template_name = 'gamedays/gameday_form.html'
    model = Gameday
    pk = None

    def form_valid(self, form):
        # instance = form.save(self.request.user)
        # self.pk = instance.pk
        form.author = self.request.user
        return super(GamedayCreateView, self).form_valid(form)

    def get_success_url(self):
        return reverse('league-gameday-detail', kwargs={'pk': self.object.pk})


class GamedayUpdateView(LoginRequiredMixin, UserPassesTestMixin, UpdateView):
    form_class = GamedayUpdateForm
    template_name = 'gamedays/gameday_form.html'
    model = Gameday

    def form_valid(self, form: Form):
        # instance = form.save(self.request.user)
        # self.pk = instance.pk
        groups = [list for list in [
            form.cleaned_data['group1'].split(','),
            form.cleaned_data['group2'].split(','),
            form.cleaned_data['group3'].split(','),
            form.cleaned_data['group4'].split(',')] if list != ['']]

        sc = ScheduleCreator(schedule=Schedule(fields=form.cleaned_data['fields'], groups=groups), gameday=self.object)
        try:
            sc.create()
        except FileNotFoundError:
            form.add_error(None,
                           'Spielplan konnte nicht erstellt werden, da es die Kombination #Teams und #Felder nicht gibt')
            return super(GamedayUpdateView, self).form_invalid(form)

        return super(GamedayUpdateView, self).form_valid(form)

    def get_success_url(self):
        return reverse('league-gameday-detail', kwargs={'pk': self.object.pk})

    def test_func(self):
        # post = self.get_object()
        return self.request.user.is_staff

# class GamedayUpdateView(LoginRequiredMixin, UserPassesTestMixin, UpdateView):
#     form_class = Gameday
#     model = Gameday
#     fields = ['name', 'date', 'start']
#
#     def form_valid(self, form):
#         form.instance.author = self.request.user
#         return super().form_valid(form)
#
#     def test_func(self):
#         post = self.get_object()
#         return self.request.user.is_staff
