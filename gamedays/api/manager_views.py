from http import HTTPStatus

from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from gamedays.api.serializers import (
    LeagueManagerSerializer,
    GamedayManagerSerializer,
    TeamManagerSerializer,
)
from gamedays.models import (
    LeagueManager,
    GamedayManager,
    TeamManager,
    Team,
    League,
    Season,
    SeasonLeagueTeam,
)
from league_manager.utils.decorators import league_manager_required
from league_manager.utils.manager_permissions import ManagerPermissionHelper


class LeagueManagerListCreateAPIView(APIView):
    """
    GET: List all league managers for a specific league (staff only) or all (staff only)
    POST: Assign a user as league manager (staff/league managers only)
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, league_id=None):
        if not request.user.is_staff:
            raise PermissionDenied("Staff access required")

        if league_id:
            managers = LeagueManager.objects.filter(league_id=league_id).select_related(
                "user", "league", "season", "created_by"
            )
        else:
            managers = LeagueManager.objects.all().select_related(
                "user", "league", "season", "created_by"
            )

        serializer = LeagueManagerSerializer(managers, many=True)
        return Response(serializer.data)

    def post(self, request, league_id):
        if not request.user.is_staff:
            raise PermissionDenied("Staff access required")

        data = request.data.copy()
        data["league"] = league_id

        serializer = LeagueManagerSerializer(data=data)
        if serializer.is_valid():
            serializer.save(created_by=request.user)
            return Response(serializer.data, status=HTTPStatus.CREATED)
        return Response(serializer.errors, status=HTTPStatus.BAD_REQUEST)


class LeagueManagerDeleteAPIView(APIView):
    """DELETE: Remove a league manager assignment"""

    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        if not request.user.is_staff:
            raise PermissionDenied("Staff access required")

        try:
            manager = LeagueManager.objects.get(pk=pk)
            manager.delete()
            return Response(status=HTTPStatus.NO_CONTENT)
        except LeagueManager.DoesNotExist:
            return Response(
                {"detail": "League manager assignment not found"},
                status=HTTPStatus.NOT_FOUND,
            )


class GamedayManagerListCreateAPIView(APIView):
    """
    GET: List gameday managers for a gameday
    POST: Assign a user as gameday manager (league managers/staff only)
    """

    permission_classes = [permissions.IsAuthenticated]

    @league_manager_required
    def get(self, request, *args, **kwargs):
        gameday_id = kwargs.get("gameday_id")
        managers = GamedayManager.objects.filter(gameday_id=gameday_id).select_related(
            "user", "gameday", "assigned_by"
        )
        serializer = GamedayManagerSerializer(managers, many=True)
        return Response(serializer.data)

    @league_manager_required
    def post(self, request, *args, **kwargs):
        gameday_id = kwargs.get("gameday_id")
        data = request.data.copy()
        data["gameday"] = gameday_id

        serializer = GamedayManagerSerializer(data=data)
        if serializer.is_valid():
            serializer.save(assigned_by=request.user)
            return Response(serializer.data, status=HTTPStatus.CREATED)
        return Response(serializer.errors, status=HTTPStatus.BAD_REQUEST)


class GamedayManagerUpdateDeleteAPIView(APIView):
    """
    PATCH: Update gameday manager permissions
    DELETE: Remove a gameday manager assignment
    """

    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        # Only staff or league managers can update
        try:
            manager = GamedayManager.objects.select_related("gameday").get(pk=pk)
        except GamedayManager.DoesNotExist:
            return Response(
                {"detail": "Gameday manager assignment not found"},
                status=HTTPStatus.NOT_FOUND,
            )

        # Check permissions
        if not (
            request.user.is_staff
            or ManagerPermissionHelper.is_league_manager(
                request.user, manager.gameday.league, manager.gameday.season
            )
        ):
            raise PermissionDenied("League manager permission required")

        serializer = GamedayManagerSerializer(manager, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=HTTPStatus.BAD_REQUEST)

    def delete(self, request, pk):
        # Only staff or league managers can delete
        try:
            manager = GamedayManager.objects.select_related("gameday").get(pk=pk)
        except GamedayManager.DoesNotExist:
            return Response(
                {"detail": "Gameday manager assignment not found"},
                status=HTTPStatus.NOT_FOUND,
            )

        # Check permissions
        if not (
            request.user.is_staff
            or ManagerPermissionHelper.is_league_manager(
                request.user, manager.gameday.league, manager.gameday.season
            )
        ):
            raise PermissionDenied("League manager permission required")

        manager.delete()
        return Response(status=HTTPStatus.NO_CONTENT)


class TeamManagerListCreateAPIView(APIView):
    """
    GET: List team managers for a team
    POST: Assign a user as team manager (staff/league managers only)
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, team_id):
        # Staff, league managers, or existing team managers can view
        try:
            team = Team.objects.get(pk=team_id)
        except Team.DoesNotExist:
            return Response({"detail": "Team not found"}, status=HTTPStatus.NOT_FOUND)

        if not (
            request.user.is_staff
            or ManagerPermissionHelper.can_assign_team_manager(request.user, team)
            or ManagerPermissionHelper.is_team_manager(request.user, team)
        ):
            raise PermissionDenied()

        managers = TeamManager.objects.filter(team_id=team_id).select_related(
            "user", "team", "assigned_by"
        )
        serializer = TeamManagerSerializer(managers, many=True)
        return Response(serializer.data)

    def post(self, request, team_id):
        # League managers and staff can assign team managers
        try:
            team = Team.objects.get(pk=team_id)
        except Team.DoesNotExist:
            return Response({"detail": "Team not found"}, status=HTTPStatus.NOT_FOUND)

        if not (
            request.user.is_staff
            or ManagerPermissionHelper.can_assign_team_manager(request.user, team)
        ):
            raise PermissionDenied("League manager or staff permission required")

        data = request.data.copy()
        data["team"] = team_id

        serializer = TeamManagerSerializer(data=data)
        if serializer.is_valid():
            serializer.save(assigned_by=request.user)
            return Response(serializer.data, status=HTTPStatus.CREATED)
        return Response(serializer.errors, status=HTTPStatus.BAD_REQUEST)


class TeamManagerDeleteAPIView(APIView):
    """DELETE: Remove a team manager assignment"""

    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        try:
            manager = TeamManager.objects.select_related("team").get(pk=pk)
        except TeamManager.DoesNotExist:
            return Response(
                {"detail": "Team manager assignment not found"},
                status=HTTPStatus.NOT_FOUND,
            )

        # Check permissions
        if not (
            request.user.is_staff
            or ManagerPermissionHelper.can_assign_team_manager(
                request.user, manager.team
            )
        ):
            raise PermissionDenied("League manager or staff permission required")

        manager.delete()
        return Response(status=HTTPStatus.NO_CONTENT)


class UserManagerPermissionsAPIView(APIView):
    """
    GET: Get current user's manager permissions
    Returns all leagues, gamedays, and teams the user can manage
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        data = {
            "is_staff": user.is_staff,
            "managed_leagues": [],
            "managed_gamedays": [],
            "managed_teams": [],
        }

        if not user.is_staff:
            # League manager permissions
            league_managers = LeagueManager.objects.filter(user=user).select_related(
                "league", "season"
            )
            data["managed_leagues"] = [
                {
                    "id": lm.id,
                    "league_id": lm.league.id,
                    "league_name": lm.league.name,
                    "season_id": lm.season.id if lm.season else None,
                    "season_name": lm.season.name if lm.season else "All Seasons",
                }
                for lm in league_managers
            ]

            # Gameday manager permissions
            gameday_managers = GamedayManager.objects.filter(user=user).select_related(
                "gameday"
            )
            data["managed_gamedays"] = [
                {
                    "id": gm.id,
                    "gameday_id": gm.gameday.id,
                    "gameday_name": gm.gameday.name,
                    "gameday_date": gm.gameday.date.isoformat(),
                    "can_edit_details": gm.can_edit_details,
                    "can_assign_officials": gm.can_assign_officials,
                    "can_manage_scores": gm.can_manage_scores,
                }
                for gm in gameday_managers
            ]

            # Team manager permissions
            team_managers = TeamManager.objects.filter(user=user).select_related("team")
            data["managed_teams"] = [
                {
                    "id": tm.id,
                    "team_id": tm.team.id,
                    "team_name": tm.team.name,
                    "can_edit_roster": tm.can_edit_roster,
                    "can_submit_passcheck": tm.can_submit_passcheck,
                }
                for tm in team_managers
            ]

        return Response(data)
