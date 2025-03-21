from django.db.models import Func


class GroupConcat(Func):
    function = 'GROUP_CONCAT'
    template = "%(function)s(%(expressions)s ORDER BY %(ordering)s SEPARATOR ',')"
