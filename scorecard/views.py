from django.views.generic import TemplateView


class ScorecardView(TemplateView):
    template_name = 'scorecard/base.html'


class ScorecardTestView(TemplateView):
    template_name = 'scorecard/test.html'
