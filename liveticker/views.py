from django.views.generic import TemplateView


class LivetickerView(TemplateView):
    template_name = "liveticker/index.html"
