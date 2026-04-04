"""
Tests for TeamCreationView, TeamBulkCreationView, and LeagueTeamsView endpoints.

POST /api/designer/teams/                             — create a single team by name
POST /api/designer/teams/bulk/                        — create N auto-named teams
GET  /api/designer/gamedays/<id>/league-teams/        — list teams for a gameday's league
"""

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from gamedays.models import Team, SeasonLeagueTeam


@pytest.mark.django_db
class TestTeamCreationView:
    """Tests for POST /api/designer/teams/."""

    URL = "/api/designer/teams/"

    def test_create_team_returns_201(self, api_client, staff_user):
        """Creating a new team returns 201 with id and name."""
        api_client.force_authenticate(user=staff_user)
        response = api_client.post(self.URL, {"name": "Team Alpha"}, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "Team Alpha"
        assert "id" in response.data

    def test_create_team_persists_to_db(self, api_client, staff_user):
        """Created team is saved in the database."""
        api_client.force_authenticate(user=staff_user)
        api_client.post(self.URL, {"name": "Persisted Team"}, format="json")

        assert Team.objects.filter(name="Persisted Team").exists()

    def test_create_team_sets_description_and_location(self, api_client, staff_user):
        """Team is created with description=name and location='placeholder'."""
        api_client.force_authenticate(user=staff_user)
        api_client.post(self.URL, {"name": "Check Defaults"}, format="json")

        team = Team.objects.get(name="Check Defaults")
        assert team.description == "Check Defaults"
        assert team.location == "placeholder"

    def test_existing_team_returns_200(self, api_client, staff_user, db):
        """Posting with an existing team name returns 200 (not 201)."""
        Team.objects.create(
            name="Existing Team", description="Existing Team", location="placeholder"
        )
        api_client.force_authenticate(user=staff_user)
        response = api_client.post(self.URL, {"name": "Existing Team"}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Existing Team"

    def test_missing_name_returns_400(self, api_client, staff_user):
        """Request without name returns 400."""
        api_client.force_authenticate(user=staff_user)
        response = api_client.post(self.URL, {}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "error" in response.data

    def test_empty_name_returns_400(self, api_client, staff_user):
        """Request with empty string name returns 400."""
        api_client.force_authenticate(user=staff_user)
        response = api_client.post(self.URL, {"name": "   "}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "error" in response.data

    def test_unauthenticated_user_is_rejected(self, api_client):
        """Unauthenticated requests are rejected with 401."""
        response = api_client.post(self.URL, {"name": "Ghost Team"}, format="json")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestTeamBulkCreationView:
    """Tests for POST /api/designer/teams/bulk/."""

    URL = "/api/designer/teams/bulk/"

    def test_bulk_create_returns_201_with_list(self, api_client, staff_user):
        """Bulk creating N teams returns 201 with a list of N items."""
        api_client.force_authenticate(user=staff_user)
        response = api_client.post(self.URL, {"count": 4}, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert len(response.data) == 4

    def test_bulk_create_names_teams_sequentially(self, api_client, staff_user):
        """Teams are named 'Team 1', 'Team 2', ..., 'Team N'."""
        api_client.force_authenticate(user=staff_user)
        response = api_client.post(self.URL, {"count": 3}, format="json")

        names = [item["name"] for item in response.data]
        assert names == ["Team 1", "Team 2", "Team 3"]

    def test_bulk_create_each_item_has_id_and_name(self, api_client, staff_user):
        """Each returned item has id and name keys."""
        api_client.force_authenticate(user=staff_user)
        response = api_client.post(self.URL, {"count": 2}, format="json")

        for item in response.data:
            assert "id" in item
            assert "name" in item

    def test_bulk_create_persists_teams(self, api_client, staff_user):
        """Teams are persisted in the database."""
        api_client.force_authenticate(user=staff_user)
        api_client.post(self.URL, {"count": 3}, format="json")

        assert Team.objects.filter(name="Team 1").exists()
        assert Team.objects.filter(name="Team 2").exists()
        assert Team.objects.filter(name="Team 3").exists()

    def test_bulk_create_idempotent_for_existing_teams(self, api_client, staff_user, db):
        """Bulk creation with existing team names returns them without duplicates."""
        Team.objects.create(
            name="Team 1", description="Team 1", location="placeholder"
        )
        api_client.force_authenticate(user=staff_user)
        response = api_client.post(self.URL, {"count": 2}, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert len(response.data) == 2
        assert Team.objects.filter(name="Team 1").count() == 1

    def test_missing_count_returns_400(self, api_client, staff_user):
        """Request without count returns 400."""
        api_client.force_authenticate(user=staff_user)
        response = api_client.post(self.URL, {}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "error" in response.data

    def test_count_zero_returns_400(self, api_client, staff_user):
        """count=0 returns 400."""
        api_client.force_authenticate(user=staff_user)
        response = api_client.post(self.URL, {"count": 0}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "error" in response.data

    def test_negative_count_returns_400(self, api_client, staff_user):
        """Negative count returns 400."""
        api_client.force_authenticate(user=staff_user)
        response = api_client.post(self.URL, {"count": -3}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "error" in response.data

    def test_non_integer_count_returns_400(self, api_client, staff_user):
        """Non-integer count returns 400."""
        api_client.force_authenticate(user=staff_user)
        response = api_client.post(self.URL, {"count": "abc"}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "error" in response.data

    def test_bulk_count_too_large_returns_400(self, api_client, staff_user):
        """count > 50 returns 400."""
        api_client.force_authenticate(user=staff_user)
        response = api_client.post(self.URL, {"count": 51}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "error" in response.data

    def test_unauthenticated_user_is_rejected(self, api_client):
        """Unauthenticated requests are rejected with 401."""
        response = api_client.post(self.URL, {"count": 3}, format="json")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestLeagueTeamsView:
    """Tests for GET /api/designer/gamedays/<id>/league-teams/."""

    def url(self, gameday_id):
        return f"/api/designer/gamedays/{gameday_id}/league-teams/"

    def test_returns_teams_from_league(self, api_client, staff_user, gameday, teams):
        """Returns all teams in the gameday's league+season."""
        slt = SeasonLeagueTeam.objects.create(season=gameday.season, league=gameday.league)
        slt.teams.set(teams[:3])
        api_client.force_authenticate(user=staff_user)

        response = api_client.get(self.url(gameday.pk))

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 3
        returned_ids = {item["id"] for item in response.data}
        assert returned_ids == {t.pk for t in teams[:3]}
        for item in response.data:
            assert "id" in item
            assert "name" in item

    def test_returns_empty_list_when_no_season_league_team(self, api_client, staff_user, gameday):
        """Returns empty list when no SeasonLeagueTeam exists for the gameday."""
        api_client.force_authenticate(user=staff_user)

        response = api_client.get(self.url(gameday.pk))

        assert response.status_code == status.HTTP_200_OK
        assert response.data == []

    def test_returns_404_for_unknown_gameday(self, api_client, staff_user):
        """Returns 404 when gameday does not exist."""
        api_client.force_authenticate(user=staff_user)

        response = api_client.get(self.url(99999))

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_unauthenticated_user_is_rejected(self, api_client, gameday):
        """Unauthenticated requests are rejected with 401."""
        response = api_client.get(self.url(gameday.pk))

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
