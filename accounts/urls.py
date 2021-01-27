from django.urls import path, include
from knox import views as knox_views

from accounts.api import RegisterAPI, LoginAPI, UserAPI

urlpatterns = [
    path('knox-auth/', include('knox.urls')),
    path('auth/register/', RegisterAPI.as_view(), name='accounts-register'),
    path('auth/login/', LoginAPI.as_view(), name='accounts-login'),
    path('auth/user/', UserAPI.as_view(), name='accounts-user'),
    path('auth/logout/', knox_views.LogoutView.as_view(), name='accounts-logout')
]
