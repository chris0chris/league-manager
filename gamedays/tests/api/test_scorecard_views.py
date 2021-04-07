import json
import pathlib
import re
from http import HTTPStatus

from django_webtest import WebTest
from rest_framework.reverse import reverse

from gamedays.tests.setup_factories.db_setup import DBSetup
from teammanager.models import Gameinfo, GameOfficial, GameSetup, TeamLog, Gameresult


class TestRetrieveUpdateOfficials(WebTest):

    def test_create_officials(self):
        DBSetup().g62_status_empty()
        last_game = Gameinfo.objects.last()
        assert len(GameOfficial.objects.all()) == 0
        response = self.app.put_json(reverse('api-game-officials', kwargs={'pk': last_game.pk}), [
            {"name": "Saskia", "position": "referee"},
            {"name": "Franz", "position": "side jude"}], headers=DBSetup().get_token_header())
        assert response.status_code == HTTPStatus.OK
        assert len(GameOfficial.objects.all()) == 2

    def test_officials_will_be_updated(self):
        DBSetup().g62_status_empty()
        last_game = Gameinfo.objects.last()
        DBSetup().create_officials(last_game)
        assert len(GameOfficial.objects.all()) == 5
        response = self.app.put_json(reverse('api-game-officials', kwargs={'pk': last_game.pk}), [
            {"name": "Saskia", "position": "referee"},
            {"name": "Franz", "position": "side judge"}], headers=DBSetup().get_token_header())
        assert response.status_code == HTTPStatus.OK
        assert len(GameOfficial.objects.all()) == 5

    def test_officials_get(self):
        DBSetup().g62_status_empty()
        last_game = Gameinfo.objects.last()
        DBSetup().create_officials(last_game)
        response = self.app.get(reverse('api-game-officials', kwargs={'pk': last_game.pk}))
        assert response.status_code == HTTPStatus.OK
        assert len(response.json) == 5


class TestGameSetup(WebTest):

    def test_game_setup_create(self):
        DBSetup().g62_status_empty()
        first_game = Gameinfo.objects.last()
        gamesetup = {"ctResult": "won", "direction": "arrow_forward", "fhPossession": "HOME"}
        assert len(GameSetup.objects.all()) == 0
        response = self.app.put_json(reverse('api-game-setup', kwargs={'pk': first_game.pk}), gamesetup,
                                     headers=DBSetup().get_token_header())
        assert len(GameSetup.objects.all()) == 1
        assert response.status_code == HTTPStatus.OK
        assert response.json == gamesetup
        first_game: Gameinfo = Gameinfo.objects.last()
        assert first_game.status == '1. Halbzeit'

    def test_game_setup_update(self):
        DBSetup().g62_status_empty()
        first_game = Gameinfo.objects.last()
        first_game.status = '2. Halbzeit'
        first_game.gameStarted = '11:00'
        first_game.save()
        DBSetup().create_gamesetup(first_game)

        gamesetup = {"ctResult": "won", "direction": "arrow_forward", "fhPossession": "HOME"}
        assert len(GameSetup.objects.all()) == 1
        response = self.app.put_json(reverse('api-game-setup', kwargs={'pk': first_game.pk}), gamesetup
                                     , headers=DBSetup().get_token_header())
        assert len(GameSetup.objects.all()) == 1
        assert response.status_code == HTTPStatus.OK
        assert response.json == gamesetup
        first_game: Gameinfo = Gameinfo.objects.last()
        assert first_game.status == '2. Halbzeit'
        assert str(first_game.gameStarted) == '11:00:00'

    def test_game_setup_get(self):
        DBSetup().g62_status_empty()
        last_game = Gameinfo.objects.last()
        DBSetup().create_gamesetup(last_game)
        response = self.app.get(reverse('api-game-setup', kwargs={'pk': last_game.pk}))
        assert response.status_code == HTTPStatus.OK
        assert response.json == {"ctResult": "won", "direction": "arrow_forward", "fhPossession": "AWAY"}

    def test_game_setup_not_found_(self):
        response = self.app.get(reverse('api-game-setup', kwargs={'pk': 666}))
        assert response.status_code == HTTPStatus.OK
        assert response.json == {}


class TestGameLog(WebTest):
    def test_game_not_found_exception(self):
        response = self.app.get(reverse('api-gamelog', kwargs={'id': 666}), expect_errors=True)
        assert response.status_code == HTTPStatus.NOT_FOUND

    def test_get_team_log(self):
        gameinfo = DBSetup().create_teamlog_home_and_away()
        response = self.app.get(reverse('api-gamelog', kwargs={'id': gameinfo.pk}))
        assert response.status_code == HTTPStatus.OK
        with open(pathlib.Path(__file__).parent / '../service/testdata/teamlog.json') as f:
            expected_gamelog = json.load(f)
        expected_gamelog['gameId'] = gameinfo.pk
        assert response.json == expected_gamelog

    def test_post_team_log(self):
        DBSetup().g62_status_empty()
        another_user = DBSetup().create_new_user()
        firstGame = Gameinfo.objects.first()
        response = self.app.post_json(reverse('api-gamelog', kwargs={'id': firstGame.pk}),
                                      {'team': 'A1', 'gameId': firstGame.pk, 'half': 1,
                                       'event': [
                                           {'name': 'Touchdown', 'player': '19'},
                                           {'name': '1-Extra-Punkt', 'player': '7'}]},
                                      headers=DBSetup().get_token_header(another_user))
        assert response.status_code == HTTPStatus.CREATED
        assert TeamLog.objects.first().author == another_user
        assert response.json == {'away': {'firsthalf': {'entries': [], 'score': 0},
                                          'name': 'A2',
                                          'score': 0,
                                          'secondhalf': {'entries': [], 'score': 0}},
                                 'gameId': 1,
                                 'home': {'firsthalf': {'entries': [{'pat1': 7, 'sequence': 1, 'td': 19}], 'score': 7},
                                          'name': 'A1',
                                          'score': 7,
                                          'secondhalf': {'entries': [], 'score': 0}},
                                 'isFirstHalf': True}

    def test_post_team_log_with_empty_pat(self):
        DBSetup().g62_status_empty()
        firstGame = Gameinfo.objects.first()
        response = self.app.post_json(reverse('api-gamelog', kwargs={'id': firstGame.pk}),
                                      {'team': 'A1', 'gameId': firstGame.pk, 'half': 1,
                                       'event': [
                                           {'name': 'Touchdown', 'player': '19'},
                                           {'name': '1-Extra-Punkt', 'player': ''}]},
                                      headers=DBSetup().get_token_header())
        assert response.status_code == HTTPStatus.CREATED
        assert response.json == {'gameId': 1,
                                 'away': {
                                     'name': 'A2',
                                     'score': 0,
                                     'firsthalf': {'entries': [], 'score': 0},
                                     'secondhalf': {'entries': [], 'score': 0}},
                                 'home': {
                                     'name': 'A1',
                                     'score': 6,
                                     'firsthalf': {
                                         'score': 6,
                                         'entries': [{'pat1': None, 'sequence': 1, 'td': 19}],
                                     },
                                     'secondhalf': {'entries': [], 'score': 0}},
                                 'isFirstHalf': True}

    def test_post_team_log_change_of_possession(self):
        DBSetup().g62_status_empty()
        firstGame = Gameinfo.objects.first()
        response = self.app.post_json(reverse('api-gamelog', kwargs={'id': firstGame.pk}),
                                      {'team': 'A1', 'gameId': firstGame.pk, 'half': 1,
                                       'event': [{'name': 'Turnover'}]}, headers=DBSetup().get_token_header())
        assert response.status_code == HTTPStatus.CREATED
        assert response.json == {'gameId': 1,
                                 'isFirstHalf': True,
                                 'home': {
                                     'name': 'A1',
                                     'score': 0,
                                     'firsthalf': {
                                         'score': 0,
                                         'entries': [{'sequence': 1, 'cop': True}]},
                                     'secondhalf': {'score': 0, 'entries': []}},
                                 'away': {
                                     'name': 'A2',
                                     'score': 0,
                                     'firsthalf': {'score': 0, 'entries': []},
                                     'secondhalf': {'score': 0, 'entries': []}
                                 }}

    def test_post_team_log_updates_score(self):
        DBSetup().g62_status_empty()
        firstGame = Gameinfo.objects.first()
        response = self.app.post_json(reverse('api-gamelog', kwargs={'id': firstGame.pk}),
                                      {'team': 'A1', 'gameId': firstGame.pk, 'half': 1,
                                       'event': [
                                           {'name': 'Touchdown', 'player': '19'},
                                           {'name': '2-Extra-Punkte', 'player': '7'}]},
                                      headers=DBSetup().get_token_header())
        assert response.status_code == HTTPStatus.CREATED
        home: Gameresult = Gameresult.objects.get(gameinfo=firstGame, isHome=True)
        away: Gameresult = Gameresult.objects.get(gameinfo=firstGame, isHome=False)
        assert home.fh == 8
        assert away.fh == 0

    def test_score_is_updated_with_multiple_entries(self):
        DBSetup().g62_status_empty()
        firstGame = Gameinfo.objects.first()
        self.app.post_json(reverse('api-gamelog', kwargs={'id': firstGame.pk}),
                           {'team': 'A1', 'gameId': firstGame.pk, 'half': 1,
                            'event': [
                                {'name': 'Touchdown', 'player': '19'},
                                {'name': '1-Extra-Punkt', 'player': '7'}]}, headers=DBSetup().get_token_header())
        self.app.post_json(reverse('api-gamelog', kwargs={'id': firstGame.pk}),
                           {'team': 'A1', 'gameId': firstGame.pk, 'half': 1,
                            'event': [
                                {'name': 'Touchdown', 'player': '19'},
                                {'name': 'Safety (+2)', 'player': '7'}]}, headers=DBSetup().get_token_header())
        self.app.post_json(reverse('api-gamelog', kwargs={'id': firstGame.pk}),
                           {'team': 'A2', 'gameId': firstGame.pk, 'half': 2,
                            'event': [
                                {'name': 'Touchdown', 'player': '19'},
                                {'name': '2-Extra-Punkte', 'player': ''}]}, headers=DBSetup().get_token_header())
        self.app.post_json(reverse('api-gamelog', kwargs={'id': firstGame.pk}),
                           {'team': 'A2', 'gameId': firstGame.pk, 'half': 2,
                            'event': [{'name': 'Turnover'}]}, headers=DBSetup().get_token_header())
        home: Gameresult = Gameresult.objects.get(gameinfo=firstGame, isHome=True)
        away: Gameresult = Gameresult.objects.get(gameinfo=firstGame, isHome=False)
        assert home.fh == 15
        assert home.sh == 0
        assert away.fh == 0
        assert away.sh == 6

    def test_team_log_entry_is_deleted(self):
        gameinfo = DBSetup().create_teamlog_home_and_away()
        response = self.app.delete_json(reverse('api-gamelog', kwargs={'id': gameinfo.pk}), {
            'sequence': 2
        }, headers=DBSetup().get_token_header())
        assert response.status_code == HTTPStatus.OK
        json_response = response.json
        assert json_response['home']['score'] == 34
        assert json_response['home']['firsthalf']['entries'][1]['isDeleted']


class TestGameHalftime(WebTest):
    def test_halftime_submitted(self):
        DBSetup().g62_status_empty()
        firstGame: Gameinfo = Gameinfo.objects.first()
        response = self.app.put_json(reverse('api-game-halftime', kwargs={'pk': firstGame.pk}),
                                     headers=DBSetup().get_token_header())
        assert response.status_code == HTTPStatus.OK
        firstGame = Gameinfo.objects.first()
        assert firstGame.status == '2. Halbzeit'
        assert re.match('^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]', str(firstGame.gameHalftime))


class TestGameFinalize(WebTest):
    def test_game_is_finalized(self):
        DBSetup().g62_status_empty()
        firstGame: Gameinfo = Gameinfo.objects.last()
        DBSetup().create_gamesetup(firstGame)
        response = self.app.put_json(reverse('api-game-finalize', kwargs={'pk': firstGame.pk}), {
            'homeCaptain': 'Home Captain',
            'awayCaptain': 'Away Captain',
            'hasFinalScoreChanged': True
        }, headers=DBSetup().get_token_header())
        assert response.status_code == HTTPStatus.OK
        gamesetup = GameSetup.objects.get(gameinfo=firstGame)
        assert gamesetup.homeCaptain == 'Home Captain'
        assert gamesetup.awayCaptain == 'Away Captain'
        assert gamesetup.hasFinalScoreChanged == True
        firstGame: Gameinfo = Gameinfo.objects.last()
        assert firstGame.status == 'beendet'
        assert re.match('^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]', str(firstGame.gameFinished))


class TestGamesToWhistleAPIView(WebTest):
    def test_get_games_to_whistle_for_specific_team(self):
        gameday = DBSetup().g62_status_empty()
        Gameinfo.objects.filter(id=1).update(gameFinished='13:00')
        Gameinfo.objects.filter(id=2).update(officials=2)
        response = self.app.get(reverse('api-gameday-whistlegames', kwargs={'pk': gameday.pk, 'team': 'officials'})
                                , headers=DBSetup().get_token_header())
        assert len(response.json) == 4

    def test_get_all_games_to_whistle_for_all_teams(self):
        gameday = DBSetup().g62_status_empty()

        Gameinfo.objects.filter(id=1).update(gameFinished='13:00')
        Gameinfo.objects.filter(id=2).update(officials=2)
        response = self.app.get(reverse('api-gameday-whistlegames', kwargs={'pk': gameday.pk, 'team': '*'}))
        assert len(response.json) == 10