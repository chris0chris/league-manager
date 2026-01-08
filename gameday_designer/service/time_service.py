"""
Gameday Time Calculation Service.

Centralized service for calculating game start times based on gameday start,
durations, and breaks. Harmonizes logic between frontend and backend.
"""
from datetime import time, datetime, timedelta
from typing import List, Dict, Optional


class TimeService:
    """
    Service for gameday-related time calculations.
    """

    @staticmethod
    def add_minutes(start_time: time, minutes: int) -> time:
        """
        Add minutes to a time object.
        """
        # Convert to datetime to perform arithmetic
        dt = datetime.combine(datetime.today(), start_time)
        dt_new = dt + timedelta(minutes=minutes)
        return dt_new.time()

    @staticmethod
    def calculate_game_times(
        gameday_start: time,
        game_duration: int,
        slots: List[Dict]
    ) -> List[time]:
        """
        Calculate start times for a sequence of slots on a single field.
        
        Args:
            gameday_start: The start time of the gameday.
            game_duration: Default duration of a game in minutes.
            slots: List of slot data dictionaries (must include 'break_after').
            
        Returns:
            List of calculated start times (time objects).
        """
        calculated_times = []
        current_time = gameday_start
        
        for i, slot in enumerate(slots):
            calculated_times.append(current_time)
            
            # Prepare time for next slot: current + duration + break
            break_minutes = slot.get('break_after', 0)
            current_time = TimeService.add_minutes(current_time, game_duration + break_minutes)
            
        return calculated_times
