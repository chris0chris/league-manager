from datetime import datetime

from django.contrib import messages
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.shortcuts import render, redirect
from django.urls import reverse
from django.views import View
from django.views.generic import CreateView, TemplateView, UpdateView, ListView

from gamedays.models import Team
from league_manager.utils.decorators import get_user_request_permission
from league_manager.utils.serializer_utils import Obfuscator
from league_manager.utils.view_utils import PermissionHelper
from .forms import PlayerlistCreateForm, PlayerlistUpdateForm, PlayerlistTransferForm
from .models import Playerlist, PlayerlistTransfer
from .service.passcheck_service import PasscheckService


class RosterView(View):
    template_name = 'passcheck/roster_list.html'

    @get_user_request_permission
    def get(self, request, **kwargs):
        team_id = kwargs.get('pk')
        year = kwargs.get('season', datetime.today().year)
        user_permission = kwargs.get('user_permission')
        passcheck_service = PasscheckService(user_permission=user_permission)
        from passcheck.urls import PASSCHECK_ROSTER_LIST_FOR_YEAR
        context = {
            'season': year,
            'url_pattern': PASSCHECK_ROSTER_LIST_FOR_YEAR,
            'pk': team_id,
            **passcheck_service.get_roster(team_id, year)
        }
        return render(request, self.template_name, context)


def build_message(action_msg, form):
    msg = (f'Player {action_msg}: #{form.instance.jersey_number} '
           f'{form.instance.player.person.first_name} {form.instance.player.person.last_name} '
           f'({form.instance.player.pass_number})')
    return msg


class PlayerlistCommonMixin(LoginRequiredMixin):
    template_name = 'passcheck/forms/playerlist_form.html'
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
        if not form.instance.pk:
            form.instance = form.save()
        return super().form_valid(form)


class PlayerlistCreateView(PlayerlistCommonMixin, UserPassesTestMixin, CreateView):
    form_class = PlayerlistCreateForm

    def form_valid(self, form):
        response = super().form_valid(form)

        msg = build_message('erstellt', form)

        messages.success(self.request, msg)
        return response

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

    def form_valid(self, form):
        response = super().form_valid(form)

        msg = build_message('aktualisiert', form)

        messages.success(self.request, msg)
        return response

    def get_success_url(self):
        from passcheck.urls import PASSCHECK_ROSTER_LIST
        return reverse(PASSCHECK_ROSTER_LIST, kwargs={'pk': self.object.team_id})

    def test_func(self):
        player = Playerlist.objects.get(pk=self.kwargs.get('pk'))
        return PermissionHelper.has_staff_or_user_permission(self.request, player.team_id)


class PlayerlistTransferView(PlayerlistCommonMixin, UserPassesTestMixin, UpdateView):
    template_name = 'passcheck/forms/playerlist_transfer_form.html'
    form_class = PlayerlistTransferForm

    def form_valid(self, form):
        response = super().form_valid(form)
        action_msg = 'für Transfer registiert'
        if self.request.method == 'POST':
            action_type = self.request.POST.get('action_type')
            if action_type == 'approved':
                action_msg = 'für Transfer genehmigt'
            elif action_type == 'rejected':
                action_msg = 'für Transfer abgelehnt'

            msg = build_message(action_msg, form)

            if action_type == 'rejected':
                messages.warning(self.request, msg)
            else:
                messages.success(self.request, msg)

        return response

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        kwargs['action_type'] = self.request.POST.get('action_type')
        return kwargs

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['has_transfer_status'] = context['object'].playerlisttransfer_set.filter(status='pending').exists()
        return context

    def get_success_url(self):
        from passcheck.urls import PASSCHECK_TRANSFER_LIST
        return reverse(PASSCHECK_TRANSFER_LIST)

    def test_func(self):
        pk = self.kwargs.get('pk')
        if PlayerlistTransfer.objects.filter(status='approved', current_team=pk).exists():
            return False
        player = Playerlist.objects.get(pk=pk)
        return PermissionHelper.has_staff_or_user_permission(self.request, player.team_id)


class PasscheckPlayerGamesList(View):
    template_name = 'passcheck/player_gamedays_list.html'

    def get(self, request, **kwargs):
        player_id = kwargs.get('pk')
        player = Playerlist.objects.get(pk=player_id)
        user_permission = PermissionHelper.get_user_request_permission(self.request, player.team_id)
        passcheck_service = PasscheckService(user_permission=user_permission)
        return render(request, self.template_name, passcheck_service.get_player_gamedays(player_id))


class TransferListView(ListView):
    model = PlayerlistTransfer
    template_name = 'passcheck/playerlist_transfer_list.html'

    def get_queryset(self):
        queryset = super().get_queryset().filter(status='pending')
        user = self.request.user
        if not user.is_staff:
            for obj in queryset:
                obj.current_team.player.person.first_name = Obfuscator.obfuscate(obj.current_team.player.person.first_name)
                obj.current_team.player.person.last_name = Obfuscator.obfuscate(obj.current_team.player.person.last_name)

        return queryset

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        from passcheck.urls import PASSCHECK_ROSTER_TRANSFER
        context['transfer_url'] = PASSCHECK_ROSTER_TRANSFER

        return context


class PasscheckView(TemplateView):
    template_name = 'passcheck/index.html'
