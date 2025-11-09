from dataclasses import dataclass, field
from typing import Dict, Any


@dataclass
class TeamStats:
    team_id: int
    team_name: str
    points: int = 0
    pf: int = 0
    pa: int = 0
    diff: int = 0
    extras: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self):
        base = {
            "team_id": self.team_id,
            "team_name": self.team_name,
            "points": self.points,
            "pf": self.pf,
            "pa": self.pa,
            "diff": self.diff,
        }
        base.update(self.extras)
        return base
