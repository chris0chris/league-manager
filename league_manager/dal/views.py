from dal import autocomplete

from gamedays.models import Team


class TeamAutocompleteView(autocomplete.Select2QuerySetView):
    def get_queryset(self):
        qs = Team.objects.exclude(location='dummy').order_by('description')

        if self.q:
            qs = qs.filter(description__icontains=self.q).exclude(location='dummy').order_by('description')

        return qs

    def get_result_label(self, item):
        return item.description
