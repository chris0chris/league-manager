from league_manager.utils.utils import get_menu_items
import league_manager

def global_menu(request):
    return {
        'menu_items': get_menu_items(request)
    }

def version_number(request):
    return {'APP_VERSION_NUMBER': league_manager.__version__}
