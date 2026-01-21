from django.db.models import Func


class GroupConcat(Func):
    function = "GROUP_CONCAT"
    template = "%(function)s(%(expressions)s ORDER BY %(ordering)s SEPARATOR ',')"

    def as_sqlite(self, compiler, connection, **extra_context):
        return super().as_sql(
            compiler,
            connection,
            template="%(function)s(%(expressions)s)",
            **extra_context,
        )

