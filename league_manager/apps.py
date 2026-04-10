from django.apps import AppConfig


class LeagueManagerConfig(AppConfig):
    name = "league_manager"

    def ready(self):
        # noinspection PyUnresolvedReferences
        import league_manager.signals
