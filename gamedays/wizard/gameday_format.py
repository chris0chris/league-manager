from gamedays.forms import (
    GamedayFormatBaseFormSet,
    SCHEDULE_MAP,
    get_gameday_format_formset,
)
from gamedays.management.schedule_manager import ScheduleCreator, Schedule
from gamedays.wizard import WizardStepHandler, FIELD_GROUP_STEP
from league_table.models import LeagueGroup

GAMEDAY_FORMAT_STEP = "gameday-format"


class GamedayFormatStepHandler(WizardStepHandler):

    def handle_form(self, wizard, form: GamedayFormatBaseFormSet, data):
        field_group_step = wizard.extra.get(FIELD_GROUP_STEP, {})
        group_array = field_group_step.get("group_names") or []
        schedule_format = field_group_step.get("format")
        groups = SCHEDULE_MAP.get(schedule_format, {}).get("groups", [])
        needed_teams = [group["teams"] for group in groups]
        number_groups = len(groups)
        if len(group_array) > 0 and len(group_array) != len(groups):
            raise ValueError("ungleiche Anzahl an Gruppen!")
        formset = get_gameday_format_formset(
            extra=len(groups),
            needed_teams_list=needed_teams,
            data=data,
            prefix=GAMEDAY_FORMAT_STEP,
        )
        if len(group_array):
            group_names = LeagueGroup.objects.filter(id__in=group_array).values_list(
                "name", flat=True
            )
        else:
            group_names = [f"Gruppe {n}" for n in range(1, number_groups + 1)]
        for index, current_form in enumerate(formset):
            current_form.fields["group"].label = group_names[index]
        return formset

    def handle_process_step(self, wizard, form: GamedayFormatBaseFormSet):
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
