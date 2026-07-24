from django.views.generic import TemplateView


class GameProgressPageView(TemplateView):
    """
    Serves the game progress dashboard React application.

    Publicly accessible (no login required) but intentionally not linked
    from any menu for non-staff users; see gameday_designer/menu.py.
    """

    template_name = "journey_dashboard/index.html"
