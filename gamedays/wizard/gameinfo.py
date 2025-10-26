from django.forms import BaseFormSet

from gamedays.forms import get_gameinfo_formset
from gamedays.models import Gameinfo
from gamedays.service.gameday_form_service import GamedayFormService
from gamedays.wizard import WizardStepHandler, FIELD_GROUP_STEP
from league_table.models import LeagueGroup

GAMEINFO_STEP = "gameinfo-step"


class GameinfoStepHandler(WizardStepHandler):
    def handle_form(self, wizard, form: BaseFormSet, data):
        field_group_step = wizard.extra.get(FIELD_GROUP_STEP) or {}
        number_fields = int(field_group_step.get("number_fields", 1))
        number_groups = field_group_step.get("number_groups")
        group_names = field_group_step.get("group_names")
        if number_groups:
            number_groups = int(number_groups)
            group_choices = [
                (f"Gruppe {n}", f"Gruppe {n}") for n in range(1, number_groups + 1)
            ]
        else:
            groups = LeagueGroup.objects.filter(id__in=group_names)
            group_choices = [
                (f"{currentGroup.pk}", f"{currentGroup.name}")
                for currentGroup in groups
            ]

        field_choices = [(f"{n}", f"Feld {n}") for n in range(1, number_fields + 1)]

        form_kwargs = {"group_choices": group_choices, "field_choices": field_choices}
        qs = Gameinfo.objects.filter(gameday=wizard.gameday)
        formset = get_gameinfo_formset()(
            data, queryset=qs, prefix=GAMEINFO_STEP, form_kwargs=form_kwargs
        )
        return formset

    def handle_process_step(self, wizard, form: BaseFormSet):
        gameday_form_service = GamedayFormService(wizard.gameday)
        for current_form in form:
            if current_form.has_changed():
                gameday_form_service.handle_gameinfo_and_gameresult(
                    current_form.cleaned_data, current_form.instance
                )
