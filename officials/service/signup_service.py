from datetime import datetime

from django.db import IntegrityError
from django.db.models import Func, IntegerField, CharField, Subquery, Count, F, BooleanField, Case, When, OuterRef, \
    Value, Q
from django.db.models.functions import Concat

from gamedays.models import Gameday
from officials.models import OfficialGamedaySignup
from officials.serializers import OfficialGamedaySignupSerializer, GamedaySignedUpOfficialsSerializer

OFFICIALS_PER_FIELD = 6


class DuplicateSignupError(Exception):
    pass


class MaxSignupError(Exception):
    pass


class OfficialSignupService:
    @staticmethod
    def create_signup(gameday_id, official_id):
        gameday = Gameday.objects.get(pk=gameday_id)
        number_fields = int(gameday.format.split('_')[-1])
        officials_limit = number_fields * OFFICIALS_PER_FIELD
        if OfficialGamedaySignup.objects.filter(gameday=gameday).count() >= officials_limit:
            raise MaxSignupError(f'{gameday.name} - Das Limit von {officials_limit} wurde erreicht.')
        try:
            OfficialGamedaySignup.objects.create(gameday=gameday, official_id=official_id)
        except IntegrityError:
            raise DuplicateSignupError(f'{gameday.name}')

    @staticmethod
    def get_signup_data(official_id, league):
        signed_up_officials = OfficialGamedaySignup.objects.filter(
            gameday_id=OuterRef('pk'),
            official_id=official_id
        ).values('gameday_id')

        names_signed_up_officials = OfficialGamedaySignup.objects.filter(
            gameday_id=OuterRef('pk')
        ).annotate(
            full_name=Concat('official__pk', Value('#'), 'official__first_name', Value(' '), 'official__last_name')
        ).order_by('official__first_name').values_list('full_name', flat=True)


        all_gamedays = Gameday.objects.filter(date__gte=datetime.today())
        relevant_leagues = all_gamedays.order_by().values_list('league__name', flat=True).distinct()
        all_gamedays = all_gamedays.filter(Q(league__name=league) if league else Q(),).annotate(
            count_signup=Count('officialgamedaysignup'),
            limit_signup=(ExtractFieldPart(F('format'), output_field=IntegerField())) * OFFICIALS_PER_FIELD,
            has_signed_up=Case(
                When(pk__in=Subquery(signed_up_officials), then=True),
                default=False,
                output_field=BooleanField()
            ),
            official_names=Subquery(
                names_signed_up_officials.annotate(
                    names=ConcatOfficialsNames(F('full_name'))
                ).order_by('full_name').values('names'),
                output_field=CharField()
            )
        ).order_by('date', 'pk')
        return {
            'gamedays': OfficialGamedaySignupSerializer(
                all_gamedays.values(*OfficialGamedaySignupSerializer.ALL_FIELD_VALUES),
                many=True).data,
            'leagues': relevant_leagues,
        }

    @staticmethod
    def get_signed_up_officials(gameday_id, show_officials_names):
        signed_up_officials = OfficialGamedaySignup.objects.filter(gameday_id=gameday_id)
        return GamedaySignedUpOfficialsSerializer(
            instance=signed_up_officials.values(*GamedaySignedUpOfficialsSerializer.ALL_FIELD_VALUES),
            is_staff=show_officials_names,
            many=True).data


class ExtractFieldPart(Func):
    function = 'SUBSTRING_INDEX'
    template = "%(function)s(%(expressions)s, '_', -1)"
    output_field = IntegerField()


class ConcatOfficialsNames(Func):
    function = 'GROUP_CONCAT'
    template = "%(function)s(%(expressions)s SEPARATOR ', ')"
    output_field = CharField()
