from gamedays.forms import GamedayGaminfoFieldsAndGroupsForm
from gamedays.service.gameday_service import GamedayService
from gamedays.wizard import WizardStepHandler

FIELD_GROUP_STEP = "field-group-step"


class FieldGroupStepHandler(WizardStepHandler):
    def handle(self, wizard, form: GamedayGaminfoFieldsAndGroupsForm):
        wizard.extra[FIELD_GROUP_STEP] = form.cleaned_data
        GamedayService.update_format(wizard.gameday, form.cleaned_data)