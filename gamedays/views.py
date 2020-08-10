from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.shortcuts import render
from django.urls import reverse
from django.views import View
from django.views.generic import ListView, DetailView, UpdateView, FormView

from .forms import GamedayForm
from .models import Gameday
from .service.GamedayService import get_game_schedule_and_table
from .service.GamedaySpreadsheetService import get_spreadsheet, get_gamedays_spreads, get_gameday


class GamespreadsDetailView(View):
    template_name = 'gamedays/gameday_detail.html'

    def get(self, request, *args, **kwargs):
        context = {'info': get_spreadsheet(kwargs['index']),
                   'object': get_gameday(kwargs['index'])
                   }
        return render(request, self.template_name, context)


class GamespreadListView(View):
    template_name = 'gamedays/gameday_list.html'

    def get(self, request, *args, **kwargs):
        context = {}
        context['object_list'] = get_gamedays_spreads()
        return render(request, self.template_name, context)


class GamedayListView(ListView):
    model = Gameday


class GamedayDetailView(DetailView):
    model = Gameday

    def get_context_data(self, **kwargs):
        context = super(GamedayDetailView, self).get_context_data()
        context['info'] = get_game_schedule_and_table(context['gameday'].pk)
        return context


class GamedayCreateView(LoginRequiredMixin, FormView):
    form_class = GamedayForm
    template_name = 'gamedays/gameday_form.html'
    pk = None

    def form_valid(self, form):
        instance = form.save(self.request.user)
        self.pk = instance.pk
        return super(GamedayCreateView, self).form_valid(form)

    def get_success_url(self):
        return reverse('league-gameday-detail', kwargs={'pk': self.pk})


class GamedayUpdateView(LoginRequiredMixin, UserPassesTestMixin, UpdateView):
    model = Gameday
    fields = ['name', 'date', 'start']

    def form_valid(self, form):
        form.instance.author = self.request.user
        return super().form_valid(form)

    def test_func(self):
        post = self.get_object()
        if self.request.user == post.author:
            return True
        return False
