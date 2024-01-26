from functools import wraps

from django.views import View

from league_manager.utils.view_utils import PermissionHelper


def is_staff(view_func):
    @wraps(view_func)
    def _wrapped_view(request: View, *args, **kwargs):
        is_staff = PermissionHelper.has_staff_or_user_permission(request.request)
        kwargs['is_staff'] = is_staff
        return view_func(request, *args, **kwargs)

    return _wrapped_view
