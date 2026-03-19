from django.db import transaction
from django.contrib.auth.models import User
from gameday_designer.models import ScheduleTemplate, TemplateSlot, TemplateUpdateRule, TemplateUpdateRuleTeam
from gamedays.models import UserProfile

class TemplateCreationService:
    def __init__(self, user: User):
        self.user = user

    def create_template(self, data: dict) -> ScheduleTemplate:
        with transaction.atomic():
            association = None
            try:
                profile = UserProfile.objects.get(user=self.user)
                association = profile.team.association if profile.team else None
            except UserProfile.DoesNotExist:
                pass

            template = ScheduleTemplate.objects.create(
                name=data["name"],
                description=data.get("description", ""),
                num_teams=data["num_teams"],
                num_fields=data["num_fields"],
                num_groups=data.get("num_groups", 1),
                game_duration=data.get("game_duration", 70),
                sharing=data.get("sharing", ScheduleTemplate.SHARING_ASSOCIATION),
                association=association,
                created_by=self.user,
                updated_by=self.user,
            )

            for slot_data in data.get("slots", []):
                update_rule_data = slot_data.pop("update_rule", None)
                slot = TemplateSlot.objects.create(
                    template=template,
                    **slot_data
                )

                if update_rule_data:
                    team_rules_data = update_rule_data.pop("team_rules", [])
                    rule = TemplateUpdateRule.objects.create(
                        template=template,
                        slot=slot,
                        **update_rule_data
                    )
                    for team_rule_data in team_rules_data:
                        TemplateUpdateRuleTeam.objects.create(
                            update_rule=rule,
                            **team_rule_data
                        )

            return template
