from django.urls import path, re_path

from officials.views import OfficialsTeamListView, AllOfficialsListView, GameOfficialListView, \
    AddInternalGameOfficialUpdateView, LicenseCheckForOfficials, MoodleReportView, \
    OfficialProfileLicenseView, OfficialAssociationListView, OfficialProfileGamelistView

OFFICIALS_LIST_FOR_TEAM = 'view-officials-list-for-team'
OFFICIALS_LIST_FOR_TEAM_AND_YEAR = 'view-officials-list-for-team-and-year'
OFFICIALS_LIST_FOR_ALL_TEAMS = 'view-officials-list-for-all-teams'
OFFICIALS_LIST_FOR_ALL_TEAMS_AND_YEAR = 'view-officials-list-for-all-teams-and-year'
OFFICIALS_GAME_OFFICIALS_APPEARANCE = 'view-officials-game-officials-appearance'
OFFICIALS_GAME_OFFICIALS_APPEARANCE_FOR_TEAM = 'view-officials-game-officials-appearance-for-team'
OFFICIALS_GAME_OFFICIALS_APPEARANCE_FOR_TEAM_AND_YEAR = 'view-officials-game-officials-appearance-for-team-and-year'
OFFICIALS_GAMEOFFICIAL_INTERNAL_CREATE = 'view-officials-gameofficial-internal-create'
OFFICIALS_LICENSE_CHECK = 'view-officials-license-check'
OFFICIALS_MOODLE_REPORT = 'view-officials-moodle-report'
OFFICIALS_PROFILE_LICENSE = 'view-officials-profile-license'
OFFICIALS_PROFILE_GAMELIST = 'view-officials-profile-gamelist'
OFFICIALS_ASSOCIATION_LIST = 'view-officials-association-list'

urlpatterns = [
    path('team/<int:pk>/list', OfficialsTeamListView.as_view(), name=OFFICIALS_LIST_FOR_TEAM),
    path('team/<int:pk>/list/<int:season>', OfficialsTeamListView.as_view(), name=OFFICIALS_LIST_FOR_TEAM_AND_YEAR),
    path('team/all/list', AllOfficialsListView.as_view(), name=OFFICIALS_LIST_FOR_ALL_TEAMS),
    path('team/all/list/<int:year>', AllOfficialsListView.as_view(), name=OFFICIALS_LIST_FOR_ALL_TEAMS_AND_YEAR),
    path('einsaetze', GameOfficialListView.as_view(), name=OFFICIALS_GAME_OFFICIALS_APPEARANCE),
    re_path('team/(?P<pk>\w+)?/gamelist/(?P<season>\d+)?', GameOfficialListView.as_view(),
            name=OFFICIALS_GAME_OFFICIALS_APPEARANCE_FOR_TEAM_AND_YEAR),
    path('gameofficial/internal/create', AddInternalGameOfficialUpdateView.as_view(),
         name=OFFICIALS_GAMEOFFICIAL_INTERNAL_CREATE),
    path('licensecheck/<int:year>/<int:course_id>', LicenseCheckForOfficials.as_view(), name=OFFICIALS_LICENSE_CHECK),
    path('moodle-report', MoodleReportView.as_view(), name=OFFICIALS_MOODLE_REPORT),
    path('profile/<int:pk>/license', OfficialProfileLicenseView.as_view(), name=OFFICIALS_PROFILE_LICENSE),
    path('profile/<int:pk>/gamelist/<int:season>', OfficialProfileGamelistView.as_view(),
         name=OFFICIALS_PROFILE_GAMELIST),
    path('<str:abbr>/list', OfficialAssociationListView.as_view(), name=OFFICIALS_ASSOCIATION_LIST),

]
