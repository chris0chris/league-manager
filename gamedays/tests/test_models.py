from gamedays.models import EmptyTeam, Team


class TestEmptyTeamAttributes:
    def test_empty_team_attributes(self):
        empty_team_instance = EmptyTeam(name="Dummy Team")
        empty_team_attrs = vars(empty_team_instance)
        team_attrs = []
        for field in Team._meta.get_fields():
            if field.concrete:
                team_attrs += [field.name]

        for attr in team_attrs:
            assert attr in empty_team_attrs, f"Attribute {attr} not found in EmptyTeam class."

        for attr in empty_team_attrs:
            assert attr in team_attrs, f"Attribute {attr} not found in Team model."
