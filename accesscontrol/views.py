from collections import defaultdict

from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.shortcuts import render, redirect
from django.urls import reverse_lazy
from django.views import View
from django.views.generic import CreateView, DeleteView, UpdateView

from accesscontrol.models import Association, LeagueAssociationAssignment
from gamedays.models import League, Season, SeasonLeagueTeam, Team
from accesscontrol.forms import AssociationCreateAndUpdateForm, TeamCreateAndUpdateForm, LeagueCreateAndUpdateForm

class AssociationAdminView(LoginRequiredMixin, View):
    template_name = 'association_admin.html'

    def get(self, request, **kwargs):
        association_subassociations = defaultdict(list)

        associations = Association.objects.filter(associationadminassignment__user=request.user).order_by(
            "abbr").distinct()

        for association in associations:
            association_subassociations[association] = []
            sub_associations = (Association.objects.filter(parent_id=association).order_by("name"))

            for sub_association in sub_associations:
                association_subassociations[association].append(sub_association)

        return render(
            request,
            self.template_name,
            {
                "association_subassociations": dict(association_subassociations),
            }
        )


class LeagueAdminView(LoginRequiredMixin, View):
    template_name = 'league_admin.html'

    def get(self, request, **kwargs):
        association_leagues = defaultdict(list)

        associations = (Association.objects.filter(associationadminassignment__user=request.user)
                   .order_by("abbr").distinct())

        for accociation in associations:
            association_leagues[accociation] = []

        entries = (LeagueAssociationAssignment.objects.filter(association__in=associations)
                   .select_related("association","league")
                   .order_by("association__name", "league__name"))

        for entry in entries:
            association_leagues[entry.association].append(entry.league)

        return render(
            request,
            self.template_name,
            {
                "association_leagues": dict(association_leagues),
            }
        )


class TeamAdminView(LoginRequiredMixin, View):
    template_name = 'team_admin.html'

    def get(self, request, **kwargs):
        league_teams = defaultdict(list)
        leagues = League.objects.filter(leagueadminassignment__user=request.user).distinct()
        current_season = Season.objects.last()

        entries = (SeasonLeagueTeam.objects.filter(league__in=leagues, season=current_season)
                   .select_related("league", "team").order_by("league__name", "team__description"))
        for entry in entries:
            league_teams[entry.league].append(entry.team)

        return render(
            request,
            self.template_name,
            {
                "league_teams": dict(league_teams),
            }
        )


class AssociationCreateView(LoginRequiredMixin, CreateView):
    model = Association
    form_class = AssociationCreateAndUpdateForm
    template_name = 'forms/association_form.html'

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        parent_pk = self.kwargs.get("pk")
        if parent_pk:
            parent = Association.objects.get(pk=parent_pk)
            kwargs["parent_association"] = parent
        return kwargs

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        parent_pk = self.kwargs.get("pk")
        if parent_pk:
            parent_association = Association.objects.get(pk=parent_pk)
            context['parent_association'] = parent_association
        return context

    def form_valid(self, form):
        parent_pk = self.kwargs.get("pk")
        if parent_pk:
            form.instance.parent = Association.objects.get(pk=parent_pk)
        return super().form_valid(form)

    def get_success_url(self):
        return reverse_lazy("view-association-admin")

    def handle_no_permission(self):
        if self.request.user.is_authenticated:
            return redirect("view-association-admin")
        return super().handle_no_permission()


class LeagueCreateView(LoginRequiredMixin, CreateView):
    model = League
    form_class = LeagueCreateAndUpdateForm
    template_name = 'forms/league_form.html'

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        parent_pk = self.kwargs.get("pk")
        if parent_pk:
            parent = Association.objects.get(pk=parent_pk)
            kwargs["parent_association"] = parent
        return kwargs

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        parent_pk = self.kwargs.get("pk")
        if parent_pk:
            parent_association = Association.objects.get(pk=parent_pk)
            context['association'] = parent_association
        return context

    def form_valid(self, form):
        parent_pk = self.kwargs.get("pk")
        if parent_pk:
            form.instance.parent = Association.objects.get(pk=parent_pk)
        return super().form_valid(form)

    def get_success_url(self):
        return reverse_lazy("view-league-admin")

    def handle_no_permission(self):
        if self.request.user.is_authenticated:
            return redirect("view-league-admin")
        return super().handle_no_permission()


class TeamCreateView(LoginRequiredMixin, CreateView):
    model = Team
    form_class = TeamCreateAndUpdateForm
    template_name = 'forms/team_form.html'

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        parent_pk = self.kwargs.get("pk")
        if parent_pk:
            kwargs["parent_league"] = parent_pk
        return kwargs

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        parent_pk = self.kwargs.get("pk")
        if parent_pk:
            league = League.objects.get(pk=parent_pk)
            context['league'] = league
        return context

    def form_valid(self, form):
        parent_pk = self.kwargs.get("pk")
        if parent_pk:
            form.instance.parent = Association.objects.get(pk=parent_pk)
        return super().form_valid(form)

    def get_success_url(self):
        return reverse_lazy("view-team-admin")

    def handle_no_permission(self):
        if self.request.user.is_authenticated:
            return redirect("view-team-admin")
        return super().handle_no_permission()


class AssociationUpdateView(UserPassesTestMixin, UpdateView):
    model = Association
    form_class = AssociationCreateAndUpdateForm
    template_name = 'forms/association_form.html'

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        parent = Association.objects.get(pk=self.object.parent_id)
        kwargs["parent_association"] = parent
        return kwargs

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        parent_association = Association.objects.get(pk=self.object.parent_id)
        context["parent_association"] = parent_association
        return context

    def get_success_url(self):
        return reverse_lazy("view-association-admin")

    def test_func(self):
        return self.request.user.groups.filter(name="Association-Admin").exists() or self.request.user.is_superuser


class LeagueUpdateView(UserPassesTestMixin, UpdateView):
    model = League
    form_class = LeagueCreateAndUpdateForm
    template_name = 'forms/league_form.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        entry = LeagueAssociationAssignment.objects.filter(
            league=self.object
        ).select_related("association").first()

        if entry:
            context["association"] = entry.association

        return context

    def get_success_url(self):
        return reverse_lazy("view-league-admin")

    def test_func(self):
        return self.request.user.groups.filter(name="Association-Admin").exists() or self.request.user.is_superuser


class TeamUpdateView(UserPassesTestMixin, UpdateView):
    model = Team
    form_class = TeamCreateAndUpdateForm
    template_name = 'forms/team_form.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        entry = SeasonLeagueTeam.objects.filter(
            team=self.object
        ).select_related("league").first()

        if entry:
            context["league"] = entry.league

        return context

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()

        season_entry = SeasonLeagueTeam.objects.filter(
            team=self.get_object()
        ).first()

        if season_entry:
            kwargs["parent_league"] = season_entry.league.pk

        return kwargs

    def get_success_url(self):
        return reverse_lazy("view-team-admin")

    def test_func(self):
        return self.request.user.groups.filter(name="Liga-Admin").exists() or self.request.user.is_superuser


class AssociationDeleteView(DeleteView):
    model = Association
    success_url = reverse_lazy("view-association-admin")


class LeagueDeleteView(DeleteView):
    model = League
    success_url = reverse_lazy("view-league-admin")


class TeamDeleteView(DeleteView):
    model = Team
    success_url = reverse_lazy("view-team-admin")
