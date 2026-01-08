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
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.contrib.auth import views as auth_view
from django.contrib.sitemaps.views import sitemap
from django.urls import path, include
from django.views.generic import TemplateView

from league_manager.views import homeview, ClearCacheView, robots_txt_view
from league_manager.sitemaps import (
    StaticViewSitemap,
    LeaguetableSitemap,
    GamedaySitemap,
    PasscheckTeamSitemap,
    OfficialsSitemap,
)

ADMIN_ALL_URLS = 'admin-all-urls'
CLEAR_CACHE = 'clear-cache'

LEAGUE_MANAGER_MAINTENANCE = 'maintenance'

# Sitemap configuration
sitemaps = {
    'static': StaticViewSitemap,
    'leaguetable': LeaguetableSitemap,
    'gamedays': GamedaySitemap,
    'passcheck': PasscheckTeamSitemap,
    'officials': OfficialsSitemap,
}

urlpatterns = [
                  path('sitemap.xml', sitemap, {'sitemaps': sitemaps}, name='django.contrib.sitemaps.views.sitemap'),
                  path('robots.txt', robots_txt_view, name='robots-txt'),
                  path('maintenance/', TemplateView.as_view(template_name='league_manager/maintenance.html'),
                       name=LEAGUE_MANAGER_MAINTENANCE),
                  path('clear-cache/', ClearCacheView.as_view(), name=CLEAR_CACHE),
                  path('admin/', admin.site.urls),
                  # ToDo: fix gameday urls
                  path('api/', include('gamedays.api.urls')),
                  path('api/designer/', include('gameday_designer.urls')),
                  path('api/liveticker/', include('liveticker.api.urls')),
                  path('api/officials/', include('officials.api.urls')),
                  path('api/passcheck/', include('passcheck.api.urls')),
                  path('gamedays/gameday/design/', include('gameday_designer.app_urls')),
                  path('officials/', include('officials.urls')),
                  path('teammanager/', include('teammanager.urls')),
                  path('scorecard/', include('scorecard.urls')),
                  path('liveticker/', include('liveticker.urls')),
                  path('leaguetable/', include('league_table.urls')),
                  path('gamedays/', include('gamedays.urls')),
                  path('passcheck/', include('passcheck.urls')),
                  path('dal/', include('league_manager.dal.urls')),
                  path('', homeview),
                  path('login/', auth_view.LoginView.as_view(template_name='registration/login.html'), name='login'),
                  path('logout/', auth_view.LogoutView.as_view(template_name='registration/logout.html'),
                       name='logout'),
                  # path('api-auth/', include('rest_framework.urls', namespace='rest_framework')),
                  path('accounts/', include('accounts.urls')),
                  path(r'health/', include('health_check.urls')),
              ] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

if settings.DEBUG:
    import debug_toolbar

    urlpatterns = [
                      # path('silk/', include('silk.urls', namespace='silk')),
                      path('__debug__/', include(debug_toolbar.urls)),
                  ] + urlpatterns
