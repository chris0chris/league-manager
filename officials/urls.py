from django.urls import path

from officials.constants import OFFICIALS_STATISTICS, OFFICIALS_STATISTICS_FOR_SEASON
from officials.views import (
    AllTeamsCardListView,
    OfficialsStatisticsView,
    OfficialsTeamListView,
    GameOfficialListView,
    AddExternalGameOfficialUpdateView,
    AddInternalGameOfficialUpdateView,
    GameOfficialImportUploadView,
    GameOfficialImportConfirmView,
    MoodleReportView,
    OfficialProfileLicenseView,
    OfficialAssociationListView,
    OfficialProfileGamelistView,
    OfficialSignUpListView,
    MoodleLoginView,
    OfficialSignUpView,
    OfficialSignUpCancelView,
    OfficialSignOutView,
    LicenseCheckForOfficials,
)
from officials.selfservice import (
    AddAssignmentView,
    ClaimGameOfficialView,
    ExternalGameDeleteView,
    ExternalGameEditView,
    UnassignGameOfficialView,
)

OFFICIALS_LIST_FOR_TEAM = "view-officials-list-for-team"
OFFICIALS_LIST_FOR_TEAM_AND_YEAR = "view-officials-list-for-team-and-year"
OFFICIALS_LIST_FOR_ALL_TEAMS = "view-officials-list-for-all-teams"
OFFICIALS_LIST_FOR_ALL_TEAMS_AND_YEAR = "view-officials-list-for-all-teams-and-year"
OFFICIALS_GAME_OFFICIALS_APPEARANCE = "view-officials-game-officials-appearance"
OFFICIALS_GAME_OFFICIALS_APPEARANCE_FOR_YEAR = (
    "view-officials-game-officials-appearance-for-year"
)
OFFICIALS_GAME_OFFICIALS_APPEARANCE_FOR_TEAM = (
    "view-officials-game-officials-appearance-for-team"
)
OFFICIALS_GAME_OFFICIALS_APPEARANCE_FOR_TEAM_AND_YEAR = (
    "view-officials-game-officials-appearance-for-team-and-year"
)
OFFICIALS_GAMEOFFICIAL_INTERNAL_CREATE = "view-officials-gameofficial-internal-create"
OFFICIALS_GAMEOFFICIAL_EXTERNAL_CREATE = "view-officials-gameofficial-external-create"
OFFICIALS_GAMEOFFICIAL_IMPORT_UPLOAD = "view-officials-gameofficial-import-upload"
OFFICIALS_GAMEOFFICIAL_IMPORT_CONFIRM = "view-officials-gameofficial-import-confirm"
OFFICIALS_LICENSE_CHECK = "view-officials-license-check"
OFFICIALS_MOODLE_REPORT = "view-officials-moodle-report"
OFFICIALS_PROFILE_LICENSE = "view-officials-profile-license"
OFFICIALS_PROFILE_GAMELIST = "view-officials-profile-gamelist"
OFFICIALS_ASSOCIATION_LIST = "view-officials-association-list"
OFFICIALS_MOODLE_LOGIN = "view-officials-moodle-login"
OFFICIALS_SIGN_UP_LIST = "view-officials-sign-up-list"
OFFICIALS_SIGN_UP_FOR_GAMEDAY = "view-officials-sign-up-for-gameday"
OFFICIALS_SIGN_UP_CANCEL_FOR_GAMEDAY = "view-officials-sign-up-cancel-for-gameday"
OFFICIALS_SIGN_OUT = "view-officials-sign-out"
OFFICIALS_SELF_SERVICE_CLAIM = "view-officials-selfservice-claim"
OFFICIALS_SELF_SERVICE_ADD_ASSIGNMENT = "view-officials-selfservice-add-assignment"
OFFICIALS_SELF_SERVICE_UNASSIGN = "view-officials-selfservice-unassign"
OFFICIALS_SELF_SERVICE_EXTERNAL_EDIT = "view-officials-selfservice-external-edit"
OFFICIALS_SELF_SERVICE_EXTERNAL_DELETE = "view-officials-selfservice-external-delete"
# OFFICIALS_STATISTICS / OFFICIALS_STATISTICS_FOR_SEASON live in
# officials/constants.py (imported above) since OfficialsStatisticsView
# also needs them and can't import from this module without a circular
# import - re-exported here so existing `from officials.urls import
# OFFICIALS_STATISTICS...` call sites keep working unchanged.

urlpatterns = [
    path(
        "statistics/",
        OfficialsStatisticsView.as_view(),
        name=OFFICIALS_STATISTICS,
    ),
    path(
        "statistics/<int:season>/",
        OfficialsStatisticsView.as_view(),
        name=OFFICIALS_STATISTICS_FOR_SEASON,
    ),
    path(
        "team/<int:pk>/list/",
        OfficialsTeamListView.as_view(),
        name=OFFICIALS_LIST_FOR_TEAM,
    ),
    path(
        "team/<int:pk>/list/<int:season>/",
        OfficialsTeamListView.as_view(),
        name=OFFICIALS_LIST_FOR_TEAM_AND_YEAR,
    ),
    path(
        "team/all/list/",
        AllTeamsCardListView.as_view(),
        name=OFFICIALS_LIST_FOR_ALL_TEAMS,
    ),
    path(
        "einsaetze/",
        GameOfficialListView.as_view(),
        name=OFFICIALS_GAME_OFFICIALS_APPEARANCE,
    ),
    path(
        "einsaetze/<int:season>/",
        GameOfficialListView.as_view(),
        name=OFFICIALS_GAME_OFFICIALS_APPEARANCE_FOR_YEAR,
    ),
    path(
        "team/<int:pk>/gamelist/",
        GameOfficialListView.as_view(),
        name=OFFICIALS_GAME_OFFICIALS_APPEARANCE_FOR_TEAM,
    ),
    path(
        "team/<int:pk>/gamelist/<int:season>/",
        GameOfficialListView.as_view(),
        name=OFFICIALS_GAME_OFFICIALS_APPEARANCE_FOR_TEAM_AND_YEAR,
    ),
    path(
        "gameofficial/internal/create/",
        AddInternalGameOfficialUpdateView.as_view(),
        name=OFFICIALS_GAMEOFFICIAL_INTERNAL_CREATE,
    ),
    path(
        "gameofficial/external/create/",
        AddExternalGameOfficialUpdateView.as_view(),
        name=OFFICIALS_GAMEOFFICIAL_EXTERNAL_CREATE,
    ),
    path(
        "gameofficial/<int:pk>/claim/",
        ClaimGameOfficialView.as_view(),
        name=OFFICIALS_SELF_SERVICE_CLAIM,
    ),
    path(
        "gameofficial/add-assignment/",
        AddAssignmentView.as_view(),
        name=OFFICIALS_SELF_SERVICE_ADD_ASSIGNMENT,
    ),
    path(
        "gameofficial/<int:pk>/unassign/",
        UnassignGameOfficialView.as_view(),
        name=OFFICIALS_SELF_SERVICE_UNASSIGN,
    ),
    path(
        "external/<int:pk>/edit/",
        ExternalGameEditView.as_view(),
        name=OFFICIALS_SELF_SERVICE_EXTERNAL_EDIT,
    ),
    path(
        "external/<int:pk>/delete/",
        ExternalGameDeleteView.as_view(),
        name=OFFICIALS_SELF_SERVICE_EXTERNAL_DELETE,
    ),
    path(
        "gameofficial/import/upload/",
        GameOfficialImportUploadView.as_view(),
        name=OFFICIALS_GAMEOFFICIAL_IMPORT_UPLOAD,
    ),
    path(
        "gameofficial/import/confirm/",
        GameOfficialImportConfirmView.as_view(),
        name=OFFICIALS_GAMEOFFICIAL_IMPORT_CONFIRM,
    ),
    path(
        "licensecheck/<int:course_id>/",
        LicenseCheckForOfficials.as_view(),
        name=OFFICIALS_LICENSE_CHECK,
    ),
    path("moodle-report/", MoodleReportView.as_view(), name=OFFICIALS_MOODLE_REPORT),
    path(
        "profile/<int:pk>/license/",
        OfficialProfileLicenseView.as_view(),
        name=OFFICIALS_PROFILE_LICENSE,
    ),
    path(
        "profile/<int:pk>/gamelist/<int:season>/",
        OfficialProfileGamelistView.as_view(),
        name=OFFICIALS_PROFILE_GAMELIST,
    ),
    path(
        "<str:abbr>/list/",
        OfficialAssociationListView.as_view(),
        name=OFFICIALS_ASSOCIATION_LIST,
    ),
    path(
        "gameday/sign-up/login/", MoodleLoginView.as_view(), name=OFFICIALS_MOODLE_LOGIN
    ),
    path(
        "gameday/sign-up/",
        OfficialSignUpListView.as_view(),
        name=OFFICIALS_SIGN_UP_LIST,
    ),
    path(
        "gameday/sign-up/<int:gameday>/add/",
        OfficialSignUpView.as_view(),
        name=OFFICIALS_SIGN_UP_FOR_GAMEDAY,
    ),
    path(
        "gameday/sign-up/<int:gameday>/cancel/",
        OfficialSignUpCancelView.as_view(),
        name=OFFICIALS_SIGN_UP_CANCEL_FOR_GAMEDAY,
    ),
    path(
        "gameday/sign-up/logout/",
        OfficialSignOutView.as_view(),
        name=OFFICIALS_SIGN_OUT,
    ),
]
