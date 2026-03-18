from django.urls import path
from accesscontrol.views import AssociationAdminView, LeagueAdminView, TeamAdminView, AssociationCreateView, \
    AssociationDeleteView, LeagueDeleteView, TeamDeleteView, LeagueCreateView, TeamCreateView, \
    AssociationUpdateView, LeagueUpdateView, TeamUpdateView

ASSOCIATION_ADMIN = 'view-association-admin'
LEAGUE_ADMIN = 'view-league-admin'
TEAM_ADMIN = 'view-team-admin'
CREATE_ASSOCIATION = 'create-association'
UPDATE_ASSOCIATION = 'update-association'
DELETE_ASSOCIATION = 'delete-association'
CREATE_LEAGUE ='create-league'
UPDATE_LEAGUE = 'update-league'
DELETE_LEAGUE = 'delete-league'
CREATE_TEAM = 'create-team'
UPDATE_TEAM = 'update-team'
DELETE_TEAM = 'delete-team'

urlpatterns = [
    path('associations', AssociationAdminView.as_view(), name=ASSOCIATION_ADMIN),
    path('associations/create/<int:pk>', AssociationCreateView.as_view(), name=CREATE_ASSOCIATION),
    path('association/update/<int:pk>', AssociationUpdateView.as_view(), name=UPDATE_ASSOCIATION),
    path('associations/delete/<int:pk>', AssociationDeleteView.as_view(), name=DELETE_ASSOCIATION),
    path('leagues', LeagueAdminView.as_view(), name=LEAGUE_ADMIN),
    path('leagues/create/<int:pk>', LeagueCreateView.as_view(), name=CREATE_LEAGUE),
    path('leagues/update/<int:pk>', LeagueUpdateView.as_view(), name=UPDATE_LEAGUE),
    path('leagues/delete/<int:pk>', LeagueDeleteView.as_view(), name=DELETE_LEAGUE),
    path('teams', TeamAdminView.as_view(), name=TEAM_ADMIN),
    path('teams/create/<int:pk>', TeamCreateView.as_view(), name=CREATE_TEAM),
    path('teams/update/<int:pk>', TeamUpdateView.as_view(), name=UPDATE_TEAM),
    path('teams/delete/<int:pk>', TeamDeleteView.as_view(), name=DELETE_TEAM),
]

