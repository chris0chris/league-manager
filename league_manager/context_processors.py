from league_manager.utils.utils import get_menu_items


def global_menu(request):
    return {
        'menu_items': get_menu_items(request)
    }
