from django.db.models.signals import post_save
from django.dispatch import receiver

from gamedays.management.schedule_update import ScheduleUpdate
from teammanager.models import Gameinfo

FINISHED = 'beendet'


@receiver(post_save, sender=Gameinfo)
def update_game_schedule(sender, instance: Gameinfo, created, **kwargs):
    if instance.status == FINISHED:
        update_schedule = ScheduleUpdate(instance.gameday_id, instance.gameday.format)
        update_schedule.update()
