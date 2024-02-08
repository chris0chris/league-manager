from django.contrib import messages
from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import render
from django.urls import reverse
from django.views import View
from django.views.generic import CreateView, TemplateView

from league_manager.utils.decorators import get_user_request_permission
from .forms import PlayerlistCreateForm
from .models import Playerlist
from .service.passcheck_service import PasscheckService


class PlayerlistView(View):
    template_name = 'passcheck/playerlist_list.html'

    @get_user_request_permission
    def get(self, request, **kwargs):
        team_id = kwargs.get('team')
        user_permission = kwargs.get('user_permission')
        passcheck_service = PasscheckService(user_permission=user_permission)
        context = {
            'object_list': passcheck_service.get_roster(team_id)
        }
        return render(request, self.template_name, context)


class PlayerlistCreateView(LoginRequiredMixin, CreateView):
    form_class = PlayerlistCreateForm
    template_name = 'passcheck/playerlist_form.html'
    model = Playerlist
    pk = None

    def get_form_kwargs(self):
        kwargs = super(PlayerlistCreateView, self).get_form_kwargs()
        kwargs['initial']['user'] = self.request.user
        return kwargs

    def form_valid(self, form):
        msg = f'Player erstellt: #{form.instance.jersey_number} {form.instance.first_name} {form.instance.last_name} ({form.instance.pass_number})'
        messages.success(self.request, msg)
        return super(PlayerlistCreateView, self).form_valid(form)

    def get_success_url(self):
        from passcheck.urls import PASSCHECK_ROSTER_CREATE
        return reverse(PASSCHECK_ROSTER_CREATE)

    def test_func(self):
        return self.request.user.is_staff


# declaring Views via django views
class PasscheckPlayerGamesList(View):
    template_name = 'passcheck/player_games_list.html'

    @get_user_request_permission
    def get(self, request, **kwargs):
        player_id = kwargs.get('id')
        user_permission = kwargs.get('user_permission')
        passcheck_service = PasscheckService(user_permission=user_permission)
        return render(request, self.template_name, passcheck_service.get_player_gamedays(player_id))


class PasscheckView(TemplateView):
    template_name = 'passcheck/index.html'
