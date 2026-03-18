from django import forms
from django.contrib.auth.models import User

from accesscontrol.models import Association, LeagueAssociationAssignment, TeamAdminAssignment, LeagueAdminAssignment, \
    AssociationAdminAssignment
from gamedays.models import Team, League, SeasonLeagueTeam, Season


class AdminEmailsField(forms.CharField):
    """Custom field for multiple emails separated by commas or newlines."""
    def to_python(self, value):
        if not value:
            return []
        emails = [e.strip() for e in value.replace("\n", ",").split(",") if e.strip()]
        return emails

class AssociationCreateAndUpdateForm(forms.ModelForm):
    name = forms.CharField(label="Name", max_length=50)
    abbr = forms.CharField(label="Abkürzung", max_length=50)
    type = forms.ChoiceField(label="Verbandsart", choices=[])
    association_admins = AdminEmailsField(
        label="Verbandsmanager Email-Adressen",
        required=False,
        widget=forms.Textarea(attrs={"placeholder": "Email-Adressen durch Komma getrennt"})
    )

    class Meta:
        model = Association
        fields = ['name', 'abbr', 'type']
        labels = {
            'name': 'Name',
            'abbr': 'Abkürzung',
            'type': 'Verbandsart'
        }

    def __init__(self, *args, **kwargs):
        self.parent_association = kwargs.pop('parent_association', None)
        super().__init__(*args, **kwargs)

        if self.parent_association:
            self.fields['type'].choices = self.get_choices()
        else:
            self.fields['type'].choices = Association.AssociationType.choices

    def get_choices(self):
        parent_type = self.parent_association.type

        if parent_type == Association.AssociationType.INTERNATIONAL:
            return [(Association.AssociationType.NATIONAL, "National Federation")]
        elif parent_type == Association.AssociationType.NATIONAL:
            return [(Association.AssociationType.NATIONAL, "Regional Federation")]
        else:
            return []

    def save(self, commit=True):
        association = super().save(commit=False)
        self.save_m2m()

        if self.parent_association:
            association.parent = self.parent_association

        if commit:
            association.save()

            not_existing = []
            emails = self.cleaned_data.get('association_admins', [])
            existing_assignments = AssociationAdminAssignment.objects.filter(association=association)

            for assignment in existing_assignments:
                if assignment.user.email not in emails:
                    assignment.delete()

            for email in emails:
                try:
                    user = User.objects.get(email=email)
                    AssociationAdminAssignment.objects.get_or_create(association=association, user=user)
                except User.DoesNotExist:
                    not_existing.append(email)

        return association

class LeagueCreateAndUpdateForm(forms.ModelForm):
    name = forms.CharField(label="Name", max_length=50)
    league_admins = AdminEmailsField(
        label="Ligamanager Email-Adressen",
        required=False,
        widget=forms.Textarea(attrs={"placeholder": "Email-Adressen durch Komma getrennt"})
    )

    class Meta:
        model = League
        fields = ['name', 'league_admins']
        labels = {
            'name': 'Name'
        }

    def __init__(self, *args, **kwargs):
        self.parent_association = kwargs.pop('parent_association', None)
        super().__init__(*args, **kwargs)

        if self.instance.pk:
            assigned_users = LeagueAdminAssignment.objects.filter(league=self.instance).select_related('user').all()
            emails = [a.user.email for a in assigned_users]
            self.fields['league_admins'].initial = ",".join(emails)

    def save(self, commit=True):
        league = super().save(commit=False)
        self.save_m2m()

        if commit:
            league.save()

            not_existing = []
            emails = self.cleaned_data.get('league_admins', [])
            existing_assignments = LeagueAdminAssignment.objects.filter(league=league)

            for assignment in existing_assignments:
                if assignment.user.email not in emails:
                    assignment.delete()

            for email in emails:
                try:
                    user = User.objects.get(email=email)
                    LeagueAdminAssignment.objects.get_or_create(league=league, user=user)
                except User.DoesNotExist:
                    not_existing.append(email)

            if self.parent_association:
                LeagueAssociationAssignment.objects.create(
                    league=league,
                    association=self.parent_association
                )

        return league



class TeamCreateAndUpdateForm(forms.ModelForm):
    season = forms.ModelChoiceField(
        label="Saison",
        queryset=Season.objects.all(),
    )
    association = forms.ModelChoiceField(
        label="Verband",
        queryset=Association.objects.none(),
    )
    team_admins = AdminEmailsField(
        label="Teammanager Email-Adressen",
        required=False,
        widget=forms.Textarea(attrs={"placeholder": "Email-Adressen durch Komma getrennt"})
    )

    class Meta:
        model = Team
        fields = ['description', 'name', 'location', 'season', 'association', 'team_admins']
        labels = {
            'name': 'Abkürzung',
            'description': 'Teamname',
            'location': 'Stadt'
        }

    def __init__(self, *args, **kwargs):
        self.parent_league = kwargs.pop('parent_league', None)
        super().__init__(*args, **kwargs)

        if not self.instance.pk:
            last_season = Season.objects.order_by('id').last()
            if last_season:
                self.fields['season'].initial = last_season
        else:
            entry = SeasonLeagueTeam.objects.filter(team=self.instance).select_related('season').last()
            if entry:
                self.fields['season'].initial = entry.season

        if self.parent_league:
            organizing_associations = Association.objects.filter(leagueassociationassignment__league=self.parent_league)
            child_associations = Association.objects.filter(parent__in=organizing_associations)
            all_associations = (organizing_associations | child_associations).distinct()

            self.fields['association'].queryset = all_associations

        if self.instance.pk and self.instance.association:
            if self.instance.association not in all_associations:
                self.fields['association'].queryset = (all_associations | Association.objects.filter(pk=self.instance.association))

        if self.instance.pk:
            assigned_users = TeamAdminAssignment.objects.filter(team=self.instance).select_related('user').all()
            emails = [a.user.email for a in assigned_users]
            self.fields['team_admins'].initial = ",".join(emails)

    def save(self, commit=True):
        team = super().save(commit=False)
        team.association = self.cleaned_data['association']
        team.logo = None
        is_new = team.pk is None

        if commit:
            team.save()

            not_existing = []
            emails = self.cleaned_data.get('team_admins', [])
            existing_assignments = TeamAdminAssignment.objects.filter(team=team)

            for assignment in existing_assignments:
                if assignment.user.email not in emails:
                    assignment.delete()

            for email in emails:
                try:
                    user = User.objects.get(email=email)
                    TeamAdminAssignment.objects.get_or_create(team=team, user=user)
                except User.DoesNotExist:
                    not_existing.append(email)

            if is_new and self.parent_league:
                league = League.objects.get(pk=self.parent_league)
                SeasonLeagueTeam.objects.get_or_create(
                    league=league,
                    season=self.cleaned_data['season'],
                    team=team
                )
            self.save_m2m()

        return team