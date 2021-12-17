from gamedays.tests.setup_factories.db_setup import DBSetup
from gamedays.tests.setup_factories.factories import TeamFactory
from officials.models import Official
from officials.tests.setup_factories.factories_officials import OfficialFactory, OfficialLicenseHistoryFactory, \
    OfficialLicenseFactory
from teammanager.models import Team, Gameinfo


class DbSetupOfficials:
    def create_officials_and_team(self) -> Team:
        team_name = 'Test Team'
        DBSetup().create_new_user(team_name)
        team = TeamFactory(name=team_name)
        official1 = OfficialFactory(first_name='Franzi', last_name='Fedora', team=team)
        official2 = OfficialFactory(first_name='Julia', last_name='Jegura', team=team)
        OfficialLicenseHistoryFactory(license=OfficialLicenseFactory(name='F1'), official=official1)
        OfficialLicenseHistoryFactory(license=OfficialLicenseFactory(name='F2'), official=official1,
                                      created_at='2020-07-07')
        OfficialLicenseHistoryFactory(license=OfficialLicenseFactory(name='F2'), official=official2)
        return team

    def create_officials_full_setup(self):
        db_setup = DBSetup()
        team = self.create_officials_and_team()
        db_setup.g62_status_empty()
        db_setup.create_game_officials(Gameinfo.objects.first(), Official.objects.first())
        db_setup.create_game_officials(Gameinfo.objects.last(), Official.objects.last())
        db_setup.create_game_officials(Gameinfo.objects.get(pk=2), Official.objects.last())
        gameday = db_setup.g62_status_empty()
        db_setup.create_game_officials(gameday.gameinfo_set.first(), Official.objects.first())
        db_setup.create_game_officials(gameday.gameinfo_set.last(), Official.objects.last())
        gameday.date = '2020-07-07'
        gameday.save()
        return team