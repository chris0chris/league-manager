import json


class AsJsonEncoder(json.JSONEncoder):
    def default(self, obj):
        if hasattr(obj, 'as_json'):
            return obj.as_json()
        return json.JSONEncoder.default(self, obj)