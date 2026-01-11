from gamedays.forms import (
    GamedayFormatBaseFormSet,
    SCHEDULE_MAP,
    get_gameday_format_formset,
    GamedayGaminfoFieldsAndGroupsForm,
    GamedayFormatForm,
    SCHEDULE_MAP_GROUPS_C,
    SCHEDULE_MAP_TEAMS_C,
)
from gamedays.management.schedule_manager import (
    ScheduleCreator,
    Schedule,
    GroupSchedule,
)
from gamedays.wizard import WizardStepHandler, FIELD_GROUP_STEP
from league_table.models import LeagueGroup

GAMEDAY_FORMAT_STEP = "gameday-format"


class GamedayFormatStepHandler(WizardStepHandler):

    def handle_form(self, wizard, form: GamedayFormatBaseFormSet, data):
        field_group_step = wizard.wizard_state.get(FIELD_GROUP_STEP, {})
        group_array = (
            field_group_step.get(GamedayGaminfoFieldsAndGroupsForm.GROUP_NAMES_C) or []
        )
        schedule_format = field_group_step.get(
            GamedayGaminfoFieldsAndGroupsForm.FORMAT_C
        )
        groups = SCHEDULE_MAP.get(schedule_format, {}).get(SCHEDULE_MAP_GROUPS_C, [])
        needed_teams = [group[SCHEDULE_MAP_TEAMS_C] for group in groups]
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
            league_groups = LeagueGroup.objects.filter(id__in=group_array)
        else:
            league_groups = [f"Gruppe {n}" for n in range(1, number_groups + 1)]
        for index, current_form in enumerate(formset):
            if len(group_array):
                group_name = league_groups[index].name
                current_form.fields[GamedayFormatForm.GROUP_C].label = group_name
                current_form.fields[GamedayFormatForm.GROUP_NAME_C].initial = group_name
                current_form.fields[GamedayFormatForm.LEAGUE_GROUP_C].initial = (
                    league_groups[index].pk
                )
            else:
                current_form.fields[GamedayFormatForm.GROUP_C].label = league_groups[
                    index
                ]
                current_form.fields[GamedayFormatForm.GROUP_NAME_C].initial = (
                    league_groups[index]
                )
        return formset

    def handle_process_step(self, wizard, form: GamedayFormatBaseFormSet):
        grouped_teams = []
        for current_form in form:
            cleaned_data = current_form.cleaned_data
            league_group = cleaned_data.get(GamedayFormatForm.LEAGUE_GROUP_C)
            if league_group:
                league_group = LeagueGroup.objects.get(pk=league_group)

            grouped_teams += [
                GroupSchedule(
                    name=cleaned_data[GamedayFormatForm.GROUP_NAME_C],
                    league_group=league_group,
                    teams=[
                        current_team.name
                        for current_team in cleaned_data[GamedayFormatForm.GROUP_C]
                    ],
                )
            ]
        field_group_step = wizard.wizard_state[FIELD_GROUP_STEP] or {}
        schedule_format = field_group_step.get(
            GamedayGaminfoFieldsAndGroupsForm.FORMAT_C, "FORMAT_NOT_FOUND"
        )
        sc = ScheduleCreator(
            schedule=Schedule(gameday_format=schedule_format, groups=grouped_teams),
            gameday=wizard.gameday,
        )
        sc.create()
