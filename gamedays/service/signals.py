import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from gamedays.management.schedule_update import ScheduleUpdate
from gamedays.models import Gameinfo, GamedayDesignerState
from gameday_designer.models import TemplateApplication
from gamedays.service.schedule_resolution_service import (
    GamedayScheduleResolutionService,
)

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Gameinfo)
def update_game_schedule(sender, instance: Gameinfo, created, **kwargs):
    if instance.status == Gameinfo.STATUS_COMPLETED:
        try:
            # Check for Designer-based gameday (template slots)
            if TemplateApplication.objects.filter(gameday=instance.gameday).exists():
                resolution_service = GamedayScheduleResolutionService(instance.gameday_id)
                # Trigger updates for both standing (group) and stage
                if resolution_service.gmw.is_finished(instance.standing):
                    resolution_service.update_participants(instance.standing)
                if resolution_service.gmw.is_finished(instance.stage):
                    resolution_service.update_participants(instance.stage)
            elif GamedayDesignerState.objects.filter(gameday=instance.gameday).exists():
                # Canvas-published gameday: resolve dynamic team refs in downstream games
                from gamedays.service.canvas_progression_service import CanvasBracketProgressionService
                CanvasBracketProgressionService(instance).apply()
            else:
                # Fallback to legacy JSON-based logic
                update_schedule = ScheduleUpdate(instance.gameday_id, instance.gameday.format)
                update_schedule.update()
        except Exception as e:
            logger.warning(
                f"Schedule resolution failed for gameinfo {instance.pk} "
                f"(gameday {instance.gameday_id}): {e}"
            )
