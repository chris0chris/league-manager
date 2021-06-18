"""league_manager URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/3.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
import debug_toolbar
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.contrib.auth import views as auth_view
from django.urls import path, include

from league_manager.views import homeview

urlpatterns = [
                  path('admin/', admin.site.urls),
                  path('api/', include('gamedays.api.urls')),
                  path('teammanager/', include('teammanager.urls')),
                  path('scorecard/', include('scorecard.urls')),
                  path('liveticker/', include('liveticker.urls')),
                  path('leaguetable/', include('league_table.urls')),
                  path('gamedays/', include('gamedays.urls')),
                  path('', homeview),
                  path('login/', auth_view.LoginView.as_view(template_name='registration/login.html'), name='login'),
                  path('logout/', auth_view.LogoutView.as_view(template_name='registration/logout.html'),
                       name='logout'),
                  # path('api-auth/', include('rest_framework.urls', namespace='rest_framework')),
                  path('accounts/', include('accounts.urls'))
              ] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

if settings.DEBUG:
    urlpatterns = [
                      path('__debug__/', include(debug_toolbar.urls)),
                  ] + urlpatterns
