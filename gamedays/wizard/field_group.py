from gamedays.forms import GamedayGaminfoFieldsAndGroupsForm
from gamedays.service.gameday_service import GamedayService
from gamedays.wizard import WizardStepHandler

FIELD_GROUP_STEP = "field-group-step"


class FieldGroupStepHandler(WizardStepHandler):
    def handle_form(self, wizard, form: GamedayGaminfoFieldsAndGroupsForm, data):
        gameday = wizard.gameday
        groups = gameday.season.groups_season.filter(
            season=gameday.season, league=gameday.league
        )
        form.fields["group_names"].choices = [(g.id, g.name) for g in groups]
        return form

    def handle_process_step(self, wizard, form: GamedayGaminfoFieldsAndGroupsForm):
        wizard.extra[FIELD_GROUP_STEP] = form.cleaned_data
        GamedayService.update_format(wizard.gameday, form.cleaned_data)
