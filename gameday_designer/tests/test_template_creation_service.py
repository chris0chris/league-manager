import pytest
from django.contrib.auth.models import User
from gameday_designer.models import ScheduleTemplate, TemplateSlot, TemplateUpdateRule
from gameday_designer.service.template_creation_service import TemplateCreationService

@pytest.mark.django_db
class TestTemplateCreationService:
    def test_create_template_from_designer_data(self):
        user = User.objects.create_user(username="testuser")
        data = {
            "name": "Custom Template",
            "description": "A test template",
            "num_teams": 4,
            "num_fields": 1,
            "num_groups": 1,
            "game_duration": 60,
            "sharing": "PRIVATE",
            "slots": [
                {
                    "field": 1,
                    "slot_order": 1,
                    "stage": "Preliminary",
                    "stage_type": "STANDARD",
                    "standing": "Group A",
                    "home_group": 0,
                    "home_team": 0,
                    "away_group": 0,
                    "away_team": 1,
                },
                {
                    "field": 1,
                    "slot_order": 2,
                    "stage": "Final",
                    "stage_type": "RANKING",
                    "standing": "Final",
                    "home_reference": "Winner G1",
                    "away_reference": "Winner G2",
                    "update_rule": {
                        "pre_finished": "Preliminary",
                        "team_rules": [
                            {"role": "home", "standing": "Group A", "place": 1},
                            {"role": "away", "standing": "Group B", "place": 1}
                        ]
                    }
                }
            ]
        }
        
        service = TemplateCreationService(user)
        template = service.create_template(data)
        
        assert template.name == "Custom Template"
        assert template.slots.count() == 2
        assert template.update_rules.count() == 1
        
        final_slot = template.slots.get(stage="Final")
        assert final_slot.update_rule.get().pre_finished == "Preliminary"
        assert final_slot.update_rule.get().team_rules.count() == 2
