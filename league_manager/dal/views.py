from dal import autocomplete
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page

from gamedays.models import Team


@method_decorator(cache_page(60 * 60 * 24), name="dispatch")
class TeamAutocompleteView(autocomplete.Select2QuerySetView):
    paginate_by = 500

    def get_queryset(self):
        qs = Team.objects.exclude(location="dummy").order_by("description")
        if self.q:
            qs = qs.filter(description__icontains=self.q)
        return qs

    def get_result_label(self, item):
        return item.description
