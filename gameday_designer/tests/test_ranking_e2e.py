import pytest
from gamedays.models import Gameday, Team
from gameday_designer.models import ScheduleTemplate, TemplateSlot
from gameday_designer.service.template_application_service import TemplateApplicationService

@pytest.mark.django_db
class TestRankingStageE2E:
    """End-to-end tests for Ranking Stage application."""

    def test_apply_template_with_ranking_stage(self, db, staff_user, gameday, teams):
        """
        Test applying a template that uses a Ranking Stage.
        
        Structure:
        - Preliminary (RANKING): Team 0 vs Team 1
        - Final (STANDARD): Rank 1 Preliminary vs Team 2
        """
        template = ScheduleTemplate.objects.create(
            name="Ranking E2E Template",
            num_teams=3,
            num_fields=1,
            num_groups=1,
            game_duration=60,
            created_by=staff_user
        )
        
        # 1. Ranking Stage Slot
        slot1 = TemplateSlot.objects.create(
            template=template,
            field=1,
            slot_order=1,
            stage="Preliminary",
            stage_type="RANKING",
            standing="G1",
            home_group=0,
            home_team=0,
            away_group=0,
            away_team=1,
            official_group=0,
            official_team=2
        )
        
        # 2. Final Stage Slot (referencing rank from Preliminary)
        slot2 = TemplateSlot.objects.create(
            template=template,
            field=1,
            slot_order=2,
            stage="Final",
            stage_type="STANDARD",
            standing="Final",
            home_reference="Rank 1 Preliminary",
            away_group=0,
            away_team=2,
            official_group=0,
            official_team=0
        )
        
        team_mapping = {
            "0_0": teams[0].pk,
            "0_1": teams[1].pk,
            "0_2": teams[2].pk
        }
        
        # Apply template
        service = TemplateApplicationService(template, gameday, team_mapping, applied_by=staff_user)
        result = service.apply()
        
        assert result.success is True
        assert result.gameinfos_created == 2
        
        # Verify created games
        games = gameday.gameinfo_set.all().order_by('scheduled')
        assert games.count() == 2
        
        # Game 1: Preliminary
        game1 = games[0]
        assert game1.stage == "Preliminary"
        results1 = game1.gameresult_set.all()
        assert results1.count() == 2
        
        # Game 2: Final
        game2 = games[1]
        assert game2.stage == "Final"
        results2 = game2.gameresult_set.all()
        assert results2.count() == 2
        
        # Verify Rank 1 Preliminary was resolved
        # (Based on our service logic, Rank 1 should be the team with the smallest PK among participants)
        ordered_teams = sorted([teams[0].pk, teams[1].pk])
        expected_team_id = ordered_teams[0]
        
        home_final = results2.get(isHome=True)
        assert home_final.team.pk == expected_team_id
        
        away_final = results2.get(isHome=False)
        assert away_final.team.pk == teams[2].pk
