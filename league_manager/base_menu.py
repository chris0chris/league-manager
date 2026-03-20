from abc import ABC, abstractmethod

from django.urls import reverse


class BaseMenu(ABC):
    @abstractmethod
    def get_name(self):
        pass

    @abstractmethod
    def get_menu_items(self, request):
        """
        This method must return a list of menu items specific to the app.
        Each item should be a dictionary with 'name' and a MenuItem.create() list
        """
        pass


class MenuDivider:
    @staticmethod
    def create():
        return {"is_divider": True}


class MenuItem:
    @staticmethod
    def create(name, url, is_static=False, permissions=None, url_kwargs=None):
        permissions = permissions or []
        url_kwargs = url_kwargs or {}
        return {
            "name": name,
            "static": is_static,
            "url": url if is_static else reverse(url, kwargs=url_kwargs),
            # 'permissions': permissions,
        }
