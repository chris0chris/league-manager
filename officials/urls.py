from django.urls import path

from officials.views import OfficialsTeamListView, AllOfficialsListView, GameOfficialListView, \
    AddInternalGameOfficialUpdateView, AddExternalGameOfficialUpdateView, LicenseCheckForOfficials, MoodleReportView, \
    OfficialProfileLicenseView, OfficialAssociationListView, OfficialProfileGamelistView

OFFICIALS_LIST_FOR_TEAM = 'view-officials-list-for-team'
OFFICIALS_LIST_FOR_TEAM_AND_YEAR = 'view-officials-list-for-team-and-year'
OFFICIALS_LIST_FOR_ALL_TEAMS = 'view-officials-list-for-all-teams'
OFFICIALS_LIST_FOR_ALL_TEAMS_AND_YEAR = 'view-officials-list-for-all-teams-and-year'
OFFICIALS_GAME_OFFICIALS_APPEARANCE = 'view-officials-game-officials-appearance'
OFFICIALS_GAME_OFFICIALS_APPEARANCE_FOR_TEAM = 'view-officials-game-officials-appearance-for-team'
OFFICIALS_GAME_OFFICIALS_APPEARANCE_FOR_TEAM_AND_YEAR = 'view-officials-game-officials-appearance-for-team-and-year'
OFFICIALS_GAMEOFFICIAL_INTERNAL_CREATE = 'officials-gameofficial-internal-create'
OFFICIALS_GAMEOFFICIAL_EXTERNAL_CREATE = 'officials-gameofficial-external-create'
OFFICIALS_LICENSE_CHECK = 'officials-license-check'
OFFICIALS_MOODLE_REPORT = 'officials-moodle-report'
OFFICIALS_PROFILE_LICENSE = 'officials-profile-license'
OFFICIALS_PROFILE_GAMELIST = 'officials-profile-gamelist'
OFFICIALS_ASSOCIATION_LIST = 'officials-association-list'

urlpatterns = [
    path('team/<int:pk>/list', OfficialsTeamListView.as_view(), name=OFFICIALS_LIST_FOR_TEAM),
    path('team/<int:pk>/list/<int:year>', OfficialsTeamListView.as_view(), name=OFFICIALS_LIST_FOR_TEAM_AND_YEAR),
    path('team/all/list', AllOfficialsListView.as_view(), name=OFFICIALS_LIST_FOR_ALL_TEAMS),
    path('team/all/list/<int:year>', AllOfficialsListView.as_view(), name=OFFICIALS_LIST_FOR_ALL_TEAMS_AND_YEAR),
    path('einsaetze', GameOfficialListView.as_view(), name=OFFICIALS_GAME_OFFICIALS_APPEARANCE),
    path('team/all/gamelist', GameOfficialListView.as_view(), name=OFFICIALS_GAME_OFFICIALS_APPEARANCE),
    path('team/all/gamelist/<int:year>', GameOfficialListView.as_view(), name=OFFICIALS_GAME_OFFICIALS_APPEARANCE),
    path('team/<int:pk>/gamelist', GameOfficialListView.as_view(), name=OFFICIALS_GAME_OFFICIALS_APPEARANCE_FOR_TEAM),
    path('team/<int:pk>/gamelist/<int:year>', GameOfficialListView.as_view(),
         name=OFFICIALS_GAME_OFFICIALS_APPEARANCE_FOR_TEAM_AND_YEAR),
    path('gameofficial/internal/create', AddInternalGameOfficialUpdateView.as_view(),
         name=OFFICIALS_GAMEOFFICIAL_INTERNAL_CREATE),
    path('gameofficial/external/create', AddExternalGameOfficialUpdateView.as_view(),
         name=OFFICIALS_GAMEOFFICIAL_EXTERNAL_CREATE),
    path('licensecheck/<int:year>/<int:course_id>', LicenseCheckForOfficials.as_view(), name=OFFICIALS_LICENSE_CHECK),
    path('moodle-report', MoodleReportView.as_view(), name=OFFICIALS_MOODLE_REPORT),
    path('profile/<int:license_id>/license', OfficialProfileLicenseView.as_view(), name=OFFICIALS_PROFILE_LICENSE),
    path('profile/<int:license_id>/gamelist/<int:year>', OfficialProfileGamelistView.as_view(),
         name=OFFICIALS_PROFILE_GAMELIST),
    path('<str:abbr>/list', OfficialAssociationListView.as_view(), name=OFFICIALS_ASSOCIATION_LIST),

]
