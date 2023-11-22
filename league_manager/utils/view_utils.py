from gamedays.models import Team


class PermissionHelper:
    @staticmethod
    def has_staff_or_user_permission(request, team_id):
        team = Team.objects.get(pk=team_id)
        if request.user.is_staff:
            return True
        return request.user.username == team.name
