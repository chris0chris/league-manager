from datetime import datetime, timedelta

from gamedays.models import Association, Team, Gameinfo
from gamedays.tests.setup_factories.db_setup import DBSetup
from gamedays.tests.setup_factories.factories import TeamFactory
from officials.models import Official
from officials.tests.setup_factories.factories_officials import (
    OfficialFactory,
    OfficialLicenseHistoryFactory,
    OfficialLicenseFactory,
    OfficialExternalGamesFactory,
)

# The 19 association rows that exist in production (abbr, name). The import
# and the self-service forms resolve free-text values (e.g. "Hamburg") by
# name, so a test that exercises those paths needs these rows.
PRODUCTION_ASSOCIATIONS = [
    ("AFVBY", "Bayern"),
    ("OHNE", "-"),
    ("AFCVBW", "Baden-Württemberg"),
    ("AFCVBB", "Berlin-Brandenburg"),
    ("AFCVHH", "Hamburg"),
    ("AFCVMV", "Mecklenburg-Vorpommern"),
    ("AFCVN", "Niedersachsen"),
    ("AFCVNORD", "Nord"),
    ("AFCVNRW", "Nordrhein-Westfalen"),
    ("AFCVRLP", "Rheinland-Pfalz"),
    ("AFCVSAA", "Saarland"),
    ("AFCVSH", "Schleswig-Holstein"),
    ("AFCVT", "Thüringen"),
    ("AFVH", "Hessen"),
    ("AFVS", "Sachsen"),
    ("AFVSA", "Sachsen-Anhalt"),
    ("LUX", "Luxemburg"),
    ("SAFV", "Schweiz"),
    ("BAFL", "Belgien"),
]


class DbSetupOfficials:
    @staticmethod
    def create_production_associations() -> dict[str, Association]:
        return {
            abbr: DBSetup().create_new_association(abbr=abbr, name=name)
            for abbr, name in PRODUCTION_ASSOCIATIONS
        }

    def create_multiple_officials(self, number: int, team: Team = None):
        if team is None:
            team_name = "Test Team"
            DBSetup().create_new_user(team_name)
            team = TeamFactory(name=team_name)
        association = DBSetup().create_new_association()
        license_f2 = OfficialLicenseFactory(id=3, name="F2")
        license_f1 = OfficialLicenseFactory(id=1, name="F1")
        for i in range(number):
            official = OfficialFactory(
                first_name="Juli" + "i" * i,
                last_name="Jarula" + "a" * i,
                team=team,
                association=association,
                external_id=i * 10,
            )
            if i % 2 == 0:
                OfficialLicenseHistoryFactory(
                    license=license_f1, official=official, created_at="2020-07-07"
                )
            else:
                OfficialLicenseHistoryFactory(
                    license=license_f2, official=official, created_at="2020-07-07"
                )

    # noinspection PyMethodMayBeStatic
    def create_officials_and_team(self) -> Team:
        team_name = "Test Team"
        DBSetup().create_new_user(team_name)
        team = TeamFactory(name=team_name)
        association = DBSetup().create_new_association()
        license_f2 = OfficialLicenseFactory(id=3, name="F2")
        license_f1 = OfficialLicenseFactory(id=1, name="F1")
        official1 = OfficialFactory(
            first_name="Franzi",
            last_name="Fedora",
            team=team,
            association=association,
            external_id=5,
        )
        official2 = OfficialFactory(
            first_name="Julia", last_name="Jegura", team=team, external_id=7
        )
        OfficialLicenseHistoryFactory(
            license=license_f2, official=official1, created_at="2020-07-07"
        )
        OfficialLicenseHistoryFactory(
            license=license_f1,
            official=official1,
            created_at=str(datetime.today().year - 1) + "-01-01",
        )
        OfficialLicenseHistoryFactory(license=license_f1, official=official1)
        OfficialLicenseHistoryFactory(
            license=license_f2,
            official=official2,
            created_at=str(datetime.today().year - 1) + "-01-01",
        )
        OfficialLicenseHistoryFactory(license=license_f2, official=official2)
        return team

    def create_officials_full_setup(self):
        db_setup = DBSetup()
        team = self.create_officials_and_team()
        db_setup.g62_status_empty()
        first_game = Gameinfo.objects.first()
        db_setup.create_game_officials(first_game, Official.objects.first())
        db_setup.create_game_officials(Gameinfo.objects.last(), Official.objects.last())
        db_setup.create_game_officials(
            Gameinfo.objects.get(pk=first_game.pk + 1), Official.objects.last()
        )
        gameday = db_setup.g62_status_empty()
        gameday.date = "2020-07-07"
        db_setup.create_game_officials(
            gameday.gameinfo_set.first(), Official.objects.first()
        )
        db_setup.create_game_officials(
            gameday.gameinfo_set.last(), Official.objects.last()
        )
        gameday.save()
        return team

    # noinspection PyMethodMayBeStatic
    def create_external_officials_entries(self):
        current_year = datetime.today()
        last_year = current_year - timedelta(days=3 * 365)
        association_a = DBSetup().create_new_association(
            abbr="EXA", name="association A"
        )
        association_b = DBSetup().create_new_association(
            abbr="EXB", name="association B"
        )
        OfficialExternalGamesFactory(
            official=Official.objects.first(),
            number_games=4,
            date=current_year,
            position="Mix",
            association=association_a,
            is_international=False,
            has_clockcontrol=1,
            halftime_duration=15,
            notification_date=current_year,
            reporter_name="some reporter name",
            comment="no comment",
        ).save()
        OfficialExternalGamesFactory(
            official=Official.objects.first(),
            number_games=6,
            date=current_year,
            position="Mix",
            association=association_a,
            is_international=False,
            has_clockcontrol=0,
            halftime_duration=15,
            notification_date=current_year,
            reporter_name="some reporter name",
            comment="no comment",
        ).save()
        OfficialExternalGamesFactory(
            official=Official.objects.first(),
            number_games=6,
            date=last_year,
            position="Mix",
            association=association_a,
            is_international=False,
            has_clockcontrol=1,
            halftime_duration=15,
            notification_date=last_year,
            reporter_name="some reporter name",
            comment="no comment",
        ).save()
        OfficialExternalGamesFactory(
            official=Official.objects.last(),
            number_games=7,
            date=current_year,
            position="Referee",
            association=association_b,
            is_international=True,
            has_clockcontrol=1,
            halftime_duration=15,
            notification_date=current_year,
            reporter_name="some reporter name",
            comment="no comment",
        ).save()
        OfficialExternalGamesFactory(
            official=Official.objects.last(),
            number_games=5,
            date=last_year,
            position="Referee",
            association=association_b,
            is_international=True,
            has_clockcontrol=0,
            halftime_duration=15,
            notification_date=last_year,
            reporter_name="some reporter name",
            comment="no comment",
        ).save()
