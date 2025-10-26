from django.forms import BaseFormSet

from gamedays.service.gameday_form_service import GamedayFormService
from gamedays.wizard import WizardStepHandler

GAMEINFO_STEP = "gameinfo-step"

class GameinfoStepHandler(WizardStepHandler):
    def handle(self, wizard, form: BaseFormSet):
        gameday_form_service = GamedayFormService(wizard.gameday)
        for current_form in form:
            if current_form.has_changed():
                gameday_form_service.handle_gameinfo_and_gameresult(
                    current_form.cleaned_data, current_form.instance
                )
