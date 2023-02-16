from datetime import datetime, timedelta

from gamedays.tests.setup_factories.db_setup import DBSetup
from gamedays.tests.setup_factories.factories import TeamFactory
from officials.models import Official
from officials.tests.setup_factories.factories_officials import OfficialFactory, OfficialLicenseHistoryFactory, \
    OfficialLicenseFactory, OfficialExternalGamesFactory
from teammanager.models import Team, Gameinfo


class DbSetupOfficials:
    def create_officials_and_team(self) -> Team:
        team_name = 'Test Team'
        DBSetup().create_new_user(team_name)
        team = TeamFactory(name=team_name)
        official1 = OfficialFactory(first_name='Franzi', last_name='Fedora', team=team, external_id=1)
        official2 = OfficialFactory(first_name='Julia', last_name='Jegura', team=team, external_id=7)
        OfficialLicenseHistoryFactory(license=OfficialLicenseFactory(name='F1'), official=official1)
        OfficialLicenseHistoryFactory(license=OfficialLicenseFactory(name='F2'), official=official1,
                                      created_at='2020-07-07')
        OfficialLicenseHistoryFactory(license=OfficialLicenseFactory(name='F2'), official=official2)
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
