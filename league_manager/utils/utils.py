import inspect
from importlib import import_module
from django.apps import apps


def get_menu_items(request):
    menus = {}

    for app_config in apps.get_app_configs():
        try:
            menu_module = import_module(f'{app_config.name}.menu')

            for name, obj in inspect.getmembers(menu_module, inspect.isclass):
                if name.startswith(app_config.name.capitalize() + 'Menu'):
                    menu_instance = obj()

                    menu_name = menu_instance.get_name()
                    menu_items = menu_instance.get_menu_items(request)

                    if menu_name in menus:
                        menus[menu_name]['items'].extend(menu_items)
                    else:
                        menus[menu_name] = {
                            'name': menu_name,
                            'items': menu_items,
                        }
        except (ImportError, AttributeError):
            # Skip apps without a menu.py or with no matching menu classes
            continue

    return menus
