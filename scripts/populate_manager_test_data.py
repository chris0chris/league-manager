#!/usr/bin/env python
"""
Populate test data for the Manager System feature testing

This script creates:
- 5 test users (staff, league manager, gameday manager, team manager, no permissions)
- Test league, season, teams
- Test gamedays
- Manager permissions at all three levels
"""

import os
import sys
import django
from datetime import date, time, timedelta

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'league_manager.settings')
django.setup()

from django.contrib.auth.models import User
from gamedays.models import (
    Season, League, Association, Team, SeasonLeagueTeam, Gameday,
    LeagueManager, GamedayManager, TeamManager
)


def create_users():
    """Create test users with different permission levels"""
    print("Creating test users...")

    users = {}

    # Staff user
    users['staff'], created = User.objects.get_or_create(
        username='staff_user',
        defaults={
            'email': 'staff@test.com',
            'is_staff': True,
            'is_superuser': True,
        }
    )
    if created:
        users['staff'].set_password('test123')
        users['staff'].save()
        print(f"  ✓ Created staff user: staff_user / test123")
    else:
        print(f"  ⚠ Staff user already exists")

    # League Manager user
    users['league_mgr'], created = User.objects.get_or_create(
        username='league_mgr',
        defaults={
            'email': 'league@test.com',
            'first_name': 'League',
            'last_name': 'Manager',
        }
    )
    if created:
        users['league_mgr'].set_password('test123')
        users['league_mgr'].save()
        print(f"  ✓ Created league manager: league_mgr / test123")
    else:
        print(f"  ⚠ League manager already exists")

    # Gameday Manager user
    users['gameday_mgr'], created = User.objects.get_or_create(
        username='gameday_mgr',
        defaults={
            'email': 'gameday@test.com',
            'first_name': 'Gameday',
            'last_name': 'Manager',
        }
    )
    if created:
        users['gameday_mgr'].set_password('test123')
        users['gameday_mgr'].save()
        print(f"  ✓ Created gameday manager: gameday_mgr / test123")
    else:
        print(f"  ⚠ Gameday manager already exists")

    # Team Manager user
    users['team_mgr'], created = User.objects.get_or_create(
        username='team_mgr',
        defaults={
            'email': 'team@test.com',
            'first_name': 'Team',
            'last_name': 'Manager',
        }
    )
    if created:
        users['team_mgr'].set_password('test123')
        users['team_mgr'].save()
        print(f"  ✓ Created team manager: team_mgr / test123")
    else:
        print(f"  ⚠ Team manager already exists")

    # No permissions user
    users['no_perms'], created = User.objects.get_or_create(
        username='no_perms',
        defaults={
            'email': 'noperms@test.com',
            'first_name': 'No',
            'last_name': 'Permissions',
        }
    )
    if created:
        users['no_perms'].set_password('test123')
        users['no_perms'].save()
        print(f"  ✓ Created no-permissions user: no_perms / test123")
    else:
        print(f"  ⚠ No-permissions user already exists")

    return users


def create_league_structure():
    """Create league, season, association, and teams"""
    print("\nCreating league structure...")

    # Create season
    season, created = Season.objects.get_or_create(
        name='2024',
        defaults={'name': '2024'}
    )
    if created:
        print(f"  ✓ Created season: {season.name}")
    else:
        print(f"  ⚠ Season {season.name} already exists")

    # Create league
    league, created = League.objects.get_or_create(
        name='Test League',
        defaults={'name': 'Test League'}
    )
    if created:
        print(f"  ✓ Created league: {league.name}")
    else:
        print(f"  ⚠ League {league.name} already exists")

    # Create another league for testing access control
    other_league, created = League.objects.get_or_create(
        name='Other League',
        defaults={'name': 'Other League'}
    )
    if created:
        print(f"  ✓ Created other league: {other_league.name}")
    else:
        print(f"  ⚠ Other league {other_league.name} already exists")

    # Create association
    association, created = Association.objects.get_or_create(
        abbr='TEST',
        defaults={
            'abbr': 'TEST',
            'name': 'Test Association',
        }
    )
    if created:
        print(f"  ✓ Created association: {association.name}")
    else:
        print(f"  ⚠ Association {association.name} already exists")

    # Create teams
    teams = {}
    for team_name in ['Test Team A', 'Test Team B', 'Test Team C', 'Other Team']:
        team, created = Team.objects.get_or_create(
            name=team_name,
            defaults={
                'name': team_name,
                'description': f'{team_name} Description',
                'location': 'Test City',
                'association': association,
            }
        )
        teams[team_name] = team
        if created:
            print(f"  ✓ Created team: {team_name}")
        else:
            print(f"  ⚠ Team {team_name} already exists")

    # Link teams to season/league
    for team_name in ['Test Team A', 'Test Team B', 'Test Team C']:
        slt, created = SeasonLeagueTeam.objects.get_or_create(
            season=season,
            league=league,
            team=teams[team_name]
        )
        if created:
            print(f"  ✓ Linked {team_name} to {season.name} {league.name}")

    # Link Other Team to Other League
    slt, created = SeasonLeagueTeam.objects.get_or_create(
        season=season,
        league=other_league,
        team=teams['Other Team']
    )
    if created:
        print(f"  ✓ Linked Other Team to {season.name} {other_league.name}")

    return {
        'season': season,
        'league': league,
        'other_league': other_league,
        'teams': teams,
        'association': association,
    }


def create_gamedays(league_data, users):
    """Create test gamedays"""
    print("\nCreating gamedays...")

    gamedays = {}
    today = date.today()

    # Create gameday in Test League
    gamedays['test_gameday'], created = Gameday.objects.get_or_create(
        name='Test Gameday 1',
        league=league_data['league'],
        season=league_data['season'],
        defaults={
            'name': 'Test Gameday 1',
            'league': league_data['league'],
            'season': league_data['season'],
            'date': today + timedelta(days=7),
            'start': time(10, 0),
            'format': '6_2',
            'author': users['staff'],
            'address': '123 Test Street, Test City',
        }
    )
    if created:
        print(f"  ✓ Created gameday: {gamedays['test_gameday'].name}")
    else:
        print(f"  ⚠ Gameday {gamedays['test_gameday'].name} already exists")

    # Create another gameday in Test League
    gamedays['test_gameday2'], created = Gameday.objects.get_or_create(
        name='Test Gameday 2',
        league=league_data['league'],
        season=league_data['season'],
        defaults={
            'name': 'Test Gameday 2',
            'league': league_data['league'],
            'season': league_data['season'],
            'date': today + timedelta(days=14),
            'start': time(10, 0),
            'format': '6_2',
            'author': users['staff'],
            'address': '456 Test Avenue, Test City',
        }
    )
    if created:
        print(f"  ✓ Created gameday: {gamedays['test_gameday2'].name}")
    else:
        print(f"  ⚠ Gameday {gamedays['test_gameday2'].name} already exists")

    # Create gameday in Other League (for access control testing)
    gamedays['other_gameday'], created = Gameday.objects.get_or_create(
        name='Other League Gameday',
        league=league_data['other_league'],
        season=league_data['season'],
        defaults={
            'name': 'Other League Gameday',
            'league': league_data['other_league'],
            'season': league_data['season'],
            'date': today + timedelta(days=21),
            'start': time(10, 0),
            'format': '6_2',
            'author': users['staff'],
            'address': '789 Other Street, Other City',
        }
    )
    if created:
        print(f"  ✓ Created gameday: {gamedays['other_gameday'].name}")
    else:
        print(f"  ⚠ Gameday {gamedays['other_gameday'].name} already exists")

    return gamedays


def assign_manager_permissions(users, league_data, gamedays):
    """Assign manager permissions to test users"""
    print("\nAssigning manager permissions...")

    # Assign League Manager permission
    league_mgr, created = LeagueManager.objects.get_or_create(
        user=users['league_mgr'],
        league=league_data['league'],
        season=league_data['season'],
        defaults={
            'created_by': users['staff'],
        }
    )
    if created:
        print(f"  ✓ Assigned {users['league_mgr'].username} as League Manager for {league_data['league'].name}")
    else:
        print(f"  ⚠ League Manager permission already exists")

    # Assign Gameday Manager permission with limited permissions
    gameday_mgr, created = GamedayManager.objects.get_or_create(
        user=users['gameday_mgr'],
        gameday=gamedays['test_gameday'],
        defaults={
            'assigned_by': users['staff'],
            'can_edit_details': True,
            'can_assign_officials': True,
            'can_manage_scores': False,  # Limited permission
        }
    )
    if created:
        print(f"  ✓ Assigned {users['gameday_mgr'].username} as Gameday Manager for {gamedays['test_gameday'].name}")
        print(f"    Permissions: edit_details=True, assign_officials=True, manage_scores=False")
    else:
        print(f"  ⚠ Gameday Manager permission already exists")

    # Assign Team Manager permission
    team_mgr, created = TeamManager.objects.get_or_create(
        user=users['team_mgr'],
        team=league_data['teams']['Test Team A'],
        defaults={
            'assigned_by': users['staff'],
            'can_edit_roster': True,
            'can_submit_passcheck': True,
        }
    )
    if created:
        print(f"  ✓ Assigned {users['team_mgr'].username} as Team Manager for {league_data['teams']['Test Team A'].name}")
        print(f"    Permissions: edit_roster=True, submit_passcheck=True")
    else:
        print(f"  ⚠ Team Manager permission already exists")

    return {
        'league_mgr': league_mgr,
        'gameday_mgr': gameday_mgr,
        'team_mgr': team_mgr,
    }


def main():
    """Main function to populate all test data"""
    print("=" * 80)
    print("Manager System - Test Data Population")
    print("=" * 80)

    try:
        # Create users
        users = create_users()

        # Create league structure
        league_data = create_league_structure()

        # Create gamedays
        gamedays = create_gamedays(league_data, users)

        # Assign manager permissions
        permissions = assign_manager_permissions(users, league_data, gamedays)

        print("\n" + "=" * 80)
        print("✓ Test data population completed successfully!")
        print("=" * 80)
        print("\nTest Users Created:")
        print("-" * 80)
        print(f"Staff User:          staff_user / test123  (Full Access)")
        print(f"League Manager:      league_mgr / test123  (Manages 'Test League')")
        print(f"Gameday Manager:     gameday_mgr / test123 (Manages 'Test Gameday 1')")
        print(f"Team Manager:        team_mgr / test123    (Manages 'Test Team A')")
        print(f"No Permissions User: no_perms / test123    (No Manager Access)")
        print("\nYou can now start the Django server and test the manager system!")
        print("Run: python manage.py runserver")
        print("Then visit: http://localhost:8000/managers/dashboard/")
        print("=" * 80)

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
