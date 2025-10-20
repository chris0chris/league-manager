from django.conf import settings

from league_manager.utils.utils import get_menu_items


def global_menu(request):
    return {
        'menu_items': get_menu_items(request)
    }

def pages_links(request):
    return {
        'PAGES_LINKS': getattr(settings, 'PAGES_LINKS', {}),
    }
