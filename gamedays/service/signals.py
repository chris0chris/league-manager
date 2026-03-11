from django.db.models.signals import post_save
from django.dispatch import receiver

from gamedays.management.schedule_update import ScheduleUpdate
from gamedays.models import Gameinfo
from gameday_designer.models import TemplateApplication
from gamedays.service.schedule_resolution_service import (
    GamedayScheduleResolutionService,
)

FINISHED = "beendet"


@receiver(post_save, sender=Gameinfo)
def update_game_schedule(sender, instance: Gameinfo, created, **kwargs):
    if instance.status == FINISHED:
        # Check for Designer-based gameday
        if TemplateApplication.objects.filter(gameday=instance.gameday).exists():
            resolution_service = GamedayScheduleResolutionService(instance.gameday_id)
            # Trigger updates for both standing (group) and stage
            if resolution_service.gmw.is_finished(instance.standing):
                resolution_service.update_participants(instance.standing)
            if resolution_service.gmw.is_finished(instance.stage):
                resolution_service.update_participants(instance.stage)
        else:
            # Fallback to legacy JSON-based logic
            update_schedule = ScheduleUpdate(
                instance.gameday_id, instance.gameday.format
            )
            update_schedule.update()
