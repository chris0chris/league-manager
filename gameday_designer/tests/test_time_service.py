"""
Tests for Gameday Time Calculation Service.
"""

import pytest
from datetime import time
from gameday_designer.service.time_service import TimeService


def test_add_minutes():
    """Test adding minutes to time object."""
    assert TimeService.add_minutes(time(10, 0), 30) == time(10, 30)
    assert TimeService.add_minutes(time(10, 30), 45) == time(11, 15)
    assert TimeService.add_minutes(time(23, 45), 30) == time(0, 15)


def test_calculate_game_times():
    """Test full calculation for a single field."""
    gameday_start = time(9, 0)
    game_duration = 50
    slots = [{"break_after": 10}, {"break_after": 0}, {"break_after": 15}]

    times = TimeService.calculate_game_times(gameday_start, game_duration, slots)

    assert len(times) == 3
    assert times[0] == time(9, 0)
    assert times[1] == time(10, 0)  # 9:00 + 50 + 10
    assert times[2] == time(10, 50)  # 10:00 + 50 + 0
