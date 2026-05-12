from django.dispatch import receiver
from django.utils import timezone
from django.contrib.auth.signals import user_logged_in, user_logged_out
from .models import Journey

@receiver(user_logged_in)
def on_user_logged_in(sender, request, user, **kwargs):
    """Create a new journey when user logs in."""
    # Close any open journey (shouldn't happen but be safe)
    open_journey = Journey.objects.filter(user=user, ended_at__isnull=True).first()
    if open_journey:
        open_journey.ended_at = timezone.now()
        open_journey.save()

    # Create new journey
    Journey.objects.create(user=user)

@receiver(user_logged_out)
def on_user_logged_out(sender, user, **kwargs):
    """Close active journey when user logs out."""
    open_journey = Journey.objects.filter(user=user, ended_at__isnull=True).first()
    if open_journey:
        open_journey.ended_at = timezone.now()
        open_journey.save()
