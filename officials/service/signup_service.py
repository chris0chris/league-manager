from datetime import datetime

from django.db import IntegrityError
from django.db.models import (
    Func,
    IntegerField,
    CharField,
    Subquery,
    Count,
    F,
    BooleanField,
    Case,
    When,
    OuterRef,
    Value,
    Q,
)
from django.db.models.functions import Concat, Coalesce

from gamedays.models import Gameday
from league_table.models import LeagueSeasonConfig, OverrideOfficialGamedaySetting
from officials.models import OfficialGamedaySignup
from officials.serializers import (
    OfficialGamedaySignupSerializer,
    GamedaySignedUpOfficialsSerializer,
)


class DuplicateSignupError(Exception):
    pass


class MaxSignupError(Exception):
    pass


class OfficialSignupService:
    @staticmethod
    def create_signup(gameday_id, official_id):
        # Subqueries for config and override values
        config_sq = LeagueSeasonConfig.objects.filter(
            league_id=OuterRef('league_id'),
            season_id=OuterRef('season_id')
        )
        override_sq = OverrideOfficialGamedaySetting.objects.filter(
            gameday_id=OuterRef('pk')
        )

        gameday_with_limit = Gameday.objects.filter(pk=gameday_id).annotate(
            number_of_fields=Count('gameinfo__field', distinct=True),
            final_allow_registration=Coalesce(
                Subquery(override_sq.values('allow_officials_to_register')[:1]),
                Subquery(config_sq.values('allow_officials_to_register')[:1]),
                Value(False),
                output_field=BooleanField()
            ),
            final_officials_per_field=Coalesce(
                Subquery(override_sq.values('officials_per_gameday_per_field')[:1]),
                Subquery(config_sq.values('officials_per_gameday_per_field')[:1]),
                Value(0),
                output_field=IntegerField()
            ),
            final_officials_number=Coalesce(
                Subquery(override_sq.values('officials_per_gameday_number')[:1]),
                Subquery(config_sq.values('officials_per_gameday_number')[:1]),
                Value(0),
                output_field=IntegerField()
            )
        ).annotate(
            limit_signup=Case(
                When(final_allow_registration=False, then=Value(0)),
                When(final_officials_per_field__gt=0, then=F('number_of_fields') * F('final_officials_per_field')),
                default=F('final_officials_number'),
                output_field=IntegerField()
            )
        ).first()

        if gameday_with_limit is None:
            # This case should not be reached with a valid gameday_id
            raise Gameday.DoesNotExist

        limit = gameday_with_limit.limit_signup
        if OfficialGamedaySignup.objects.filter(gameday=gameday_with_limit).count() >= limit:
            raise MaxSignupError(f'{gameday_with_limit.name} - Das Limit von {limit} wurde erreicht.')
        try:
            OfficialGamedaySignup.objects.create(
                gameday=gameday_with_limit, official_id=official_id
            )
        except IntegrityError:
            raise DuplicateSignupError(f"{gameday_with_limit.name}")

    @staticmethod
    def cancel_signup(gameday_id, official_id):
        OfficialGamedaySignup.objects.filter(
            gameday_id=gameday_id, official_id=official_id
        ).delete()
    @staticmethod
    def get_signup_data(official_id, league):
        signed_up_officials = OfficialGamedaySignup.objects.filter(
            gameday_id=OuterRef("pk"), official_id=official_id
        ).values("gameday_id")

        names_signed_up_officials = (
            OfficialGamedaySignup.objects.filter(gameday_id=OuterRef("pk"))
            .annotate(
                full_name=Concat(
                    "official__pk",
                    Value("#"),
                    "official__first_name",
                    Value(" "),
                    "official__last_name",
                )
            )
            .order_by("official__first_name")
            .values_list("full_name", flat=True)
)
        all_gamedays = Gameday.objects.filter(date__gte=datetime.today())
        relevant_leagues = all_gamedays.order_by().values_list('league__name', flat=True).distinct()

        # Subqueries for config and override values
        config_sq = LeagueSeasonConfig.objects.filter(
            league_id=OuterRef('league_id'),
            season_id=OuterRef('season_id')
        )
        override_sq = OverrideOfficialGamedaySetting.objects.filter(
            gameday_id=OuterRef('pk')
        )

        all_gamedays = all_gamedays.filter(Q(league__name=league) if league else Q(), ).annotate(
            number_of_fields=Count('gameinfo__field', distinct=True),
            # Use Coalesce to prioritize override settings over league settings
            final_allow_registration=Coalesce(
                Subquery(override_sq.values('allow_officials_to_register')[:1]),
                Subquery(config_sq.values('allow_officials_to_register')[:1]),
                output_field=BooleanField()
            ),
            final_officials_per_field=Coalesce(
                Subquery(override_sq.values('officials_per_gameday_per_field')[:1]),
                Subquery(config_sq.values('officials_per_gameday_per_field')[:1]),
                output_field=IntegerField()
            ),
            final_officials_number=Coalesce(
                Subquery(override_sq.values('officials_per_gameday_number')[:1]),
                Subquery(config_sq.values('officials_per_gameday_number')[:1]),
                output_field=IntegerField()
            )
        ).annotate(
            limit_signup=Case(
                When(final_allow_registration=False, then=Value(0)),
                When(final_officials_per_field__gt=0, then=F('number_of_fields') * F('final_officials_per_field')),
                default=F('final_officials_number'),
                output_field=IntegerField()
            ),
            count_signup=Count('officialgamedaysignup', distinct=True),
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
        ).order_by("date", "pk")
        return {
            "gamedays": OfficialGamedaySignupSerializer(
                all_gamedays.values(*OfficialGamedaySignupSerializer.ALL_FIELD_VALUES),
                many=True,
            ).data,
            "leagues": relevant_leagues,
        }

    @staticmethod
    def get_signed_up_officials(gameday_id, show_officials_names):
        signed_up_officials = OfficialGamedaySignup.objects.filter(
            gameday_id=gameday_id
        )
        return GamedaySignedUpOfficialsSerializer(
            instance=signed_up_officials.values(
                *GamedaySignedUpOfficialsSerializer.ALL_FIELD_VALUES
            ),
            is_staff=show_officials_names,
            many=True,
        ).data


class ExtractFieldPart(Func):
    function = "SUBSTRING_INDEX"
    template = "%(function)s(%(expressions)s, '_', -1)"
    output_field = IntegerField()


class ConcatOfficialsNames(Func):
    function = "GROUP_CONCAT"
    template = "%(function)s(%(expressions)s SEPARATOR ', ')"
    output_field = CharField()

    def as_sqlite(self, compiler, connection, **extra_context):
        return super().as_sql(
            compiler,
            connection,
            template="%(function)s(%(expressions)s)",
            **extra_context,
        )
