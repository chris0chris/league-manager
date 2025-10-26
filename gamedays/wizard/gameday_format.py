from gamedays.forms import GamedayFormatBaseFormSet
from gamedays.management.schedule_manager import ScheduleCreator, Schedule
from gamedays.wizard import WizardStepHandler, FIELD_GROUP_STEP

GAMEDAY_FORMAT_STEP = "gameday-format"


class GamedayFormatStepHandler(WizardStepHandler):

    def handle(self, wizard, form: GamedayFormatBaseFormSet):
        # TODO die Entität übergeben und nicht den Namen
        grouped_teams = [
            [team.name for team in f.cleaned_data["group"]]
            for f in form
            if f.cleaned_data.get("group")
        ]
        field_group_step = wizard.extra[FIELD_GROUP_STEP] or {}
        schedule_format = field_group_step.get("format", "FORMAT_NOT_FOUND")
        sc = ScheduleCreator(
            schedule=Schedule(gameday_format=schedule_format, groups=grouped_teams),
            gameday=wizard.gameday,
        )
        sc.create()
