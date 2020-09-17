import functools

from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from gamedays.management.schedule_update import ScheduleUpdate
from gamedays.models import Gameinfo

FINISHED = 'beendet'

# ToDo entfernen, wenn auf factory boy migriert
def suspendingreceiver(signal, **decorator_kwargs):
    def wrapper(func):
        @receiver(signal, **decorator_kwargs)
        @functools.wraps(func)
        def fake_receiver(sender, **kwargs):
            if settings.SUSPEND_SIGNALS:
                return
            return func(sender, **kwargs)

        return fake_receiver

    return wrapper


@suspendingreceiver(post_save, sender=Gameinfo)
# @receiver(post_save, sender=Gameinfo)
def update_game_schedule(sender, instance: Gameinfo, created, **kwargs):
    if instance.status == FINISHED:
        update_schedule = ScheduleUpdate(instance.pk)
        update_schedule.update()
        # if qualify finished -> create SF / PO / PD
        # if SF finished -> create P1, P3
