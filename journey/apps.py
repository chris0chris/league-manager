from django.apps import AppConfig

class JourneyConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'journey'

    def ready(self):
        import journey.signals
