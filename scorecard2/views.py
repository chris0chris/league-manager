from django.views.generic import TemplateView


class ScorecardView(TemplateView):
    template_name = 'scorecard/index.html'
