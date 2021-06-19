from .base import *

if os.environ.get('league_manager') == 'dev':
    from .dev import *
else:
    from .prod import *
