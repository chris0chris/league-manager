from gamedays.models import Team


class PermissionHelper:
    @staticmethod
    def has_staff_or_user_permission(request):
        if request.user.is_staff:
            return True
        try:
            Team.objects.get(name=request.user.username)
        except Team.DoesNotExist:
            return False
        return True
