from django.shortcuts import render
from django.views.generic import ListView

# importing models
from .models import Playerlist


# declaring Views via django views
class PasscheckListView(ListView):
    model = Playerlist
    ordering = ['trikotnumber']

# ToDo: check if should be class and document
def passcheck_view(request):
    return render(request, 'passcheck/index.html')
