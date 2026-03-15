import logging
from gamedays.models import Gameinfo, Gameday
from gameday_designer.models import ScheduleTemplate, TemplateSlot, TemplateApplication

logger = logging.getLogger(__name__)


class GamedayPlaceholderService:
    """
    Central service for resolving human-friendly placeholder names (e.g., "Winner Game 1")
    for gamedays that haven't had teams assigned to bracket slots yet.

    All gameinfos and template slots are prefetched in __init__ to avoid N+1 queries
    when resolving placeholders for multiple games on the same gameday.
    """

    def __init__(self, gameday_id: int):
        self.gameday_id = gameday_id
        self.gameday = Gameday.objects.filter(pk=gameday_id).first()
        self._template = None
        self._gameinfos = {
            gi.pk: gi
            for gi in Gameinfo.objects.filter(gameday_id=gameday_id)
        }
        self._slots_by_field = None

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

        # 2. Fallback to format-based name for migrated templates (convention from migrate_json_schedules)
        template_name = f"schedule_{self.gameday.format}"
        if template_name:
            logger.info(
                f"No TemplateApplication found for gameday {self.gameday_id}; "
                f"falling back to format-name lookup: '{template_name}'"
            )
        self._template = ScheduleTemplate.objects.filter(name=template_name).first()
        if self._template:
            logger.info(
                f"Gameday {self.gameday_id} matched template by format name '{template_name}' "
                f"(no TemplateApplication record). Consider creating one."
            )
        return self._template

    def _get_slots_by_field(self) -> dict:
        """Prefetch and cache all template slots grouped by field."""
        if self._slots_by_field is not None:
            return self._slots_by_field

        template = self.get_template()
        if not template:
            self._slots_by_field = {}
            return self._slots_by_field

        self._slots_by_field = {}
        for slot in TemplateSlot.objects.filter(template=template).order_by('field', 'slot_order'):
            self._slots_by_field.setdefault(slot.field, []).append(slot)
        return self._slots_by_field

    def get_placeholder(
        self, gameinfo_id: int, is_home: bool = True, is_official: bool = False
    ) -> str:
        """Get a specific placeholder name for a game slot."""
        try:
            gi = self._gameinfos.get(gameinfo_id)
            if not gi:
                return "TBD"

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
        except (Gameinfo.DoesNotExist, IndexError, AttributeError) as e:
            logger.warning(f"Placeholder resolution failed for game {gameinfo_id}: {str(e)}")
            return "TBD"

    def _find_slot_for_game(self, gi: Gameinfo) -> TemplateSlot:
        """Matches a Gameinfo to its TemplateSlot by counting previous games on the same field."""
        field_slots = self._get_slots_by_field().get(gi.field, [])
        if not field_slots:
            return None

        # Count how many games (including this one) are on this field at or before this time
        # This matches the 'slot_order' logic used during template application
        game_index = sum(
            1 for g in self._gameinfos.values()
            if g.field == gi.field and g.scheduled <= gi.scheduled
        )

        if game_index < 1 or game_index > len(field_slots):
            return None

        return field_slots[game_index - 1]

    @classmethod
    def resolve_placeholder(cls, gameinfo_id: int, is_home: bool = True) -> str:
        """Utility class method for quick lookups."""
        try:
            gi = Gameinfo.objects.get(pk=gameinfo_id)
            service = cls(gi.gameday_id)
            return service.get_placeholder(gameinfo_id, is_home)
        except Gameinfo.DoesNotExist:
            return "TBD"
