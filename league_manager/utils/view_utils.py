from gamedays.models import Team


class PermissionHelper:
    @staticmethod
    def has_staff_or_user_permission(request, team: Team):
        if request.user.is_staff:
            return True
        return request.user.username == team.name
