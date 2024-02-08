from gamedays.models import Team


class UserRequestPermission:
    def __init__(self, is_staff=False, is_user=False):
        self.is_staff = is_staff
        self.is_user = is_user

    def is_user_or_staff(self):
        return self.is_staff or self.is_user


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

    @staticmethod
    def get_staff_or_user_permission(request):
        if request.user.is_staff:
            return UserRequestPermission(is_staff=True)
        try:
            Team.objects.get(name=request.user.username)
        except Team.DoesNotExist:
            return UserRequestPermission()
        return UserRequestPermission(is_user=True)
