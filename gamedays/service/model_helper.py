from django.db.models import Subquery, OuterRef, F, ExpressionWrapper, Value, IntegerField
from django.db.models.functions import Coalesce

from gamedays.models import Gameresult


class GameresultHelper:

    @staticmethod
    def get_gameresult_team_subquery(is_home: bool, team_column: str):
        return Subquery(
            Gameresult.objects.filter(
                gameinfo=OuterRef('id'),
                isHome=is_home
            ).values(f'team__{team_column}')[:1]
        )

    @staticmethod
    def get_gameresult_score(is_home, is_fh=False, is_sh=False) -> Subquery:
        annotations = {}
        if is_fh:
            annotations['fh'] = F('fh')
        if is_sh:
            annotations['sh'] = F('sh')
        if annotations:
            return Subquery(
                Gameresult.objects.filter(gameinfo=OuterRef('id'), isHome=is_home).annotate(
                    score=ExpressionWrapper(Coalesce(sum(annotations.values()), 0), output_field=IntegerField())
                ).values('score')[:1]
            )
        else:
            # If no fields provided, return a constant value (e.g., 0)
            return Subquery(Value(0, output_field=IntegerField()))

    @staticmethod
    def get_gameresult_score_half(is_home):
        return Subquery(
            Gameresult.objects.filter(gameinfo=OuterRef('id'), isHome=is_home).annotate(
                score=(F('fh') + F('sh'))).values('score')[:1]
        )


class TeamLogHelper:
    EXCLUDED_EVENTS = ['Strafe', 'Spielzeit', 'Auszeit', 'First Down']
