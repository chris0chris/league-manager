from django.db import models
from django.contrib.auth.models import User

class Journey(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        return f"{self.user.username} - {self.started_at}"

class JourneyEvent(models.Model):
    journey = models.ForeignKey(Journey, on_delete=models.CASCADE, related_name='events')
    event_name = models.CharField(max_length=100)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['journey', 'created_at']),
            models.Index(fields=['event_name', 'created_at']),
        ]

    def __str__(self):
        return f"{self.event_name} @ {self.created_at}"
