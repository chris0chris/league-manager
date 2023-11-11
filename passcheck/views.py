from django.shortcuts import render
from django.views.generic import ListView

from .models import Playerlist


class PasscheckListView(ListView):
    model = Playerlist
    ordering = ['trikotnumber']


def passcheck_view(request):
    return render(request, 'passcheck/index.html')
