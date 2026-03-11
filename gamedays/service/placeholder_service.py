import logging
import pandas as pd
from django.db.models import QuerySet
from gamedays.models import Gameinfo, Gameday
from gameday_designer.models import ScheduleTemplate, TemplateSlot, TemplateApplication

logger = logging.getLogger(__name__)


class GamedayPlaceholderService:
    """
    Central service for resolving human-friendly placeholder names (e.g., "Winner Game 1")
    for gamedays that haven't had teams assigned to bracket slots yet.
    """

    def __init__(self, gameday_id: int):
        self.gameday_id = gameday_id
        self.gameday = Gameday.objects.filter(pk=gameday_id).first()
        self._template = None
        self._slots_by_field = {}

    def get_template(self) -> ScheduleTemplate:
        if self._template:
            return self._template

        if not self.gameday:
            return None

        # 1. Try via TemplateApplication
        application = TemplateApplication.objects.filter(gameday=self.gameday).first()
        if application:
            self._template = application.template
            return self._template

        # 2. Fallback to format-based name for migrated templates
        template_name = f"schedule_{self.gameday.format}"
        self._template = ScheduleTemplate.objects.filter(name=template_name).first()
        return self._template

    def get_placeholder(
        self, gameinfo_id: int, is_home: bool = True, is_official: bool = False
    ) -> str:
        """Get a specific placeholder name for a game slot."""
        try:
            gi = Gameinfo.objects.get(pk=gameinfo_id)
            template = self.get_template()
            if not template:
                return "TBD"

            slot = self._find_slot_for_game(gi)
            if not slot:
                return "TBD"

            if is_official:
                return slot.official_reference or (
                    f"G{slot.official_group+1}_T{slot.official_team+1}"
                    if slot.official_group is not None
                    else "TBD"
                )

            if is_home:
                return slot.home_reference or (
                    f"G{slot.home_group+1}_T{slot.home_team+1}"
                    if slot.home_group is not None
                    else "TBD"
                )
            else:
                return slot.away_reference or (
                    f"G{slot.away_group+1}_T{slot.away_team+1}"
                    if slot.away_group is not None
                    else "TBD"
                )
        except Exception as e:
            logger.debug(
                f"Placeholder resolution failed for game {gameinfo_id}: {str(e)}"
            )
            return "TBD"

    def _find_slot_for_game(self, gi: Gameinfo) -> TemplateSlot:
        """Matches a Gameinfo to its TemplateSlot by counting previous games on the same field."""
        template = self.get_template()
        if not template:
            return None

        # Count how many games (including this one) happened on this field before or at this time
        # This matches the 'slot_order' logic used during template application
        game_index = Gameinfo.objects.filter(
            gameday_id=self.gameday_id, field=gi.field, scheduled__lte=gi.scheduled
        ).count()

        slots = TemplateSlot.objects.filter(template=template, field=gi.field).order_by(
            "slot_order"
        )

        if game_index > slots.count():
            return None

        return slots[game_index - 1]

    @classmethod
    def resolve_placeholder(cls, gameinfo_id: int, is_home: bool = True) -> str:
        """Utility class method for quick lookups."""
        try:
            gi = Gameinfo.objects.get(pk=gameinfo_id)
            service = cls(gi.gameday_id)
            return service.get_placeholder(gameinfo_id, is_home)
        except Exception:
            return "TBD"
