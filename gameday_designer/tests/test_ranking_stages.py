import pytest
from rest_framework import status
from gameday_designer.models import TemplateSlot

@pytest.mark.django_db
class TestRankingStageIntegration:
    """Tests for Ranking Stage integration in models and API."""

    def test_create_ranking_stage_slot(self, api_client, staff_user, template):
        """Test that a slot can be created with RANKING stage_type."""
        api_client.force_authenticate(user=staff_user)
        
        data = {
            "template": template.pk,
            "field": 1,
            "slot_order": 1,
            "stage": "Placement",
            "stage_type": "RANKING",
            "standing": "P1",
            "home_group": 0,
            "home_team": 0,
            "away_group": 0,
            "away_team": 1,
            "official_group": 0,
            "official_team": 2,
        }
        
        # Use the template detail endpoint to get the slots (or create via slot endpoint if exists)
        # For now, let's create it directly and check serialization via detail view
        slot = TemplateSlot.objects.create(**data | {"template": template})
        
        response = api_client.get(f"/api/designer/templates/{template.pk}/")
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["slots"]) == 1
        assert response.data["slots"][0]["stage_type"] == "RANKING"

    def test_default_stage_type_is_standard(self, api_client, template):
        """Test that stage_type defaults to STANDARD."""
        slot = TemplateSlot.objects.create(
            template=template,
            field=1,
            slot_order=1,
            stage="Vorrunde",
            standing="G1",
            home_group=0,
            home_team=0,
            away_group=0,
            away_team=1,
            official_group=0,
            official_team=2,
        )
        
        response = api_client.get(f"/api/designer/templates/{template.pk}/")
        assert response.data["slots"][0]["stage_type"] == "STANDARD"
