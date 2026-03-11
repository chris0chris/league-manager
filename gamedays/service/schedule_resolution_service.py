from gamedays.models import Team, Gameinfo, Gameresult, Gameday
from gameday_designer.models import ScheduleTemplate, TemplateUpdateRule, TemplateApplication
from gamedays.service.model_wrapper import GamedayModelWrapper
import logging

logger = logging.getLogger(__name__)

class GamedayScheduleResolutionService:
    def __init__(self, gameday_id: int):
        self.gameday_id = gameday_id
        self.gameday = Gameday.objects.get(pk=gameday_id)
        self.template = self._get_template()
        self.gmw = GamedayModelWrapper(gameday_id)

    def _get_template(self) -> ScheduleTemplate:
        # Try to find via TemplateApplication first
        application = TemplateApplication.objects.filter(gameday=self.gameday).first()
        if application:
            return application.template
        
        # Fallback to name-based lookup for migrated templates
        template_name = f"schedule_{self.gameday.format}"
        return ScheduleTemplate.objects.filter(name=template_name).first()

    def update_participants(self, finished_standing: str):
        """
        Updates dependent games based on a finished standing/stage.
        """
        if not self.template:
            logger.warning(f"No template found for gameday {self.gameday_id}")
            return

        # Find rules that depend on the stage that just finished
        rules = TemplateUpdateRule.objects.filter(
            template=self.template,
            pre_finished=finished_standing
        )

        for rule in rules:
            self._apply_rule(rule)

    def _apply_rule(self, rule: TemplateUpdateRule):
        # Find the Gameinfo object in this gameday that matches the slot
        # We match by field, stage, and standing
        target_gi = Gameinfo.objects.filter(
            gameday=self.gameday,
            field=rule.slot.field,
            stage=rule.slot.stage,
            standing=rule.slot.standing
        ).first()

        if not target_gi:
            logger.warning(f"Could not find target Gameinfo for rule {rule.id}")
            return

        for team_rule in rule.team_rules.all():
            try:
                team_name = self.gmw.get_team_by(
                    place=team_rule.place,
                    standing=team_rule.standing,
                    points=team_rule.points
                )
                team = Team.objects.get(name=team_name)
                
                if team_rule.role == 'home':
                    self._update_gameresult(target_gi, team, True)
                elif team_rule.role == 'away':
                    self._update_gameresult(target_gi, team, False)
                elif team_rule.role == 'official':
                    if target_gi.officials != team:
                        target_gi.officials = team
                        target_gi.save()
            except Exception as e:
                logger.error(f"Error applying team rule {team_rule.id}: {str(e)}")

    def _update_gameresult(self, gi: Gameinfo, team: Team, is_home: bool):
        gameresult, created = Gameresult.objects.get_or_create(
            gameinfo=gi, 
            isHome=is_home
        )
        if gameresult.team != team:
            gameresult.team = team
            gameresult.save()

    @classmethod
    def get_game_placeholder(cls, gameinfo_id: int, is_home: bool) -> str:
        try:
            gi = Gameinfo.objects.get(pk=gameinfo_id)
            service = cls(gi.gameday_id)
            if not service.template:
                return "TBD"
            
            from gameday_designer.models import TemplateSlot
            slots = TemplateSlot.objects.filter(template=service.template).order_by('field', 'slot_order')
            
            # Match by counting games on the same field
            games_on_field = Gameinfo.objects.filter(
                gameday_id=gi.gameday_id, 
                field=gi.field,
                scheduled__lte=gi.scheduled
            ).count()
            
            slot = TemplateSlot.objects.filter(
                template=service.template,
                field=gi.field
            ).order_by('slot_order')[games_on_field - 1]

            if is_home:
                return slot.home_reference or (f"G{slot.home_group+1}_T{slot.home_team+1}" if slot.home_group is not None else "TBD")
            else:
                return slot.away_reference or (f"G{slot.away_group+1}_T{slot.away_team+1}" if slot.away_group is not None else "TBD")
        except Exception:
            return "TBD"
