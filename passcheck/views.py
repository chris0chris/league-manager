from django.contrib import messages
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.shortcuts import render, redirect
from django.urls import reverse
from django.views import View
from django.views.generic import CreateView, TemplateView, UpdateView

from gamedays.models import Team
from league_manager.utils.decorators import get_user_request_permission
from league_manager.utils.view_utils import PermissionHelper
from .forms import PlayerlistCreateForm, PlayerlistUpdateForm
from .models import Playerlist
from .service.passcheck_service import PasscheckService


class RosterView(View):
    template_name = 'passcheck/roster_list.html'

    @get_user_request_permission
    def get(self, request, **kwargs):
        team_id = kwargs.get('pk')
        user_permission = kwargs.get('user_permission')
        passcheck_service = PasscheckService(user_permission=user_permission)
        return render(request, self.template_name, passcheck_service.get_roster(team_id))


class PlayerlistCommonMixin(LoginRequiredMixin):
    form_class = PlayerlistCreateForm
    template_name = 'passcheck/playerlist_form.html'
    model = Playerlist

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        try:
            team_id = Team.objects.get(name=self.request.user).pk
        except Team.DoesNotExist:
            team_id = None
        context['team_id'] = team_id
        return context

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        kwargs['initial']['user'] = self.request.user
        return kwargs

    def form_valid(self, form):
        if self.request.method == 'POST':
            if isinstance(self, PlayerlistCreateView):
                action_msg = 'erstellt'
            elif isinstance(self, PlayerlistUpdateView):
                action_msg = 'aktualisiert'
            else:
                action_msg = 'processed'

            msg = (f'Player {action_msg}: #{form.instance.jersey_number} '
                   f'{form.instance.first_name} {form.instance.last_name} '
                   f'({form.instance.pass_number})')
            messages.success(self.request, msg)
        return super().form_valid(form)


class PlayerlistCreateView(PlayerlistCommonMixin, UserPassesTestMixin, CreateView):
    def get_success_url(self):
        from passcheck.urls import PASSCHECK_PLAYER_CREATE
        return reverse(PASSCHECK_PLAYER_CREATE)

    def handle_no_permission(self):
        if self.request.user.is_authenticated:
            from passcheck.urls import PASSCHECK_TEAM_NOT_EXISTENT
            return redirect(PASSCHECK_TEAM_NOT_EXISTENT)
        return super().handle_no_permission()

    def test_func(self):
        user = self.request.user
        try:
            Team.objects.get(name=user)
        except Team.DoesNotExist:
            if not user.is_staff:
                return False
        return True


class PlayerlistUpdateView(PlayerlistCommonMixin, UserPassesTestMixin, UpdateView):
    form_class = PlayerlistUpdateForm

    def get_success_url(self):
        from passcheck.urls import PASSCHECK_ROSTER_LIST
        return reverse(PASSCHECK_ROSTER_LIST, kwargs={'pk': self.object.team_id})

    def test_func(self):
        player = Playerlist.objects.get(pk=self.kwargs.get('pk'))
        return PermissionHelper.has_staff_or_user_permission(self.request, player.team_id)


class PasscheckPlayerGamesList(View):
    template_name = 'passcheck/player_gamedays_list.html'

    def get(self, request, **kwargs):
        player_id = kwargs.get('pk')
        player = Playerlist.objects.get(pk=player_id)
        user_permission = PermissionHelper.get_user_request_permission(self.request, player.team_id)
        passcheck_service = PasscheckService(user_permission=user_permission)
        return render(request, self.template_name, passcheck_service.get_player_gamedays(player_id))


class PasscheckView(TemplateView):
    template_name = 'passcheck/index.html'
