from datetime import datetime, timedelta

from gamedays.models import Team, Gameinfo
from gamedays.tests.setup_factories.db_setup import DBSetup
from gamedays.tests.setup_factories.factories import TeamFactory
from officials.models import Official
from officials.tests.setup_factories.factories_officials import OfficialFactory, OfficialLicenseHistoryFactory, \
    OfficialLicenseFactory, OfficialExternalGamesFactory


class DbSetupOfficials:
    # noinspection PyMethodMayBeStatic
    def create_officials_and_team(self) -> Team:
        team_name = 'Test Team'
        DBSetup().create_new_user(team_name)
        team = TeamFactory(name=team_name)
        association = DBSetup().create_new_association()
        license_f2 = OfficialLicenseFactory(name='F2')
        license_f1 = OfficialLicenseFactory(name='F1')
        official1 = OfficialFactory(first_name='Franzi', last_name='Fedora', team=team, association=association)
        official2 = OfficialFactory(first_name='Julia', last_name='Jegura', team=team)
        OfficialLicenseHistoryFactory(license=license_f2, official=official1,
                                      created_at='2020-07-07')
        OfficialLicenseHistoryFactory(license=license_f1, official=official1)
        OfficialLicenseHistoryFactory(license=license_f2, official=official2,
                                      created_at=str(datetime.today().year - 1) + '-01-01')
        OfficialLicenseHistoryFactory(license=license_f2, official=official2)
        return team

    def create_officials_full_setup(self):
        db_setup = DBSetup()
        team = self.create_officials_and_team()
        db_setup.g62_status_empty()
        first_game = Gameinfo.objects.first()
        db_setup.create_game_officials(first_game, Official.objects.first())
        db_setup.create_game_officials(Gameinfo.objects.last(), Official.objects.last())
        db_setup.create_game_officials(Gameinfo.objects.get(pk=first_game.pk + 1), Official.objects.last())
        gameday = db_setup.g62_status_empty()
        db_setup.create_game_officials(gameday.gameinfo_set.first(), Official.objects.first())
        db_setup.create_game_officials(gameday.gameinfo_set.last(), Official.objects.last())
        gameday.date = '2020-07-07'
        gameday.save()
        return team

    # noinspection PyMethodMayBeStatic
    def create_external_officials_entries(self):
        current_year = datetime.today()
        last_year = current_year - timedelta(days=3 * 365)
        OfficialExternalGamesFactory(official=Official.objects.first(), number_games=4, date=current_year,
                                     position='Mix', association='association A', is_international=False,
                                     comment='no comment').save()
        OfficialExternalGamesFactory(official=Official.objects.first(), number_games=6, date=current_year,
                                     position='Mix', association='association A', is_international=False,
                                     comment='no comment').save()
        OfficialExternalGamesFactory(official=Official.objects.first(), number_games=6, date=last_year,
                                     position='Mix', association='association A', is_international=False,
                                     comment='no comment').save()
        OfficialExternalGamesFactory(official=Official.objects.last(), number_games=7, date=current_year,
                                     position='Referee', association='association B', is_international=True,
                                     comment='no comment').save()
        OfficialExternalGamesFactory(official=Official.objects.last(), number_games=5, date=last_year,
                                     position='Referee', association='association B', is_international=True,
                                     comment='no comment').save()
